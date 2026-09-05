export type CrawlerPhase = 'Phase 1 (쉬움/즉시수집)' | 'Phase 2 (보통/정밀수집)' | 'Phase 3 (어려움/폐쇄형)';

export type SourceCategory = 
  | '모바일·온라인 접수 플랫폼'
  | '협회 및 공공 체육 기관'
  | '네이버 밴드 & 커뮤니티'
  | '전문 언론 및 국제기구';

export interface CrawlerSource {
  id: string;
  name: string;
  category: SourceCategory;
  targetUrl: string;
  subUrls?: string[];
  difficulty: '매우 쉬움' | '쉬움' | '보통' | '어려움';
  phase: CrawlerPhase;
  method: string;
  recommendedTool: string;
  collectedData: string;
  description: string;
}

export const CRAWLER_SOURCES: CrawlerSource[] = [
  // 1. 모바일·온라인 대회 접수 플랫폼
  {
    id: 'courtx',
    name: '코트엑스 (CourtX)',
    category: '모바일·온라인 접수 플랫폼',
    targetUrl: 'https://www.courtx.co.kr/Tournament/List',
    difficulty: '보통',
    phase: 'Phase 2 (보통/정밀수집)',
    method: '동적 렌더링 / SPA 구조',
    recommendedTool: 'Playwright / Puppeteer',
    collectedData: '전국/지역 대회 캘린더, 세부 요강, 접수 상태 및 참가비',
    description: '전국 오픈 및 지역 대회의 공식 일정과 참가 신청 링크가 표준화되어 제공됩니다.',
  },
  {
    id: 'facecock',
    name: '페이스콕 (Facecock)',
    category: '모바일·온라인 접수 플랫폼',
    targetUrl: 'https://facecock.co.kr/page/?pid=game',
    difficulty: '쉬움',
    phase: 'Phase 1 (쉬움/즉시수집)',
    method: '정적 HTML 구조',
    recommendedTool: 'Cheerio / Axios',
    collectedData: '전국·지역 대회 일정, 체육관 장소, 포스터 이미지, 접수 기간',
    description: '구조화된 테이블 형태로 초기 파이프라인 구축 시 빠른 데이터 수집에 적합합니다.',
  },
  {
    id: 'sponet',
    name: '스포넷 (SPONET)',
    category: '모바일·온라인 접수 플랫폼',
    targetUrl: 'https://sponet.co.kr/',
    subUrls: ['https://sponet.co.kr/BM/tn/'],
    difficulty: '보통',
    phase: 'Phase 2 (보통/정밀수집)',
    method: '메인 공지 및 서브도메인 링크 수집',
    recommendedTool: 'Playwright / Cheerio',
    collectedData: '지자체 협회장기/시장기, 온라인 접수 페이지 링크, 대진표',
    description: '지자체 및 전국 오픈 대회의 온라인 접수를 대행하는 대표적인 전통 플랫폼입니다.',
  },
  {
    id: 'badmintongame',
    name: '배드민턴게임 (BadmintonGame)',
    category: '모바일·온라인 접수 플랫폼',
    targetUrl: 'http://www.badmintongame.co.kr/game/game.html',
    subUrls: ['http://www.badmintongame.co.kr/game/game.html', 'http://www.badmintongame.co.kr/'],
    difficulty: '쉬움',
    phase: 'Phase 1 (쉬움/즉시수집)',
    method: '온라인 접수 및 대회 캘린더 테이블 파싱',
    recommendedTool: 'Cheerio / Axios',
    collectedData: '전국 시·군·구 협회장기/시장기, 전국 오픈 대회 요강, 온라인 신청 링크, 대진표',
    description: '전국 배드민턴 대회의 온라인 접수 및 대진표, 경기 결과를 전문 운영하는 통합 시스템입니다.',
  },
  {
    id: 'ohmyplay',
    name: '오마이플레이 (OHMYPLAY)',
    category: '모바일·온라인 접수 플랫폼',
    targetUrl: 'https://m.ohmyplay.com/tournament/list',
    subUrls: ['https://ohmyplay.com/', 'https://m.ohmyplay.com/tournament/list'],
    difficulty: '보통',
    phase: 'Phase 2 (보통/정밀수집)',
    method: '모바일 웹 기반 파싱 / REST API',
    recommendedTool: 'Playwright / Fetch API',
    collectedData: '전문/생활체육 대회 대진표, 코트 배정, 실시간 경기 중계 링크',
    description: '실시간 대진표 및 코트 배정 정보를 제공하여 대회 당일 라이브 정보 연동에 유리합니다.',
  },
  {
    id: 'baef',
    name: '배프 (BAEF)',
    category: '모바일·온라인 접수 플랫폼',
    targetUrl: 'https://www.badmintonfriends.co.kr/acff4b5f-3746-4049-a013-1f5911ecdae1',
    subUrls: ['https://www.badmintonfriends.co.kr/'],
    difficulty: '보통',
    phase: 'Phase 2 (보통/정밀수집)',
    method: '단일 페이지 애플리케이션 (SPA) 분석',
    recommendedTool: 'Playwright / Network Intercept',
    collectedData: '수도권·지방 오픈 대회 일정, 플리트 협약 대회 요강, 온라인 접수',
    description: '배드민턴 프렌즈 공식 모바일 플랫폼으로 플리트 및 수도권 오픈 대회 접수를 총괄합니다.',
  },
  {
    id: 'badmintok',
    name: '배드민톡 (Badmintok)',
    category: '모바일·온라인 접수 플랫폼',
    targetUrl: 'https://badmintok.com/badminton-tournament/',
    difficulty: '쉬움',
    phase: 'Phase 1 (쉬움/즉시수집)',
    method: '월별 대회 목록 테이블 파싱',
    recommendedTool: 'Cheerio / BeautifulSoup',
    collectedData: '월별 전국 대회 통계 및 포스터 요강, 접수 링크',
    description: '월별로 일목요연하게 정리된 전국 대회 리스트를 빠르게 스크랩할 수 있습니다.',
  },
  {
    id: 'reboot',
    name: '리부트아카데미',
    category: '모바일·온라인 접수 플랫폼',
    targetUrl: 'https://reboot-badminton.com/tournaments.html',
    difficulty: '매우 쉬움',
    phase: 'Phase 1 (쉬움/즉시수집)',
    method: '정적 HTML / 구조화된 리스트',
    recommendedTool: 'Cheerio / HTTP GET',
    collectedData: '날짜별 전국/지역/배프 대회 통합 캘린더',
    description: '복잡한 스크립트 실행 없이 단순 HTTP 요청만으로 일정과 장소를 즉시 수집 가능합니다.',
  },
  {
    id: 'ddakple',
    name: '딱플 (Ddakple)',
    category: '모바일·온라인 접수 플랫폼',
    targetUrl: 'https://ddakple.com/',
    difficulty: '보통',
    phase: 'Phase 2 (보통/정밀수집)',
    method: '앱 연동 웹 뷰 / 동적 렌더링',
    recommendedTool: 'Playwright',
    collectedData: '스마트 토너먼트 대회 정보, 실시간 점수',
    description: '스마트 토너먼트 시스템 기반의 경기 운영 데이터를 제공합니다.',
  },

  // 2. 협회 및 공공 체육 기관
  {
    id: 'bkplay',
    name: '대한배드민턴협회 (BKPLAY)',
    category: '협회 및 공공 체육 기관',
    targetUrl: 'https://sfa.bkplay.kr/tournament/all/list.do',
    subUrls: ['https://sfa.bkplay.kr/tournament/all/year/list.do'],
    difficulty: '보통',
    phase: 'Phase 2 (보통/정밀수집)',
    method: '공식 운영 포털 / 페이지네이션 파싱',
    recommendedTool: 'Playwright / Cheerio',
    collectedData: '시·군·구 협회 공식 대회, 승급 대회 공고, 접수 기간',
    description: '동호인 공식 급수 인정 대회 및 시·도 협회 주관 대회 데이터의 공신력 있는 원천입니다.',
  },
  {
    id: 'sports_portal',
    name: '대한체육회 배드민턴 대회운영 정보시스템',
    category: '협회 및 공공 체육 기관',
    targetUrl: 'https://result.sports.or.kr/BM/INF201.do',
    subUrls: ['https://result.sports.or.kr/BM/INF201.do', 'https://result.sports.or.kr/BM/INF001.do', 'https://g1.sports.or.kr/schedule/month.do'],
    difficulty: '보통',
    phase: 'Phase 2 (보통/정밀수집)',
    method: '연간 공인 대회 폼 전송 (POST)',
    recommendedTool: 'Fetch API / Cheerio',
    collectedData: '전문체육, 생활체육, 전국종별/학교선수권, 국가대표 국제대회 공식 공인 일정 및 경기 결과',
    description: '대한체육회 및 대한배드민턴협회에서 주최·주관하는 국가 공인 전국 대회의 핵심 원천입니다.',
  },
  {
    id: 'regional_associations',
    name: '각 시·도 배드민턴협회 (예: 대전협회 등)',
    category: '협회 및 공공 체육 기관',
    targetUrl: 'https://djminton.com/v2/main.php?cmd=academic',
    difficulty: '쉬움',
    phase: 'Phase 1 (쉬움/즉시수집)',
    method: '연간 사업계획 / 대회 공지사항 게시판 파싱',
    recommendedTool: 'Cheerio / BeautifulSoup',
    collectedData: '관할 구군 협회장기 일정, 시 대회 연간 일정',
    description: '지역별 지자체장기 및 시·도 협회 연간 공식 일정을 확인할 수 있습니다.',
  },
  {
    id: 'local_sports_councils',
    name: '관할 구 체육회 / 구청 (강남구 등)',
    category: '협회 및 공공 체육 기관',
    targetUrl: 'https://www.gangnam.go.kr/',
    difficulty: '보통',
    phase: 'Phase 2 (보통/정밀수집)',
    method: '지자체별 공지사항 게시판 크롤링',
    recommendedTool: 'Cheerio / Playwright',
    collectedData: '구청장기/구협회장기 공식 요강 공문 (HWP/PDF)',
    description: '관할 구 단위 생활체육 대회 공문 및 참가 요강을 수집합니다.',
  },

  // 3. 네이버 밴드 & 커뮤니티
  {
    id: 'naverband',
    name: '네이버 밴드 (검증된 공개 대회 공지 3곳)',
    category: '네이버 밴드 & 커뮤니티',
    targetUrl: 'https://band.us/band/63083777',
    subUrls: [
      'https://band.us/@mintoncontest',
      'https://band.us/band/63083777',
      'https://band.us/band/65702481',
    ],
    difficulty: '어려움',
    phase: 'Phase 3 (어려움/폐쇄형)',
    method: '공개 게시글 확인 후 포스터/PDF의 날짜를 별도 검증',
    recommendedTool: 'Playwright + 문서/OCR 검증',
    collectedData: '공개된 개별 게시글 링크와 첨부 요강',
    description: '사용자가 제시한 35개 주소 중 실제 전국 대회 공지 밴드로 확인된 3곳입니다. 게시일을 대회일로 오인하지 않도록 첨부 요강의 날짜까지 확인된 건만 대회 데이터에 반영합니다.',
  },
  {
    id: 'cafe_market',
    name: '네이버 카페 (배드민턴마켓 대회홍보)',
    category: '네이버 밴드 & 커뮤니티',
    targetUrl: 'https://cafe.naver.com/badmintonmarket',
    difficulty: '보통',
    phase: 'Phase 2 (보통/정밀수집)',
    method: '네이버 로그인 쿠키 / 검색 피드 파싱',
    recommendedTool: 'Playwright / Cheerio',
    collectedData: '사설 오픈 대회, 클럽 교류전, 브랜드 대회 공고',
    description: '용품점 및 브랜드 후원 대회와 동호인 클럽 교류전 정보가 주로 게시됩니다.',
  },

  // 4. 전문 언론 및 국제기구
  {
    id: 'badmintontimes',
    name: '배드민턴타임즈',
    category: '전문 언론 및 국제기구',
    targetUrl: 'http://www.badmintontimes.com/calendar/m3_calendarList.jsp?menunum=204',
    difficulty: '매우 쉬움',
    phase: 'Phase 1 (쉬움/즉시수집)',
    method: '단순 테이블 HTML 구조 파싱',
    recommendedTool: 'Cheerio / Axios',
    collectedData: '월별 전국 생활체육 및 엘리트·국제 대회 일정',
    description: '정형화된 월간 캘린더 테이블을 제공하여 가벼운 스크립트로 즉시 추출 가능합니다.',
  },
  {
    id: 'bwf_world_tour',
    name: 'BWF World Tour (국제배드민턴연맹)',
    category: '전문 언론 및 국제기구',
    targetUrl: 'https://bwfworldtour.bwfbadminton.com/calendar/',
    difficulty: '쉬움',
    phase: 'Phase 1 (쉬움/즉시수집)',
    method: 'BWF 공개 캘린더 API / JSON 또는 웹 파싱',
    recommendedTool: 'Fetch API / Cheerio',
    collectedData: 'BWF 슈퍼시리즈, 코리아오픈 등 글로벌 국제 투어 일정 및 상금',
    description: '세계 최정상급 국가대표 선수들이 참가하는 국제 대회 공식 캘린더입니다.',
  },
];

