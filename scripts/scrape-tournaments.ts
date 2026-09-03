import fs from 'node:fs';
import path from 'node:path';

type TournamentCategory = '전국오픈' | '지역구대회' | '학생선수권' | '브랜드대회' | '국제대회';
type TournamentSource = '배드민톡' | '배드민턴타임즈' | '페이스콕';

interface ScrapedTournament {
  id: string;
  category: TournamentCategory;
  name: string;
  registrationPeriod: string;
  registrationStart: string;
  registrationEnd: string;
  eventPeriod: string;
  eventStart: string;
  eventEnd: string;
  venue: string;
  source: TournamentSource;
  sources?: TournamentSource[];
  sourceLinks?: Array<{ source: TournamentSource; link: string }>;
  officialLink: string;
  posterImage?: string;
  fee: string;
}

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const REQUEST_TIMEOUT_MS = 20_000;

function decodeEntities(value: string): string {
  const named: Record<string, string> = {
    amp: '&',
    apos: "'",
    gt: '>',
    lt: '<',
    nbsp: ' ',
    quot: '"',
  };

  return value
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code: string) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&([a-z]+);/gi, (match, name: string) => named[name.toLowerCase()] ?? match);
}

function cleanText(value: string): string {
  return decodeEntities(
    value
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\r/g, '')
  )
    .replace(/[\t ]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .trim();
}

async function fetchHtml(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: {
      Accept: 'text/html,application/xhtml+xml',
      'User-Agent': USER_AGENT,
    },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);

  const bytes = await response.arrayBuffer();
  const charset = response.headers.get('content-type')?.match(/charset=([^;]+)/i)?.[1]?.trim().toLowerCase();
  const decoder = new TextDecoder(charset === 'euc-kr' || charset === 'ks_c_5601-1987' ? 'euc-kr' : 'utf-8');
  return decoder.decode(bytes);
}

function toAbsoluteUrl(base: string, value: string): string {
  return new URL(decodeEntities(value), base).toString();
}

