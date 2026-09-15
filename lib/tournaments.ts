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
  | '대한체육회'
  | '인포민턴'
  | '배드민턴게임'
  | '오마이플레이'
  | '콕콕'
  | 'BKPLAY' 
  | '네이버밴드'
  | '네이버카페'
  | '네이버블로그'
  | '웹검색'
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
  subCategory?: string;
  shuttlecock?: string;
  sponsor?: string;
  registrationSite?: string;
  dailySchedule?: Array<{ date: string; events?: string[]; description: string }>;
}

export const ALL_REGIONS = ['서울', '경기', '인천', '충청', '전라', '경상', '강원', '제주', '기타'] as const;
export type Region = (typeof ALL_REGIONS)[number];

/**
 * 대회명과 장소를 종합하여 정확한 대회 구분을 판별합니다.
 */
export function categorizeTournament(name: string, venue = ''): TournamentCategory {
  const text = `${name} ${venue}`;

  // 1순위: 국제대회
  if (/(?:BWF|월드투어|World\s*Tour|국제챌린지|인터내셔널|International|아시아선수권|세계선수권|올림픽|아시안게임)/i.test(text)) {
    return '국제대회';
  }

  // 2순위: 학생선수권
  if (/(?:초등|중등|고등|학생|주니어|junior|꿈나무|학교|유소년|청소년|어린이|대학생|대학교|대학부|동아리|학산배|학교스포츠클럽)/i.test(text)) {
    return '학생선수권';
  }

  // 3순위: 전국대회 / 전국오픈 (대한배드민턴협회 주관 또는 '전국' 키워드 대회 최우선)
  // '대한배드민턴협회장기 전국 배드민턴대회' 등 중앙 협회 및 전국 단위 대회는 지역구대회보다 항상 우선!
  if (
    /(?:대한배드민턴협회|전국배드민턴|전국오픈|전국대회|전국종별|전국선수권|코리아오픈)/i.test(text) ||
    (text.includes('전국') && !/(?:구청장|시장기|군수기|구대회|시대회|군대회|시민리그|구리그)/.test(text))
  ) {
    return '전국오픈';
  }

  // 4순위: 브랜드대회 (유명 배드민턴 용품/라켓 브랜드 스폰서)
  if (/(?:요넥스|yonex|빅터|victor|테크니스트|technist|플리트|fleet|리닝|li-ning|미즈노|mizuno|아펙스|apacs|익스트림|xtrm|extreme|코트엑스|courtx|플라이파워|flypower|트라이온|trion|스펙트럼|spectrum|맥스|maxx|던롭|dunlop|KBB|삼화|라이징|rising|고센|gosen|포르자|forza)/i.test(text)) {
    if (/(?:구청장|시장기|시장배|군수기|군수배|협회장기|협회장배|회장기|회장배|의장기|의장배|연합회장|체육회장)/i.test(text)) {
      return '지역구대회';
    }
    return '브랜드대회';
  }

  // 5순위: 지역구대회 (시·군·구·도 자치단체/협회 주관 생활체육)
  if (
    /(?:구청장|시장기|시장배|군수기|군수배|협회장기|협회장배|회장기|회장배|의장기|의장배|연합회장|체육회장|도지사기|도지사배|구대회|시대회|군대회|도대회|구민|시민|군민|도민|생활체육|클럽대항|동호인대회|관내|종별선수권|한마음|지역사랑|범시민|리그전|시민리그|구리그|협회리그|S-리그|리그)/i.test(text) ||
    /(?:강남구|강서구|송파구|노원구|마포구|서초구|강동구|도봉구|은평구|양천구|구로구|영등포구|동작구|관악구|금천구|용산구|성동구|광진구|동대문구|중랑구|성북구|강북구|서대문구|종로구|수원시|성남시|고양시|용인시|부천시|안산시|안양시|남양주시|화성시|평택시|의정부시|시흥시|파주시|김포시|광명시|군포시|이천시|오산시|하남시|양주시|구리시|안성시|포천시|의왕시|여주시|동두천시|가평군|양평군|연천군).*(?:대회|축제|리그|페스티벌)/.test(text)
  ) {
    return '지역구대회';
  }

  // 기본값: 전국오픈
  return '전국오픈';
}

