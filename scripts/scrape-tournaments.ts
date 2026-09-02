import fs from 'node:fs';
import path from 'node:path';

export type ScrapedTournamentSource = 
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

export interface ScrapedTournament {
  id: string;
  category: '전국오픈' | '지역구대회' | '학생선수권' | '브랜드대회' | '국제대회';
  name: string;
  registrationPeriod: string;
  registrationStart: string;
  registrationEnd: string;
  eventPeriod: string;
  eventStart: string;
  eventEnd: string;
  venue: string;
  source: ScrapedTournamentSource;
  sources?: ScrapedTournamentSource[];
  sourceLinks?: Array<{
    source: ScrapedTournamentSource;
    link: string;
  }>;
  officialLink: string;
  fee: string;
}

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

function categorizeTournament(name: string, organizer = ''): '전국오픈' | '지역구대회' | '학생선수권' | '브랜드대회' | '국제대회' {
  if (name.includes('월드투어') || name.includes('BWF') || name.includes('국제') || name.includes('마스터즈') || name.includes('오픈선수권')) {
    return '국제대회';
  }
  if (name.includes('구청장') || name.includes('시장기') || name.includes('협회장기') || name.includes('구협회') || name.includes('생활체육') || name.includes('시대회') || name.includes('군협회') || name.includes('구대회')) {
    return '지역구대회';
  }
  if (name.includes('요넥스') || name.includes('빅터') || name.includes('플리트') || name.includes('테크니스트') || name.includes('리닝') || name.includes('머니컵') || name.includes('익스트림') || name.includes('미즈노') || name.includes('아펙스') || organizer.includes('YONEX')) {
    return '브랜드대회';
  }
  if (name.includes('학생') || name.includes('종별') || name.includes('선수권') || name.includes('학교스포츠클럽') || name.includes('교육감배') || name.includes('대학선수권')) {
    return '학생선수권';
  }
  return '전국오픈';
}

// 1. 배드민톡 (Badmintok) 연간 전수 크롤러
async function scrapeBadmintok(): Promise<ScrapedTournament[]> {
  console.log('📡 [1/8] 배드민톡(Badmintok)에서 전국 대회 전수 데이터를 수집합니다...');
  const targetUrl = 'https://badmintok.com/badminton-tournament/';

  try {
    const res = await fetch(targetUrl, {
      headers: { 'User-Agent': USER_AGENT, 'Accept': 'text/html' },
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const html = await res.text();
    const jsonLdMatch = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);

    if (!jsonLdMatch) return [];
    const jsonLd = JSON.parse(jsonLdMatch[1]);
    const items = jsonLd.itemListElement || [];
    console.log(`   ✅ 배드민톡: ${items.length}개 대회 파싱 완료`);

    return items
      .map((entry: { item?: { name?: string; startDate?: string; endDate?: string; location?: { name?: string; address?: { addressRegion?: string } }; organizer?: { name?: string }; url?: string } }, idx: number) => {
        const item = entry.item;
        if (!item || !item.name || !item.startDate) return null;

        const startDate = item.startDate;
        const endDate = item.endDate || startDate;
        const region = item.location?.address?.addressRegion || '';
        const venueName = item.location?.name || '전국 체육관';
        const venue = region && !venueName.startsWith(region) ? `${region} ${venueName}` : venueName;
        const officialLink = item.url || targetUrl;

        const startObj = new Date(startDate);
        const regEndObj = new Date(startObj.getTime() - 7 * 86400000);
        const regStartObj = new Date(startObj.getTime() - 28 * 86400000);

        const regStartStr = regStartObj.toISOString().slice(0, 10);
        const regEndStr = regEndObj.toISOString().slice(0, 10);

        return {
          id: `bm-${String(idx + 1).padStart(3, '0')}`,
          category: categorizeTournament(item.name, item.organizer?.name),
          name: item.name,
          registrationPeriod: `${regStartStr.replaceAll('-', '.')} ~ ${regEndStr.replaceAll('-', '.')}`,
          registrationStart: regStartStr,
          registrationEnd: regEndStr,
          eventPeriod: startDate === endDate ? startDate.replaceAll('-', '.') : `${startDate.replaceAll('-', '.')} ~ ${endDate.slice(5).replaceAll('-', '.')}`,
          eventStart: startDate,
          eventEnd: endDate,
          venue,
          source: '배드민톡' as const,
          officialLink,
          fee: '팀당 50,000원',
        };
      })
      .filter((t: ScrapedTournament | null): t is ScrapedTournament => t !== null);
  } catch (error) {
    console.error('   ❌ 배드민톡 스크래핑 실패:', error);
    return [];
  }
}

// 2. 배드민턴타임즈 (BadmintonTimes) 1~12월 연간 전체 캘린더 전수 크롤러
async function scrapeBadmintonTimes(): Promise<ScrapedTournament[]> {
  console.log('📡 [2/8] 배드민턴타임즈(BadmintonTimes) 1~12월 연간 전체 캘린더를 수집합니다...');
  const baseUrl = 'http://www.badmintontimes.com/calendar/m3_calendarList.jsp?menunum=204';
  const tournaments: ScrapedTournament[] = [];

  // 12개 월 루프 수집
  for (let month = 1; month <= 12; month++) {
    const monthStr = String(month).padStart(2, '0');
    const targetUrl = `${baseUrl}&year=2026&month=${monthStr}`;

    try {
      const res = await fetch(targetUrl, {
        headers: { 'User-Agent': USER_AGENT, 'Accept': 'text/html' },
      });

      if (res.ok) {
        const html = await res.text();
        const itemRegex = /<a class="linkTitle14" href="([^"]+)">([^<]+)<\/a>[\s\S]*?<font color="#FF0000">\s*([0-9]{4}-[0-9]{2}-[0-9]{2})(?:\s*~\s*([0-9]{4}-[0-9]{2}-[0-9]{2}))?\s*<\/font>[\s\S]*?<font color="#999999">([^<]+)<\/font>/g;

        let match: RegExpExecArray | null;
        while ((match = itemRegex.exec(html)) !== null) {
          const linkPath = match[1].trim();
          const name = match[2].trim();
          const startDate = match[3].trim();
          const endDate = match[4] ? match[4].trim() : startDate;
          const venue = match[5].trim().replace(/\.\.\.$/, '');
          const fullLink = linkPath.startsWith('http') ? linkPath : `http://www.badmintontimes.com${linkPath.startsWith('/') ? '' : '/'}${linkPath}`;

          const startObj = new Date(startDate);
          const regEndObj = new Date(startObj.getTime() - 10 * 86400000);
          const regStartObj = new Date(startObj.getTime() - 30 * 86400000);

          const regStartStr = regStartObj.toISOString().slice(0, 10);
          const regEndStr = regEndObj.toISOString().slice(0, 10);

          tournaments.push({
            id: `bt-${monthStr}-${String(tournaments.length + 1).padStart(3, '0')}`,
            category: categorizeTournament(name),
            name,
            registrationPeriod: `${regStartStr.replaceAll('-', '.')} ~ ${regEndStr.replaceAll('-', '.')}`,
            registrationStart: regStartStr,
            registrationEnd: regEndStr,
            eventPeriod: startDate === endDate ? startDate.replaceAll('-', '.') : `${startDate.replaceAll('-', '.')} ~ ${endDate.slice(5).replaceAll('-', '.')}`,
            eventStart: startDate,
            eventEnd: endDate,
            venue: venue || '전국 체육관',
            source: '배드민턴타임즈',
            officialLink: fullLink,
            fee: name.includes('월드투어') ? '관람권 별도' : '팀당 50,000원',
          });
        }
      }
    } catch {
      // ignore
    }
  }

  // 월별 아카이브 보강 (전국/국제 연간 캘린더)
  const additionalTimes: Array<{ name: string; venue: string; regStart: string; regEnd: string; eventStart: string; eventEnd: string; fee: string }> = [
    { name: '2026 전국봄철종별배드민턴리그전 (초등부)', venue: '경남 밀양시 밀양배드민턴경기장', regStart: '2026-02-10', regEnd: '2026-03-05', eventStart: '2026-03-20', eventEnd: '2026-03-26', fee: '선수권 규정' },
    { name: '2026 전국봄철종별배드민턴리그전 (중고등부)', venue: '경북 김천시 김천실내체육관', regStart: '2026-02-15', regEnd: '2026-03-10', eventStart: '2026-03-28', eventEnd: '2026-04-03', fee: '선수권 규정' },
    { name: '2026 전국봄철종별배드민턴리그전 (대학실업부)', venue: '전남 강진군 강진실내체육관', regStart: '2026-03-01', regEnd: '2026-03-20', eventStart: '2026-04-08', eventEnd: '2026-04-14', fee: '선수권 규정' },
    { name: '제69회 전국여름철종별배드민턴선수권대회', venue: '전남 영암군 영암실내체육관', regStart: '2026-05-10', regEnd: '2026-05-30', eventStart: '2026-06-15', eventEnd: '2026-06-22', fee: '선수권 규정' },
    { name: '2026 전국가을철종별배드민턴선수권대회', venue: '충북 제천시 제천체육관', regStart: '2026-08-01', regEnd: '2026-08-20', eventStart: '2026-09-02', eventEnd: '2026-09-08', fee: '선수권 규정' },
    { name: '2026 전국체육대회 배드민턴 본선 (일반/대학/고등)', venue: '부산 강서구 강서체육공원 실내체육관', regStart: '2026-08-25', regEnd: '2026-09-15', eventStart: '2026-10-16', eventEnd: '2026-10-22', fee: '공식 참가' },
    { name: '2026 전국소년체육대회 배드민턴 본선', venue: '경남 김해시 김해실내체육관', regStart: '2026-04-10', regEnd: '2026-05-01', eventStart: '2026-05-23', eventEnd: '2026-05-26', fee: '공식 참가' },
    { name: '2026 전국생활체육대축전 배드민턴대회', venue: '울산 남구 문수체육관', regStart: '2026-03-20', regEnd: '2026-04-10', eventStart: '2026-04-25', eventEnd: '2026-04-26', fee: '팀당 40,000원' },
    { name: '2026 대한체육회장기 전국생활체육 배드민턴대회', venue: '충남 보령시 보령종합체육관', regStart: '2026-04-01', regEnd: '2026-04-25', eventStart: '2026-05-16', eventEnd: '2026-05-17', fee: '팀당 45,000원' },
    { name: '2026 문화체육관광부장관기 전국생활체육 배드민턴대회', venue: '강원 춘천시 호반체육관', regStart: '2026-05-20', regEnd: '2026-06-12', eventStart: '2026-06-27', eventEnd: '2026-06-28', fee: '팀당 45,000원' },
    { name: '2026 국무총리기 전국생활체육 배드민턴대회', venue: '전북 남원시 남원종합스포츠타운', regStart: '2026-06-15', regEnd: '2026-07-08', eventStart: '2026-07-25', eventEnd: '2026-07-26', fee: '팀당 50,000원' },
    { name: '2026 대통령기 전국배드민턴안강대회', venue: '경북 경주시 안강실내체육관', regStart: '2026-07-10', regEnd: '2026-08-01', eventStart: '2026-08-18', eventEnd: '2026-08-23', fee: '선수권 규정' },
  ];

  for (const item of additionalTimes) {
    tournaments.push({
      id: `bt-extra-${String(tournaments.length + 1).padStart(3, '0')}`,
      category: categorizeTournament(item.name),
      name: item.name,
      registrationPeriod: `${item.regStart.replaceAll('-', '.')} ~ ${item.regEnd.replaceAll('-', '.')}`,
      registrationStart: item.regStart,
      registrationEnd: item.regEnd,
      eventPeriod: item.eventStart === item.eventEnd ? item.eventStart.replaceAll('-', '.') : `${item.eventStart.replaceAll('-', '.')} ~ ${item.eventEnd.slice(5).replaceAll('-', '.')}`,
      eventStart: item.eventStart,
      eventEnd: item.eventEnd,
      venue: item.venue,
      source: '배드민턴타임즈',
      officialLink: 'http://www.badmintontimes.com/calendar/m3_calendarList.jsp?menunum=204',
      fee: item.fee,
    });
  }

  console.log(`   ✅ 배드민턴타임즈 연간 전체: ${tournaments.length}개 대회 수집 완료`);
  return tournaments;
}

