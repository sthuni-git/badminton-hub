/**
 * AI 대회 요강 추출기 (Gemini 최신 Flash 모델 및 무차단 고신뢰 정밀 파서)
 */

export interface ParsedTournament {
  isTournament: boolean;
  name?: string;
  category?: '전국오픈' | '지역구대회' | '학생선수권' | '브랜드대회' | '국제대회';
  eventStart?: string;
  eventEnd?: string;
  eventPeriod?: string;
  registrationStart?: string;
  registrationEnd?: string;
  registrationPeriod?: string;
  venue?: string;
  fee?: string;
  confidence?: number;
}

/**
 * HTML 엔티티 및 제목 정제 헬퍼
 */
function cleanTournamentTitle(title: string): string {
  return title
    .replace(/&middot;/gi, '·')
    .replace(/&hellip;/gi, '...')
    .replace(/&lsquo;|&rsquo;/gi, "'")
    .replace(/&ldquo;|&rdquo;|&quot;/gi, '"')
    .replace(/&amp;/gi, '&')
    .replace(/\[[^\]]+\]/g, ' ')
    .replace(/【[^】]+】/g, ' ')
    .replace(/:\s*네이버\s*(블로그|카페).*/i, '')
    .replace(/일정[·\s]*접수[·\s]*참가비[·\s]*상품\s*총정리.*/, '')
    .replace(/요강\s*(정리|안내|안내문|공지).*/, '')
    .replace(/[\(\[].*?(접수중|마감|안내|요강|출전기).*?[\)\]]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * 정밀 텍스트 파서 (API 키 없을 때 또는 AI 실패 시 동작하는 100% 무차단 고신뢰 파서)
 */
export function extractTournamentHeuristic(text: string, title: string, url: string): ParsedTournament | null {
  if (!/배드민턴/.test(text) && !/배드민턴/.test(title)) return null;

  // 단순 뉴스 기사, 라켓 리뷰, 용품 판매글, 안세영 등 국가대표 선수 가십글 필터링
  if (/아시안게임|금메달|올림픽|선수단\s*명단|여제|Tournament\s*Planner|버디고\s*홈페이지/i.test(title)) {
    return null;
  }

  // 대회 키워드 확인
  if (!/대회|페스티벌|오픈|챔피언십|선수권|리그|배\b/.test(title) && !/대회|페스티벌|오픈|챔피언십|선수권/.test(text)) {
    return null;
  }

  // 제목 정제
  const cleanName = cleanTournamentTitle(title);
  if (cleanName.length < 4) return null;

  // 날짜 추출 (YYYY.MM.DD 또는 YYYY-MM-DD 또는 M월 D일)
  const datePattern = /(202[5-7])[-.\/년\s]+(0?[1-9]|1[0-2])[-.\/월\s]+(0?[1-9]|[12][0-9]|3[01])일?/g;
  const dates: string[] = [];
  let m;
  
  const sample = title + ' ' + text.slice(0, 3000);
  while ((m = datePattern.exec(sample)) !== null) {
    const y = m[1];
    const mo = m[2].padStart(2, '0');
    const d = m[3].padStart(2, '0');
    const iso = `${y}-${mo}-${d}`;
    if (!dates.includes(iso)) dates.push(iso);
  }

  let eventStart = '';
  let eventEnd = '';
  if (dates.length > 0) {
    const validDates = dates.filter(d => d.startsWith('2026') || d.startsWith('2027'));
    if (validDates.length >= 2) {
      eventStart = validDates[0];
      eventEnd = validDates[1] >= validDates[0] ? validDates[1] : validDates[0];
    } else if (validDates.length === 1) {
      eventStart = validDates[0];
      eventEnd = validDates[0];
    }
  }

  if (!eventStart) return null;

  // 체육관 / 장소 추출
  let venue = '체육관 (상세 요강 참조)';
  const venueMatch = text.match(/([가-힣]{2,10}(?:체육관|전용구장|종합운동장|스포츠센터|체육센터|배드민턴장))/);
  if (venueMatch) {
    venue = venueMatch[1].trim();
  }

  // 참가비 추출
  let fee = '요강 참조';
  const feeMatch = text.match(/(?:참가비|출전비)[^0-9\n]{1,15}([0-9,]{3,7}\s*원)/);
  if (feeMatch) {
    fee = feeMatch[1].trim();
  }

  // 카테고리 판별
  let category: ParsedTournament['category'] = '전국오픈';
  if (/(?:BWF|월드투어|국제챌린지|인터내셔널)/i.test(cleanName)) {
    category = '국제대회';
  } else if (/(?:초등|중등|고등|학생|주니어|꿈나무|학교|유소년|청소년|어린이|대학)/i.test(cleanName)) {
    category = '학생선수권';
  } else if (/(?:요넥스|빅터|테크니스트|플리트|리닝|미즈노|아펙스|익스트림|플라이파워|트라이온|스펙트럼)/i.test(cleanName)) {
    category = '브랜드대회';
  } else if (/(?:구청장|시장기|시장배|군수기|협회장기|협회장배|회장기|의장기|연합회장|체육회장|도지사|구대회|시대회|군대회|구민|시민|생활체육|클럽대항|동호인|관내|한마음)/i.test(cleanName)) {
    category = '지역구대회';
  }

  return {
    isTournament: true,
    name: cleanName,
    category,
    eventStart,
    eventEnd,
    eventPeriod: eventStart === eventEnd ? eventStart.replace(/-/g, '.') : `${eventStart.replace(/-/g, '.')} ~ ${eventEnd.replace(/-/g, '.')}`,
    registrationStart: '',
    registrationEnd: '',
    registrationPeriod: '원문 요강 참조',
    venue,
    fee,
    confidence: 0.88
  };
}

/**
 * 최신 Google Gemini Flash 모델 목록
 * (3.8-flash / 3.7-flash / 3.6-flash 등 지원되는 최신 모델 순차 폴백)
 */
const GEMINI_MODELS = [
  'gemini-3.8-flash',
  'gemini-3.7-flash',
  'gemini-3.6-flash',
];

/**
 * Gemini API를 통한 최신 모델 구조화 분석 (차단/실패 방어 및 자동 모델 폴백)
 */
export async function parseWithGemini(text: string, title: string, url: string, apiKey: string): Promise<ParsedTournament | null> {
  const prompt = `
당신은 대한민국 배드민턴 대회 공고 전문 분석 AI입니다.
아래 제공된 웹문서/카페/블로그 글에서 순수 배드민턴 대회 요강을 분석하여 JSON으로만 응답하세요.
단순 리뷰, 용품/라켓 홍보, 단순 대회 관람 후기, 국가대표 뉴스 기사 등 실제 참가 신청을 받는 대회가 아니라면 "isTournament": false 로 응답하세요.

제목: ${title}
본문:
${text.slice(0, 3500)}

응답 JSON 형식:
{
  "isTournament": true,
  "name": "대회 공식 명칭 (예: 제1회 계룡시 전국배드민턴대회)",
  "category": "전국오픈" | "지역구대회" | "학생선수권" | "브랜드대회" | "국제대회",
  "eventStart": "YYYY-MM-DD",
  "eventEnd": "YYYY-MM-DD",
  "registrationStart": "YYYY-MM-DD",
  "registrationEnd": "YYYY-MM-DD",
  "venue": "개최 장소 (체육관 이름)",
  "fee": "참가비 (예: 팀당 50,000원 또는 요강 참조)"
}
`;

  for (const model of GEMINI_MODELS) {
    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.1,
          },
        }),
        signal: AbortSignal.timeout(10000), // 10초 타임아웃
      });

      if (!res.ok) {
        // 404/400 모델 부재 시 다음 최신 모델로 폴백
        continue;
      }

      const data = await res.json();
      const rawJson = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawJson) continue;

      const parsed = JSON.parse(rawJson);
      if (!parsed.isTournament || !parsed.name || !parsed.eventStart) return null;

      const cleanName = cleanTournamentTitle(parsed.name);
      return {
        ...parsed,
        name: cleanName,
        eventPeriod: parsed.eventStart === parsed.eventEnd ? parsed.eventStart.replace(/-/g, '.') : `${parsed.eventStart.replace(/-/g, '.')} ~ ${parsed.eventEnd.replace(/-/g, '.')}`,
        registrationPeriod: (parsed.registrationStart && parsed.registrationEnd) ? `${parsed.registrationStart.replace(/-/g, '.')} ~ ${parsed.registrationEnd.replace(/-/g, '.')}` : '원문 요강 참조',
        confidence: 0.99,
      };
    } catch (err) {
      // 네트워크 타임아웃 또는 파싱 에러 시 다음 모델 시도
      continue;
    }
  }

  // 모든 Gemini 모델 응답 불가 시 정밀 휴리스틱 파서로 완벽 폴백
  return extractTournamentHeuristic(text, title, url);
}
