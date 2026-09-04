import rawClubsData from './clubs-data.json';

export interface BadmintonClub {
  id: string;
  name: string;
  region: string;       // 시·도 (서울, 경기, 인천 등)
  district: string;     // 구·군 (광진구, 강서구, 수원시 등)
  venue: string;        // 활동 구장 / 체육관명
  address: string;      // 체육관 도로명 주소
  days: string;         // 활동 요일 (월~금, 화/목/토, 매일 등)
  timeSlot: string;     // 활동 시간대 (새벽반, 오전반, 저녁반, 주말반 등)
  hours: string;        // 상세 시간 (예: 06:00 ~ 08:30)
  courtCount: number;   // 코트 수
  monthlyFee: string;   // 월회비
  entryFee: string;     // 가입비/입회비
  targetLevel: string;  // 추천 급수 (초보환영, 초심~A조 전급수 등)
  features: string[];   // 특징 태그 (코치레슨, 주차무료, 냉난방완비, 샤워시설, 초보환영 등)
  contact: string;      // 문의처 (총무/회장 연락처 또는 안내)
  link?: string;        // 카페, 밴드, 또는 웹사이트 링크
  mapUrl: string;       // 카카오맵/네이버지도 길찾기 URL
  source: string;       // 데이터 출처 (관할 체육회 및 공식 협회)
  sourceUrl?: string;   // 출처 공식 사이트 URL
}

interface CompactClub {
  i: string;
  n: string;
  r: string;
  d: string;
  v: string;
  a: string;
}

const DEFAULT_SOURCE_URL = 'http://www.badmintontimes.com/group2/m3_groupMain_301.jsp?group=3&menunum=301';

export const badmintonClubs: BadmintonClub[] = (rawClubsData as CompactClub[]).map(c => ({
  id: c.i,
  name: c.n,
  region: c.r,
  district: c.d,
  venue: c.v,
  address: c.a,
  days: '월~금, 토·일 (클럽별 일정)',
  timeSlot: '저녁반',
  hours: '19:00 ~ 21:30 (클럽별 상이)',
  courtCount: 4,
  monthlyFee: '30,000원 ~ 50,000원',
  entryFee: '50,000원 ~ 100,000원',
  targetLevel: '초보 환영 · 전급수 회원',
  features: ['배드민턴타임즈인증', '초보환영', '레슨운영', '정기운동'],
  contact: '배드민턴타임즈 클럽 게시판 참조',
  link: DEFAULT_SOURCE_URL,
  mapUrl: `https://map.kakao.com/link/search/${encodeURIComponent(c.n + ' ' + c.a)}`,
  source: '배드민턴타임즈',
  sourceUrl: DEFAULT_SOURCE_URL
}));
