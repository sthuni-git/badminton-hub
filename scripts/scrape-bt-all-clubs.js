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

// 1. 단일 상세 페이지 수집 함수
async function fetchClubDetail(id, fallback = {}) {
  try {
    const res = await fetch('http://www.badmintontimes.com/club2/m3_clubRead.jsp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `menunum=301&pg=1&no=${id}&sf=&sw=`
    });
    if (!res.ok) return fallback;
    const html = await res.text();

    const trRegex = /<tr[^>]*>[\s\S]*?<b>([^<]+)<\/b><\/td>\s*<td[^>]*>([\s\S]*?)<\/td>\s*<\/tr>/g;
    let m;
    const fields = {};
    while ((m = trRegex.exec(html)) !== null) {
      const key = m[1].trim();
      const val = m[2].replace(/<br\s*[\/]?>/gi, ' ').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
      fields[key] = val;
    }

    const loc = fields['클럽위치'] || fallback.loc || '';
    const parts = loc.split(/\s+/);
    const region = normalizeRegion(parts[0] || '');
    const district = parts[1] || '전체';

    let link = fields['관련링크'] || '';
    if (link === 'http://' || link === 'https://') link = '';

    return {
      i: `bt-${id}`,
      n: fields['클럽이름'] || fallback.name || '',
      r: region,
      d: district,
      loc: loc, // 클럽위치 (운동장소)
      h: fields['운동시간'] || fallback.time || '', // 운동시간
      vt: fields['구장형태'] || '', // 구장형태
      c: fields['코트수'] || '', // 코트수
      m: fields['회원수'] || '', // 회원수
      f: fields['회비안내'] || '', // 회비안내
      p: fields['문의전화'] || '', // 문의전화
      l: link, // 관련링크
      desc: fields['기타사항'] || '', // 기타사항
      dt: fields['등록일자'] || fallback.date || '' // 등록일자
    };
  } catch (e) {
    return fallback;
  }
}

// 2. 전체 페이지 수집
async function main() {
  console.log('[BadmintonTimes] Starting full detailed scrape (3,656 clubs)...');
  const t0 = Date.now();

  const totalPages = 245;
  const listItems = [];

  // 목록 수집 (1 ~ 245 페이지)
  console.log('Step 1: Gathering club IDs from all 245 list pages...');
  const pageBatchSize = 25;
  for (let p = 1; p <= totalPages; p += pageBatchSize) {
    const batch = [];
    for (let i = 0; i < pageBatchSize && (p + i) <= totalPages; i++) {
      const pageNum = p + i;
      batch.push(
        fetch(`http://www.badmintontimes.com/club2/m3_clubList.jsp?menunum=301&pg=${pageNum}`)
          .then(r => r.text())
          .then(html => {
            const itemRegex = /readClub\((\d+)\);[^>]*>([^<]+)<\/a><\/td>\s*<td colspan="2"[^>]*>([^<]*)<\/td>[\s\S]*?<font color=["']#005883["']>([^<]*)<\/font>[\s\S]*?<font color=["']#999999["']>([^<]*)<\/font>/g;
            let m;
            const items = [];
            while ((m = itemRegex.exec(html)) !== null) {
              items.push({ id: m[1], name: m[2].trim(), loc: m[3].trim(), time: m[4].trim(), date: m[5].trim() });
            }
            return items;
          })
          .catch(() => [])
      );
    }
    const results = await Promise.all(batch);
    for (const res of results) {
      listItems.push(...res);
    }
    process.stdout.write(`\rList pages fetched: ${Math.min(p + pageBatchSize - 1, totalPages)} / ${totalPages} - Found: ${listItems.length} clubs`);
  }

  console.log(`\nStep 1 Complete! Total items to scrape details: ${listItems.length}`);

  // 중복 ID 제거
  const uniqueItemsMap = new Map();
  for (const it of listItems) {
    if (!uniqueItemsMap.has(it.id)) {
      uniqueItemsMap.set(it.id, it);
    }
  }
  const uniqueItems = Array.from(uniqueItemsMap.values());
  console.log(`Unique clubs to scrape: ${uniqueItems.length}`);

  // Step 2: 상세 정보 동시 병렬 수집 (배치 사이즈 30)
  console.log('Step 2: Scraping detail pages (위치, 구장형태, 코트수, 회원수, 회비, 전화, 링크, 기타, 등록일자)...');
  const allClubs = [];
  const detailBatchSize = 30;

  for (let i = 0; i < uniqueItems.length; i += detailBatchSize) {
    const batch = uniqueItems.slice(i, i + detailBatchSize);
    const batchPromises = batch.map(item => fetchClubDetail(item.id, item));
    const batchResults = await Promise.all(batchPromises);
    allClubs.push(...batchResults);

    process.stdout.write(`\rDetails scraped: ${Math.min(i + detailBatchSize, uniqueItems.length)} / ${uniqueItems.length} (${((Math.min(i + detailBatchSize, uniqueItems.length) / uniqueItems.length) * 100).toFixed(1)}%)`);
  }

  console.log(`\n\nAll details scraped successfully in ${((Date.now() - t0) / 1000).toFixed(1)}s!`);

  const outputPath = path.join(__dirname, '../lib/clubs-data.json');
  fs.writeFileSync(outputPath, JSON.stringify(allClubs), 'utf8');
  const stats = fs.statSync(outputPath);
  console.log(`Saved ${allClubs.length} clubs to ${outputPath} (${(stats.size / 1024).toFixed(1)} KB)`);
}

main().catch(console.error);
