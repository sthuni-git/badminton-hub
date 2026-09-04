import rawClubsData from './clubs-data.json';

export interface BadmintonClub {
  id: string;
  name: string;
  region: string;           // 시·도 (서울, 경기, 충남 등)
  district: string;         // 구·군 (마포구, 아산시 등)
  location: string;         // 클럽위치 (혹은 운동장소)
  venue: string;            // 체육관/학교명
  address: string;          // 주소
  venueType: string;        // 구장형태 (실내체육관, 전용구장 등)
  courtCount: string;       // 코트수 (예: 4 코트)
  memberCount: string;      // 회원수 (예: 60 명)
  feeInfo: string;          // 회비안내 (가입비, 월회비 등)
  hours: string;            // 운동시간 (19:00 ~ 21:00 까지)
  contact: string;          // 문의전화
  link?: string;            // 관련링크 (블로그, 카페, 밴드)
  description?: string;     // 기타사항 (운동장소/시간 상세 등)
  registeredDate?: string;  // 등록일자 (2026-09-03)
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
  const venue = parts.length > 2 ? parts.slice(2).join(' ') : (c.loc || `${c.n} 체육관`);
  const fullAddress = c.loc || `${c.r} ${c.d}`;

  return {
    id: c.i,
    name: c.n,
    region: c.r,
    district: c.d,
    location: c.loc || fullAddress,
    venue,
    address: fullAddress,
    venueType: c.vt || '실내체육관',
    courtCount: c.c || '4 코트',
    memberCount: c.m || '회원 모집중',
    feeInfo: c.f || '클럽 방문 또는 게시판 문의',
    hours: c.h || '19:00 ~ 21:30 (클럽 일정)',
    contact: (c.p && c.p !== '-') ? c.p : '배드민턴타임즈 게시판 문의',
    link: c.l || undefined,
    description: c.desc || undefined,
    registeredDate: c.dt || undefined,
    mapUrl: `https://map.kakao.com/link/search/${encodeURIComponent(c.n + ' ' + fullAddress)}`,
    source: '배드민턴타임즈',
    sourceUrl: DEFAULT_SOURCE_URL
  };
});
