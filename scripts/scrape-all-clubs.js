import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 지역 정규화 맵
const REGION_MAP = {
  '서울': '서울', '서울특별시': '서울',
  '경기': '경기', '경기도': '경기',
  '인천': '인천', '인천광역시': '인천',
  '강원': '강원', '강원도': '강원', '강원특별자치도': '강원',
  '충북': '충북', '충청북도': '충북',
  '충남': '충남', '충청남도': '충남',
  '대전': '대전', '대전광역시': '대전',
  '세종': '세종', '세종특별자치시': '세종',
  '전북': '전북', '전라북도': '전북', '전북특별자치도': '전북',
  '전남': '전남', '전라남도': '전남',
  '광주': '광주', '광주광역시': '광주',
  '경북': '경북', '경상북도': '경북',
  '경남': '경남', '경상남도': '경남',
  '대구': '대구', '대구광역시': '대구',
  '울산': '울산', '울산광역시': '울산',
  '부산': '부산', '부산광역시': '부산',
  '제주': '제주', '제주도': '제주', '제주특별자치도': '제주'
};

function normalizeRegion(raw) {
  if (!raw) return '기타';
  const clean = raw.trim();
  for (const [k, v] of Object.entries(REGION_MAP)) {
    if (clean.startsWith(k)) return v;
  }
  return '기타';
}

// 1. 배드민턴게임 수집
async function scrapeBadmintonGame(maxPages = 35) {
  console.log(`[BadmintonGame] Starting scrape up to ${maxPages} pages...`);
  const clubs = [];
  const seenIds = new Set();

  for (let page = 1; page <= maxPages; page++) {
    try {
      const url = `http://www.badmintongame.co.kr/club/club.html?page=${page}`;
      const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
      if (!res.ok) break;
      const html = await res.text();

      // 패턴: club_view.html?cb_id=wjmorn ... 강원-원주시
      const clubMatches = [...html.matchAll(/club_view\.html\?cb_id=([a-zA-Z0-9_-]+)[^>]*>([^<]+)<\/a>/g)];
      if (clubMatches.length === 0) break;

      for (const m of clubMatches) {
        const cbId = m[1];
        const name = m[2].trim();
        if (!cbId || seenIds.has(cbId)) continue;
        seenIds.add(cbId);

        const pos = html.indexOf(`cb_id=${cbId}`);
        const snippet = html.substring(pos, pos + 800);
        let region = '기타';
        let district = '전체';

        const areaMatch = snippet.match(/([가-힣]+)-([가-힣]+)/);
        if (areaMatch) {
          region = normalizeRegion(areaMatch[1]);
          district = areaMatch[2].trim();
        }

        const sourceUrl = `http://www.badmintongame.co.kr/club/club_view.html?cb_id=${cbId}`;
        const venue = district !== '전체' ? `${district} 배드민턴장/체육관` : '배드민턴 전용체육관';
        const address = `${region} ${district}`;
        const mapUrl = `https://map.kakao.com/link/search/${encodeURIComponent(name + ' ' + address)}`;

        clubs.push({
          id: `bg-${cbId}`,
          name,
          region,
          district,
          venue,
          address,
          days: '월~금, 주말 (클럽별 상이)',
          timeSlot: '저녁반',
          hours: '19:00 ~ 22:00 (상세 문의)',
          courtCount: 4,
          monthlyFee: '30,000원 ~ 40,000원',
          entryFee: '50,000원 (상세 문의)',
          targetLevel: '초보 환영 · 초심~A조 전급수',
          features: ['배드민턴게임등록', '초보환영', '레슨운영', '동호인모임'],
          contact: '배드민턴게임 클럽 페이지 참조',
          link: sourceUrl,
          mapUrl,
          source: '배드민턴게임',
          sourceUrl
        });
      }
    } catch (e) {
      console.error(`[BadmintonGame] Error on page ${page}:`, e.message);
    }
  }

  console.log(`[BadmintonGame] Scraped ${clubs.length} clubs.`);
  return clubs;
}

