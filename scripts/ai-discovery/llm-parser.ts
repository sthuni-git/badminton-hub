/**
 * AI 대회 요강 추출기 (Gemini API 및 고신뢰 정밀 파서)
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
 * 정밀 텍스트 파서 (API 키 없을 때 동작하는 무비용 고신뢰 파서)
 */
export function extractTournamentHeuristic(text: string, title: string, url: string): ParsedTournament | null {
  if (!/배드민턴/.test(text) && !/배드민턴/.test(title)) return null;
  if (!/대회|페스티벌|오픈|챔피언십|선수권|리그/.test(title) && !/대회|페스티벌|오픈|챔피언십|선수권/.test(text)) return null;

  // 제목 정제 (블로그 및 카페 특유의 수식어 정리)
  let cleanName = title
    .replace(/\[[^\]]+\]/g, ' ')
    .replace(/【[^】]+】/g, ' ')
    .replace(/:\s*네이버\s*(블로그|카페).*/i, '')
    .replace(/일정[·\s]*접수[·\s]*참가비[·\s]*상품\s*총정리.*/, '')
    .replace(/요강\s*(정리|안내|안내문|공지).*/, '')
    .replace(/[\(\[].*?(접수중|마감|안내|요강).*?[\)\]]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (cleanName.length < 5) return null;

  // 날짜 추출
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
  if (/구청장기|협회장기|구대회|시대회|연합회장기/.test(cleanName)) {
    category = '지역구대회';
  } else if (/요넥스|빅터|미즈노|플라이파워|익스트림|테크니스트|스펙트럼/.test(cleanName)) {
    category = '브랜드대회';
  } else if (/학생|청소년|유소년|대학/.test(cleanName)) {
    category = '학생선수권';
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
    confidence: 0.85
  };
}

/**
 * Gemini API를 통한 고난도 비정형 텍스트 구조화 (API Key 존재 시 활성화)
 */
export async function parseWithGemini(text: string, title: string, url: string, apiKey: string): Promise<ParsedTournament | null> {
  const prompt = `
당신은 대한민국 배드민턴 대회 공고 분석 전문가입니다.
아래 제공된 웹문서/카페/블로그 글에서 배드민턴 대회 요강을 분석하여 JSON으로만 응답하세요.
대회 공고가 아니거나(단순 후기, 용품 판매, 라켓 리뷰 등), 날짜가 없으면 isTournament를 false로 응답하세요.

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
  "registrationStart": "YYYY-MM-DD" or "",
  "registrationEnd": "YYYY-MM-DD" or "",
  "venue": "개최 장소 (체육관 이름)",
  "fee": "참가비 (예: 팀당 50,000원 또는 요강 참조)"
}
`;

  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: 'application/json' }
      })
    });

    if (!res.ok) {
      console.warn(`Gemini API error: ${res.status}`);
      return extractTournamentHeuristic(text, title, url);
    }

    const data = await res.json();
    const rawJson = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawJson) return extractTournamentHeuristic(text, title, url);

    const parsed = JSON.parse(rawJson);
    if (!parsed.isTournament || !parsed.name || !parsed.eventStart) return null;

    return {
      ...parsed,
      eventPeriod: parsed.eventStart === parsed.eventEnd ? parsed.eventStart.replace(/-/g, '.') : `${parsed.eventStart.replace(/-/g, '.')} ~ ${parsed.eventEnd.replace(/-/g, '.')}`,
      registrationPeriod: (parsed.registrationStart && parsed.registrationEnd) ? `${parsed.registrationStart.replace(/-/g, '.')} ~ ${parsed.registrationEnd.replace(/-/g, '.')}` : '원문 요강 참조',
      confidence: 0.98
    };
  } catch (err) {
    console.warn('Gemini parse failed, falling back to heuristic:', err);
    return extractTournamentHeuristic(text, title, url);
  }
}
