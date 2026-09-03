import scrapedTournaments from './tournaments-scraped.json';

export type TournamentCategory = '전국오픈' | '지역구대회' | '학생선수권' | '브랜드대회' | '국제대회';

export type TournamentSource = 
  | '배드민톡' 
  | '배드민턴타임즈'
  | '페이스콕' 
  | '코트엑스' 
  | '스포넷' 
  | '위꾹'
  | '대한배드민턴협회'
  | '배드민턴게임'
  | '오마이플레이'
  | 'BKPLAY' 
  | '네이버밴드'
  | 'BWF';

export interface Tournament {
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
  bandName?: string;
  bandUrl?: string;
  posterImage?: string;
  fee: string;
}

// 개별 상세 원문 링크와 실제 개최일을 확인할 수 있는 레코드만 노출합니다.
export const mockTournaments: Tournament[] = (scrapedTournaments as unknown as Tournament[]) || [];
export const defaultMockTournaments: Tournament[] = mockTournaments;
