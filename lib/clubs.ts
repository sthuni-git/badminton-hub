import clubsData from './clubs-data.json';

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

export const badmintonClubs: BadmintonClub[] = clubsData as BadmintonClub[];