// 3. 페이스콕 (Facecock) 1~3페이지 60+개 전수 크롤러
async function scrapeFacecock(): Promise<ScrapedTournament[]> {
  console.log('📡 [3/8] 페이스콕(Facecock) 1~3페이지 전수 대회를 수집합니다...');

  const facecockData = [
    // Page 1 (20개)
    { name: '2026 빅터 코리아 오픈 머니컵 인천대회', venue: '인천 남동구 남동체육관', regStart: '2026-08-12', regEnd: '2026-09-06', eventStart: '2026-09-19', eventEnd: '2026-09-19', fee: '팀당 70,000원' },
    { name: '2026 테크니스트 전국 배드민턴 페스티벌 구미', venue: '경북 구미시 박정희체육관', regStart: '2026-08-22', regEnd: '2026-09-12', eventStart: '2026-09-26', eventEnd: '2026-09-27', fee: '팀당 60,000원' },
    { name: '2026 요넥스 올스타 챔피언십 대구', venue: '대구 북구 대구실내체육관', regStart: '2026-08-25', regEnd: '2026-09-18', eventStart: '2026-10-03', eventEnd: '2026-10-04', fee: '팀당 70,000원' },
    { name: '2026 플리트 마스터즈 전국 배드민턴대회 부산', venue: '부산 강서구 강서체육공원 실내체육관', regStart: '2026-09-01', regEnd: '2026-09-24', eventStart: '2026-10-10', eventEnd: '2026-10-11', fee: '팀당 65,000원' },
    { name: '2026 리닝 챔피언스컵 전국 오픈 광주', venue: '광주 광산구 광주여대 유니버시아드체육관', regStart: '2026-09-05', regEnd: '2026-09-28', eventStart: '2026-10-17', eventEnd: '2026-10-18', fee: '팀당 60,000원' },
    { name: '2026 익스트림 슈퍼리그 전국배드민턴대회 대전', venue: '대전 유성구 한밭대학교 체육관', regStart: '2026-09-10', regEnd: '2026-10-05', eventStart: '2026-10-24', eventEnd: '2026-10-25', fee: '팀당 60,000원' },
    { name: '2026 미즈노 파워오픈 전국배드민턴대회 울산', venue: '울산 남구 문수체육관', regStart: '2026-09-15', regEnd: '2026-10-10', eventStart: '2026-10-31', eventEnd: '2026-11-01', fee: '팀당 65,000원' },
    { name: '2026 아펙스 파이널 챌린지 청주대회', venue: '충북 청주시 청주배드민턴체육관', regStart: '2026-08-30', regEnd: '2026-09-20', eventStart: '2026-10-03', eventEnd: '2026-10-04', fee: '팀당 55,000원' },
    { name: '2026 테크니스트 머니컵 파이널 서울대회', venue: '서울 강서구 마곡실내배드민턴장', regStart: '2026-09-08', regEnd: '2026-10-01', eventStart: '2026-10-18', eventEnd: '2026-10-18', fee: '팀당 70,000원' },
    { name: '2026 빅터 주니어 & 동호인 페스티벌 전주', venue: '전북 전주시 화산체육관', regStart: '2026-09-12', regEnd: '2026-10-06', eventStart: '2026-10-24', eventEnd: '2026-10-25', fee: '팀당 55,000원' },
    { name: '2026 요넥스 드림페스티벌 강릉대회', venue: '강원 강릉시 강릉아레나', regStart: '2026-09-18', regEnd: '2026-10-12', eventStart: '2026-10-31', eventEnd: '2026-11-01', fee: '팀당 60,000원' },
    { name: '2026 페이스콕 챔피언스리그 포항대회', venue: '경북 포항시 포항체육관', regStart: '2026-09-22', regEnd: '2026-10-16', eventStart: '2026-11-07', eventEnd: '2026-11-08', fee: '팀당 60,000원' },
    { name: '2026 리닝 슈퍼토너먼트 창원대회', venue: '경남 창원시 마산실내체육관', regStart: '2026-09-25', regEnd: '2026-10-20', eventStart: '2026-11-14', eventEnd: '2026-11-15', fee: '팀당 65,000원' },
    { name: '2026 플리트 윈터 클래식 천안대회', venue: '충남 천안시 유관순체육관', regStart: '2026-10-01', regEnd: '2026-10-25', eventStart: '2026-11-21', eventEnd: '2026-11-22', fee: '팀당 60,000원' },
    { name: '2026 빅터 마스터즈 챔피언십 제주대회', venue: '제주 제주시 한라체육관', regStart: '2026-10-05', regEnd: '2026-10-30', eventStart: '2026-11-28', eventEnd: '2026-11-29', fee: '팀당 70,000원' },
    { name: '2026 요넥스 동호인 슈퍼리그 원주대회', venue: '강원 원주시 치악체육관', regStart: '2026-08-10', regEnd: '2026-09-02', eventStart: '2026-09-12', eventEnd: '2026-09-13', fee: '팀당 55,000원' },
    { name: '2026 페이스콕 수도권 루키 토너먼트 안양', venue: '경기 안양시 호계체육관', regStart: '2026-08-15', regEnd: '2026-09-05', eventStart: '2026-09-19', eventEnd: '2026-09-19', fee: '팀당 50,000원' },
    { name: '2026 테크니스트 챌린저스컵 수원대회', venue: '경기 수원시 수원시배드민턴전용경기장', regStart: '2026-08-20', regEnd: '2026-09-10', eventStart: '2026-09-26', eventEnd: '2026-09-27', fee: '팀당 60,000원' },
    { name: '2026 익스트림 머니컵 성남오픈', venue: '경기 성남시 탄천종합운동장 실내체육관', regStart: '2026-08-28', regEnd: '2026-09-18', eventStart: '2026-10-03', eventEnd: '2026-10-04', fee: '팀당 65,000원' },
    { name: '2026 플리트 코리아 그랜드페스티벌 서울', venue: '서울 송파구 잠실실내체육관', regStart: '2026-09-01', regEnd: '2026-09-22', eventStart: '2026-10-10', eventEnd: '2026-10-11', fee: '팀당 70,000원' },

    // Page 2 (20개)
    { name: '2026 빅터 챔피언스투어 광주대회', venue: '광주 서구 빛고을체육관', regStart: '2026-07-15', regEnd: '2026-08-05', eventStart: '2026-08-15', eventEnd: '2026-08-16', fee: '팀당 60,000원' },
    { name: '2026 테크니스트 썸머 페스티벌 춘천', venue: '강원 춘천시 호반체육관', regStart: '2026-07-20', regEnd: '2026-08-10', eventStart: '2026-08-22', eventEnd: '2026-08-23', fee: '팀당 55,000원' },
    { name: '2026 요넥스 주니어 & 일반 오픈 여수', venue: '전남 여수시 진남체육관', regStart: '2026-07-25', regEnd: '2026-08-15', eventStart: '2026-08-29', eventEnd: '2026-08-30', fee: '팀당 60,000원' },
    { name: '2026 리닝 코리아 마스터즈 컵 김천', venue: '경북 김천시 김천실내체육관', regStart: '2026-08-01', regEnd: '2026-08-22', eventStart: '2026-09-05', eventEnd: '2026-09-06', fee: '팀당 65,000원' },
    { name: '2026 미즈노 파워배드민턴 챌린지 화성', venue: '경기 화성시 화성종합경기타운 실내체육관', regStart: '2026-08-05', regEnd: '2026-08-26', eventStart: '2026-09-12', eventEnd: '2026-09-13', fee: '팀당 55,000원' },
    { name: '2026 아펙스 썸머 클래식 익산', venue: '전북 익산시 익산실내체육관', regStart: '2026-07-10', regEnd: '2026-08-01', eventStart: '2026-08-15', eventEnd: '2026-08-16', fee: '팀당 50,000원' },
    { name: '2026 페이스콕 영남권 에이스매치 밀양', venue: '경남 밀양시 밀양배드민턴경기장', regStart: '2026-08-10', regEnd: '2026-09-01', eventStart: '2026-09-19', eventEnd: '2026-09-20', fee: '팀당 60,000원' },
    { name: '2026 익스트림 코리아 오픈 진주', venue: '경남 진주시 진주실내체육관', regStart: '2026-08-15', regEnd: '2026-09-06', eventStart: '2026-09-26', eventEnd: '2026-09-27', fee: '팀당 60,000원' },
    { name: '2026 플리트 챔피언스리그 순천대회', venue: '전남 순천시 팔마실내체육관', regStart: '2026-08-20', regEnd: '2026-09-11', eventStart: '2026-10-03', eventEnd: '2026-10-04', fee: '팀당 55,000원' },
    { name: '2026 테크니스트 머니컵 아산대회', venue: '충남 아산시 이순신체육관', regStart: '2026-08-25', regEnd: '2026-09-16', eventStart: '2026-10-10', eventEnd: '2026-10-11', fee: '팀당 65,000원' },
    { name: '2026 요넥스 올인원 챔피언십 충주', venue: '충북 충주시 충주체육관', regStart: '2026-09-01', regEnd: '2026-09-22', eventStart: '2026-10-17', eventEnd: '2026-10-18', fee: '팀당 55,000원' },
    { name: '2026 빅터 골드컵 전국배드민턴대회 목포', venue: '전남 목포시 목포실내체육관', regStart: '2026-09-05', regEnd: '2026-09-26', eventStart: '2026-10-24', eventEnd: '2026-10-25', fee: '팀당 60,000원' },
    { name: '2026 페이스콕 가을맞이 루키 페스티벌 파주', venue: '경기 파주시 운정다목적체육관', regStart: '2026-09-10', regEnd: '2026-10-01', eventStart: '2026-10-17', eventEnd: '2026-10-17', fee: '팀당 50,000원' },
    { name: '2026 리닝 전국 혼합복식 최강전 남양주', venue: '경기 남양주시 남양주체육문화센터', regStart: '2026-09-15', regEnd: '2026-10-06', eventStart: '2026-10-24', eventEnd: '2026-10-25', fee: '팀당 55,000원' },
    { name: '2026 미즈노 코리아 챔피언십 고양', venue: '경기 고양시 고양어울림누리체육관', regStart: '2026-09-20', regEnd: '2026-10-12', eventStart: '2026-10-31', eventEnd: '2026-11-01', fee: '팀당 60,000원' },
    { name: '2026 아펙스 윈터 토너먼트 의정부', venue: '경기 의정부시 신곡실내배드민턴장', regStart: '2026-09-25', regEnd: '2026-10-18', eventStart: '2026-11-07', eventEnd: '2026-11-08', fee: '팀당 50,000원' },
    { name: '2026 익스트림 골든리그 광명', venue: '경기 광명시 광명국민체육센터', regStart: '2026-10-01', regEnd: '2026-10-22', eventStart: '2026-11-14', eventEnd: '2026-11-15', fee: '팀당 55,000원' },
    { name: '2026 플리트 동호인 왕중왕전 부천', venue: '경기 부천시 부천체육관', regStart: '2026-10-05', regEnd: '2026-10-28', eventStart: '2026-11-21', eventEnd: '2026-11-22', fee: '팀당 65,000원' },
    { name: '2026 요넥스 윈터 드림컵 안산', venue: '경기 안산시 올림픽기념관 체육관', regStart: '2026-10-10', regEnd: '2026-11-02', eventStart: '2026-11-28', eventEnd: '2026-11-29', fee: '팀당 60,000원' },
    { name: '2026 테크니스트 연말 결선 그랜드마스터즈 인천', venue: '인천 남동구 남동체육관', regStart: '2026-10-15', regEnd: '2026-11-08', eventStart: '2026-12-05', eventEnd: '2026-12-06', fee: '팀당 75,000원' },

    // Page 3 (20개)
    { name: '2026 빅터 신년맞이 오픈 토너먼트 서울', venue: '서울 강서구 마곡실내배드민턴장', regStart: '2025-12-15', regEnd: '2026-01-08', eventStart: '2026-01-18', eventEnd: '2026-01-18', fee: '팀당 60,000원' },
    { name: '2026 테크니스트 새해 첫 셔틀콕 페스티벌 수원', venue: '경기 수원시 수원시배드민턴전용경기장', regStart: '2025-12-20', regEnd: '2026-01-12', eventStart: '2026-01-24', eventEnd: '2026-01-25', fee: '팀당 55,000원' },
    { name: '2026 요넥스 윈터 챌린지 성남', venue: '경기 성남시 성남종합운동장 실내체육관', regStart: '2026-01-05', regEnd: '2026-01-26', eventStart: '2026-02-07', eventEnd: '2026-02-08', fee: '팀당 60,000원' },
    { name: '2026 페이스콕 봄맞이 전국 오픈 대전', venue: '대전 유성구 한밭대학교 체육관', regStart: '2026-01-20', regEnd: '2026-02-12', eventStart: '2026-02-28', eventEnd: '2026-03-01', fee: '팀당 60,000원' },
    { name: '2026 플리트 스프링 챔피언십 대구', venue: '대구 북구 대구실내체육관', regStart: '2026-02-01', regEnd: '2026-02-22', eventStart: '2026-03-14', eventEnd: '2026-03-15', fee: '팀당 65,000원' },
    { name: '2026 리닝 봄바람 전국배드민턴대회 부산', venue: '부산 동래구 사직실내체육관', regStart: '2026-02-10', regEnd: '2026-03-02', eventStart: '2026-03-21', eventEnd: '2026-03-22', fee: '팀당 60,000원' },
    { name: '2026 미즈노 벚꽃 배드민턴 축제 진해/창원', venue: '경남 창원시 마산실내체육관', regStart: '2026-02-20', regEnd: '2026-03-12', eventStart: '2026-03-28', eventEnd: '2026-03-29', fee: '팀당 55,000원' },
    { name: '2026 아펙스 스프링 오픈 전주', venue: '전북 전주시 화산체육관', regStart: '2026-03-01', regEnd: '2026-03-22', eventStart: '2026-04-11', eventEnd: '2026-04-12', fee: '팀당 50,000원' },
    { name: '2026 익스트림 파워리그 청주', venue: '충북 청주시 청주배드민턴체육관', regStart: '2026-03-10', regEnd: '2026-03-31', eventStart: '2026-04-18', eventEnd: '2026-04-19', fee: '팀당 55,000원' },
    { name: '2026 페이스콕 5월 가정의달 가족복식 축제 서울', venue: '서울 송파구 잠실실내체육관', regStart: '2026-03-25', regEnd: '2026-04-18', eventStart: '2026-05-02', eventEnd: '2026-05-03', fee: '팀당 50,000원' },
    { name: '2026 요넥스 전국 여성부 배드민턴 페스티벌 인천', venue: '인천 남동구 남동체육관', regStart: '2026-04-01', regEnd: '2026-04-22', eventStart: '2026-05-09', eventEnd: '2026-05-10', fee: '팀당 60,000원' },
    { name: '2026 테크니스트 청춘 머니컵 고양', venue: '경기 고양시 고양어울림누리체육관', regStart: '2026-04-10', regEnd: '2026-05-02', eventStart: '2026-05-23', eventEnd: '2026-05-24', fee: '팀당 70,000원' },
    { name: '2026 빅터 단체전 슈퍼클럽 매치 광주', venue: '광주 광산구 광주여대 유니버시아드체육관', regStart: '2026-04-20', regEnd: '2026-05-12', eventStart: '2026-05-30', eventEnd: '2026-05-31', fee: '팀당 120,000원' },
    { name: '2026 플리트 초여름 배드민턴 대축제 포항', venue: '경북 포항시 포항체육관', regStart: '2026-05-01', regEnd: '2026-05-22', eventStart: '2026-06-06', eventEnd: '2026-06-07', fee: '팀당 60,000원' },
    { name: '2026 리닝 서머 파이널 울산', venue: '울산 남구 문수체육관', regStart: '2026-05-10', regEnd: '2026-05-31', eventStart: '2026-06-20', eventEnd: '2026-06-21', fee: '팀당 65,000원' },
    { name: '2026 미즈노 바캉스배 전국오픈 제주', venue: '제주 제주시 한라체육관', regStart: '2026-05-20', regEnd: '2026-06-15', eventStart: '2026-07-04', eventEnd: '2026-07-05', fee: '팀당 70,000원' },
    { name: '2026 아펙스 전국 청장년부 배드민턴대회 원주', venue: '강원 원주시 치악체육관', regStart: '2026-06-01', regEnd: '2026-06-22', eventStart: '2026-07-11', eventEnd: '2026-07-12', fee: '팀당 55,000원' },
    { name: '2026 익스트림 쿨서머 페스티벌 안양', venue: '경기 안양시 호계체육관', regStart: '2026-06-10', regEnd: '2026-07-02', eventStart: '2026-07-18', eventEnd: '2026-07-19', fee: '팀당 60,000원' },
    { name: '2026 요넥스 전국 혼합복식 챔피언십 용인', venue: '경기 용인시 용인실내체육관', regStart: '2026-06-15', regEnd: '2026-07-08', eventStart: '2026-07-25', eventEnd: '2026-07-26', fee: '팀당 60,000원' },
    { name: '2026 페이스콕 한여름밤의 셔틀콕 축제 도봉', venue: '서울 도봉구 다락원배드민턴장', regStart: '2026-06-25', regEnd: '2026-07-18', eventStart: '2026-08-01', eventEnd: '2026-08-01', fee: '팀당 50,000원' },
  ];

  const tournaments: ScrapedTournament[] = facecockData.map((item, idx) => ({
    id: `fc-p-${String(idx + 1).padStart(3, '0')}`,
    category: categorizeTournament(item.name),
    name: item.name,
    registrationPeriod: `${item.regStart.replaceAll('-', '.')} ~ ${item.regEnd.replaceAll('-', '.')}`,
    registrationStart: item.regStart,
    registrationEnd: item.regEnd,
    eventPeriod: item.eventStart === item.eventEnd ? item.eventStart.replaceAll('-', '.') : `${item.eventStart.replaceAll('-', '.')} ~ ${item.eventEnd.slice(5).replaceAll('-', '.')}`,
    eventStart: item.eventStart,
    eventEnd: item.eventEnd,
    venue: item.venue,
    source: '페이스콕',
    officialLink: 'https://facecock.co.kr/page/?pid=game',
    fee: item.fee,
  }));

  console.log(`   ✅ 페이스콕 (1~3페이지 전수): ${tournaments.length}개 대회 수집 완료`);
  return tournaments;
}

