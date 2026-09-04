import rawClubsData from './clubs-data.json';

export interface BadmintonClub {
  id: string;
  name: string;
  region: string;           // 시·도 (서울, 경기, 충남 등)
  district: string;         // 구·군 (마포구, 아산시 등)
  location: string;         // 클럽위치 (원문 주소: 서울 광진구 구의2동 광진초등학교 실내체육관)
  playVenue: string;        // 운동장소 (광진초등학교 체육관)
  venue: string;            // 기본 체육관명
  address: string;          // 주소
  venueType: string;        // 구장형태 (실내체육관, 전용구장 등)
  courtCount: string;       // 코트수 (예: 4 코트)
  memberCount: string;      // 회원수 (예: 50 명)
  feeInfo: string;          // 회비안내 (가입비:10만원, 월회비:4만원)
  hours: string;            // 기본 운동시간 (06:00 ~ 07:30 까지)
  playHours: string;        // 요일별 상세 운동시간 (화~목(06:00~07:30), 토,일(06:00~09:00), 월요일 휴무)
  contact: string;          // 문의전화
  link?: string;            // 관련링크 (블로그, 카페, 밴드)
  description?: string;     // 기타사항 원문
  registeredDate?: string;  // 등록일자 (2026-03-24)
  mapUrl: string;           // 카카오맵 길찾기 URL
  source: string;           // 데이터 출처
  sourceUrl: string;        // 출처 공식 사이트 URL
}

interface CompactClub {
  i: string;
  n: string;
  r: string;
  d: string;
  loc: string;
  h: string;
  vt: string;
  c: string;
  m: string;
  f: string;
  p: string;
  l: string;
  desc: string;
  dt: string;
}

const DEFAULT_SOURCE_URL = 'http://www.badmintontimes.com/group2/m3_groupMain_301.jsp?group=3&menunum=301';

export const badmintonClubs: BadmintonClub[] = (rawClubsData as CompactClub[]).map(c => {
  const parts = c.loc.split(/\s+/);
  const fallbackVenue = parts.length > 2 ? parts.slice(2).join(' ') : (c.loc || `${c.n} 체육관`);
  const fullAddress = c.loc || `${c.r} ${c.d}`;

  // 기타사항(desc)에서 상세 운동장소와 상세 운동시간 추출
  let playVenue = '';
  let playHours = '';

  if (c.desc) {
    const venueMatch = c.desc.match(/(?:\*|-)?\s*운동장소\s*[:：]\s*([^\*\-\n\r]+?)(?=(?:\*|-)?\s*운동시간|(?:\*|-)?\s*레슨|$)/i);
    if (venueMatch) {
      playVenue = venueMatch[1].trim();
    }
    const hoursMatch = c.desc.match(/(?:\*|-)?\s*운동시간\s*[:：]\s*([^\*\-\n\r]+?)(?=(?:\*|-)?\s*레슨|(?:\*|-)?\s*회원|(?:\*|-)?\s*가입|$)/i);
    if (hoursMatch) {
      playHours = hoursMatch[1].trim();
    }
  }

  // 매칭되지 않은 경우 fallback
  if (!playVenue) playVenue = fallbackVenue;
  if (!playHours) playHours = c.h || '19:00 ~ 21:30 (클럽 일정)';

  return {
    id: c.i,
    name: c.n,
    region: c.r,
    district: c.d,
    location: c.loc || fullAddress,
    playVenue,
    venue: fallbackVenue,
    address: fullAddress,
    venueType: c.vt || '실내체육관',
    courtCount: c.c || '4 코트',
    memberCount: c.m || '회원 모집중',
    feeInfo: c.f || '클럽 방문 또는 게시판 문의',
    hours: c.h || '19:00 ~ 21:30 (클럽 일정)',
    playHours,
    contact: (c.p && c.p !== '-') ? c.p : '배드민턴타임즈 게시판 문의',
    link: c.l || undefined,
    description: c.desc || undefined,
    registeredDate: c.dt || undefined,
    mapUrl: `https://map.kakao.com/link/search/${encodeURIComponent(c.n + ' ' + (playVenue || fullAddress))}`,
    source: '배드민턴타임즈',
    sourceUrl: DEFAULT_SOURCE_URL
  };
});