export const CRAWLER_TIPS = [
  {
    phase: 'Phase 1 (즉시 수집 권장 - 난이도 하)',
    targets: '리부트아카데미, 배드민턴타임즈, 페이스콕',
    guide: '복잡한 자바스크립트 렌더링이나 로그인 세션 없이 단순 HTTP GET 요청(Cheerio / Axios)만으로 대회명, 일정, 장소를 즉시 추출하여 기본 DB를 빠르게 구축할 수 있습니다.',
  },
  {
    phase: 'Phase 2 (정밀 데이터 수집 - 난이도 중)',
    targets: '코트엑스, 스포넷, BKPLAY, 오마이플레이, 배프',
    guide: 'Playwright 또는 Puppeteer를 사용하여 동적 SPA 페이지를 렌더링한 후, 상세 페이지 링크, 접수 마감일, 요강 첨부파일(PDF/HWP), 참가비 등을 정확하게 추출합니다.',
  },
  {
    phase: 'Phase 3 (폐쇄형 채널 - 난이도 상)',
    targets: '네이버 밴드(@mintoncontest, 대회밴드), 네이버 카페',
    guide: '로그인 쿠키를 탑재한 헤드리스 브라우저 세션을 운용하거나, 사용자가 밴드/카페 링크를 입력하면 본문을 자동 파싱해 등록하는 보조 웹훅 파이프라인으로 구성하는 것이 안정적입니다.',
  },
];
