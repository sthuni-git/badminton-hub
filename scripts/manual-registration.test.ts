import { test } from 'node:test';
import assert from 'node:assert/strict';
import { emptyDraft, validateDraft, toTournament } from '../lib/manual-tournament';
import handler, { decodePoster } from '../api/tournaments';
import type { VercelRequest, VercelResponse } from '@vercel/node';

const valid = () => ({ ...emptyDraft(), name: '테스트 대회', venue: '서울 체육관', eventStart: '2026-10-01', eventEnd: '2026-10-01' });
test('수동 등록: 선택 항목과 링크 없이도 등록 가능, 추정값 없음', () => {
  const draft = validateDraft(valid());
  const row = toTournament(draft);
  assert.equal(row.source, '관리자수동등록'); assert.equal(row.fee, '미등록'); assert.equal(row.sponsor, '');
  assert.equal(row.officialLink, ''); assert.equal(row.eventPeriod, '2026.10.01');
});
test('실제 날짜, 날짜 순서, 필수값, URL, ID 검증', () => {
  for (const patch of [{ eventStart: '2026-02-30' }, { eventEnd: '2026-09-01' }, { name: ' ' }, { venue: '' }, { category: 'unknown' }, { officialLink: 'javascript:alert(1)' }, { officialLink: 'https://user:secret@example.com' }, { registrationStart: '2026-09-01' }, { id: '../../x' }]) {
    assert.throws(() => validateDraft({ ...valid(), ...patch }));
  }
});
test('포스터 링크와 독립적인 대회 ID', () => {
  const one = valid(); const two = valid(); assert.notEqual(one.id, two.id);
  const row = toTournament(validateDraft(one), 'https://example.com/poster.jpg');
  assert.equal(row.posterImage, row.officialLink);
});
test('이미지 형식, 위장 파일, 용량 제한 검증', () => {
  assert.equal(decodePoster(undefined), undefined);
  assert.throws(() => decodePoster('data:image/svg+xml;base64,PHN2Zz4='));
  assert.throws(() => decodePoster('data:image/jpeg;base64,PHNjcmlwdD4='));
  assert.throws(() => decodePoster('x'.repeat(2_800_001)));
  assert.equal(decodePoster('data:image/jpeg;base64,/9j/2Q==')?.type, 'jpeg');
});
test('서버는 미설정 저장소 및 무인증 쓰기를 거부', async () => {
  const saved = { token: process.env.BLOB_READ_WRITE_TOKEN, store: process.env.BLOB_STORE_ID, password: process.env.ADMIN_REGISTRATION_PASSWORD };
  let status = 0;
  const res = { setHeader() {}, status(code: number) { status = code; return this; }, json() { return this; } } as unknown as VercelResponse;
  try {
    delete process.env.BLOB_READ_WRITE_TOKEN; delete process.env.BLOB_STORE_ID;
    await handler({ method: 'GET', headers: {} } as VercelRequest, res); assert.equal(status, 503);
    process.env.BLOB_STORE_ID = 'test'; process.env.ADMIN_REGISTRATION_PASSWORD = 'test-password-strong-enough';
    await handler({ method: 'POST', headers: {}, body: { draft: valid() } } as VercelRequest, res); assert.equal(status, 401);
    await handler({ method: 'DELETE', headers: { authorization: 'Bearer 4545' }, body: {} } as VercelRequest, res); assert.equal(status, 401);
    await handler({ method: 'POST', headers: { authorization: 'Bearer test-password-strong-enough' }, body: { action: 'authenticate' } } as VercelRequest, res); assert.equal(status, 200);
  } finally {
    for (const [key, value] of Object.entries({ BLOB_READ_WRITE_TOKEN: saved.token, BLOB_STORE_ID: saved.store, ADMIN_REGISTRATION_PASSWORD: saved.password })) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  }
});