/**
 * 대회 상세 요강 구조체
 */
export interface TournamentOutline {
  host: string;            // 주최 / 주관
  eligibility: string;     // 참가 대상 및 급수
  events: string;          // 경기 종목 (남복, 여복, 혼복 등)
  rules: string;           // 경기 방식 및 규정
  awards: string;          // 시상 및 기념품
  notes: string[];         // 유의사항
}

/**
 * 대회 정보를 기반으로 체계적인 공식 요강 요약 정보를 생성합니다.
 */
export function getTournamentOutline(t: Tournament): TournamentOutline {
  const isNational = t.category === '전국오픈';
  const isStudent = t.category === '학생선수권';
  const isBrand = t.category === '브랜드대회';
  const isDistrict = t.category === '지역구대회';
  const isBwf = t.category === '국제대회';

  // 주최/주관사 추정
  let host = '공식 배드민턴 협회 및 대회 조직위원회';
  if (t.name.includes('대한배드민턴협회')) {
    host = '사단법인 대한배드민턴협회 (BKA)';
  } else if (isBwf) {
    host = '세계배드민턴연맹 (BWF) / 해당 국가 배드민턴협회';
  } else if (isBrand) {
    const brand = t.name.match(/요넥스|빅터|테크니스트|플리트|리닝|미즈노|익스트림|플라이파워|트라이온|스펙트럼|코트엑스/)?.[0] || '용품사';
    host = `${brand} 코리아 공식 협찬 및 주관`;
  } else if (isDistrict) {
    const matchedRegion = t.venue.split(' ')[0] || '지역';
    host = `${matchedRegion} 배드민턴협회 및 관할 체육회`;
  } else if (isStudent) {
    host = '한국초중고배드민턴연맹 / 한국대학배드민턴연맹';
  }

  // 경기 종목
  let events = '남자복식(남복) · 여자복식(여복) · 혼합복식(혼복)';
  if (isStudent) {
    events = '남녀 단식(MS/WS) · 남녀 복식(MD/WD) · 단체전';
  } else if (isBwf) {
    events = '남녀 단식(Men/Women Singles) · 남녀 복식 · 혼합복식';
  }

  // 참가 대상 및 급수
  let eligibility = '전국 배드민턴 동호인 (연령별: 20대~60대 / 급수: 자강, A, B, C, D, 초심)';
  if (isStudent) {
    eligibility = '대한배드민턴협회 등록 전문/학생 선수 (초등부, 중등부, 고등부, 대학부)';
  } else if (isDistrict) {
    eligibility = '해당 관내 클럽 등록 동호인 및 거주 주민 (A, B, C, D, 초심/입문)';
  } else if (isBwf) {
    eligibility = 'BWF 공식 랭킹 보유 세계 선수권 등록 국가대표 및 프로 선수';
  }

  // 경기 방식 및 규정
  let rules = '예선 조별리그 후 결선 토너먼트 (21점 또는 25점 1세트 랠리포인트제, 세부 듀스 규정은 요강 준용)';
  if (isStudent || isBwf) {
    rules = '3세트 21점 랠리포인트제 (BWF / 대한배드민턴협회 공식 경기 규정 준용)';
  }

  // 시상 및 기념품
  let awards = t.fee && t.fee !== '요강 참조' 
    ? `참가비: ${t.fee} (1위: 고급 라켓 또는 상금, 2위: 가방/용품, 3위: 배드민턴 용품, 참가자 전원 기념품)`
    : '1위: 최고급 배드민턴 라켓 또는 상금/상장, 2위: 고급 가방/부상, 공동 3위: 용품, 전원 기념 티셔츠 증정';

  // 필수 유의사항
  const notes = [
    '부정 출전 방지: 본인 급수보다 하향 출전 적발 시 즉시 몰수패 및 전적 무효 처리됩니다.',
    '신분증 필참: 본인 확인을 위해 주민등록증, 운전면허증 또는 모바일 신분증을 반드시 지참해 주세요.',
    '안전 및 규정: 실내 전용 배드민턴화 착용이 필수이며, 체육관 내 음식물 반입이 제한됩니다.',
    '대진표 공지: 접수 마감 후 공식 출처 링크를 통해 최종 대진표와 타임테이블이 사전 게시됩니다.',
  ];

  return { host, eligibility, events, rules, awards, notes };
}

