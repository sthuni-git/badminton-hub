import fs from 'node:fs';
import path from 'node:path';
import https from 'node:https';
import { extractTournamentHeuristic, parseWithGemini, type ParsedTournament } from './llm-parser.js';

interface SearchTarget {
  title: string;
  link: string;
  source: '네이버카페' | '네이버블로그' | '웹검색';
  snippet: string;
}

/**
 * 공개 웹 검색 및 네이버 Open API를 통한 배드민턴 대회 관련 글 탐색
 */
async function fetchSearchTargets(query: string): Promise<SearchTarget[]> {
  const results: SearchTarget[] = [];

  // 1. 네이버 Open API 사용 (키가 있는 경우)
  const naverClientId = process.env.NAVER_CLIENT_ID;
  const naverClientSecret = process.env.NAVER_CLIENT_SECRET;

  if (naverClientId && naverClientSecret) {
    try {
      const endpoints = [
        { type: 'cafearticle', source: '네이버카페' as const },
        { type: 'blog', source: '네이버블로그' as const },
        { type: 'webkr', source: '웹검색' as const },
      ];

      for (const ep of endpoints) {
        const url = `https://openapi.naver.com/v1/search/${ep.type}.json?query=${encodeURIComponent(query)}&display=20&sort=date`;
        const res = await fetch(url, {
          headers: {
            'X-Naver-Client-Id': naverClientId,
            'X-Naver-Client-Secret': naverClientSecret,
          },
        });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.items)) {
            for (const item of data.items) {
              const cleanTitle = (item.title || '').replace(/<[^>]+>/g, '').trim();
              const link = item.link || '';
              const snippet = (item.description || '').replace(/<[^>]+>/g, '').trim();
              if (link && cleanTitle) {
                results.push({ title: cleanTitle, link, source: ep.source, snippet });
              }
            }
          }
        }
      }
      return results;
    } catch (e) {
      console.warn('Naver Open API search failed:', e);
    }
  }

  // 2. Fallback: 네이버 공개 모바일/웹 검색 결과 파싱
  try {
    const webUrl = 'https://search.naver.com/search.naver?where=article&query=' + encodeURIComponent(query);
    const res = await fetch(webUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'ko-KR,ko;q=0.9',
      },
    });
    if (res.ok) {
      const html = await res.text();
      // 블로그 및 카페 링크 추출
      const blogMatches = html.match(/https?:\/\/blog\.naver\.com\/[a-zA-Z0-9_-]+\/\d+/g) || [];
      const cafeMatches = html.match(/https?:\/\/cafe\.naver\.com\/[a-zA-Z0-9_-]+\/\d+/g) || [];

      const uniqueBlogs = Array.from(new Set(blogMatches));
      const uniqueCafes = Array.from(new Set(cafeMatches));

      for (const b of uniqueBlogs.slice(0, 10)) {
        results.push({
          title: '네이버 블로그 배드민턴 대회 공고',
          link: b,
          source: '네이버블로그',
          snippet: '',
        });
      }

      for (const c of uniqueCafes.slice(0, 10)) {
        results.push({
          title: '네이버 카페 배드민턴 대회 공고',
          link: c,
          source: '네이버카페',
          snippet: '',
        });
      }
    }
  } catch (err) {
    console.warn('Public search scraping fallback error:', err);
  }

  return results;
}

/**
 * 게시글 본문 추출 (모바일 블로그/카페 타깃)
 */
async function extractPageContent(targetUrl: string): Promise<{ title: string; text: string }> {
  let url = targetUrl;
  if (url.includes('blog.naver.com') && !url.includes('m.blog.naver.com')) {
    url = url.replace('blog.naver.com', 'm.blog.naver.com');
  }

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'ko-KR,ko;q=0.9',
      },
    });
    if (!res.ok) return { title: '', text: '' };

    const html = await res.text();
    const titleMatch = html.match(/<meta property="og:title" content="([^"]+)"/i) || html.match(/<title>([\s\S]*?)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : '';

    const clean = html
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    return { title, text: clean };
  } catch (e) {
    return { title: '', text: '' };
  }
}

/**
 * 메인 실행기
 */
export async function runAiDiscovery(): Promise<number> {
  console.log('🤖 AI 기반 대회 탐색(Google / Naver / Cafe / Blog) 파이프라인 가동');
  const geminiApiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '';
  if (geminiApiKey) {
    console.log('✨ Gemini LLM API 활성화됨');
  } else {
    console.log('ℹ️ Gemini API 키 미제공 - 무비용 고신뢰 정밀 텍스트 파서로 가동');
  }

  const queries = [
    '배드민턴대회 요강 2026',
    '배드민턴 오픈대회 접수',
    '배드민턴 협회장기 요강',
  ];

  const candidateTournaments: any[] = [];
  const visitedUrls = new Set<string>();

  for (const q of queries) {
    const targets = await fetchSearchTargets(q);
    console.log(`🔎 쿼리 [${q}] -> ${targets.length}건 후보 링크 발견`);

    for (const target of targets) {
      if (visitedUrls.has(target.link)) continue;
      visitedUrls.add(target.link);

      const { title, text } = await extractPageContent(target.link);
      const effectiveTitle = title || target.title;
      const effectiveText = text || target.snippet;

      if (!effectiveText) continue;

      let parsed: ParsedTournament | null = null;
      if (geminiApiKey) {
        parsed = await parseWithGemini(effectiveText, effectiveTitle, target.link, geminiApiKey);
      } else {
        parsed = extractTournamentHeuristic(effectiveText, effectiveTitle, target.link);
      }

      if (parsed && parsed.isTournament && parsed.name && parsed.eventStart && parsed.eventEnd) {
        const id = `ai-${target.source === '네이버카페' ? 'cafe' : target.source === '네이버블로그' ? 'blog' : 'web'}-${Buffer.from(target.link).toString('base64').slice(0, 10).replace(/[^a-zA-Z0-9]/g, '')}`;

        candidateTournaments.push({
          id,
          category: parsed.category || '전국오픈',
          name: parsed.name,
          registrationPeriod: parsed.registrationPeriod || '원문 요강 참조',
          registrationStart: parsed.registrationStart || '',
          registrationEnd: parsed.registrationEnd || '',
          eventPeriod: parsed.eventPeriod,
          eventStart: parsed.eventStart,
          eventEnd: parsed.eventEnd,
          venue: parsed.venue || '상세 요강 참조',
          source: target.source,
          sources: [target.source],
          officialLink: target.link,
          fee: parsed.fee || '요강 참조',
          sourceLinks: [
            { source: target.source, link: target.link }
          ]
        });
        console.log(`   ✅ 신규 대회 발굴: [${parsed.name}] (${parsed.eventPeriod}) 장소: ${parsed.venue}`);
      }
    }
  }

  console.log(`🎉 AI 탐색 완료: 총 ${candidateTournaments.length}건 유효 대회 발굴`);
  return candidateTournaments.length;
}

// 직접 실행 시
if (process.argv[1]?.includes('discover-tournaments')) {
  runAiDiscovery().catch(console.error);
}