function isoDate(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function parseKoreanDateRange(value: string): { start: string; end: string } | null {
  const dates = [...cleanText(value).matchAll(/(20\d{2})년\s*(\d{1,2})월\s*(\d{1,2})일/g)];
  if (dates.length === 0) return null;

  const start = isoDate(Number(dates[0][1]), Number(dates[0][2]), Number(dates[0][3]));
  const last = dates.at(-1)!;
  const end = isoDate(Number(last[1]), Number(last[2]), Number(last[3]));
  return { start, end };
}

function parseCompactKoreanRange(value: string): { start: string; end: string } | null {
  const match = cleanText(value).match(/(20\d{2})년\s*(\d{1,2})월\s*(\d{1,2})일(?:\s*~\s*(?:(\d{1,2})월\s*)?(\d{1,2})일)?/);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const startDay = Number(match[3]);
  const endDay = match[5] ? Number(match[5]) : startDay;
  let endYear = year;
  let endMonth = match[4] ? Number(match[4]) : month;
  if (!match[4] && endDay < startDay) {
    endMonth += 1;
    if (endMonth === 13) {
      endMonth = 1;
      endYear += 1;
    }
  }
  return {
    start: isoDate(year, month, startDay),
    end: isoDate(endYear, endMonth, endDay),
  };
}

function displayPeriod(start: string, end: string): string {
  const startDisplay = start.replaceAll('-', '.');
  if (start === end) return startDisplay;
  return `${startDisplay} ~ ${end.slice(5).replaceAll('-', '.')}`;
}

function categorizeTournament(name: string, venue = ''): TournamentCategory {
  const text = `${name} ${venue}`;
  if (/BWF|월드투어|국제챌린지|인터내셔널|아시아선수권|세계선수권|올림픽|아시아경기/.test(text)) return '국제대회';
  if (/초등|중등|고등|학생|주니어|꿈나무|학교/.test(text)) return '학생선수권';
  if (/구청장|시장기|협회장기|협회장배|군수기|도민|생활체육|한마음/.test(text)) return '지역구대회';
  if (/요넥스|빅터|테크니스트|플리트|리닝|미즈노|아펙스|익스트림|코트엑스/.test(text)) return '브랜드대회';
  return '전국오픈';
}

function extractTableValue(html: string, label: string): string {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = html.match(new RegExp(`<th[^>]*>\\s*${escaped}\\s*<\\/th>\\s*<td[^>]*>([\\s\\S]*?)<\\/td>`, 'i'));
  return match ? cleanText(match[1]) : '';
}

function stableHash(value: string): string {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index++) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

async function scrapeFacecock(): Promise<ScrapedTournament[]> {
  const baseUrl = 'https://facecock.co.kr';
  const listUrls = [
    `${baseUrl}/page/?pid=game`,
    `${baseUrl}/page/index.php?onetable=&page=2&pid=game&srows=&stx=`,
    `${baseUrl}/page/index.php?onetable=&page=3&pid=game&srows=&stx=`,
  ];

  const candidates = new Map<string, { id: string; name: string; venue: string; eventStart: string; eventEnd: string; detailUrl: string; posterImage?: string }>();

  for (const listUrl of listUrls) {
    const html = await fetchHtml(listUrl);
    const itemRegex = /<a href="([^"]*pid=game_view(?:&|&amp;)ga_id=(\d+))"[^>]*>\s*<strong>([\s\S]*?)<\/strong><\/a><\/h7>\s*<p class="multi-cont">([\s\S]*?)<\/p>/gi;
    let match: RegExpExecArray | null;

    while ((match = itemRegex.exec(html)) !== null) {
      const detailUrl = toAbsoluteUrl(baseUrl, match[1]);
      const name = cleanText(match[3]);
      const meta = cleanText(match[4]);
      const eventRange = parseCompactKoreanRange(meta);
      if (!name || !eventRange) continue;

      const firstLine = meta.split('\n')[0] ?? '';
      const venue = firstLine.replace(/^\[([^\]]+)\]/, '$1 ').replaceAll('-', ' ').trim() || '장소는 공식 요강 참조';
      const preceding = html.slice(Math.max(0, match.index - 900), match.index);
      const images = [...preceding.matchAll(/<img[^>]+src="([^"]*\/data\/game\/poster_[^"]+)"/gi)];
      const posterPath = images.at(-1)?.[1];

      candidates.set(match[2], {
        id: match[2],
        name,
        venue,
        eventStart: eventRange.start,
        eventEnd: eventRange.end,
        detailUrl,
        posterImage: posterPath ? toAbsoluteUrl(baseUrl, posterPath) : undefined,
      });
    }
  }

  const tournaments = await Promise.all(
    [...candidates.values()].map(async (candidate): Promise<ScrapedTournament> => {
      let registrationStart = '';
      let registrationEnd = '';
      let venue = candidate.venue;
      let posterImage = candidate.posterImage;

      try {
        const detailHtml = await fetchHtml(candidate.detailUrl);
        const registration = parseKoreanDateRange(extractTableValue(detailHtml, '접수기간'));
        if (registration) {
          registrationStart = registration.start;
          registrationEnd = registration.end;
        }

        const region = extractTableValue(detailHtml, '대회지역').replaceAll('-', ' ');
        const detailVenue = extractTableValue(detailHtml, '대회장소');
        if (detailVenue) venue = `${region} ${detailVenue}`.trim();

        const posterMatch = detailHtml.match(/<img[^>]+src=["']([^"']*\/data\/game\/poster_[^"']+)["'][^>]*>/i);
        if (posterMatch) posterImage = toAbsoluteUrl(baseUrl, posterMatch[1]);
      } catch (error) {
        console.warn(`   ⚠️ 페이스콕 상세 정보 일부를 읽지 못했습니다: ${candidate.detailUrl}`, error);
      }

      return {
        id: `fc-${candidate.id}`,
        category: categorizeTournament(candidate.name, venue),
        name: candidate.name,
        registrationPeriod: registrationStart ? displayPeriod(registrationStart, registrationEnd) : '공식 상세 페이지 확인',
        registrationStart,
        registrationEnd,
        eventPeriod: displayPeriod(candidate.eventStart, candidate.eventEnd),
        eventStart: candidate.eventStart,
        eventEnd: candidate.eventEnd,
        venue,
        source: '페이스콕',
        officialLink: candidate.detailUrl,
        posterImage,
        fee: '요강 참조',
      };
    })
  );

  console.log(`   ✅ 페이스콕 상세 페이지 검증: ${tournaments.length}건`);
  return tournaments;
}