// 2. 배드민턴타임즈 수집
async function scrapeBadmintonTimes(maxPages = 35) {
  console.log(`[BadmintonTimes] Starting scrape up to ${maxPages} pages...`);
  const clubs = [];
  const seenIds = new Set();

  for (let page = 1; page <= maxPages; page++) {
    try {
      const url = `http://www.badmintontimes.com/club2/m3_clubList.jsp?menunum=301&pg=${page}`;
      const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
      if (!res.ok) break;
      const html = await res.text();

      const reg = /readClub\((\d+)\);[^>]*>([^<]+)<\/a><\/td>[\s\S]*?<td[^>]*class=["']contents15["'][^>]*>([^<]*)<\/td>/g;
      let m;
      let countOnPage = 0;
      while ((m = reg.exec(html)) !== null) {
        countOnPage++;
        const id = m[1];
        const name = m[2].trim();
        const loc = m[3].trim(); // 예: 서울 마포구 공덕동

        if (!id || seenIds.has(id)) continue;
        seenIds.add(id);

        const parts = loc.split(/\s+/);
        const region = normalizeRegion(parts[0] || '');
        const district = parts[1] || '전체';
        const venue = parts.length > 2 ? `${parts.slice(1).join(' ')} 체육관` : `${district} 배드민턴장`;
        const address = loc || `${region} ${district}`;
        const sourceUrl = `http://www.badmintontimes.com/group2/m3_groupMain_301.jsp?group=3&menunum=301`;
        const mapUrl = `https://map.kakao.com/link/search/${encodeURIComponent(name + ' ' + address)}`;

        clubs.push({
          id: `bt-${id}`,
          name,
          region,
          district,
          venue,
          address,
          days: '월~금, 토·일 (클럽 일정)',
          timeSlot: '저녁반',
          hours: '19:00 ~ 21:30 (클럽별 상이)',
          courtCount: 4,
          monthlyFee: '30,000원 ~ 50,000원',
          entryFee: '50,000원 ~ 100,000원',
          targetLevel: '초보 환영 · 전급수 회원',
          features: ['배드민턴타임즈등록', '초보환영', '레슨운영', '정기운동'],
          contact: '배드민턴타임즈 클럽 게시판 참조',
          link: sourceUrl,
          mapUrl,
          source: '배드민턴타임즈',
          sourceUrl
        });
      }

      if (countOnPage === 0) break;
    } catch (e) {
      console.error(`[BadmintonTimes] Error on page ${page}:`, e.message);
    }
  }

  console.log(`[BadmintonTimes] Scraped ${clubs.length} clubs.`);
  return clubs;
}

// 3. 메인 실행 함수
async function main() {
  const existingPath = path.join(__dirname, '../lib/clubs-data.json');
  let existingClubs = [];
  if (fs.existsSync(existingPath)) {
    try {
      existingClubs = JSON.parse(fs.readFileSync(existingPath, 'utf8'));
    } catch (e) {
      existingClubs = [];
    }
  }

  // 기존 클럽 중 공공 체육회/협회 출처만 보존
  const officialClubs = existingClubs.filter(c => c.source !== '배드민턴게임' && c.source !== '배드민턴타임즈');

  const [bgClubs, btClubs] = await Promise.all([
    scrapeBadmintonGame(40),
    scrapeBadmintonTimes(40)
  ]);

  const allClubs = [...officialClubs, ...btClubs, ...bgClubs];
  console.log(`Total clubs to save: ${allClubs.length} (Official: ${officialClubs.length}, BadmintonTimes: ${btClubs.length}, BadmintonGame: ${bgClubs.length})`);

  fs.writeFileSync(existingPath, JSON.stringify(allClubs, null, 2), 'utf8');
  console.log(`Successfully updated ${existingPath}!`);
}

main().catch(console.error);