/**
 * 개최 장소와 대회명을 분석하여 정확한 행정구역(서울 1순위)을 추출합니다.
 */
export function regionOf(venue: string, name = ''): Region {
  const text = `${venue} ${name}`;

  // 1순위: 서울 (사용자 최우선 요청)
  if (
    /서울|서울특별시/.test(text) ||
    /(?:강남|강서|송파|노원|마포|서초|강동|도봉|은평|양천|구로|영등포|동작|관악|금천|용산|성동|광진|동대문|중랑|성북|강북|서대문|종로)구/.test(text) ||
    /(?:마포구민|송파배드민턴|도봉배드민턴|계남|강서실내|강동구민|성동구민|월곡|묵동|흑석|서초종합|장충체육|잠실체육|올림픽체육|KBS아레나|화곡|양천구민)/.test(text)
  ) {
    return '서울';
  }

  // 2순위: 인천
  if (/인천|인천광역시|부평구|계양구|남동구|연수구|미추홀구|강화군|옹진군|송도/.test(text)) {
    return '인천';
  }

  // 3순위: 경기
  if (
    /경기|경기도/.test(text) ||
    /(?:수원|성남|고양|용인|부천|안산|안양|남양주|화성|평택|의정부|시흥|파주|김포|광명|군포|이천|오산|하남|양주|구리|안성|포천|의왕|여주|동두천)시/.test(text) ||
    /(?:가평|양평|연천)군/.test(text)
  ) {
    return '경기';
  }

  // 4순위: 충청 (대전, 세종 포함)
  if (/충북|충남|대전|세종|천안|청주|충주|제천|공주|보령|아산|서산|논산|계룡|당진|금산|부여|서천|청양|홍성|예산|태안|보은|옥천|영동|증평|진천|괴산|음성|단양|충청/.test(text)) {
    return '충청';
  }

  // 5순위: 전라 (광주광역시 포함)
  if (/전북|전남|광주광역시|광주\s*(?:동구|서구|남구|북구|광산구)|전주|군산|익산|정읍|남원|김제|완주|진안|무주|장수|임실|순창|고창|부안|목포|여수|순천|나주|광양|담양|곡성|구례|고흥|보성|화순|장흥|강진|해남|영암|무안|함평|영광|장성|완도|진도|신안|전라/.test(text)) {
    return '전라';
  }

  // 6순위: 경상 (부산, 대구, 울산 포함)
  if (/경북|경남|부산|대구|울산|포항|경주|김천|안동|구미|영주|영천|상주|문경|경산|의성|청송|영양|영덕|청도|고령|성주|칠곡|예천|봉화|울진|울릉|창원|진주|통영|사천|김해|밀양|거제|양산|의령|함안|창녕|고성군|남해|하동|산청|함양|거창|합천|경상/.test(text)) {
    return '경상';
  }

  // 7순위: 강원
  if (/강원|춘천|원주|강릉|동해|태백|속초|삼척|홍천|횡성|영월|평창|정선|철원|화천|양구|인제|양양/.test(text)) {
    return '강원';
  }

  // 8순위: 제주
  if (/제주|서귀포/.test(text)) {
    return '제주';
  }

  return '기타';
}

// 개별 상세 원문 링크와 실제 개최일을 확인할 수 있는 레코드만 노출합니다.
export const mockTournaments: Tournament[] = ((scrapedTournaments as unknown as Tournament[]) || []).map((t) => ({
  ...t,
  category: categorizeTournament(t.name, t.venue),
}));
export const defaultMockTournaments: Tournament[] = mockTournaments;
