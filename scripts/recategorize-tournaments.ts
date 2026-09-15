import fs from 'node:fs';
import path from 'node:path';
import { categorizeTournament } from '../lib/tournaments.js';

const filePath = path.resolve(process.cwd(), 'lib/tournaments-scraped.json');
const raw = fs.readFileSync(filePath, 'utf-8');
const tournaments = JSON.parse(raw);

let changed = 0;
const counts: Record<string, number> = {};

for (const t of tournaments) {
  const newCat = categorizeTournament(t.name, t.venue);
  if (t.category !== newCat) {
    t.category = newCat;
    changed++;
  }
  counts[newCat] = (counts[newCat] || 0) + 1;
}

fs.writeFileSync(filePath, `${JSON.stringify(tournaments, null, 2)}\n`, 'utf-8');

console.log(`✅ 재분류 완료: 총 ${tournaments.length}건 중 ${changed}건 카테고리 교정`);
console.log('📊 카테고리별 분포:', counts);
