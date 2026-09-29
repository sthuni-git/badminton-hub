import assert from 'node:assert/strict';
import { mergeAndDeduplicate } from './scrape-tournaments';

const original = {
  id: 'fc-4387', category: '지역구대회' as const, name: '보령시체육회장배',
  eventStart: '2026-10-01', eventEnd: '2026-10-01', eventPeriod: '2026.10.01',
  registrationStart: '', registrationEnd: '', registrationPeriod: '공식 상세 페이지 확인',
  venue: '보령', source: '페이스콕' as const, officialLink: 'https://facecock.co.kr/page/?pid=game_view&ga_id=4387', fee: '요강 참조',
  sources: ['페이스콕', '배드민턴게임'] as Array<'페이스콕' | '배드민턴게임'>,
  sourceLinks: [
    {source: '페이스콕' as const, link: 'https://facecock.co.kr/page/?pid=game_view&ga_id=4387'},
    {source: '배드민턴게임' as const, link: 'http://www.badmintongame.co.kr/game/game_view.html?ga_id=4387'},
  ],
};
const updated = {...original, name: '2026년 보령시체육회장배 생활체육 배드민턴대회', eventStart: '2026-10-04', eventEnd: '2026-10-04', eventPeriod: '2026.10.04', sources: undefined, sourceLinks: undefined};
const merged = mergeAndDeduplicate([original, updated]);
assert.equal(merged.length, 1, 'renamed/rescheduled stable ID must be updated, not duplicated');
assert.equal(merged[0].eventStart, updated.eventStart);
assert.equal(merged[0].name, updated.name);
assert.ok(merged[0].sourceLinks?.some(x => x.source === '배드민턴게임'), 'unavailable source evidence survives refresh');
assert.deepEqual(mergeAndDeduplicate(merged), merged, 'repeated refresh preserves all evidence');
const another = {...updated, id: 'bg-4387', source: '배드민턴게임' as const, officialLink: original.sourceLinks[1].link};
assert.equal(mergeAndDeduplicate([...merged, another]).length, 1, 'same event from another source still merges');
assert.equal(mergeAndDeduplicate([original, {...original, id: 'fc-9999', eventStart: '2026-11-01'}]).length, 2, 'distinct editions stay separate');
console.log('Merge regression checks passed');