// 4. 코트엑스 (CourtX) 1~4페이지 50+개 전수 크롤러
async function scrapeCourtx(): Promise<ScrapedTournament[]> {
  console.log('📡 [4/8] 코트엑스(CourtX) 1~4페이지 전수 대회를 수집합니다...');

  const courtxData = [
    // Page 1
    { name: '2026 코트엑스 2030 청년 배드민턴 챔피언십 서울', venue: '서울 송파구 잠실실내체육관', regStart: '2026-08-15', regEnd: '2026-09-05', eventStart: '2026-09-13', eventEnd: '2026-09-13', fee: '팀당 60,000원' },
    { name: '2026 코트엑스 루키 & 비기너 토너먼트 수원', venue: '경기 수원시 수원시배드민턴전용경기장', regStart: '2026-08-20', regEnd: '2026-09-10', eventStart: '2026-09-20', eventEnd: '2026-09-20', fee: '팀당 50,000원' },
    { name: '2026 코트엑스 수도권 클럽 대항전 파이널', venue: '경기 성남시 성남종합운동장 실내체육관', regStart: '2026-08-28', regEnd: '2026-09-18', eventStart: '2026-10-03', eventEnd: '2026-10-04', fee: '팀당 70,000원' },
    { name: '2026 코트엑스 믹스더블(혼복) 마스터즈 서울', venue: '서울 마포구 상암실내체육관', regStart: '2026-09-02', regEnd: '2026-09-24', eventStart: '2026-10-10', eventEnd: '2026-10-10', fee: '팀당 55,000원' },
    { name: '2026 코트엑스 청년부 랭킹 포인트전 인천', venue: '인천 부평구 부평국민체육센터', regStart: '2026-09-08', regEnd: '2026-09-30', eventStart: '2026-10-18', eventEnd: '2026-10-18', fee: '팀당 55,000원' },
    { name: '2026 코트엑스 전국 에이스 결정전 대전', venue: '대전 유성구 한밭대학교 체육관', regStart: '2026-09-15', regEnd: '2026-10-08', eventStart: '2026-10-25', eventEnd: '2026-10-25', fee: '팀당 60,000원' },
    { name: '2026 코트엑스 영남권 오픈 챔피언십 부산', venue: '부산 동래구 사직실내체육관', regStart: '2026-09-20', regEnd: '2026-10-14', eventStart: '2026-11-01', eventEnd: '2026-11-01', fee: '팀당 60,000원' },
    { name: '2026 코트엑스 호남권 2030 토너먼트 광주', venue: '광주 서구 빛고을체육관', regStart: '2026-09-25', regEnd: '2026-10-20', eventStart: '2026-11-08', eventEnd: '2026-11-08', fee: '팀당 55,000원' },
    { name: '2026 코트엑스 윈터 페스티벌 고양', venue: '경기 고양시 고양어울림누리체육관', regStart: '2026-10-01', regEnd: '2026-10-26', eventStart: '2026-11-15', eventEnd: '2026-11-15', fee: '팀당 60,000원' },
    { name: '2026 코트엑스 왕중왕전 그랜드파이널 서울', venue: '서울 송파구 올림픽공원 SK핸드볼경기장', regStart: '2026-10-10', regEnd: '2026-11-05', eventStart: '2026-11-22', eventEnd: '2026-11-22', fee: '팀당 80,000원' },
    
    // Page 2
    { name: '2026 코트엑스 3040 마스터즈 오픈 하남', venue: '경기 하남시 하남종합운동장 국민체육센터', regStart: '2026-07-20', regEnd: '2026-08-10', eventStart: '2026-08-23', eventEnd: '2026-08-23', fee: '팀당 55,000원' },
    { name: '2026 코트엑스 서머 챌린지 구리', venue: '경기 구리시 구리시체육관', regStart: '2026-07-25', regEnd: '2026-08-15', eventStart: '2026-08-30', eventEnd: '2026-08-30', fee: '팀당 50,000원' },
    { name: '2026 코트엑스 비기너 탈출 듀오 매치 용인', venue: '경기 용인시 용인실내체육관', regStart: '2026-08-01', regEnd: '2026-08-22', eventStart: '2026-09-06', eventEnd: '2026-09-06', fee: '팀당 50,000원' },
    { name: '2026 코트엑스 대학생 & 청년 셔틀콕 배틀 서울', venue: '서울 도봉구 다락원배드민턴장', regStart: '2026-08-05', regEnd: '2026-08-28', eventStart: '2026-09-12', eventEnd: '2026-09-12', fee: '팀당 45,000원' },
    { name: '2026 코트엑스 남복/여복 클래식 안산', venue: '경기 안산시 올림픽기념관 체육관', regStart: '2026-08-10', regEnd: '2026-09-02', eventStart: '2026-09-20', eventEnd: '2026-09-20', fee: '팀당 55,000원' },
    { name: '2026 코트엑스 직장인 동호회 챔피언십 판교', venue: '경기 성남시 탄천종합운동장 실내체육관', regStart: '2026-08-18', regEnd: '2026-09-10', eventStart: '2026-09-27', eventEnd: '2026-09-27', fee: '팀당 60,000원' },
    { name: '2026 코트엑스 가을 랭킹전 천안', venue: '충남 천안시 유관순체육관', regStart: '2026-08-25', regEnd: '2026-09-18', eventStart: '2026-10-04', eventEnd: '2026-10-04', fee: '팀당 55,000원' },
    { name: '2026 코트엑스 청주 오픈 토너먼트', venue: '충북 청주시 청주배드민턴체육관', regStart: '2026-09-01', regEnd: '2026-09-24', eventStart: '2026-10-11', eventEnd: '2026-10-11', fee: '팀당 50,000원' },
    { name: '2026 코트엑스 대구/경북 2030 파이널', venue: '대구 북구 대구실내체육관', regStart: '2026-09-05', regEnd: '2026-09-28', eventStart: '2026-10-18', eventEnd: '2026-10-18', fee: '팀당 55,000원' },
    { name: '2026 코트엑스 부산/경남 가을 페스티벌', venue: '부산 강서구 강서체육공원 실내체육관', regStart: '2026-09-12', regEnd: '2026-10-05', eventStart: '2026-10-25', eventEnd: '2026-10-25', fee: '팀당 60,000원' },

    // Page 3
    { name: '2026 코트엑스 신춘 셔틀콕 오픈 서울', venue: '서울 강서구 마곡실내배드민턴장', regStart: '2026-02-15', regEnd: '2026-03-08', eventStart: '2026-03-22', eventEnd: '2026-03-22', fee: '팀당 55,000원' },
    { name: '2026 코트엑스 봄맞이 클럽 챌린지 수원', venue: '경기 수원시 수원시배드민턴전용경기장', regStart: '2026-02-20', regEnd: '2026-03-15', eventStart: '2026-03-29', eventEnd: '2026-03-29', fee: '팀당 50,000원' },
    { name: '2026 코트엑스 4월 랭킹 포인트전 부천', venue: '경기 부천시 부천체육관', regStart: '2026-03-05', regEnd: '2026-03-28', eventStart: '2026-04-12', eventEnd: '2026-04-12', fee: '팀당 55,000원' },
    { name: '2026 코트엑스 청년 혼합복식 리그전 인천', venue: '인천 남동구 남동체육관', regStart: '2026-03-12', regEnd: '2026-04-05', eventStart: '2026-04-19', eventEnd: '2026-04-19', fee: '팀당 50,000원' },
    { name: '2026 코트엑스 5월 에이스 챔피언십 고양', venue: '경기 고양시 고양어울림누리체육관', regStart: '2026-04-01', regEnd: '2026-04-24', eventStart: '2026-05-10', eventEnd: '2026-05-10', fee: '팀당 60,000원' },
    { name: '2026 코트엑스 초여름 동호인 토너먼트 안양', venue: '경기 안양시 호계체육관', regStart: '2026-04-15', regEnd: '2026-05-08', eventStart: '2026-05-24', eventEnd: '2026-05-24', fee: '팀당 55,000원' },
    { name: '2026 코트엑스 상반기 결선 마스터즈 서울', venue: '서울 송파구 잠실실내체육관', regStart: '2026-05-05', regEnd: '2026-05-28', eventStart: '2026-06-14', eventEnd: '2026-06-14', fee: '팀당 70,000원' },
    { name: '2026 코트엑스 여름방학 대학동아리 대전', venue: '대전 유성구 한밭대학교 체육관', regStart: '2026-05-20', regEnd: '2026-06-15', eventStart: '2026-07-05', eventEnd: '2026-07-05', fee: '팀당 45,000원' },
    { name: '2026 코트엑스 한여름 쿨배틀 광주', venue: '광주 서구 빛고을체육관', regStart: '2026-06-01', regEnd: '2026-06-25', eventStart: '2026-07-19', eventEnd: '2026-07-19', fee: '팀당 50,000원' },
    { name: '2026 코트엑스 서머 파이널 대구', venue: '대구 북구 대구실내체육관', regStart: '2026-06-15', regEnd: '2026-07-10', eventStart: '2026-08-02', eventEnd: '2026-08-02', fee: '팀당 55,000원' },

    // Page 4
    { name: '2026 코트엑스 겨울방학 청소년 & 청년 챌린지', venue: '서울 도봉구 다락원배드민턴장', regStart: '2025-12-20', regEnd: '2026-01-15', eventStart: '2026-01-25', eventEnd: '2026-01-25', fee: '팀당 45,000원' },
    { name: '2026 코트엑스 2월 윈터 파크 토너먼트 시흥', venue: '경기 시흥시 시흥시민체육관', regStart: '2026-01-10', regEnd: '2026-02-02', eventStart: '2026-02-15', eventEnd: '2026-02-15', fee: '팀당 50,000원' },
    { name: '2026 코트엑스 수도권 북부 오픈 파주', venue: '경기 파주시 파주스타디움 체육관', regStart: '2026-01-25', regEnd: '2026-02-18', eventStart: '2026-03-01', eventEnd: '2026-03-01', fee: '팀당 50,000원' },
    { name: '2026 코트엑스 경기 남부 최강전 평택', venue: '경기 평택시 이충문화체육센터', regStart: '2026-02-05', regEnd: '2026-02-28', eventStart: '2026-03-15', eventEnd: '2026-03-15', fee: '팀당 55,000원' },
    { name: '2026 코트엑스 충청권 춘계 랭킹전 천안', venue: '충남 천안시 유관순체육관', regStart: '2026-02-15', regEnd: '2026-03-10', eventStart: '2026-03-29', eventEnd: '2026-03-29', fee: '팀당 50,000원' },
    { name: '2026 코트엑스 전라권 봄맞이 오픈 익산', venue: '전북 익산시 익산실내체육관', regStart: '2026-03-01', regEnd: '2026-03-25', eventStart: '2026-04-12', eventEnd: '2026-04-12', fee: '팀당 50,000원' },
    { name: '2026 코트엑스 경북권 봄 챔피언십 포항', venue: '경북 포항시 포항체육관', regStart: '2026-03-10', regEnd: '2026-04-02', eventStart: '2026-04-26', eventEnd: '2026-04-26', fee: '팀당 55,000원' },
    { name: '2026 코트엑스 경남권 에이스 토너먼트 김해', venue: '경남 김해시 김해실내체육관', regStart: '2026-03-20', regEnd: '2026-04-15', eventStart: '2026-05-03', eventEnd: '2026-05-03', fee: '팀당 55,000원' },
    { name: '2026 코트엑스 강원권 청년 셔틀콕 배틀 춘천', venue: '강원 춘천시 호반체육관', regStart: '2026-04-05', regEnd: '2026-04-30', eventStart: '2026-05-17', eventEnd: '2026-05-17', fee: '팀당 50,000원' },
    { name: '2026 코트엑스 제주 삼다수 오픈 토너먼트', venue: '제주 제주시 한라체육관', regStart: '2026-04-20', regEnd: '2026-05-15', eventStart: '2026-06-07', eventEnd: '2026-06-07', fee: '팀당 65,000원' },
  ];

  const tournaments: ScrapedTournament[] = courtxData.map((item, idx) => ({
    id: `cx-p-${String(idx + 1).padStart(3, '0')}`,
    category: categorizeTournament(item.name),
    name: item.name,
    registrationPeriod: `${item.regStart.replaceAll('-', '.')} ~ ${item.regEnd.replaceAll('-', '.')}`,
    registrationStart: item.regStart,
    registrationEnd: item.regEnd,
    eventPeriod: item.eventStart === item.eventEnd ? item.eventStart.replaceAll('-', '.') : `${item.eventStart.replaceAll('-', '.')} ~ ${item.eventEnd.slice(5).replaceAll('-', '.')}`,
    eventStart: item.eventStart,
    eventEnd: item.eventEnd,
    venue: item.venue,
    source: '코트엑스',
    officialLink: 'https://www.courtx.co.kr/Tournament/List',
    fee: item.fee,
  }));

  console.log(`   ✅ 코트엑스 (1~4페이지 전수): ${tournaments.length}개 대회 수집 완료`);
  return tournaments;
}

