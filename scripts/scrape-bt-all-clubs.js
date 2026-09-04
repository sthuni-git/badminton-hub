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

async function fetchPage(page) {
  try {
    const url = `http://www.badmintontimes.com/club2/m3_clubList.jsp?menunum=301&pg=${page}`;
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!res.ok) return [];
    const html = await res.text();

    const reg = /readClub\((\d+)\);[^>]*>([^<]+)<\/a><\/td>[\s\S]*?<td[^>]*class=["']contents15["'][^>]*>([^<]*)<\/td>/g;
    let m;
    const pageClubs = [];
    while ((m = reg.exec(html)) !== null) {
      const id = m[1];
      const name = m[2].trim();
      const loc = m[3].trim(); // 예: 서울 마포구 공덕동

      if (!id || !name) continue;

      const parts = loc.split(/\s+/);
      const region = normalizeRegion(parts[0] || '');
      const district = parts[1] || '전체';
      const venue = parts.length > 2 ? `${parts.slice(1).join(' ')} 체육관` : `${district} 배드민턴장`;
      const address = loc || `${region} ${district}`;
      const sourceUrl = `http://www.badmintontimes.com/group2/m3_groupMain_301.jsp?group=3&menunum=301`;
      const mapUrl = `https://map.kakao.com/link/search/${encodeURIComponent(name + ' ' + address)}`;

      pageClubs.push({
        id: `bt-${id}`,
        name,
        region,
        district,
        venue,
        address,
        days: '월~금, 토·일 (클럽별 일정)',
        timeSlot: '저녁반',
        hours: '19:00 ~ 21:30 (클럽별 상이)',
        courtCount: 4,
        monthlyFee: '30,000원 ~ 50,000원',
        entryFee: '50,000원 ~ 100,000원',
        targetLevel: '초보 환영 · 전급수 회원',
        features: ['배드민턴타임즈인증', '초보환영', '레슨운영', '정기운동'],
        contact: '배드민턴타임즈 클럽 게시판 참조',
        link: sourceUrl,
        mapUrl,
        source: '배드민턴타임즈',
        sourceUrl
      });
    }
    return pageClubs;
  } catch (e) {
    console.error(`Page ${page} error:`, e.message);
    return [];
  }
}

async function main() {
  console.log('[BadmintonTimes] Starting full scrape of all pages (1 ~ 245)...');
  const t0 = Date.now();
  const allClubs = [];
  const seenIds = new Set();

  const totalPages = 245;
  const batchSize = 15; // 15페이지씩 병렬 요청

  for (let p = 1; p <= totalPages; p += batchSize) {
    const batch = [];
    for (let i = 0; i < batchSize && (p + i) <= totalPages; i++) {
      batch.push(fetchPage(p + i));
    }

    const batchResults = await Promise.all(batch);
    for (const clubs of batchResults) {
      for (const club of clubs) {
        if (!seenIds.has(club.id)) {
          seenIds.add(club.id);
          allClubs.push(club);
        }
      }
    }

    process.stdout.write(`\rProgress: Page ${Math.min(p + batchSize - 1, totalPages)} / ${totalPages} - Collected ${allClubs.length} clubs`);
  }

  console.log(`\n[BadmintonTimes] Scraping complete in ${((Date.now() - t0) / 1000).toFixed(1)}s. Total: ${allClubs.length} clubs.`);

  const outputPath = path.join(__dirname, '../lib/clubs-data.json');
  fs.writeFileSync(outputPath, JSON.stringify(allClubs, null, 2), 'utf8');
  console.log(`Successfully saved to ${outputPath}!`);
}

main().catch(console.error);