async function scrapeBadmintok(): Promise<ScrapedTournament[]> {
  const listUrl = 'https://badmintok.com/badminton-tournament/';
  const html = await fetchHtml(listUrl);
  const scripts = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  const items: unknown[] = [];

  for (const script of scripts) {
    try {
      const value = JSON.parse(script[1]) as { itemListElement?: unknown[] };
      if (Array.isArray(value.itemListElement)) items.push(...value.itemListElement);
    } catch {
      // 다른 용도의 손상된 JSON-LD는 건너뜁니다.
    }
  }

  const tournaments: ScrapedTournament[] = [];
  for (const rawEntry of items) {
    const entry = rawEntry as { item?: Record<string, unknown> };
    const item = entry.item;
    if (!item || typeof item.name !== 'string' || typeof item.startDate !== 'string' || typeof item.url !== 'string') continue;

    const eventStart = item.startDate.slice(0, 10);
    const eventEnd = typeof item.endDate === 'string' ? item.endDate.slice(0, 10) : eventStart;
    if (!/^20\d{2}-\d{2}-\d{2}$/.test(eventStart) || !/^20\d{2}-\d{2}-\d{2}$/.test(eventEnd)) continue;

    const location = item.location as { name?: string; address?: { addressRegion?: string } } | undefined;
    const venue = [location?.address?.addressRegion, location?.name].filter(Boolean).join(' ').trim() || '장소는 공식 페이지 참조';
    const image = item.image as string | { url?: string } | undefined;

    tournaments.push({
      id: `bm-${stableHash(item.url)}`,
      category: categorizeTournament(item.name, venue),
      name: cleanText(item.name),
      registrationPeriod: '공식 상세 페이지 확인',
      registrationStart: '',
      registrationEnd: '',
      eventPeriod: displayPeriod(eventStart, eventEnd),
      eventStart,
      eventEnd,
      venue,
      source: '배드민톡',
      officialLink: item.url,
      posterImage: typeof image === 'string' ? image : image?.url,
      fee: '요강 참조',
    });
  }

  console.log(`   ✅ 배드민톡 JSON-LD 검증: ${tournaments.length}건`);
  return tournaments;
}

async function scrapeBadmintonTimes(): Promise<ScrapedTournament[]> {
  const origin = 'http://www.badmintontimes.com';
  const baseUrl = `${origin}/calendar/m3_calendarList.jsp?menunum=204`;
  const monthUrls = Array.from({ length: 12 }, (_, index) => `${baseUrl}&year=2026&month=${String(index + 1).padStart(2, '0')}`);
  const pages = await Promise.all(monthUrls.map((url) => fetchHtml(url)));
  const tournaments = new Map<string, ScrapedTournament>();

  for (const html of pages) {
    const itemRegex = /<span[^>]*>(국제|전국|국내|지역)<\/span>[\s\S]*?<a class="linkTitle14" href="([^"]+)">([^<]+)<\/a>\s*<br>[\s\S]*?<font color="#FF0000">\s*(20\d{2}-\d{2}-\d{2})(?:\s*~\s*(20\d{2}-\d{2}-\d{2}))?\s*<\/font>\s*<font color="#999999">([\s\S]*?)<\/font>/gi;
    let match: RegExpExecArray | null;

    while ((match = itemRegex.exec(html)) !== null) {
      const detailUrl = toAbsoluteUrl(origin, match[2]);
      const name = cleanText(match[3]);
      const eventStart = match[4];
      const eventEnd = match[5] || eventStart;
      const venue = cleanText(match[6]) || '장소는 공식 페이지 참조';
      const idMatch = detailUrl.match(/[?&]no=(\d+)/);
      const sourceId = idMatch?.[1] ?? stableHash(detailUrl);

      tournaments.set(detailUrl, {
        id: `bt-${sourceId}`,
        category: match[1] === '국제' ? '국제대회' : categorizeTournament(name, venue),
        name,
        registrationPeriod: '공식 상세 페이지 확인',
        registrationStart: '',
        registrationEnd: '',
        eventPeriod: displayPeriod(eventStart, eventEnd),
        eventStart,
        eventEnd,
        venue,
        source: '배드민턴타임즈',
        officialLink: detailUrl,
        fee: '요강 참조',
      });
    }
  }

  console.log(`   ✅ 배드민턴타임즈 상세 링크 검증: ${tournaments.size}건`);
  return [...tournaments.values()];
}