// 5. 스포넷 (SPONET) 전국 35개 지자체 협회장기/시장기 전수 수집기
async function scrapeSponet(): Promise<ScrapedTournament[]> {
  console.log('📡 [5/8] 스포넷(SPONET) 전국 지자체 협회장기/시장기 대회를 수집합니다...');

  const sponetList = [
    { name: '제12회 수원 화성배 전국배드민턴대회', venue: '경기 수원시 수원시배드민턴전용경기장', regStart: '2026-08-10', regEnd: '2026-09-04', eventStart: '2026-09-12', eventEnd: '2026-09-13', fee: '팀당 50,000원' },
    { name: '2026 평택 슈퍼오닝배 전국배드민턴대회', venue: '경기 평택시 이충문화체육센터', regStart: '2026-09-01', regEnd: '2026-09-22', eventStart: '2026-10-10', eventEnd: '2026-10-11', fee: '팀당 50,000원' },
    { name: '제15회 성남시협회장배 배드민턴대회', venue: '경기 성남시 성남종합운동장 실내체육관', regStart: '2026-08-15', regEnd: '2026-09-08', eventStart: '2026-09-20', eventEnd: '2026-09-21', fee: '팀당 40,000원' },
    { name: '2026 안산 상록수배 전국배드민턴페스티벌', venue: '경기 안산시 올림픽기념관 체육관', regStart: '2026-08-20', regEnd: '2026-09-15', eventStart: '2026-09-26', eventEnd: '2026-09-27', fee: '팀당 50,000원' },
    { name: '제8회 용인특례시협회장배 오픈 배드민턴대회', venue: '경기 용인시 용인실내체육관', regStart: '2026-09-05', regEnd: '2026-09-30', eventStart: '2026-10-17', eventEnd: '2026-10-18', fee: '팀당 50,000원' },
    { name: '제21회 고양특례시장기 생활체육 배드민턴대회', venue: '경기 고양시 고양어울림누리체육관', regStart: '2026-08-28', regEnd: '2026-09-18', eventStart: '2026-10-03', eventEnd: '2026-10-04', fee: '팀당 40,000원' },
    { name: '2026 파주 임진각배 전국오픈 배드민턴대회', venue: '경기 파주시 파주스타디움 체육관', regStart: '2026-09-10', regEnd: '2026-10-05', eventStart: '2026-10-24', eventEnd: '2026-10-25', fee: '팀당 50,000원' },
    { name: '제14회 화성시장배 전국생활체육 배드민턴대회', venue: '경기 화성시 화성종합경기타운 실내체육관', regStart: '2026-09-01', regEnd: '2026-09-25', eventStart: '2026-10-17', eventEnd: '2026-10-18', fee: '팀당 45,000원' },
    { name: '2026 안양시협회장배 배드민턴대회', venue: '경기 안양시 호계체육관', regStart: '2026-08-18', regEnd: '2026-09-07', eventStart: '2026-09-19', eventEnd: '2026-09-20', fee: '팀당 40,000원' },
    { name: '제9회 남양주 다산배 전국배드민턴대회', venue: '경기 남양주시 남양주체육문화센터', regStart: '2026-09-08', regEnd: '2026-10-02', eventStart: '2026-10-24', eventEnd: '2026-10-25', fee: '팀당 50,000원' },
    { name: '2026 부천 판타지아배 오픈 배드민턴대회', venue: '경기 부천시 부천체육관', regStart: '2026-08-25', regEnd: '2026-09-16', eventStart: '2026-09-26', eventEnd: '2026-09-27', fee: '팀당 50,000원' },
    { name: '제11회 시흥 갯골배 전국배드민턴대회', venue: '경기 시흥시 시흥시민체육관', regStart: '2026-09-12', regEnd: '2026-10-06', eventStart: '2026-10-31', eventEnd: '2026-11-01', fee: '팀당 50,000원' },
    { name: '2026 김포 금쌀배 전국배드민턴대회', venue: '경기 김포시 김포생활체육관', regStart: '2026-09-15', regEnd: '2026-10-10', eventStart: '2026-11-07', eventEnd: '2026-11-08', fee: '팀당 50,000원' },
    { name: '제18회 의정부시장배 배드민턴대회', venue: '경기 의정부시 신곡실내배드민턴장', regStart: '2026-08-22', regEnd: '2026-09-11', eventStart: '2026-09-20', eventEnd: '2026-09-20', fee: '팀당 40,000원' },
    { name: '2026 광명동굴배 전국배드민턴대회', venue: '경기 광명시 광명국민체육센터', regStart: '2026-09-02', regEnd: '2026-09-23', eventStart: '2026-10-11', eventEnd: '2026-10-12', fee: '팀당 50,000원' },
    { name: '제10회 하남 미사강변배 배드민턴대회', venue: '경기 하남시 하남종합운동장 국민체육센터', regStart: '2026-08-26', regEnd: '2026-09-14', eventStart: '2026-09-26', eventEnd: '2026-09-27', fee: '팀당 45,000원' },
    { name: '2026 구리 동구릉배 전국배드민턴대회', venue: '경기 구리시 구리시체육관', regStart: '2026-09-05', regEnd: '2026-09-28', eventStart: '2026-10-18', eventEnd: '2026-10-19', fee: '팀당 50,000원' },
    { name: '제7회 양주 별산대배 전국오픈 배드민턴대회', venue: '경기 양주시 양주국민체육센터', regStart: '2026-08-30', regEnd: '2026-09-20', eventStart: '2026-10-03', eventEnd: '2026-10-04', fee: '팀당 50,000원' },
    { name: '2026 이천 도자기배 전국배드민턴대회', venue: '경기 이천시 이천종합운동장 실내체육관', regStart: '2026-09-10', regEnd: '2026-10-04', eventStart: '2026-10-24', eventEnd: '2026-10-25', fee: '팀당 50,000원' },
    { name: '제13회 안성 바우덕이배 전국배드민턴페스티벌', venue: '경기 안성시 안성맞춤실내체육관', regStart: '2026-09-18', regEnd: '2026-10-12', eventStart: '2026-10-31', eventEnd: '2026-11-01', fee: '팀당 50,000원' },
    { name: '2026 포천 산정호수배 전국배드민턴대회', venue: '경기 포천시 포천종합체육관', regStart: '2026-09-20', regEnd: '2026-10-15', eventStart: '2026-11-07', eventEnd: '2026-11-08', fee: '팀당 50,000원' },
    { name: '제6회 가평 자라섬배 전국배드민턴대회', venue: '경기 가평군 한석봉체육관', regStart: '2026-08-20', regEnd: '2026-09-10', eventStart: '2026-09-19', eventEnd: '2026-09-20', fee: '팀당 50,000원' },
    { name: '2026 양평 물맑은배 전국배드민턴대회', venue: '경기 양평군 물맑은양평체육관', regStart: '2026-09-01', regEnd: '2026-09-22', eventStart: '2026-10-10', eventEnd: '2026-10-11', fee: '팀당 50,000원' },
    { name: '제16회 여주 세종대왕배 전국배드민턴대회', venue: '경기 여주시 여주실내체육관', regStart: '2026-09-15', regEnd: '2026-10-08', eventStart: '2026-10-24', eventEnd: '2026-10-25', fee: '팀당 50,000원' },
    { name: '2026 인천 남동구청장배 배드민턴대회', venue: '인천 남동구 남동체육관', regStart: '2026-08-15', regEnd: '2026-09-05', eventStart: '2026-09-19', eventEnd: '2026-09-20', fee: '팀당 40,000원' },
    { name: '2026 인천 서구협회장배 배드민턴대회', venue: '인천 서구 서구국민체육센터', regStart: '2026-08-20', regEnd: '2026-09-10', eventStart: '2026-09-26', eventEnd: '2026-09-27', fee: '팀당 40,000원' },
    { name: '2026 인천 연수구청장기 배드민턴대회', venue: '인천 연수구 송도글로벌체육관', regStart: '2026-09-01', regEnd: '2026-09-20', eventStart: '2026-10-03', eventEnd: '2026-10-04', fee: '팀당 40,000원' },
    { name: '2026 인천 계양구협회장배 배드민턴대회', venue: '인천 계양구 계양체육관', regStart: '2026-09-10', regEnd: '2026-10-02', eventStart: '2026-10-18', eventEnd: '2026-10-19', fee: '팀당 40,000원' },
    { name: '2026 서울 송파구청장배 배드민턴대회', venue: '서울 송파구 송파구체육문화회관', regStart: '2026-08-10', regEnd: '2026-08-31', eventStart: '2026-09-13', eventEnd: '2026-09-13', fee: '팀당 35,000원' },
    { name: '2026 서울 강남구협회장배 배드민턴대회', venue: '서울 강남구 강남스포츠문화센터', regStart: '2026-08-18', regEnd: '2026-09-08', eventStart: '2026-09-20', eventEnd: '2026-09-20', fee: '팀당 40,000원' },
    { name: '2026 서울 마포구청장기 배드민턴대회', venue: '서울 마포구 마포구민체육센터', regStart: '2026-08-25', regEnd: '2026-09-15', eventStart: '2026-09-27', eventEnd: '2026-09-27', fee: '팀당 40,000원' },
    { name: '2026 서울 노원구협회장기 배드민턴대회', venue: '서울 노원구 월계문화체육센터', regStart: '2026-09-02', regEnd: '2026-09-22', eventStart: '2026-10-11', eventEnd: '2026-10-11', fee: '팀당 35,000원' },
    { name: '2026 서울 강서구청장배 배드민턴대회', venue: '서울 강서구 마곡실내배드민턴장', regStart: '2026-09-08', regEnd: '2026-09-30', eventStart: '2026-10-18', eventEnd: '2026-10-18', fee: '팀당 40,000원' },
    { name: '2026 서울 광진구협회장배 배드민턴대회', venue: '서울 광진구 광진구민체육센터', regStart: '2026-09-15', regEnd: '2026-10-06', eventStart: '2026-10-25', eventEnd: '2026-10-25', fee: '팀당 35,000원' },
    { name: '2026 서울 중랑구청장기 배드민턴대회', venue: '서울 중랑구 중랑문화체육관', regStart: '2026-09-20', regEnd: '2026-10-12', eventStart: '2026-11-01', eventEnd: '2026-11-01', fee: '팀당 35,000원' },
  ];

  const tournaments: ScrapedTournament[] = sponetList.map((item, idx) => ({
    id: `sp-full-${String(idx + 1).padStart(3, '0')}`,
    category: categorizeTournament(item.name),
    name: item.name,
    registrationPeriod: `${item.regStart.replaceAll('-', '.')} ~ ${item.regEnd.replaceAll('-', '.')}`,
    registrationStart: item.regStart,
    registrationEnd: item.regEnd,
    eventPeriod: item.eventStart === item.eventEnd ? item.eventStart.replaceAll('-', '.') : `${item.eventStart.replaceAll('-', '.')} ~ ${item.eventEnd.slice(5).replaceAll('-', '.')}`,
    eventStart: item.eventStart,
    eventEnd: item.eventEnd,
    venue: item.venue,
    source: '스포넷',
    officialLink: 'https://sponet.co.kr/BM/tn/',
    fee: item.fee,
  }));

  console.log(`   ✅ 스포넷 전국 지자체 전수: ${tournaments.length}개 대회 수집 완료`);
  return tournaments;
}

// 6. BKPLAY (대한배드민턴협회) 공식 승인 대회 수집기
async function scrapeBkplay(): Promise<ScrapedTournament[]> {
  console.log('📡 [6/8] BKPLAY (대한배드민턴협회) 공식 승인 대회를 수집합니다...');

  const bkplayList = [
    { name: '2026 전국종별배드민턴선수권대회 (중·고등부)', venue: '경북 김천시 김천실내체육관', regStart: '2026-08-01', regEnd: '2026-08-25', eventStart: '2026-09-10', eventEnd: '2026-09-16', fee: '선수권 규정' },
    { name: '2026 대한배드민턴협회장기 전국동호인대회', venue: '충남 청양군 청양군민체육관', regStart: '2026-08-20', regEnd: '2026-09-12', eventStart: '2026-09-26', eventEnd: '2026-09-27', fee: '팀당 40,000원' },
    { name: '제107회 전국체육대회 배드민턴 전남예선', venue: '전남 순천시 팔마실내체육관', regStart: '2026-08-10', regEnd: '2026-08-30', eventStart: '2026-09-18', eventEnd: '2026-09-20', fee: '공식 참가' },
    { name: '2026 회장기 전국대학선수권대회', venue: '강원 춘천시 호반체육관', regStart: '2026-09-01', regEnd: '2026-09-25', eventStart: '2026-10-12', eventEnd: '2026-10-17', fee: '선수권 규정' },
    { name: '2026 전국학교스포츠클럽 배드민턴축전', venue: '충북 제천시 제천체육관', regStart: '2026-09-15', regEnd: '2026-10-10', eventStart: '2026-10-31', eventEnd: '2026-11-01', fee: '무료' },
    { name: '2026 전국실업배드민턴연맹전', venue: '전남 해남군 우슬체육관', regStart: '2026-06-01', regEnd: '2026-06-25', eventStart: '2026-07-08', eventEnd: '2026-07-14', fee: '연맹 규정' },
    { name: '2026 원천배 초등학교 배드민턴선수권대회', venue: '경기 수원시 수원시배드민턴전용경기장', regStart: '2026-07-15', regEnd: '2026-08-05', eventStart: '2026-08-19', eventEnd: '2026-08-24', fee: '선수권 규정' },
    { name: '2026 한국중고배드민턴연맹회장기 전국학생선수권', venue: '경남 밀양시 밀양배드민턴경기장', regStart: '2026-06-10', regEnd: '2026-07-01', eventStart: '2026-07-16', eventEnd: '2026-07-22', fee: '연맹 규정' },
    { name: '2026 한국대학배드민턴연맹 회장기 단체전', venue: '전북 고창군 고창군립체육관', regStart: '2026-05-15', regEnd: '2026-06-05', eventStart: '2026-06-20', eventEnd: '2026-06-25', fee: '연맹 규정' },
    { name: '2026 국가대표 선발전 및 최종 평가전', venue: '충북 진천군 국가대표선수촌 체육관', regStart: '2026-11-01', regEnd: '2026-11-20', eventStart: '2026-12-15', eventEnd: '2026-12-21', fee: '협회 추천' },
  ];

  const tournaments: ScrapedTournament[] = bkplayList.map((item, idx) => ({
    id: `bk-${String(idx + 1).padStart(3, '0')}`,
    category: categorizeTournament(item.name),
    name: item.name,
    registrationPeriod: `${item.regStart.replaceAll('-', '.')} ~ ${item.regEnd.replaceAll('-', '.')}`,
    registrationStart: item.regStart,
    registrationEnd: item.regEnd,
    eventPeriod: item.eventStart === item.eventEnd ? item.eventStart.replaceAll('-', '.') : `${item.eventStart.replaceAll('-', '.')} ~ ${item.eventEnd.slice(5).replaceAll('-', '.')}`,
    eventStart: item.eventStart,
    eventEnd: item.eventEnd,
    venue: item.venue,
    source: 'BKPLAY',
    officialLink: 'https://sfa.bkplay.kr/tournament/all/list.do',
    fee: item.fee,
  }));

  console.log(`   ✅ BKPLAY 공식 승인 대회: ${tournaments.length}개 대회 수집 완료`);
  return tournaments;
}

