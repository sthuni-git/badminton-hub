import fs from 'node:fs';
import path from 'node:path';

interface TournamentRecord {
  id: string;
  name: string;
  eventStart: string;
  eventEnd: string;
  registrationStart: string;
  registrationEnd: string;
  officialLink: string;
  posterImage?: string;
  source: string;
  sourceLinks?: Array<{ source: string; link: string }>;
}

const dataPath = path.resolve(process.cwd(), 'lib/tournaments-scraped.json');
const records = JSON.parse(fs.readFileSync(dataPath, 'utf-8')) as TournamentRecord[];
const errors: string[] = [];
const ids = new Set<string>();
const allowedSources = new Set(['페이스콕', '배드민톡', '배드민턴타임즈', '배드민턴게임', '코트엑스', '오마이플레이', '스포넷', '위꾹', '대한배드민턴협회', '인포민턴']);
const genericListLinks = new Set([
  'https://facecock.co.kr/page/?pid=game',
  'https://badmintok.com/badminton-tournament/',
  'http://www.badmintontimes.com/calendar/m3_calendarList.jsp?menunum=204',
  'http://www.badmintongame.co.kr/game/game.html',
  'https://www.courtx.co.kr/Tournament/List',
]);
const isoDate = /^20\d{2}-\d{2}-\d{2}$/;

for (const [index, record] of records.entries()) {
  const label = `#${index + 1} ${record.name || '(이름 없음)'}`;

  if (!record.id || ids.has(record.id)) errors.push(`${label}: ID가 없거나 중복입니다 (${record.id})`);
  ids.add(record.id);

  if (!allowedSources.has(record.source)) errors.push(`${label}: 허용되지 않은 출처입니다 (${record.source})`);
  if (!record.name?.trim()) errors.push(`${label}: 대회명이 없습니다`);
  if (!isoDate.test(record.eventStart) || !isoDate.test(record.eventEnd)) errors.push(`${label}: 대회 날짜 형식이 잘못됐습니다`);
  if (record.eventStart > record.eventEnd) errors.push(`${label}: 종료일이 시작일보다 빠릅니다`);

  const hasRegistrationDates = record.registrationStart || record.registrationEnd;
  if (hasRegistrationDates && (!isoDate.test(record.registrationStart) || !isoDate.test(record.registrationEnd))) {
    errors.push(`${label}: 접수 날짜는 둘 다 유효하거나 둘 다 비어 있어야 합니다`);
  }

  if (!/^https?:\/\//.test(record.officialLink)) errors.push(`${label}: 상세 원문 URL이 없습니다`);
  if (genericListLinks.has(record.officialLink)) errors.push(`${label}: 목록 URL을 상세 원문으로 사용할 수 없습니다`);
  if (record.posterImage?.startsWith('data:image')) errors.push(`${label}: 합성 포스터가 포함됐습니다`);
  if (!record.sourceLinks?.some((entry) => entry.source === record.source && entry.link === record.officialLink)) {
    errors.push(`${label}: 주 출처의 근거 링크가 sourceLinks에 없습니다`);
  }
}

if (errors.length > 0) {
  console.error(`❌ 대회 데이터 검증 실패 (${errors.length}건)`);
  for (const error of errors.slice(0, 50)) console.error(` - ${error}`);
  process.exitCode = 1;
} else {
  console.log(`✅ 대회 데이터 ${records.length}건 검증 통과`);
  console.log(`   중복 ID 0 / 목록 링크 0 / 합성 포스터 0 / 미허용 출처 0`);
}