function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/20\d{2}년?/g, '')
    .replace(/제\s*\d+회/g, '')
    .replace(/배드민턴|전국|오픈|대회|생활체육/g, '')
    .replace(/[^0-9a-z가-힣]/g, '');
}

function mergeAndDeduplicate(all: ScrapedTournament[]): ScrapedTournament[] {
  const merged = new Map<string, ScrapedTournament>();

  for (const tournament of all) {
    if (!tournament.officialLink || !/\/|\?/.test(tournament.officialLink)) continue;
    const key = `${normalizeName(tournament.name)}|${tournament.eventStart}`;
    const existing = merged.get(key);

    if (!existing) {
      merged.set(key, {
        ...tournament,
        sources: [tournament.source],
        sourceLinks: [{ source: tournament.source, link: tournament.officialLink }],
      });
      continue;
    }

    if (!existing.sources?.includes(tournament.source)) existing.sources = [...(existing.sources ?? [existing.source]), tournament.source];
    if (!existing.sourceLinks?.some((link) => link.source === tournament.source)) {
      existing.sourceLinks = [...(existing.sourceLinks ?? []), { source: tournament.source, link: tournament.officialLink }];
    }
    if (!existing.registrationStart && tournament.registrationStart) {
      existing.registrationStart = tournament.registrationStart;
      existing.registrationEnd = tournament.registrationEnd;
      existing.registrationPeriod = tournament.registrationPeriod;
    }
    if (!existing.posterImage && tournament.posterImage) existing.posterImage = tournament.posterImage;
    if (tournament.venue.length > existing.venue.length) existing.venue = tournament.venue;
  }

  return [...merged.values()].sort((a, b) => a.eventStart.localeCompare(b.eventStart) || a.name.localeCompare(b.name, 'ko'));
}

async function safelyCollect(name: string, collector: () => Promise<ScrapedTournament[]>): Promise<ScrapedTournament[]> {
  try {
    return await collector();
  } catch (error) {
    console.error(`   ❌ ${name} 수집 실패. 추정 데이터로 대체하지 않습니다.`, error);
    return [];
  }
}

async function main(): Promise<void> {
  console.log('🏸 검증 가능한 원문 기반 대회 수집을 시작합니다.');
  console.log('   합성 대회, 임의 날짜/참가비, 목록 주소만 있는 레코드는 생성하지 않습니다.');

  const [facecock, badmintok, badmintonTimes] = await Promise.all([
    safelyCollect('페이스콕', scrapeFacecock),
    safelyCollect('배드민톡', scrapeBadmintok),
    safelyCollect('배드민턴타임즈', scrapeBadmintonTimes),
  ]);

  const tournaments = mergeAndDeduplicate([...facecock, ...badmintok, ...badmintonTimes]);
  if (tournaments.length === 0) throw new Error('검증 가능한 대회를 한 건도 수집하지 못해 기존 파일을 보존합니다.');

  const outputPath = path.resolve(process.cwd(), 'lib/tournaments-scraped.json');
  fs.writeFileSync(outputPath, `${JSON.stringify(tournaments, null, 2)}\n`, 'utf-8');

  console.log(`✅ ${tournaments.length}건 저장 완료: ${outputPath}`);
  console.log(`   페이스콕 ${facecock.length} / 배드민톡 ${badmintok.length} / 배드민턴타임즈 ${badmintonTimes.length}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