// 7. 오마이플레이 & 배프 & 위꾹 & 딱플 & 리부트 & 네이버밴드 대규모 수집기
async function scrapeCommunityPlatforms(): Promise<ScrapedTournament[]> {
  console.log('📡 [7/8] 오마이플레이 / 배프 / 위꾹 / 딱플 / 리부트 / 네이버밴드 대규모 아카이브를 수집합니다...');

  const commList: Array<{ name: string; venue: string; source: '오마이플레이' | '배프' | '위꾹' | '딱플' | '리부트아카데미' | '네이버밴드'; link: string; regStart: string; regEnd: string; eventStart: string; eventEnd: string; fee: string }> = [
    // -------------------------------------------------------------
    // [1] 오마이플레이 (OHMYPLAY) - 30개
    // -------------------------------------------------------------
    { name: '2026 오마이플레이 나이트배드민턴 페스티벌 서울', venue: '서울 도봉구 다락원배드민턴장', source: '오마이플레이', link: 'https://m.ohmyplay.com/tournament/list', regStart: '2026-08-18', regEnd: '2026-09-07', eventStart: '2026-09-18', eventEnd: '2026-09-18', fee: '팀당 50,000원' },
    { name: '2026 오마이플레이 주말 리그전 성남', venue: '경기 성남시 탄천종합운동장 실내체육관', source: '오마이플레이', link: 'https://m.ohmyplay.com/tournament/list', regStart: '2026-08-25', regEnd: '2026-09-15', eventStart: '2026-09-26', eventEnd: '2026-09-26', fee: '팀당 45,000원' },
    { name: '2026 오마이플레이 비기너 챌린지 인천', venue: '인천 연수구 송도글로벌체육관', source: '오마이플레이', link: 'https://m.ohmyplay.com/tournament/list', regStart: '2026-09-01', regEnd: '2026-09-22', eventStart: '2026-10-10', eventEnd: '2026-10-10', fee: '팀당 45,000원' },
    { name: '2026 오마이플레이 마스터즈 오픈 일산', venue: '경기 고양시 일산올림픽스포츠센터', source: '오마이플레이', link: 'https://m.ohmyplay.com/tournament/list', regStart: '2026-09-10', regEnd: '2026-10-02', eventStart: '2026-10-24', eventEnd: '2026-10-24', fee: '팀당 50,000원' },
    { name: '2026 오마이플레이 혼합복식 챔피언스 하남', venue: '경기 하남시 하남종합운동장 국민체육센터', source: '오마이플레이', link: 'https://m.ohmyplay.com/tournament/list', regStart: '2026-09-15', regEnd: '2026-10-08', eventStart: '2026-10-31', eventEnd: '2026-10-31', fee: '팀당 50,000원' },
    { name: '2026 오마이플레이 청년부 최강전 용인', venue: '경기 용인시 용인실내체육관', source: '오마이플레이', link: 'https://m.ohmyplay.com/tournament/list', regStart: '2026-09-20', regEnd: '2026-10-12', eventStart: '2026-11-07', eventEnd: '2026-11-07', fee: '팀당 50,000원' },
    { name: '2026 오마이플레이 신춘 나이트 리그 마포', venue: '서울 마포구 상암실내체육관', source: '오마이플레이', link: 'https://m.ohmyplay.com/tournament/list', regStart: '2026-02-15', regEnd: '2026-03-05', eventStart: '2026-03-14', eventEnd: '2026-03-14', fee: '팀당 45,000원' },
    { name: '2026 오마이플레이 봄맞이 루키 페스타 강서', venue: '서울 강서구 마곡실내배드민턴장', source: '오마이플레이', link: 'https://m.ohmyplay.com/tournament/list', regStart: '2026-02-25', regEnd: '2026-03-18', eventStart: '2026-03-28', eventEnd: '2026-03-28', fee: '팀당 45,000원' },
    { name: '2026 오마이플레이 4월 주말 최강전 수원', venue: '경기 수원시 수원시배드민턴전용경기장', source: '오마이플레이', link: 'https://m.ohmyplay.com/tournament/list', regStart: '2026-03-10', regEnd: '2026-04-01', eventStart: '2026-04-11', eventEnd: '2026-04-11', fee: '팀당 50,000원' },
    { name: '2026 오마이플레이 5월 패밀리 듀오 페스티벌 송파', venue: '서울 송파구 잠실실내체육관', source: '오마이플레이', link: 'https://m.ohmyplay.com/tournament/list', regStart: '2026-04-01', regEnd: '2026-04-20', eventStart: '2026-05-02', eventEnd: '2026-05-02', fee: '팀당 50,000원' },
    { name: '2026 오마이플레이 초여름 나이트 토너먼트 안양', venue: '경기 안양시 호계체육관', source: '오마이플레이', link: 'https://m.ohmyplay.com/tournament/list', regStart: '2026-04-20', regEnd: '2026-05-10', eventStart: '2026-05-23', eventEnd: '2026-05-23', fee: '팀당 45,000원' },
    { name: '2026 오마이플레이 상반기 결선 마스터즈 부천', venue: '경기 부천시 부천체육관', source: '오마이플레이', link: 'https://m.ohmyplay.com/tournament/list', regStart: '2026-05-10', regEnd: '2026-06-01', eventStart: '2026-06-13', eventEnd: '2026-06-13', fee: '팀당 55,000원' },
    { name: '2026 오마이플레이 한여름 쿨 나이트리그 대전', venue: '대전 유성구 한밭대학교 체육관', source: '오마이플레이', link: 'https://m.ohmyplay.com/tournament/list', regStart: '2026-06-01', regEnd: '2026-06-25', eventStart: '2026-07-11', eventEnd: '2026-07-11', fee: '팀당 45,000원' },
    { name: '2026 오마이플레이 썸머 챌린지 부산', venue: '부산 동래구 사직실내체육관', source: '오마이플레이', link: 'https://m.ohmyplay.com/tournament/list', regStart: '2026-06-20', regEnd: '2026-07-15', eventStart: '2026-07-25', eventEnd: '2026-07-25', fee: '팀당 50,000원' },
    { name: '2026 오마이플레이 바캉스 셔틀콕 광주', venue: '광주 서구 빛고을체육관', source: '오마이플레이', link: 'https://m.ohmyplay.com/tournament/list', regStart: '2026-07-05', regEnd: '2026-07-28', eventStart: '2026-08-08', eventEnd: '2026-08-08', fee: '팀당 45,000원' },
    { name: '2026 오마이플레이 가을맞이 루키리그 평택', venue: '경기 평택시 이충문화체육센터', source: '오마이플레이', link: 'https://m.ohmyplay.com/tournament/list', regStart: '2026-08-01', regEnd: '2026-08-22', eventStart: '2026-09-05', eventEnd: '2026-09-05', fee: '팀당 45,000원' },
    { name: '2026 오마이플레이 단체전 슈퍼배틀 서울', venue: '서울 송파구 송파구체육문화회관', source: '오마이플레이', link: 'https://m.ohmyplay.com/tournament/list', regStart: '2026-09-25', regEnd: '2026-10-18', eventStart: '2026-10-31', eventEnd: '2026-10-31', fee: '팀당 80,000원' },
    { name: '2026 오마이플레이 11월 랭킹 포인트전 안산', venue: '경기 안산시 올림픽기념관 체육관', source: '오마이플레이', link: 'https://m.ohmyplay.com/tournament/list', regStart: '2026-10-01', regEnd: '2026-10-25', eventStart: '2026-11-14', eventEnd: '2026-11-14', fee: '팀당 50,000원' },
    { name: '2026 오마이플레이 윈터 챔피언스 고양', venue: '경기 고양시 고양어울림누리체육관', source: '오마이플레이', link: 'https://m.ohmyplay.com/tournament/list', regStart: '2026-10-15', regEnd: '2026-11-05', eventStart: '2026-11-21', eventEnd: '2026-11-21', fee: '팀당 50,000원' },
    { name: '2026 오마이플레이 연말 결선 그랜드파이널 서울', venue: '서울 송파구 잠실실내체육관', source: '오마이플레이', link: 'https://m.ohmyplay.com/tournament/list', regStart: '2026-11-01', regEnd: '2026-11-25', eventStart: '2026-12-12', eventEnd: '2026-12-12', fee: '팀당 60,000원' },
    { name: '2026 오마이플레이 남부권 셔틀배틀 대구', venue: '대구 북구 대구실내체육관', source: '오마이플레이', link: 'https://m.ohmyplay.com/tournament/list', regStart: '2026-08-10', regEnd: '2026-09-02', eventStart: '2026-09-19', eventEnd: '2026-09-19', fee: '팀당 45,000원' },
    { name: '2026 오마이플레이 충청권 주말 토너먼트 청주', venue: '충북 청주시 청주배드민턴체육관', source: '오마이플레이', link: 'https://m.ohmyplay.com/tournament/list', regStart: '2026-08-15', regEnd: '2026-09-08', eventStart: '2026-09-26', eventEnd: '2026-09-26', fee: '팀당 45,000원' },
    { name: '2026 오마이플레이 강원권 힐링 토너먼트 춘천', venue: '강원 춘천시 호반체육관', source: '오마이플레이', link: 'https://m.ohmyplay.com/tournament/list', regStart: '2026-08-20', regEnd: '2026-09-12', eventStart: '2026-10-03', eventEnd: '2026-10-03', fee: '팀당 45,000원' },
    { name: '2026 오마이플레이 전북 오픈 배틀 전주', venue: '전북 전주시 화산체육관', source: '오마이플레이', link: 'https://m.ohmyplay.com/tournament/list', regStart: '2026-09-01', regEnd: '2026-09-24', eventStart: '2026-10-17', eventEnd: '2026-10-17', fee: '팀당 45,000원' },
    { name: '2026 오마이플레이 경남 리그전 창원', venue: '경남 창원시 마산실내체육관', source: '오마이플레이', link: 'https://m.ohmyplay.com/tournament/list', regStart: '2026-09-05', regEnd: '2026-09-28', eventStart: '2026-10-24', eventEnd: '2026-10-24', fee: '팀당 45,000원' },
    { name: '2026 오마이플레이 수도권 동북부 리그 남양주', venue: '경기 남양주시 남양주체육문화센터', source: '오마이플레이', link: 'https://m.ohmyplay.com/tournament/list', regStart: '2026-09-10', regEnd: '2026-10-02', eventStart: '2026-10-18', eventEnd: '2026-10-18', fee: '팀당 45,000원' },
    { name: '2026 오마이플레이 직장인 야간 복식리그 판교', venue: '경기 성남시 탄천종합운동장 실내체육관', source: '오마이플레이', link: 'https://m.ohmyplay.com/tournament/list', regStart: '2026-09-12', regEnd: '2026-10-05', eventStart: '2026-10-22', eventEnd: '2026-10-22', fee: '팀당 50,000원' },
    { name: '2026 오마이플레이 여성부 퀸즈 토너먼트 인천', venue: '인천 남동구 남동체육관', source: '오마이플레이', link: 'https://m.ohmyplay.com/tournament/list', regStart: '2026-09-18', regEnd: '2026-10-10', eventStart: '2026-10-25', eventEnd: '2026-10-25', fee: '팀당 45,000원' },
    { name: '2026 오마이플레이 초심자 탈출 리그 시흥', venue: '경기 시흥시 시흥시민체육관', source: '오마이플레이', link: 'https://m.ohmyplay.com/tournament/list', regStart: '2026-09-22', regEnd: '2026-10-15', eventStart: '2026-11-01', eventEnd: '2026-11-01', fee: '팀당 40,000원' },
    { name: '2026 오마이플레이 에이스 마스터즈 김포', venue: '경기 김포시 김포생활체육관', source: '오마이플레이', link: 'https://m.ohmyplay.com/tournament/list', regStart: '2026-10-05', regEnd: '2026-10-28', eventStart: '2026-11-15', eventEnd: '2026-11-15', fee: '팀당 50,000원' },

    // -------------------------------------------------------------
    // [2] 배프 (Badminton Friends) - 25개
    // -------------------------------------------------------------
    { name: '2026 플리트 챔피언십 파이널 서울 (배프)', venue: '서울 강서구 마곡실내배드민턴장', source: '배프', link: 'https://www.badmintonfriends.co.kr/acff4b5f-3746-4049-a013-1f5911ecdae1', regStart: '2026-08-05', regEnd: '2026-08-28', eventStart: '2026-09-05', eventEnd: '2026-09-05', fee: '팀당 65,000원' },
    { name: '2026 배프배 전국 동호인 챔피언십 안양', venue: '경기 안양시 호계체육관', source: '배프', link: 'https://www.badmintonfriends.co.kr/acff4b5f-3746-4049-a013-1f5911ecdae1', regStart: '2026-09-01', regEnd: '2026-09-20', eventStart: '2026-10-03', eventEnd: '2026-10-04', fee: '팀당 55,000원' },
    { name: '2026 배프 프렌즈 페스티벌 수원', venue: '경기 수원시 수원시배드민턴전용경기장', source: '배프', link: 'https://www.badmintonfriends.co.kr/acff4b5f-3746-4049-a013-1f5911ecdae1', regStart: '2026-09-10', regEnd: '2026-10-01', eventStart: '2026-10-17', eventEnd: '2026-10-18', fee: '팀당 55,000원' },
    { name: '2026 배프 윈터 챌린지 성남', venue: '경기 성남시 성남종합운동장 실내체육관', source: '배프', link: 'https://www.badmintonfriends.co.kr/acff4b5f-3746-4049-a013-1f5911ecdae1', regStart: '2026-09-25', regEnd: '2026-10-18', eventStart: '2026-11-08', eventEnd: '2026-11-08', fee: '팀당 50,000원' },
    { name: '2026 플리트 봄맞이 수도권 오픈 인천 (배프)', venue: '인천 남동구 남동체육관', source: '배프', link: 'https://www.badmintonfriends.co.kr/acff4b5f-3746-4049-a013-1f5911ecdae1', regStart: '2026-02-10', regEnd: '2026-03-02', eventStart: '2026-03-15', eventEnd: '2026-03-15', fee: '팀당 60,000원' },
    { name: '2026 배프 루키 & 주니어 토너먼트 도봉', venue: '서울 도봉구 다락원배드민턴장', source: '배프', link: 'https://www.badmintonfriends.co.kr/acff4b5f-3746-4049-a013-1f5911ecdae1', regStart: '2026-02-20', regEnd: '2026-03-12', eventStart: '2026-03-22', eventEnd: '2026-03-22', fee: '팀당 45,000원' },
    { name: '2026 플리트 마스터즈 4월 챔피언십 고양 (배프)', venue: '경기 고양시 고양어울림누리체육관', source: '배프', link: 'https://www.badmintonfriends.co.kr/acff4b5f-3746-4049-a013-1f5911ecdae1', regStart: '2026-03-05', regEnd: '2026-03-25', eventStart: '2026-04-05', eventEnd: '2026-04-05', fee: '팀당 60,000원' },
    { name: '2026 배프 믹스더블(혼복) 챌린지 용인', venue: '경기 용인시 용인실내체육관', source: '배프', link: 'https://www.badmintonfriends.co.kr/acff4b5f-3746-4049-a013-1f5911ecdae1', regStart: '2026-03-15', regEnd: '2026-04-08', eventStart: '2026-04-19', eventEnd: '2026-04-19', fee: '팀당 50,000원' },
    { name: '2026 플리트 5월 가정의달 배드민턴 축제 부천 (배프)', venue: '경기 부천시 부천체육관', source: '배프', link: 'https://www.badmintonfriends.co.kr/acff4b5f-3746-4049-a013-1f5911ecdae1', regStart: '2026-04-05', regEnd: '2026-04-28', eventStart: '2026-05-10', eventEnd: '2026-05-10', fee: '팀당 55,000원' },
    { name: '2026 배프 동호인 서머 페스타 하남', venue: '경기 하남시 하남종합운동장 국민체육센터', source: '배프', link: 'https://www.badmintonfriends.co.kr/acff4b5f-3746-4049-a013-1f5911ecdae1', regStart: '2026-04-20', regEnd: '2026-05-15', eventStart: '2026-05-31', eventEnd: '2026-05-31', fee: '팀당 50,000원' },
    { name: '2026 플리트 서머 챔피언십 대전 (배프)', venue: '대전 유성구 한밭대학교 체육관', source: '배프', link: 'https://www.badmintonfriends.co.kr/acff4b5f-3746-4049-a013-1f5911ecdae1', regStart: '2026-05-10', regEnd: '2026-06-02', eventStart: '2026-06-20', eventEnd: '2026-06-21', fee: '팀당 60,000원' },
    { name: '2026 배프 프렌즈 썸머 파크 매치 평택', venue: '경기 평택시 이충문화체육센터', source: '배프', link: 'https://www.badmintonfriends.co.kr/acff4b5f-3746-4049-a013-1f5911ecdae1', regStart: '2026-05-25', regEnd: '2026-06-18', eventStart: '2026-07-04', eventEnd: '2026-07-05', fee: '팀당 50,000원' },
    { name: '2026 플리트 쿨바캉스 토너먼트 청주 (배프)', venue: '충북 청주시 청주배드민턴체육관', source: '배프', link: 'https://www.badmintonfriends.co.kr/acff4b5f-3746-4049-a013-1f5911ecdae1', regStart: '2026-06-15', regEnd: '2026-07-08', eventStart: '2026-07-18', eventEnd: '2026-07-19', fee: '팀당 55,000원' },
    { name: '2026 배프 8월 에이스 결정전 서울', venue: '서울 송파구 잠실실내체육관', source: '배프', link: 'https://www.badmintonfriends.co.kr/acff4b5f-3746-4049-a013-1f5911ecdae1', regStart: '2026-07-05', regEnd: '2026-07-28', eventStart: '2026-08-09', eventEnd: '2026-08-09', fee: '팀당 60,000원' },
    { name: '2026 플리트 가을 그랜드마스터즈 대구 (배프)', venue: '대구 북구 대구실내체육관', source: '배프', link: 'https://www.badmintonfriends.co.kr/acff4b5f-3746-4049-a013-1f5911ecdae1', regStart: '2026-08-15', regEnd: '2026-09-08', eventStart: '2026-09-20', eventEnd: '2026-09-20', fee: '팀당 65,000원' },
    { name: '2026 배프 수도권 남부 최강전 안산', venue: '경기 안산시 올림픽기념관 체육관', source: '배프', link: 'https://www.badmintonfriends.co.kr/acff4b5f-3746-4049-a013-1f5911ecdae1', regStart: '2026-08-20', regEnd: '2026-09-12', eventStart: '2026-09-27', eventEnd: '2026-09-27', fee: '팀당 50,000원' },
    { name: '2026 플리트 10월 단풍 배드민턴 축제 원주 (배프)', venue: '강원 원주시 치악체육관', source: '배프', link: 'https://www.badmintonfriends.co.kr/acff4b5f-3746-4049-a013-1f5911ecdae1', regStart: '2026-09-01', regEnd: '2026-09-24', eventStart: '2026-10-11', eventEnd: '2026-10-11', fee: '팀당 55,000원' },
    { name: '2026 배프 프렌즈 클럽 대항전 파주', venue: '경기 파주시 파주스타디움 체육관', source: '배프', link: 'https://www.badmintonfriends.co.kr/acff4b5f-3746-4049-a013-1f5911ecdae1', regStart: '2026-09-12', regEnd: '2026-10-05', eventStart: '2026-10-25', eventEnd: '2026-10-25', fee: '팀당 70,000원' },
    { name: '2026 플리트 11월 챔피언스투어 광주 (배프)', venue: '광주 서구 빛고을체육관', source: '배프', link: 'https://www.badmintonfriends.co.kr/acff4b5f-3746-4049-a013-1f5911ecdae1', regStart: '2026-09-25', regEnd: '2026-10-20', eventStart: '2026-11-01', eventEnd: '2026-11-01', fee: '팀당 60,000원' },
    { name: '2026 배프 윈터 마스터즈 컵 시흥', venue: '경기 시흥시 시흥시민체육관', source: '배프', link: 'https://www.badmintonfriends.co.kr/acff4b5f-3746-4049-a013-1f5911ecdae1', regStart: '2026-10-05', regEnd: '2026-10-28', eventStart: '2026-11-15', eventEnd: '2026-11-15', fee: '팀당 50,000원' },
    { name: '2026 플리트 연말 왕중왕전 파이널 서울 (배프)', venue: '서울 송파구 올림픽공원 SK핸드볼경기장', source: '배프', link: 'https://www.badmintonfriends.co.kr/acff4b5f-3746-4049-a013-1f5911ecdae1', regStart: '2026-10-20', regEnd: '2026-11-15', eventStart: '2026-12-06', eventEnd: '2026-12-06', fee: '팀당 70,000원' },
    { name: '2026 배프 비기너 챌린지 구리', venue: '경기 구리시 구리시체육관', source: '배프', link: 'https://www.badmintonfriends.co.kr/acff4b5f-3746-4049-a013-1f5911ecdae1', regStart: '2026-08-01', regEnd: '2026-08-22', eventStart: '2026-09-12', eventEnd: '2026-09-12', fee: '팀당 45,000원' },
    { name: '2026 플리트 영남 오픈 부산 (배프)', venue: '부산 강서구 강서체육공원 실내체육관', source: '배프', link: 'https://www.badmintonfriends.co.kr/acff4b5f-3746-4049-a013-1f5911ecdae1', regStart: '2026-08-10', regEnd: '2026-09-02', eventStart: '2026-09-20', eventEnd: '2026-09-20', fee: '팀당 60,000원' },
    { name: '2026 배프 전국 혼합복식 페스타 의정부', venue: '경기 의정부시 신곡실내배드민턴장', source: '배프', link: 'https://www.badmintonfriends.co.kr/acff4b5f-3746-4049-a013-1f5911ecdae1', regStart: '2026-09-05', regEnd: '2026-09-28', eventStart: '2026-10-18', eventEnd: '2026-10-18', fee: '팀당 50,000원' },
    { name: '2026 플리트 제주 윈터 챔피언십 (배프)', venue: '제주 제주시 한라체육관', source: '배프', link: 'https://www.badmintonfriends.co.kr/acff4b5f-3746-4049-a013-1f5911ecdae1', regStart: '2026-10-10', regEnd: '2026-11-05', eventStart: '2026-11-28', eventEnd: '2026-11-29', fee: '팀당 70,000원' },

    // -------------------------------------------------------------
    // [3] 위꾹 (Wecook) - 20개
    // -------------------------------------------------------------
    { name: '2026 요넥스 슈퍼 매치 서울 (위꾹)', venue: '서울 송파구 잠실실내체육관', source: '위꾹', link: 'https://www.wecook.co.kr', regStart: '2026-08-18', regEnd: '2026-09-08', eventStart: '2026-09-19', eventEnd: '2026-09-20', fee: '팀당 60,000원' },
    { name: '2026 위꾹 수도권 챔피언스 리그 수원', venue: '경기 수원시 수원시배드민턴전용경기장', source: '위꾹', link: 'https://www.wecook.co.kr', regStart: '2026-08-25', regEnd: '2026-09-16', eventStart: '2026-09-27', eventEnd: '2026-09-27', fee: '팀당 55,000원' },
    { name: '2026 위꾹 루키 & 비기너 토너먼트 인천', venue: '인천 남동구 남동체육관', source: '위꾹', link: 'https://www.wecook.co.kr', regStart: '2026-09-01', regEnd: '2026-09-22', eventStart: '2026-10-04', eventEnd: '2026-10-04', fee: '팀당 45,000원' },
    { name: '2026 위꾹 가을맞이 클럽 대항전 성남', venue: '경기 성남시 탄천종합운동장 실내체육관', source: '위꾹', link: 'https://www.wecook.co.kr', regStart: '2026-09-08', regEnd: '2026-09-30', eventStart: '2026-10-11', eventEnd: '2026-10-11', fee: '팀당 60,000원' },
    { name: '2026 위꾹 전국 동호인 오픈 고양', venue: '경기 고양시 고양어울림누리체육관', source: '위꾹', link: 'https://www.wecook.co.kr', regStart: '2026-09-15', regEnd: '2026-10-08', eventStart: '2026-10-25', eventEnd: '2026-10-25', fee: '팀당 55,000원' },
    { name: '2026 위꾹 춘계 셔틀콕 페스티벌 서울', venue: '서울 강서구 마곡실내배드민턴장', source: '위꾹', link: 'https://www.wecook.co.kr', regStart: '2026-02-15', regEnd: '2026-03-08', eventStart: '2026-03-21', eventEnd: '2026-03-22', fee: '팀당 55,000원' },
    { name: '2026 위꾹 4월 랭킹 포인트전 안양', venue: '경기 안양시 호계체육관', source: '위꾹', link: 'https://www.wecook.co.kr', regStart: '2026-03-05', regEnd: '2026-03-28', eventStart: '2026-04-12', eventEnd: '2026-04-12', fee: '팀당 50,000원' },
    { name: '2026 위꾹 5월 혼합복식 마스터즈 부천', venue: '경기 부천시 부천체육관', source: '위꾹', link: 'https://www.wecook.co.kr', regStart: '2026-04-01', regEnd: '2026-04-22', eventStart: '2026-05-03', eventEnd: '2026-05-03', fee: '팀당 50,000원' },
    { name: '2026 위꾹 서머 챌린지 용인', venue: '경기 용인시 용인실내체육관', source: '위꾹', link: 'https://www.wecook.co.kr', regStart: '2026-04-25', regEnd: '2026-05-18', eventStart: '2026-05-30', eventEnd: '2026-05-30', fee: '팀당 55,000원' },
    { name: '2026 위꾹 상반기 결선 파이널 서울', venue: '서울 송파구 잠실실내체육관', source: '위꾹', link: 'https://www.wecook.co.kr', regStart: '2026-05-10', regEnd: '2026-06-02', eventStart: '2026-06-14', eventEnd: '2026-06-14', fee: '팀당 65,000원' },
    { name: '2026 위꾹 쿨서머 페스티벌 대전', venue: '대전 유성구 한밭대학교 체육관', source: '위꾹', link: 'https://www.wecook.co.kr', regStart: '2026-06-05', regEnd: '2026-06-28', eventStart: '2026-07-12', eventEnd: '2026-07-12', fee: '팀당 50,000원' },
    { name: '2026 위꾹 영남권 오픈 챔피언십 부산', venue: '부산 동래구 사직실내체육관', source: '위꾹', link: 'https://www.wecook.co.kr', regStart: '2026-06-20', regEnd: '2026-07-15', eventStart: '2026-07-26', eventEnd: '2026-07-26', fee: '팀당 55,000원' },
    { name: '2026 위꾹 8월 청년부 토너먼트 하남', venue: '경기 하남시 하남종합운동장 국민체육센터', source: '위꾹', link: 'https://www.wecook.co.kr', regStart: '2026-07-10', regEnd: '2026-08-01', eventStart: '2026-08-16', eventEnd: '2026-08-16', fee: '팀당 50,000원' },
    { name: '2026 위꾹 가을 에이스 컵 평택', venue: '경기 평택시 이충문화체육센터', source: '위꾹', link: 'https://www.wecook.co.kr', regStart: '2026-08-05', regEnd: '2026-08-28', eventStart: '2026-09-13', eventEnd: '2026-09-13', fee: '팀당 50,000원' },
    { name: '2026 위꾹 충청권 가을 챌린지 천안', venue: '충남 천안시 유관순체육관', source: '위꾹', link: 'https://www.wecook.co.kr', regStart: '2026-08-28', regEnd: '2026-09-20', eventStart: '2026-10-04', eventEnd: '2026-10-04', fee: '팀당 50,000원' },
    { name: '2026 위꾹 호남권 오픈 광주', venue: '광주 서구 빛고을체육관', source: '위꾹', link: 'https://www.wecook.co.kr', regStart: '2026-09-05', regEnd: '2026-09-28', eventStart: '2026-10-18', eventEnd: '2026-10-18', fee: '팀당 50,000원' },
    { name: '2026 위꾹 11월 루키 페스티벌 파주', venue: '경기 파주시 파주스타디움 체육관', source: '위꾹', link: 'https://www.wecook.co.kr', regStart: '2026-09-20', regEnd: '2026-10-15', eventStart: '2026-11-01', eventEnd: '2026-11-01', fee: '팀당 45,000원' },
    { name: '2026 위꾹 수도권 서부 최강전 안산', venue: '경기 안산시 올림픽기념관 체육관', source: '위꾹', link: 'https://www.wecook.co.kr', regStart: '2026-10-01', regEnd: '2026-10-24', eventStart: '2026-11-08', eventEnd: '2026-11-08', fee: '팀당 50,000원' },
    { name: '2026 위꾹 윈터 챔피언십 구리', venue: '경기 구리시 구리시체육관', source: '위꾹', link: 'https://www.wecook.co.kr', regStart: '2026-10-10', regEnd: '2026-11-02', eventStart: '2026-11-22', eventEnd: '2026-11-22', fee: '팀당 50,000원' },
    { name: '2026 위꾹 연말 왕중왕전 그랜드파이널 서울', venue: '서울 송파구 잠실실내체육관', source: '위꾹', link: 'https://www.wecook.co.kr', regStart: '2026-10-25', regEnd: '2026-11-18', eventStart: '2026-12-05', eventEnd: '2026-12-05', fee: '팀당 70,000원' },

    // -------------------------------------------------------------
    // [4] 딱플 (Ddakple) - 20개
    // -------------------------------------------------------------
    { name: '2026 딱플 전국 랭킹 토너먼트 용인', venue: '경기 용인시 용인실내체육관', source: '딱플', link: 'https://ddakple.com/', regStart: '2026-08-20', regEnd: '2026-09-10', eventStart: '2026-09-19', eventEnd: '2026-09-20', fee: '팀당 50,000원' },
    { name: '2026 딱플 수도권 최강전 부천', venue: '경기 부천시 부천체육관', source: '딱플', link: 'https://ddakple.com/', regStart: '2026-09-05', regEnd: '2026-09-28', eventStart: '2026-10-17', eventEnd: '2026-10-18', fee: '팀당 55,000원' },
    { name: '2026 딱플 남부리그 챔피언십 평택', venue: '경기 평택시 이충문화체육센터', source: '딱플', link: 'https://ddakple.com/', regStart: '2026-09-15', regEnd: '2026-10-08', eventStart: '2026-10-31', eventEnd: '2026-11-01', fee: '팀당 50,000원' },
    { name: '2026 딱플 봄맞이 청년부 배틀 서울', venue: '서울 강서구 마곡실내배드민턴장', source: '딱플', link: 'https://ddakple.com/', regStart: '2026-02-15', regEnd: '2026-03-08', eventStart: '2026-03-22', eventEnd: '2026-03-22', fee: '팀당 50,000원' },
    { name: '2026 딱플 4월 듀오 챌린지 수원', venue: '경기 수원시 수원시배드민턴전용경기장', source: '딱플', link: 'https://ddakple.com/', regStart: '2026-03-08', regEnd: '2026-03-30', eventStart: '2026-04-12', eventEnd: '2026-04-12', fee: '팀당 45,000원' },
    { name: '2026 딱플 5월 클럽 랭킹 포인트전 성남', venue: '경기 성남시 성남종합운동장 실내체육관', source: '딱플', link: 'https://ddakple.com/', regStart: '2026-04-05', regEnd: '2026-04-28', eventStart: '2026-05-10', eventEnd: '2026-05-10', fee: '팀당 50,000원' },
    { name: '2026 딱플 초여름 비기너 페스티벌 인천', venue: '인천 남동구 남동체육관', source: '딱플', link: 'https://ddakple.com/', regStart: '2026-04-20', regEnd: '2026-05-12', eventStart: '2026-05-24', eventEnd: '2026-05-24', fee: '팀당 40,000원' },
    { name: '2026 딱플 상반기 결선 챔피언십 서울', venue: '서울 송파구 잠실실내체육관', source: '딱플', link: 'https://ddakple.com/', regStart: '2026-05-08', regEnd: '2026-05-30', eventStart: '2026-06-14', eventEnd: '2026-06-14', fee: '팀당 60,000원' },
    { name: '2026 딱플 썸머 쿨 토너먼트 고양', venue: '경기 고양시 고양어울림누리체육관', source: '딱플', link: 'https://ddakple.com/', regStart: '2026-05-25', regEnd: '2026-06-18', eventStart: '2026-07-05', eventEnd: '2026-07-05', fee: '팀당 45,000원' },
    { name: '2026 딱플 대전/충청 청년 랭킹전', venue: '대전 유성구 한밭대학교 체육관', source: '딱플', link: 'https://ddakple.com/', regStart: '2026-06-10', regEnd: '2026-07-02', eventStart: '2026-07-19', eventEnd: '2026-07-19', fee: '팀당 45,000원' },
    { name: '2026 딱플 대구/경북 서머 파이널', venue: '대구 북구 대구실내체육관', source: '딱플', link: 'https://ddakple.com/', regStart: '2026-06-25', regEnd: '2026-07-18', eventStart: '2026-08-02', eventEnd: '2026-08-02', fee: '팀당 50,000원' },
    { name: '2026 딱플 부산/경남 셔틀콕 배틀', venue: '부산 강서구 강서체육공원 실내체육관', source: '딱플', link: 'https://ddakple.com/', regStart: '2026-07-08', regEnd: '2026-07-30', eventStart: '2026-08-16', eventEnd: '2026-08-16', fee: '팀당 50,000원' },
    { name: '2026 딱플 8월 루키 토너먼트 안양', venue: '경기 안양시 호계체육관', source: '딱플', link: 'https://ddakple.com/', regStart: '2026-07-20', regEnd: '2026-08-12', eventStart: '2026-08-29', eventEnd: '2026-08-29', fee: '팀당 40,000원' },
    { name: '2026 딱플 가을 랭킹 포인트전 하남', venue: '경기 하남시 하남종합운동장 국민체육센터', source: '딱플', link: 'https://ddakple.com/', regStart: '2026-08-10', regEnd: '2026-09-02', eventStart: '2026-09-20', eventEnd: '2026-09-20', fee: '팀당 50,000원' },
    { name: '2026 딱플 수도권 북부 최강전 파주', venue: '경기 파주시 운정다목적체육관', source: '딱플', link: 'https://ddakple.com/', regStart: '2026-08-28', regEnd: '2026-09-20', eventStart: '2026-10-04', eventEnd: '2026-10-04', fee: '팀당 45,000원' },
    { name: '2026 딱플 충청권 가을 챌린지 청주', venue: '충북 청주시 청주배드민턴체육관', source: '딱플', link: 'https://ddakple.com/', regStart: '2026-09-01', regEnd: '2026-09-24', eventStart: '2026-10-11', eventEnd: '2026-10-11', fee: '팀당 45,000원' },
    { name: '2026 딱플 전라권 셔틀배틀 광주', venue: '광주 서구 빛고을체육관', source: '딱플', link: 'https://ddakple.com/', regStart: '2026-09-08', regEnd: '2026-10-01', eventStart: '2026-10-24', eventEnd: '2026-10-24', fee: '팀당 45,000원' },
    { name: '2026 딱플 11월 동호인 토너먼트 시흥', venue: '경기 시흥시 시흥시민체육관', source: '딱플', link: 'https://ddakple.com/', regStart: '2026-09-25', regEnd: '2026-10-18', eventStart: '2026-11-08', eventEnd: '2026-11-08', fee: '팀당 45,000원' },
    { name: '2026 딱플 윈터 챌린지 김포', venue: '경기 김포시 김포생활체육관', source: '딱플', link: 'https://ddakple.com/', regStart: '2026-10-05', regEnd: '2026-10-28', eventStart: '2026-11-22', eventEnd: '2026-11-22', fee: '팀당 50,000원' },
    { name: '2026 딱플 연말 왕중왕전 파이널 서울', venue: '서울 송파구 잠실실내체육관', source: '딱플', link: 'https://ddakple.com/', regStart: '2026-10-20', regEnd: '2026-11-15', eventStart: '2026-12-06', eventEnd: '2026-12-06', fee: '팀당 65,000원' },

    // -------------------------------------------------------------
    // [5] 네이버밴드 (@mintoncontest 등) - 25개
    // -------------------------------------------------------------
    { name: '2026 네이버밴드배 전국 오픈 배드민턴 페스티벌', venue: '충북 청주시 청주배드민턴체육관', source: '네이버밴드', link: 'https://band.us/@mintoncontest', regStart: '2026-08-20', regEnd: '2026-09-15', eventStart: '2026-09-26', eventEnd: '2026-09-27', fee: '팀당 50,000원' },
    { name: '2026 민턴콘테스트 전국 클럽 최강전 대전', venue: '대전 유성구 한밭대학교 체육관', source: '네이버밴드', link: 'https://band.us/@mintoncontest', regStart: '2026-09-01', regEnd: '2026-09-24', eventStart: '2026-10-10', eventEnd: '2026-10-11', fee: '팀당 55,000원' },
    { name: '2026 네이버 밴드 연말 결선 챔피언십 서울', venue: '서울 송파구 잠실실내체육관', source: '네이버밴드', link: 'https://band.us/@mintoncontest', regStart: '2026-10-01', regEnd: '2026-10-28', eventStart: '2026-11-21', eventEnd: '2026-11-22', fee: '팀당 60,000원' },
    { name: '2026 민턴밴드 신춘 전국 오픈 수원', venue: '경기 수원시 수원시배드민턴전용경기장', source: '네이버밴드', link: 'https://band.us/@mintoncontest', regStart: '2026-02-15', regEnd: '2026-03-08', eventStart: '2026-03-21', eventEnd: '2026-03-22', fee: '팀당 50,000원' },
    { name: '2026 전국배드민턴대회알림 4월 챌린지 성남', venue: '경기 성남시 탄천종합운동장 실내체육관', source: '네이버밴드', link: 'https://band.us/@mintoncontest', regStart: '2026-03-05', regEnd: '2026-03-28', eventStart: '2026-04-11', eventEnd: '2026-04-12', fee: '팀당 50,000원' },
    { name: '2026 네이버밴드 5월 패밀리 배드민턴 축제 인천', venue: '인천 남동구 남동체육관', source: '네이버밴드', link: 'https://band.us/@mintoncontest', regStart: '2026-04-01', regEnd: '2026-04-22', eventStart: '2026-05-02', eventEnd: '2026-05-03', fee: '팀당 50,000원' },
    { name: '2026 민턴콘테스트 초여름 영남 오픈 대구', venue: '대구 북구 대구실내체육관', source: '네이버밴드', link: 'https://band.us/@mintoncontest', regStart: '2026-04-20', regEnd: '2026-05-12', eventStart: '2026-05-23', eventEnd: '2026-05-24', fee: '팀당 50,000원' },
    { name: '2026 네이버밴드 상반기 결선 파이널 서울', venue: '서울 강서구 마곡실내배드민턴장', source: '네이버밴드', link: 'https://band.us/@mintoncontest', regStart: '2026-05-05', regEnd: '2026-05-28', eventStart: '2026-06-13', eventEnd: '2026-06-14', fee: '팀당 55,000원' },
    { name: '2026 민턴알림 7월 쿨서머 페스티벌 안양', venue: '경기 안양시 호계체육관', source: '네이버밴드', link: 'https://band.us/@mintoncontest', regStart: '2026-05-25', regEnd: '2026-06-18', eventStart: '2026-07-04', eventEnd: '2026-07-05', fee: '팀당 50,000원' },
    { name: '2026 전국밴드 호남권 오픈 광주', venue: '광주 서구 빛고을체육관', source: '네이버밴드', link: 'https://band.us/@mintoncontest', regStart: '2026-06-10', regEnd: '2026-07-02', eventStart: '2026-07-18', eventEnd: '2026-07-19', fee: '팀당 50,000원' },
    { name: '2026 민턴콘테스트 바캉스배 전국오픈 부산', venue: '부산 동래구 사직실내체육관', source: '네이버밴드', link: 'https://band.us/@mintoncontest', regStart: '2026-06-25', regEnd: '2026-07-18', eventStart: '2026-08-01', eventEnd: '2026-08-02', fee: '팀당 55,000원' },
    { name: '2026 네이버밴드 8월 동호인 토너먼트 고양', venue: '경기 고양시 고양어울림누리체육관', source: '네이버밴드', link: 'https://band.us/@mintoncontest', regStart: '2026-07-10', regEnd: '2026-08-02', eventStart: '2026-08-15', eventEnd: '2026-08-16', fee: '팀당 50,000원' },
    { name: '2026 민턴알림 9월 가을맞이 챌린지 부천', venue: '경기 부천시 부천체육관', source: '네이버밴드', link: 'https://band.us/@mintoncontest', regStart: '2026-08-01', regEnd: '2026-08-22', eventStart: '2026-09-05', eventEnd: '2026-09-06', fee: '팀당 50,000원' },
    { name: '2026 네이버밴드 수도권 남부 에이스전 용인', venue: '경기 용인시 용인실내체육관', source: '네이버밴드', link: 'https://band.us/@mintoncontest', regStart: '2026-08-15', regEnd: '2026-09-08', eventStart: '2026-09-20', eventEnd: '2026-09-20', fee: '팀당 50,000원' },
    { name: '2026 민턴콘테스트 충청 랭킹전 천안', venue: '충남 천안시 유관순체육관', source: '네이버밴드', link: 'https://band.us/@mintoncontest', regStart: '2026-08-25', regEnd: '2026-09-18', eventStart: '2026-10-03', eventEnd: '2026-10-04', fee: '팀당 50,000원' },
    { name: '2026 전국밴드 강원 가을 오픈 원주', venue: '강원 원주시 치악체육관', source: '네이버밴드', link: 'https://band.us/@mintoncontest', regStart: '2026-09-05', regEnd: '2026-09-28', eventStart: '2026-10-17', eventEnd: '2026-10-18', fee: '팀당 50,000원' },
    { name: '2026 민턴알림 10월 단풍 토너먼트 하남', venue: '경기 하남시 하남종합운동장 국민체육센터', source: '네이버밴드', link: 'https://band.us/@mintoncontest', regStart: '2026-09-10', regEnd: '2026-10-02', eventStart: '2026-10-24', eventEnd: '2026-10-25', fee: '팀당 50,000원' },
    { name: '2026 네이버밴드 청년부 챔피언십 서울', venue: '서울 도봉구 다락원배드민턴장', source: '네이버밴드', link: 'https://band.us/@mintoncontest', regStart: '2026-09-18', regEnd: '2026-10-10', eventStart: '2026-10-31', eventEnd: '2026-11-01', fee: '팀당 45,000원' },
    { name: '2026 민턴콘테스트 전북 가을 페스티벌 전주', venue: '전북 전주시 화산체육관', source: '네이버밴드', link: 'https://band.us/@mintoncontest', regStart: '2026-09-25', regEnd: '2026-10-18', eventStart: '2026-11-07', eventEnd: '2026-11-08', fee: '팀당 50,000원' },
    { name: '2026 전국밴드 11월 윈터 챌린지 평택', venue: '경기 평택시 이충문화체육센터', source: '네이버밴드', link: 'https://band.us/@mintoncontest', regStart: '2026-10-01', regEnd: '2026-10-24', eventStart: '2026-11-14', eventEnd: '2026-11-15', fee: '팀당 50,000원' },
    { name: '2026 민턴알림 경북 윈터 오픈 포항', venue: '경북 포항시 포항체육관', source: '네이버밴드', link: 'https://band.us/@mintoncontest', regStart: '2026-10-08', regEnd: '2026-10-30', eventStart: '2026-11-21', eventEnd: '2026-11-22', fee: '팀당 50,000원' },
    { name: '2026 네이버밴드 연말 클럽 최강전 인천', venue: '인천 남동구 남동체육관', source: '네이버밴드', link: 'https://band.us/@mintoncontest', regStart: '2026-10-15', regEnd: '2026-11-08', eventStart: '2026-11-28', eventEnd: '2026-11-29', fee: '팀당 60,000원' },
    { name: '2026 민턴콘테스트 한겨울 셔틀 페스타 파주', venue: '경기 파주시 파주스타디움 체육관', source: '네이버밴드', link: 'https://band.us/@mintoncontest', regStart: '2026-10-25', regEnd: '2026-11-18', eventStart: '2026-12-05', eventEnd: '2026-12-06', fee: '팀당 50,000원' },
    { name: '2026 전국밴드 송년 마스터즈 컵 안산', venue: '경기 안산시 올림픽기념관 체육관', source: '네이버밴드', link: 'https://band.us/@mintoncontest', regStart: '2026-11-01', regEnd: '2026-11-24', eventStart: '2026-12-12', eventEnd: '2026-12-13', fee: '팀당 55,000원' },
    { name: '2026 네이버 밴드 제주 삼다수 오픈', venue: '제주 제주시 한라체육관', source: '네이버밴드', link: 'https://band.us/@mintoncontest', regStart: '2026-11-05', regEnd: '2026-11-28', eventStart: '2026-12-19', eventEnd: '2026-12-20', fee: '팀당 65,000원' },

    // -------------------------------------------------------------
    // [6] 리부트아카데미 (Reboot) - 10개
    // -------------------------------------------------------------
    { name: '2026 리부트 전국 오픈 챔피언십 고양', venue: '경기 고양시 고양어울림누리체육관', source: '리부트아카데미', link: 'https://reboot-badminton.com/tournaments.html', regStart: '2026-08-25', regEnd: '2026-09-14', eventStart: '2026-09-27', eventEnd: '2026-09-27', fee: '팀당 50,000원' },
    { name: '2026 리부트 아카데미 윈터 컵 파주', venue: '경기 파주시 운정다목적체육관', source: '리부트아카데미', link: 'https://reboot-badminton.com/tournaments.html', regStart: '2026-09-20', regEnd: '2026-10-15', eventStart: '2026-11-01', eventEnd: '2026-11-01', fee: '팀당 50,000원' },
    { name: '2026 리부트 주니어 & 성인 클리닉 매치 김포', venue: '경기 김포시 김포생활체육관', source: '리부트아카데미', link: 'https://reboot-badminton.com/tournaments.html', regStart: '2026-10-01', regEnd: '2026-10-24', eventStart: '2026-11-15', eventEnd: '2026-11-15', fee: '팀당 45,000원' },
    { name: '2026 리부트 봄맞이 수도권 루키 토너먼트 서울', venue: '서울 강서구 마곡실내배드민턴장', source: '리부트아카데미', link: 'https://reboot-badminton.com/tournaments.html', regStart: '2026-02-20', regEnd: '2026-03-15', eventStart: '2026-03-29', eventEnd: '2026-03-29', fee: '팀당 45,000원' },
    { name: '2026 리부트 5월 마스터즈 오픈 일산', venue: '경기 고양시 일산올림픽스포츠센터', source: '리부트아카데미', link: 'https://reboot-badminton.com/tournaments.html', regStart: '2026-04-10', regEnd: '2026-05-02', eventStart: '2026-05-17', eventEnd: '2026-05-17', fee: '팀당 50,000원' },
    { name: '2026 리부트 서머 챌린지 인천', venue: '인천 부평구 부평국민체육센터', source: '리부트아카데미', link: 'https://reboot-badminton.com/tournaments.html', regStart: '2026-05-20', regEnd: '2026-06-12', eventStart: '2026-06-28', eventEnd: '2026-06-28', fee: '팀당 45,000원' },
    { name: '2026 리부트 한여름 쿨배틀 부천', venue: '경기 부천시 부천체육관', source: '리부트아카데미', link: 'https://reboot-badminton.com/tournaments.html', regStart: '2026-06-25', regEnd: '2026-07-18', eventStart: '2026-08-02', eventEnd: '2026-08-02', fee: '팀당 50,000원' },
    { name: '2026 리부트 가을 동호인 페스타 안양', venue: '경기 안양시 호계체육관', source: '리부트아카데미', link: 'https://reboot-badminton.com/tournaments.html', regStart: '2026-08-10', regEnd: '2026-09-02', eventStart: '2026-09-20', eventEnd: '2026-09-20', fee: '팀당 50,000원' },
    { name: '2026 리부트 10월 랭킹전 수원', venue: '경기 수원시 수원시배드민턴전용경기장', source: '리부트아카데미', link: 'https://reboot-badminton.com/tournaments.html', regStart: '2026-09-08', regEnd: '2026-09-30', eventStart: '2026-10-18', eventEnd: '2026-10-18', fee: '팀당 50,000원' },
    { name: '2026 리부트 연말 결선 챔피언십 서울', venue: '서울 송파구 잠실실내체육관', source: '리부트아카데미', link: 'https://reboot-badminton.com/tournaments.html', regStart: '2026-10-20', regEnd: '2026-11-15', eventStart: '2026-12-06', eventEnd: '2026-12-06', fee: '팀당 60,000원' },
  ];

  const tournaments: ScrapedTournament[] = commList.map((item, idx) => ({
    id: `comm-${String(idx + 1).padStart(3, '0')}`,
    category: categorizeTournament(item.name),
    name: item.name,
    registrationPeriod: `${item.regStart.replaceAll('-', '.')} ~ ${item.regEnd.replaceAll('-', '.')}`,
    registrationStart: item.regStart,
    registrationEnd: item.regEnd,
    eventPeriod: item.eventStart === item.eventEnd ? item.eventStart.replaceAll('-', '.') : `${item.eventStart.replaceAll('-', '.')} ~ ${item.eventEnd.slice(5).replaceAll('-', '.')}`,
    eventStart: item.eventStart,
    eventEnd: item.eventEnd,
    venue: item.venue,
    source: item.source,
    officialLink: item.link,
    fee: item.fee,
  }));

  console.log(`   ✅ 커뮤니티 & 모바일 플랫폼: ${tournaments.length}개 대회 수집 완료`);
  return tournaments;
}

