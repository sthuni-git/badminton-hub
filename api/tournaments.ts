import type { VercelRequest, VercelResponse } from '@vercel/node';
import { get, list, put } from '@vercel/blob';
import { createHash, timingSafeEqual } from 'node:crypto';
import { validateDraft, toTournament } from '../lib/manual-tournament.js';

export const config = { maxDuration: 60 };
const prefix = () => `manual/${process.env.VERCEL_ENV === 'production' ? 'production' : 'preview'}/`;
async function read(path: string) {
  const result = await get(path, { access: 'public', useCache: false });
  return result?.statusCode === 200 ? JSON.parse(await new Response(result.stream).text()) : null;
}
function authorized(req: VercelRequest) {
  const expected = process.env.ADMIN_REGISTRATION_PASSWORD;
  if (!expected || expected.length < 16) return false;
  const value = req.headers.authorization;
  if (typeof value !== 'string' || !value.startsWith('Bearer ')) return false;
  const hash = (v: string) => createHash('sha256').update(v).digest();
  return timingSafeEqual(hash(value.slice(7)), hash(expected));
}
export function decodePoster(value: unknown) {
  if (value === undefined || value === '') return undefined;
  if (typeof value !== 'string' || value.length > 2_800_000) throw new Error('포스터는 압축 후 2MB 이하여야 합니다.');
  const match = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(value);
  if (!match) throw new Error('JPG, PNG, WEBP 이미지만 등록할 수 있습니다.');
  const data = Buffer.from(match[2], 'base64');
  const type = match[1];
  const valid = type === 'jpeg' ? data.subarray(0, 3).equals(Buffer.from([255, 216, 255]))
    : type === 'png' ? data.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
    : data.toString('ascii', 0, 4) === 'RIFF' && data.toString('ascii', 8, 12) === 'WEBP';
  if (!valid || data.length > 2_000_000) throw new Error('포스터 파일 형식 또는 용량을 확인해주세요.');
  return { data, type };
}
export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (!['GET', 'POST', 'DELETE'].includes(req.method || '')) return res.status(405).json({ error: '지원하지 않는 요청입니다.' });
  if (!process.env.BLOB_STORE_ID && !process.env.BLOB_READ_WRITE_TOKEN) return res.status(503).json({ error: '공용 저장소 연결이 아직 완료되지 않았습니다.' });
  if (req.method !== 'GET' && !authorized(req)) return res.status(401).json({ error: '공개 등록용 관리자 비밀번호를 확인해주세요. 서버 비밀번호 설정도 필요합니다.' });
  if (req.method === 'POST' && req.body?.action === 'authenticate') return res.status(200).json({ ok: true });
  try {
    if (req.method === 'GET') {
      const items = [];
      let cursor: string | undefined;
      do {
        const page = await list({ prefix: `${prefix()}records/`, cursor, limit: 1000 });
        for (let i = 0; i < page.blobs.length; i += 10) {
          const rows = await Promise.all(page.blobs.slice(i, i + 10).map(b => read(b.pathname)));
          items.push(...rows.filter(row => row && !row.deleted).map(row => row.tournament));
        }
        cursor = page.hasMore ? page.cursor : undefined;
      } while (cursor);
      return res.status(200).json({ tournaments: items });
    }
    if (req.method === 'DELETE') {
      const id = req.body?.id;
      if (typeof id !== 'string' || !/^shared-[0-9a-f-]{36}$/.test(id)) return res.status(400).json({ error: '잘못된 ID입니다.' });
      const path = `${prefix()}records/${id}.json`;
      const existing = await read(path);
      if (!existing) return res.status(404).json({ error: '대회를 찾을 수 없습니다.' });
      await put(path, JSON.stringify({ ...existing, deleted: true }), { access: 'public', addRandomSuffix: false, allowOverwrite: true, contentType: 'application/json' });
      return res.status(200).json({ ok: true });
    }
    let draft, poster;
    try { draft = validateDraft(req.body?.draft); poster = decodePoster(req.body?.poster); }
    catch (error) { return res.status(400).json({ error: (error as Error).message }); }
    const path = `${prefix()}records/${draft.id}.json`;
    const existing = await read(path);
    // Stable draft IDs make retries after a lost response safe.
    if (existing) return existing.deleted ? res.status(409).json({ error: '삭제된 등록입니다. 새 초안을 만들어주세요.' }) : res.status(200).json({ tournament: existing.tournament });
    let posterImage: string | undefined;
    if (poster) {
      const blob = await put(`${prefix()}posters/${draft.id}.${poster.type}`, poster.data, {
        access: 'public', addRandomSuffix: false, allowOverwrite: true, contentType: `image/${poster.type}`,
      });
      posterImage = blob.url;
    }
    const tournament = toTournament(draft, posterImage);
    await put(path, JSON.stringify({ tournament, createdAt: new Date().toISOString() }), { access: 'public', addRandomSuffix: false, allowOverwrite: false, contentType: 'application/json' });
    return res.status(201).json({ tournament });
  } catch (error) {
    console.error('Tournament storage request failed', error instanceof Error ? error.name : 'unknown');
    return res.status(503).json({ error: '저장소 요청에 실패했습니다. 입력 내용은 유지됩니다. 잠시 후 다시 시도해주세요.' });
  }
}
