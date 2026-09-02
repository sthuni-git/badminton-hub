import scrapedTournaments from './tournaments-scraped.json';

export type TournamentCategory = '전국오픈' | '지역구대회' | '학생선수권' | '브랜드대회' | '국제대회';

export type TournamentSource = 
  | '스포넷' 
  | '위꾹' 
  | '오마이플레이' 
  | '코트엑스' 
  | '페이스콕' 
  | 'BKPLAY' 
  | '리부트아카데미' 
  | '배드민톡' 
  | '배프' 
  | '딱플'
  | '대한체육회'
  | '배드민턴타임즈'
  | 'BWF'
  | '배드민턴게임'
  | '네이버밴드';

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
  posterImage?: string;
  fee: string;
}

export const defaultMockTournaments: Tournament[] = [
  // 1. 현재/진행중/마감임박 대회 (2026년 9월)
  { id:'t01', category:'전국오픈', name:'제12회 수원 화성배 전국배드민턴대회', registrationPeriod:'2026.08.10 ~ 2026.09.04', registrationStart:'2026-08-10', registrationEnd:'2026-09-04', eventPeriod:'2026.09.12 ~ 09.13', eventStart:'2026-09-12', eventEnd:'2026-09-13', venue:'경기 수원시 수원시배드민턴전용경기장', source:'스포넷', officialLink:'https://www.sponet.co.kr', fee:'팀당 50,000원' },
  { id:'t02', category:'브랜드대회', name:'2026 요넥스 슈퍼 매치 서울', registrationPeriod:'2026.08.18 ~ 2026.09.08', registrationStart:'2026-08-18', registrationEnd:'2026-09-08', eventPeriod:'2026.09.19 ~ 09.20', eventStart:'2026-09-19', eventEnd:'2026-09-20', venue:'서울 송파구 잠실실내체육관', source:'위꾹', officialLink:'https://www.wecook.co.kr', fee:'팀당 60,000원' },
  { id:'t03', category:'지역구대회', name:'제21회 부산진구청장배 배드민턴대회', registrationPeriod:'2026.08.20 ~ 2026.09.02', registrationStart:'2026-08-20', registrationEnd:'2026-09-02', eventPeriod:'2026.09.06', eventStart:'2026-09-06', eventEnd:'2026-09-06', venue:'부산 부산진구 강서체육공원 실내체육관', source:'오마이플레이', officialLink:'https://www.ohmyplay.com', fee:'팀당 40,000원' },
  { id:'t04', category:'전국오픈', name:'청주 직지배 전국 동호인 배드민턴대회', registrationPeriod:'2026.08.24 ~ 2026.09.15', registrationStart:'2026-08-24', registrationEnd:'2026-09-15', eventPeriod:'2026.09.26 ~ 09.27', eventStart:'2026-09-26', eventEnd:'2026-09-27', venue:'충북 청주시 청주배드민턴체육관', source:'코트엑스', officialLink:'https://www.courtx.co.kr/Tournament/List', fee:'팀당 50,000원' },
  { id:'t05', category:'학생선수권', name:'전국 학교스포츠클럽 배드민턴 축전', registrationPeriod:'2026.09.07 ~ 2026.09.25', registrationStart:'2026-09-07', registrationEnd:'2026-09-25', eventPeriod:'2026.10.17 ~ 10.18', eventStart:'2026-10-17', eventEnd:'2026-10-18', venue:'전북 전주시 화산체육관', source:'BKPLAY', officialLink:'https://sfa.bkplay.kr/tournament/all/list.do', fee:'무료' },
  { id:'t06', category:'브랜드대회', name:'빅터 코리아 오픈 머니컵', registrationPeriod:'2026.08.12 ~ 2026.09.06', registrationStart:'2026-08-12', registrationEnd:'2026-09-06', eventPeriod:'2026.09.19', eventStart:'2026-09-19', eventEnd:'2026-09-19', venue:'인천 남동구 남동체육관', source:'페이스콕', officialLink:'https://facecock.co.kr/page/?pid=game', fee:'팀당 70,000원' },
  { id:'t07', category:'지역구대회', name:'춘천시 협회장기 생활체육대회', registrationPeriod:'2026.08.17 ~ 2026.09.01', registrationStart:'2026-08-17', registrationEnd:'2026-09-01', eventPeriod:'2026.09.05 ~ 09.06', eventStart:'2026-09-05', eventEnd:'2026-09-06', venue:'강원 춘천시 봄내체육관', source:'스포넷', officialLink:'https://www.sponet.co.kr', fee:'팀당 40,000원' },
  { id:'t08', category:'전국오픈', name:'제8회 여수 거북선배 전국배드민턴대회', registrationPeriod:'2026.08.31 ~ 2026.09.18', registrationStart:'2026-08-31', registrationEnd:'2026-09-18', eventPeriod:'2026.10.03 ~ 10.04', eventStart:'2026-10-03', eventEnd:'2026-10-04', venue:'전남 여수시 진남체육관', source:'오마이플레이', officialLink:'https://www.ohmyplay.com', fee:'팀당 50,000원' },
  { id:'t09', category:'지역구대회', name:'대전 유성구 생활체육 한마당', registrationPeriod:'2026.09.10 ~ 2026.09.30', registrationStart:'2026-09-10', registrationEnd:'2026-09-30', eventPeriod:'2026.10.11', eventStart:'2026-10-11', eventEnd:'2026-10-11', venue:'대전 유성구 한밭대학교 체육관', source:'위꾹', officialLink:'https://www.wecook.co.kr', fee:'팀당 35,000원' },
  { id:'t10', category:'브랜드대회', name:'테크니스트 전국 배드민턴 페스티벌', registrationPeriod:'2026.08.22 ~ 2026.09.12', registrationStart:'2026-08-22', registrationEnd:'2026-09-12', eventPeriod:'2026.09.26 ~ 09.27', eventStart:'2026-09-26', eventEnd:'2026-09-27', venue:'경북 구미시 박정희체육관', source:'페이스콕', officialLink:'https://facecock.co.kr/page/?pid=game', fee:'팀당 60,000원' },
  { id:'t11', category:'국제대회', name:'2026 코리아 마스터즈 배드민턴 선수권 (BWF Super 300)', registrationPeriod:'2026.07.01 ~ 2026.08.20', registrationStart:'2026-07-01', registrationEnd:'2026-08-20', eventPeriod:'2026.09.08 ~ 09.13', eventStart:'2026-09-08', eventEnd:'2026-09-13', venue:'광주 광산구 광주여대 유니버시아드체육관', source:'BWF', officialLink:'https://bwfworldtour.bwfbadminton.com/calendar/', fee:'관람권 별도' },
  { id:'t12', category:'지역구대회', name:'제18회 제주특별자치도 도민대회', registrationPeriod:'2026.08.15 ~ 2026.09.09', registrationStart:'2026-08-15', registrationEnd:'2026-09-09', eventPeriod:'2026.09.19 ~ 09.20', eventStart:'2026-09-19', eventEnd:'2026-09-20', venue:'제주 제주시 한라체육관', source:'코트엑스', officialLink:'https://www.courtx.co.kr/Tournament/List', fee:'팀당 45,000원' },
  { id:'t13', category:'전국오픈', name:'평택 슈퍼오닝배 전국배드민턴대회', registrationPeriod:'2026.09.01 ~ 2026.09.22', registrationStart:'2026-09-01', registrationEnd:'2026-09-22', eventPeriod:'2026.10.10 ~ 10.11', eventStart:'2026-10-10', eventEnd:'2026-10-11', venue:'경기 평택시 이충문화체육센터', source:'스포넷', officialLink:'https://www.sponet.co.kr', fee:'팀당 50,000원' },
  { id:'t14', category:'학생선수권', name:'경남 교육감배 학생 배드민턴대회', registrationPeriod:'2026.09.14 ~ 2026.10.02', registrationStart:'2026-09-14', registrationEnd:'2026-10-02', eventPeriod:'2026.10.24', eventStart:'2026-10-24', eventEnd:'2026-10-24', venue:'경남 창원시 마산실내체육관', source:'BKPLAY', officialLink:'https://sfa.bkplay.kr/tournament/all/list.do', fee:'무료' },
  { id:'t15', category:'브랜드대회', name:'플리트 챔피언십 파이널', registrationPeriod:'2026.08.05 ~ 2026.08.28', registrationStart:'2026-08-05', registrationEnd:'2026-08-28', eventPeriod:'2026.09.05', eventStart:'2026-09-05', eventEnd:'2026-09-05', venue:'서울 강서구 마곡실내배드민턴장', source:'배프', officialLink:'https://www.badmintonfriends.co.kr/', fee:'팀당 65,000원' },
  { id:'t16', category:'전국오픈', name:'2026 리부트 전국 오픈 챔피언십', registrationPeriod:'2026.08.25 ~ 2026.09.14', registrationStart:'2026-08-25', registrationEnd:'2026-09-14', eventPeriod:'2026.09.27', eventStart:'2026-09-27', eventEnd:'2026-09-27', venue:'경기 고양시 고양어울림누리체육관', source:'리부트아카데미', officialLink:'https://reboot-badminton.com/tournaments.html', fee:'팀당 50,000원' },
  { id:'t17', category:'전국오픈', name:'배드민톡 선정 9월 가을맞이 전국대회', registrationPeriod:'2026.08.20 ~ 2026.09.10', registrationStart:'2026-08-20', registrationEnd:'2026-09-10', eventPeriod:'2026.09.20', eventStart:'2026-09-20', eventEnd:'2026-09-20', venue:'충남 천안시 유관순체육관', source:'배드민톡', officialLink:'https://badmintok.com/badminton-tournament/', fee:'팀당 50,000원' },
  { id:'t18', category:'학생선수권', name:'제107회 전국체육대회 배드민턴 선발전', registrationPeriod:'2026.09.01 ~ 2026.09.15', registrationStart:'2026-09-01', registrationEnd:'2026-09-15', eventPeriod:'2026.10.08 ~ 10.12', eventStart:'2026-10-08', eventEnd:'2026-10-12', venue:'부산 해운대구 벡스코 오디토리움', source:'대한체육회', officialLink:'https://g1.sports.or.kr/schedule/month.do', fee:'무료' },
  { id:'t19', category:'전국오픈', name:'전국 배드민턴 동호인 밴드 친선 교류전', registrationPeriod:'2026.08.28 ~ 2026.09.11', registrationStart:'2026-08-28', registrationEnd:'2026-09-11', eventPeriod:'2026.09.20', eventStart:'2026-09-20', eventEnd:'2026-09-20', venue:'대구 북구 대구실내체육관', source:'네이버밴드', officialLink:'https://band.us/@mintoncontest', fee:'팀당 40,000원' },

  // 2. 이미 종료된 과거 대회 샘플 (2026년 상반기)
  { id:'past01', category:'전국오픈', name:'2026 새해맞이 서울 오픈 배드민턴대회', registrationPeriod:'2025.12.15 ~ 2026.01.05', registrationStart:'2025-12-15', registrationEnd:'2026-01-05', eventPeriod:'2026.01.17 ~ 01.18', eventStart:'2026-01-17', eventEnd:'2026-01-18', venue:'서울 송파구 잠실실내체육관', source:'스포넷', officialLink:'https://www.sponet.co.kr', fee:'팀당 50,000원' },
  { id:'past02', category:'브랜드대회', name:'2026 요넥스 춘계 마스터즈 챔피언십', registrationPeriod:'2026.02.01 ~ 2026.02.20', registrationStart:'2026-02-01', registrationEnd:'2026-02-20', eventPeriod:'2026.03.07 ~ 03.08', eventStart:'2026-03-07', eventEnd:'2026-03-08', venue:'경기 수원시 수원시배드민턴전용경기장', source:'위꾹', officialLink:'https://www.wecook.co.kr', fee:'팀당 60,000원' },
  { id:'past03', category:'국제대회', name:'2026 코리아오픈 배드민턴선수권대회 (BWF Super 500)', registrationPeriod:'2026.03.01 ~ 2026.04.10', registrationStart:'2026-03-01', registrationEnd:'2026-04-10', eventPeriod:'2026.05.12 ~ 05.17', eventStart:'2026-05-12', eventEnd:'2026-05-17', venue:'전남 여수시 진남체육관', source:'BWF', officialLink:'https://bwfworldtour.bwfbadminton.com/calendar/', fee:'관람권 별도' },
  { id:'past04', category:'지역구대회', name:'제15회 대전시장기 생활체육 배드민턴대회', registrationPeriod:'2026.05.20 ~ 2026.06.10', registrationStart:'2026-05-20', registrationEnd:'2026-06-10', eventPeriod:'2026.06.20 ~ 06.21', eventStart:'2026-06-20', eventEnd:'2026-06-21', venue:'대전 유성구 한밭대학교 체육관', source:'코트엑스', officialLink:'https://www.courtx.co.kr/Tournament/List', fee:'팀당 40,000원' },
];

// 스크랩된 전수 데이터와 기본 데이터를 병합 (중복 방지)
export const mockTournaments: Tournament[] = (() => {
  const list: Tournament[] = [...defaultMockTournaments];
  const existingNames = new Set(defaultMockTournaments.map(t => t.name));

  if (Array.isArray(scrapedTournaments)) {
    for (const item of (scrapedTournaments as Tournament[])) {
      if (!existingNames.has(item.name)) {
        list.push(item);
        existingNames.add(item.name);
      }
    }
  }

  return list;
})();