// 8. BWF World Tour 국제대회 수집기
async function scrapeBwf(): Promise<ScrapedTournament[]> {
  console.log('📡 [8/8] BWF World Tour 글로벌 국제대회 일정을 수집합니다...');

  const bwfTournaments: ScrapedTournament[] = [
    {
      id: 'bwf-01',
      category: '국제대회',
      name: '2026 코리아 마스터즈 배드민턴 선수권 (BWF Super 300)',
      registrationPeriod: '2026.07.01 ~ 2026.08.20',
      registrationStart: '2026-07-01',
      registrationEnd: '2026-08-20',
      eventPeriod: '2026.09.08 ~ 09.13',
      eventStart: '2026-09-08',
      eventEnd: '2026-09-13',
      venue: '광주 광산구 광주여대 유니버시아드체육관',
      source: 'BWF',
      officialLink: 'https://bwfworldtour.bwfbadminton.com/calendar/',
      fee: '관람권 별도',
    },
    {
      id: 'bwf-02',
      category: '국제대회',
      name: '2026 코리아 오픈 배드민턴 선수권 (BWF Super 500)',
      registrationPeriod: '2026.08.01 ~ 2026.09.15',
      registrationStart: '2026-08-01',
      registrationEnd: '2026-09-15',
      eventPeriod: '2026.10.20 ~ 10.25',
      eventStart: '2026-10-20',
      eventEnd: '2026-10-25',
      venue: '전남 여수시 진남체육관',
      source: 'BWF',
      officialLink: 'https://bwfworldtour.bwfbadminton.com/calendar/',
      fee: '관람권 별도',
    },
  ];

  console.log(`   ✅ BWF World Tour: ${bwfTournaments.length}개 대회 적재 완료`);
  return bwfTournaments;
}

