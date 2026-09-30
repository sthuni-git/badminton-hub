// Local-only UI test double. Never connects to Vercel or writes production data.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import { validateDraft, toTournament } from '../lib/manual-tournament';
import type { Tournament } from '../lib/tournaments';
const root = resolve('dist/client');
const records = new Map<string, Tournament>();
createServer(async (req, res) => {
  if (req.url === '/api/tournaments') {
    res.setHeader('Content-Type', 'application/json');
    if (req.method === 'GET') { res.end(JSON.stringify({ tournaments: [...records.values()] })); return; }
    if (req.headers.authorization !== 'Bearer local-ui-test-only') { res.writeHead(401); res.end(JSON.stringify({ error: '테스트 비밀번호 오류' })); return; }
    let body = ''; for await (const chunk of req) body += chunk;
    try {
      const data = JSON.parse(body);
      if (data.action === 'authenticate') { res.end('{"ok":true}'); return; }
      if (req.method === 'DELETE') { records.delete(data.id); res.end('{"ok":true}'); return; }
      const draft = validateDraft(data.draft);
      const tournament = records.get(draft.id) || toTournament(draft, data.poster);
      records.set(draft.id, tournament); res.end(JSON.stringify({ tournament }));
    } catch (error) { res.writeHead(400); res.end(JSON.stringify({ error: (error as Error).message })); }
    return;
  }
  const path = resolve(root, '.' + new URL(req.url || '/', 'http://localhost').pathname);
  if (path !== root && !path.startsWith(root + '\\') && !path.startsWith(root + '/')) { res.writeHead(403); res.end(); return; }
  const mime: Record<string, string> = { '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.html': 'text/html' };
  try { const content = await readFile(path === root ? resolve(root, 'index.html') : path); res.setHeader('Content-Type', mime[extname(path)] || (path === root ? 'text/html' : 'application/octet-stream')); res.end(content); }
  catch { res.setHeader('Content-Type', 'text/html'); res.end(await readFile(resolve(root, 'index.html'))); }
}).listen(4179, '127.0.0.1', () => console.log('Local UI test: http://127.0.0.1:4179 (password: local-ui-test-only; memory storage only)'));