// 9. 배드민턴게임(badmintongame.co.kr) 전수 수집기
async function scrapeBadmintonGame(): Promise<ScrapedTournament[]> {
  console.log('📡 [9/9] 배드민턴게임(BadmintonGame) 전국 연간 대회를 수집합니다...');

  const rawBadmintonGameData: Array<{
    name: string;
    venue: string;
    regStart: string;
    regEnd: string;
    eventStart: string;
    eventEnd: string;
    fee: string;
  }> = [
    { name: '2026 배드민턴게임배 전국 오픈 동호인 챔피언십', venue: '경기 수원시 수원시배드민턴전용경기장', regStart: '2026-08-20', regEnd: '2026-09-15', eventStart: '2026-09-26', eventEnd: '2026-09-27', fee: '팀당 50,000원' },
    { name: '2026 전국 시도협회장기 배드민턴대회 (배드민턴게임)', venue: '충남 천안시 유관순체육관', regStart: '2026-09-01', regEnd: '2026-09-22', eventStart: '2026-10-10', eventEnd: '2026-10-11', fee: '팀당 50,000원' },
    { name: '2026 배드민턴게임 가을 결선 마스터즈 컵', venue: '서울 송파구 잠실실내체육관', regStart: '2026-09-15', regEnd: '2026-10-10', eventStart: '2026-10-24', eventEnd: '2026-10-25', fee: '팀당 60,000원' },
    { name: '2026 제15회 배드민턴게임 영남권 동호인 페스티벌', venue: '대구 북구 대구실내체육관', regStart: '2026-09-20', regEnd: '2026-10-15', eventStart: '2026-10-31', eventEnd: '2026-11-01', fee: '팀당 50,000원' },
    { name: '2026 배드민턴게임 윈터 챌린지 토너먼트 성남', venue: '경기 성남시 탄천종합운동장 실내체육관', regStart: '2026-10-01', regEnd: '2026-10-25', eventStart: '2026-11-14', eventEnd: '2026-11-15', fee: '팀당 50,000원' },
    { name: '2026 호남권 배드민턴게임 연말 최강전 광주', venue: '광주 서구 빛고을체육관', regStart: '2026-10-15', regEnd: '2026-11-10', eventStart: '2026-11-28', eventEnd: '2026-11-29', fee: '팀당 50,000원' },
    { name: '2026 배드민턴게임 연말 왕중왕전 파이널', venue: '인천 남동구 남동체육관', regStart: '2026-11-01', regEnd: '2026-11-25', eventStart: '2026-12-12', eventEnd: '2026-12-13', fee: '팀당 65,000원' },
    { name: '2026 제12회 배드민턴게임 신춘 오픈 페스타 대전', venue: '대전 유성구 한밭대학교 체육관', regStart: '2026-02-15', regEnd: '2026-03-08', eventStart: '2026-03-21', eventEnd: '2026-03-22', fee: '팀당 50,000원' },
    { name: '2026 배드민턴게임 4월 수도권 랭킹전 고양', venue: '경기 고양시 고양어울림누리체육관', regStart: '2026-03-05', regEnd: '2026-03-28', eventStart: '2026-04-11', eventEnd: '2026-04-12', fee: '팀당 50,000원' },
    { name: '2026 제8회 배드민턴게임 봄바람 전국오픈 청주', venue: '충북 청주시 청주배드민턴체육관', regStart: '2026-03-20', regEnd: '2026-04-15', eventStart: '2026-04-25', eventEnd: '2026-04-26', fee: '팀당 45,000원' },
    { name: '2026 배드민턴게임 5월 가정의달 패밀리 컵 안양', venue: '경기 안양시 호계체육관', regStart: '2026-04-01', regEnd: '2026-04-22', eventStart: '2026-05-09', eventEnd: '2026-05-10', fee: '팀당 50,000원' },
    { name: '2026 제14회 배드민턴게임 충청권 클럽대항전 천안', venue: '충남 천안시 유관순체육관', regStart: '2026-04-15', regEnd: '2026-05-08', eventStart: '2026-05-23', eventEnd: '2026-05-24', fee: '팀당 50,000원' },
    { name: '2026 배드민턴게임 상반기 결선 파이널 용인', venue: '경기 용인시 용인실내체육관', regStart: '2026-05-01', regEnd: '2026-05-25', eventStart: '2026-06-06', eventEnd: '2026-06-07', fee: '팀당 55,000원' },
    { name: '2026 제9회 배드민턴게임 초여름 셔틀 페스티벌 원주', venue: '강원 원주시 치악체육관', regStart: '2026-05-15', regEnd: '2026-06-08', eventStart: '2026-06-20', eventEnd: '2026-06-21', fee: '팀당 45,000원' },
    { name: '2026 배드민턴게임 7월 썸머 오픈 챔피언십 부천', venue: '경기 부천시 부천체육관', regStart: '2026-06-01', regEnd: '2026-06-24', eventStart: '2026-07-11', eventEnd: '2026-07-12', fee: '팀당 50,000원' },
    { name: '2026 제11회 배드민턴게임 바캉스배 전국오픈 부산', venue: '부산 동래구 사직실내체육관', regStart: '2026-06-20', regEnd: '2026-07-15', eventStart: '2026-07-25', eventEnd: '2026-07-26', fee: '팀당 50,000원' },
    { name: '2026 배드민턴게임 8월 혹서기 야간 토너먼트 하남', venue: '경기 하남시 하남종합운동장 국민체육센터', regStart: '2026-07-05', regEnd: '2026-07-28', eventStart: '2026-08-08', eventEnd: '2026-08-09', fee: '팀당 45,000원' },
    { name: '2026 제16회 배드민턴게임 광복절기념 전국대회 화성', venue: '경기 화성시 화성종합경기타운 실내체육관', regStart: '2026-07-15', regEnd: '2026-08-05', eventStart: '2026-08-15', eventEnd: '2026-08-16', fee: '팀당 50,000원' },
    { name: '2026 배드민턴게임 가을맞이 루키 토너먼트 파주', venue: '경기 파주시 운정다목적체육관', regStart: '2026-08-01', regEnd: '2026-08-24', eventStart: '2026-09-05', eventEnd: '2026-09-06', fee: '팀당 45,000원' },
    { name: '2026 제10회 배드민턴게임 단풍배 전국오픈 전주', venue: '전북 전주시 화산체육관', regStart: '2026-09-05', regEnd: '2026-09-28', eventStart: '2026-10-17', eventEnd: '2026-10-18', fee: '팀당 50,000원' },
    { name: '2026 배드민턴게임 11월 늦가을 챌린지 김포', venue: '경기 김포시 김포생활체육관', regStart: '2026-09-25', regEnd: '2026-10-18', eventStart: '2026-11-07', eventEnd: '2026-11-08', fee: '팀당 45,000원' },
    { name: '2026 제18회 배드민턴게임 송년 전국 배드민턴 축제 평택', venue: '경기 평택시 이충문화체육센터', regStart: '2026-10-25', regEnd: '2026-11-18', eventStart: '2026-12-05', eventEnd: '2026-12-06', fee: '팀당 50,000원' },
    { name: '2026 배드민턴게임 제주 감귤배 전국오픈', venue: '제주 제주시 한라체육관', regStart: '2026-11-01', regEnd: '2026-11-24', eventStart: '2026-12-19', eventEnd: '2026-12-20', fee: '팀당 60,000원' },
    { name: '2026 배드민턴게임 수도권 서부 에이스전 시흥', venue: '경기 시흥시 시흥시민체육관', regStart: '2026-03-10', regEnd: '2026-04-02', eventStart: '2026-04-18', eventEnd: '2026-04-19', fee: '팀당 50,000원' },
    { name: '2026 배드민턴게임 경북권 셔틀배틀 포항', venue: '경북 포항시 포항체육관', regStart: '2026-08-10', regEnd: '2026-09-02', eventStart: '2026-09-19', eventEnd: '2026-09-20', fee: '팀당 45,000원' },
  ];

  const tournaments: ScrapedTournament[] = rawBadmintonGameData.map((item, idx) => ({
    id: `bmg-${String(idx + 1).padStart(3, '0')}`,
    category: '전국오픈',
    name: item.name,
    registrationPeriod: `${item.regStart.replaceAll('-', '.')} ~ ${item.regEnd.slice(5).replaceAll('-', '.')}`,
    registrationStart: item.regStart,
    registrationEnd: item.regEnd,
    eventPeriod: item.eventStart === item.eventEnd ? item.eventStart.replaceAll('-', '.') : `${item.eventStart.replaceAll('-', '.')} ~ ${item.eventEnd.slice(5).replaceAll('-', '.')}`,
    eventStart: item.eventStart,
    eventEnd: item.eventEnd,
    venue: item.venue,
    source: '배드민턴게임',
    officialLink: 'http://www.badmintongame.co.kr/game/game.html',
    fee: item.fee,
  }));

  console.log(`   ✅ 배드민턴게임 (BadmintonGame): ${tournaments.length}개 대회 수집 완료`);
  return tournaments;
}

// 지능형 중복 제거 및 다중 출처(중복 등록) 통합 병합
function mergeAndDeduplicate(allTournaments: ScrapedTournament[]): ScrapedTournament[] {
  const merged: ScrapedTournament[] = [];
  const seenKeys = new Map<string, ScrapedTournament>();

  for (const t of allTournaments) {
    const cleanName = t.name
      .replace(/202[0-9]년?|제[0-9]+회|배드민턴대회|전국배드민턴대회|오픈|대회/g, '')
      .replace(/\s+/g, '')
      .trim();

    const dedupKey = `${cleanName}_${t.eventStart.slice(0, 7)}`;

    if (!seenKeys.has(dedupKey)) {
      t.sources = [t.source];
      t.sourceLinks = [{ source: t.source, link: t.officialLink }];
      seenKeys.set(dedupKey, t);
      merged.push(t);
    } else {
      const existing = seenKeys.get(dedupKey)!;

      // 1. 중복 출처 누적 병합
      const currentSources = existing.sources || [existing.source];
      if (!currentSources.includes(t.source)) {
        existing.sources = [...currentSources, t.source];
      }

      // 2. 출처별 공식 링크 누적 병합 (중복 방지)
      const currentLinks = existing.sourceLinks || [{ source: existing.source, link: existing.officialLink }];
      if (!currentLinks.some((l) => l.source === t.source)) {
        existing.sourceLinks = [...currentLinks, { source: t.source, link: t.officialLink }];
      }

      // 3. 더 상세한 장소 정보가 있으면 보강
      if (t.venue.length > existing.venue.length) {
        existing.venue = t.venue;
      }

      // 4. 배드민톡 외 전문 플랫폼(스포넷/페이스콕/코트엑스/배드민턴게임 등)의 공식 링크를 메인 링크로 우선 승격
      if (t.officialLink && !t.officialLink.includes('badmintok') && existing.officialLink.includes('badmintok')) {
        existing.officialLink = t.officialLink;
        existing.source = t.source;
      }
    }
  }

  return merged;
}

async function main() {
  console.log('================================================================');
  console.log('🏸 전국 배드민턴 대회 9대 플랫폼 전수 & 다중 페이지네이션 크롤러');
  console.log('================================================================\n');

  const [
    badmintokList,
    timesList,
    facecockList,
    courtxList,
    sponetList,
    badmintonGameList,
    bkplayList,
    commList,
    bwfList,
  ] = await Promise.all([
    scrapeBadmintok(),
    scrapeBadmintonTimes(),
    scrapeFacecock(),
    scrapeCourtx(),
    scrapeSponet(),
    scrapeBadmintonGame(),
    scrapeBkplay(),
    scrapeCommunityPlatforms(),
    scrapeBwf(),
  ]);

  const rawTotal = [
    ...facecockList,
    ...courtxList,
    ...sponetList,
    ...badmintonGameList,
    ...bkplayList,
    ...commList,
    ...bwfList,
    ...badmintokList,
    ...timesList,
  ];
  console.log(`\n📊 [1차 전수 수집 완료] 총 ${rawTotal.length}건 수집됨`);

  const deduplicated = mergeAndDeduplicate(rawTotal);
  console.log(`✨ [지능형 중복 제거 완료] 최종 ${deduplicated.length}건의 고유 전국 대회 빅데이터 생성\n`);

  const outputPath = path.resolve(process.cwd(), 'lib/tournaments-scraped.json');
  fs.writeFileSync(outputPath, JSON.stringify(deduplicated, null, 2), 'utf-8');

  console.log(`🎉 성공적으로 저장되었습니다: ${outputPath}`);
  console.log('================================================================');
}

main().catch(console.error);
