'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { BadmintonClub, badmintonClubs } from '@/lib/clubs';
import { 
  Search, 
  MapPin, 
  Clock, 
  Calendar, 
  Users, 
  ExternalLink, 
  Sparkles, 
  X,
  Info,
  ShieldCheck,
  Building2,
  Phone,
  Coins,
  Link as LinkIcon,
  Layers,
  Heart,
  Download,
  ArrowUpDown,
  Compass,
  ChevronDown
} from 'lucide-react';
import { getVenueCoordinates, calculateDistanceKm, formatDistanceKm } from '@/lib/geo-utils';
import type { UserLocation } from '@/components/tournament-explorer';

const FAVORITES_STORAGE_KEY = 'badminton_favorite_clubs';
const PAGE_SIZE = 36;

export interface ClubWithDistance extends BadmintonClub {
  distanceKm?: number;
}

interface ClubExplorerProps {
  userLocation?: UserLocation;
}

export function ClubExplorer({ userLocation }: ClubExplorerProps) {
  const [query, setQuery] = useState('');
  const [selectedRegion, setSelectedRegion] = useState('전체');
  const [selectedDistrict, setSelectedDistrict] = useState('전체');
  const [selectedTimeSlot, setSelectedTimeSlot] = useState('전체');
  const [onlyBeginner, setOnlyBeginner] = useState(false);
  const [onlyHasLink, setOnlyHasLink] = useState(false);
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [sortOption, setSortOption] = useState<'default' | 'distance' | 'name'>('default');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [selectedClub, setSelectedClub] = useState<ClubWithDistance | null>(null);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  // 즐겨찾기 로드 (SSR-Safe)
  useEffect(() => {
    try {
      const saved = localStorage.getItem(FAVORITES_STORAGE_KEY);
      if (saved) {
        setFavorites(new Set(JSON.parse(saved)));
      }
    } catch {
      // 무시
    }
  }, []);

  // 즐겨찾기 토글
  const toggleFavorite = useCallback((id: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    setFavorites(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      try {
        localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(Array.from(next)));
      } catch {
        // 무시
      }
      return next;
    });
  }, []);

  // 1차 시·도 목록 추출
  const regions = useMemo(() => {
    const list = Array.from(new Set(badmintonClubs.map(c => c.region))).filter(Boolean);
    return ['전체', ...list];
  }, []);

  // 2차 구·군 목록 추출 (선택된 시·도에 종속)
  const districts = useMemo(() => {
    if (selectedRegion === '전체') return [];
    const list = Array.from(
      new Set(
        badmintonClubs
          .filter(c => c.region === selectedRegion)
          .map(c => c.district)
          .filter(Boolean)
      )
    ).sort((a, b) => a.localeCompare(b, 'ko'));
    return ['전체', ...list];
  }, [selectedRegion]);

  // 시·도 변경 시 구·군 및 페이지 수 초기화
  const handleRegionChange = (r: string) => {
    setSelectedRegion(r);
    setSelectedDistrict('전체');
    setVisibleCount(PAGE_SIZE);
  };

  // 거리 계산이 포함된 클럽 목록 메모이제이션
  const clubsWithDistance: ClubWithDistance[] = useMemo(() => {
    return badmintonClubs.map(club => {
      let distanceKm: number | undefined;
      if (userLocation?.coords) {
        const coords = getVenueCoordinates(club.location || `${club.region} ${club.district} ${club.playVenue}`);
        if (coords) {
          distanceKm = calculateDistanceKm(userLocation.coords, coords);
        }
      }
      return {
        ...club,
        distanceKm,
      };
    });
  }, [userLocation]);

  // 검색 및 필터링 & 정렬
  const filteredClubs = useMemo(() => {
    const result = clubsWithDistance.filter(club => {
      const q = query.toLowerCase().trim();
      const matchesQuery = 
        !q || 
        club.name.toLowerCase().includes(q) || 
        club.location.toLowerCase().includes(q) || 
        club.venue.toLowerCase().includes(q) || 
        club.district.toLowerCase().includes(q) ||
        club.region.toLowerCase().includes(q) ||
        club.venueType.toLowerCase().includes(q) ||
        club.feeInfo.toLowerCase().includes(q) ||
        (club.description && club.description.toLowerCase().includes(q));

      const matchesRegion = selectedRegion === '전체' || club.region === selectedRegion;
      const matchesDistrict = selectedDistrict === '전체' || club.district === selectedDistrict;
      
      const matchesTimeSlot = selectedTimeSlot === '전체' || 
        (selectedTimeSlot === '새벽반' && (/0[56]:|새벽/.test(club.hours) || /0[56]:|새벽/.test(club.playHours))) ||
        (selectedTimeSlot === '오전반' && (/0[9-9]:|1[01]:|오전/.test(club.hours) || /0[9-9]:|1[01]:|오전/.test(club.playHours))) ||
        (selectedTimeSlot === '저녁반' && (/1[89]:|2[0-3]:|저녁|야간/.test(club.hours) || /1[89]:|2[0-3]:|저녁|야간/.test(club.playHours)));

      // 초보자 필터 버그 수정 (|| true 제거 및 키워드 매칭)
      const matchesBeginner = !onlyBeginner || 
        /초보|입문|초급|환영|누구나/.test(club.description || '') || 
        /초보|입문|초급/.test(club.feeInfo || '') || 
        /초보|입문|초급/.test(club.name);

      const matchesLink = !onlyHasLink || Boolean(club.link);
      const matchesFavorites = !onlyFavorites || favorites.has(club.id);

      return matchesQuery && matchesRegion && matchesDistrict && matchesTimeSlot && matchesBeginner && matchesLink && matchesFavorites;
    });

    // 정렬
    if (sortOption === 'distance') {
      result.sort((a, b) => (a.distanceKm ?? 99999) - (b.distanceKm ?? 99999));
    } else if (sortOption === 'name') {
      result.sort((a, b) => a.name.localeCompare(b.name, 'ko'));
    }

    return result;
  }, [clubsWithDistance, query, selectedRegion, selectedDistrict, selectedTimeSlot, onlyBeginner, onlyHasLink, onlyFavorites, sortOption, favorites]);

  // 필터 조건 변경 시 더보기 카운트 리셋
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [query, selectedRegion, selectedDistrict, selectedTimeSlot, onlyBeginner, onlyHasLink, onlyFavorites, sortOption]);

  // 현재 화면에 렌더링할 클럽 슬라이스
  const displayedClubs = useMemo(() => {
    return filteredClubs.slice(0, visibleCount);
  }, [filteredClubs, visibleCount]);

  const hasMore = visibleCount < filteredClubs.length;

  // 더보기 클릭
  const handleLoadMore = () => {
    setVisibleCount(prev => prev + PAGE_SIZE);
  };

  // CSV 엑셀 다운로드
  const handleDownloadCsv = () => {
    if (filteredClubs.length === 0) {
      alert('다운로드할 클럽 데이터가 없습니다.');
      return;
    }

    const headers = [
      '클럽명',
      '시도',
      '구군',
      '운동장소',
      '클럽위치',
      '구장형태',
      '코트수',
      '회원수',
      '운동시간',
      '회비안내',
      '문의전화',
      '관련링크',
      '출처',
      '원문링크',
      '등록일자'
    ];

    const escapeCsv = (str?: string) => {
      if (!str) return '""';
      const clean = str.replace(/"/g, '""').replace(/\r?\n/g, ' ');
      return `"${clean}"`;
    };

    const rows = filteredClubs.map(c => [
      escapeCsv(c.name),
      escapeCsv(c.region),
      escapeCsv(c.district),
      escapeCsv(c.playVenue),
      escapeCsv(c.location),
      escapeCsv(c.venueType),
      escapeCsv(c.courtCount),
      escapeCsv(c.memberCount),
      escapeCsv(c.playHours),
      escapeCsv(c.feeInfo),
      escapeCsv(c.contact),
      escapeCsv(c.link || ''),
      escapeCsv(c.source),
      escapeCsv(c.sourceUrl),
      escapeCsv(c.registeredDate || '')
    ].join(','));

    // UTF-8 BOM
    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const dateStr = new Date().toISOString().slice(0, 10);
    link.download = `배드민턴클럽_${selectedRegion !== '전체' ? selectedRegion + '_' : ''}${dateStr}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 pb-20">
      {/* 클럽 찾기 헤더 안내 배너 */}
      <div className="rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-800 to-teal-900 p-6 text-white shadow-md">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-700/80 px-3 py-1 text-xs font-semibold text-emerald-100 backdrop-blur-sm">
              <ShieldCheck className="size-3.5 text-emerald-300" /> 배드민턴타임즈(BadmintonTimes) 공식 인증 전국 클럽
            </div>
            <h2 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">전국 배드민턴 클럽 찾기</h2>
            <p className="mt-1 text-sm text-emerald-100/90">
              배드민턴타임즈 공식 등록 클럽위치(운동장소), 구장형태, 코트수, 회원수, 회비안내, 문의전화, 관련링크까지 한 번에 확인하세요!
            </p>
          </div>
          <div className="mt-4 flex items-center gap-3 md:mt-0">
            <div className="rounded-xl bg-white/10 p-3 text-center backdrop-blur-sm">
              <p className="text-xs font-bold text-emerald-200">등록 클럽</p>
              <p className="text-xl font-black text-white">{badmintonClubs.length.toLocaleString()}개소</p>
            </div>
            <div className="rounded-xl bg-white/10 p-3 text-center backdrop-blur-sm">
              <p className="text-xs font-bold text-emerald-200">링크 보유</p>
              <p className="text-xl font-black text-white">{badmintonClubs.filter(c => c.link).length.toLocaleString()}개소</p>
            </div>
            {favorites.size > 0 && (
              <button
                type="button"
                onClick={() => setOnlyFavorites(!onlyFavorites)}
                className={`rounded-xl p-3 text-center backdrop-blur-sm transition border ${
                  onlyFavorites
                    ? 'bg-rose-500/90 border-rose-300 text-white ring-2 ring-rose-300'
                    : 'bg-white/10 border-white/20 text-white hover:bg-white/20'
                }`}
              >
                <p className="text-xs font-bold text-rose-200 flex items-center justify-center gap-1">
                  <Heart className="size-3 fill-rose-300 text-rose-300" /> 찜한 클럽
                </p>
                <p className="text-xl font-black text-white">{favorites.size.toLocaleString()}개소</p>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 검색 및 필터 패널 */}
      <div className="rounded-2xl border border-border bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          {/* 검색창 */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="클럽명, 체육관/학교명, 운동장소, 지역(예: 마포구, 아산, 초등학교) 검색..."
              className="h-11 w-full rounded-xl border border-zinc-200 bg-zinc-50 pl-10 pr-4 text-sm font-medium outline-none transition focus:border-emerald-600 focus:bg-white focus:ring-2 focus:ring-emerald-100"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
              >
                <X className="size-4" />
              </button>
            )}
          </div>

          {/* 퀵 필터 토글 버튼 그룹 */}
          <div className="flex flex-wrap items-center gap-2">
            {/* 찜한 클럽 보기 */}
            <button
              type="button"
              onClick={() => setOnlyFavorites(!onlyFavorites)}
              className={`h-11 rounded-xl px-3.5 text-xs font-bold transition flex items-center gap-1.5 ${
                onlyFavorites
                  ? 'border-rose-500 bg-rose-600 text-white shadow-sm'
                  : 'border border-zinc-200 bg-zinc-50 text-zinc-700 hover:bg-zinc-100'
              }`}
            >
              <Heart className={`size-3.5 ${onlyFavorites ? 'fill-white text-white' : 'text-rose-500'}`} />
              찜한 클럽 {favorites.size > 0 && `(${favorites.size})`}
            </button>

            {/* 초보 환영 토글 */}
            <button
              type="button"
              onClick={() => setOnlyBeginner(!onlyBeginner)}
              className={`h-11 rounded-xl px-3.5 text-xs font-bold transition flex items-center gap-1.5 ${
                onlyBeginner
                  ? 'border-emerald-600 bg-emerald-700 text-white shadow-sm'
                  : 'border border-zinc-200 bg-zinc-50 text-zinc-700 hover:bg-zinc-100'
              }`}
            >
              <Sparkles className="size-3.5 text-amber-400" /> 초보/입문 환영
            </button>

            {/* 카페/블로그 링크 토글 */}
            <button
              type="button"
              onClick={() => setOnlyHasLink(!onlyHasLink)}
              className={`h-11 rounded-xl px-3.5 text-xs font-bold transition flex items-center gap-1.5 ${
                onlyHasLink
                  ? 'border-emerald-600 bg-emerald-700 text-white shadow-sm'
                  : 'border border-zinc-200 bg-zinc-50 text-zinc-700 hover:bg-zinc-100'
              }`}
            >
              <LinkIcon className="size-3.5" /> 카페/블로그 보유
            </button>

            {/* 시간대 선택 */}
            <select
              value={selectedTimeSlot}
              onChange={(e) => setSelectedTimeSlot(e.target.value)}
              className="h-11 rounded-xl border border-zinc-200 bg-zinc-50 px-3 text-xs font-bold text-zinc-700 outline-none hover:bg-zinc-100 cursor-pointer"
            >
              <option value="전체">시간대: 전체</option>
              <option value="새벽반">새벽반 (05~07시)</option>
              <option value="오전반">오전반 (09~12시)</option>
              <option value="저녁반">저녁반 (18~23시)</option>
            </select>

            {/* 정렬 드롭다운 */}
            <select
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value as any)}
              className="h-11 rounded-xl border border-zinc-200 bg-zinc-50 px-3 text-xs font-bold text-zinc-700 outline-none hover:bg-zinc-100 cursor-pointer"
            >
              <option value="default">정렬: 기본 등록순</option>
              {userLocation && <option value="distance">정렬: 📍 내 위치 가까운순</option>}
              <option value="name">정렬: 이름 가나다순</option>
            </select>
          </div>
        </div>

        {/* 1단계 시·도 지역 필터 칩 */}
        <div className="mt-4 flex flex-wrap items-center gap-1.5 border-t border-zinc-100 pt-3">
          <span className="mr-1 text-xs font-bold text-zinc-500">시·도:</span>
          {regions.map(r => (
            <button
              key={r}
              type="button"
              onClick={() => handleRegionChange(r)}
              className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                selectedRegion === r
                  ? 'bg-emerald-800 text-white shadow-xs'
                  : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
              }`}
            >
              {r}
            </button>
          ))}
        </div>

        {/* 2단계 세부 구·군 필터 칩 (시·도 선택 시 표시) */}
        {districts.length > 0 && (
          <div className="mt-2.5 flex flex-wrap items-center gap-1.5 rounded-xl bg-emerald-50/50 p-2.5 border border-emerald-100/60">
            <span className="mr-1 text-xs font-bold text-emerald-800">
              {selectedRegion} 세부 구·군 ({districts.length - 1}곳):
            </span>
            {districts.map(d => (
              <button
                key={d}
                type="button"
                onClick={() => {
                  setSelectedDistrict(d);
                  setVisibleCount(PAGE_SIZE);
                }}
                className={`rounded-md px-2 py-0.5 text-xs font-semibold transition ${
                  selectedDistrict === d
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'bg-white text-zinc-700 hover:bg-emerald-100/80 border border-emerald-200/60'
                }`}
              >
                {d}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 검색 결과 카운트, 거리 기준 및 CSV 다운로드 버튼 */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between px-1">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-bold text-zinc-700">
            검색된 클럽 <span className="text-emerald-700 font-extrabold">{filteredClubs.length.toLocaleString()}</span>곳
            {filteredClubs.length > displayedClubs.length && (
              <span className="text-xs text-zinc-400 font-normal ml-1">
                (현재 {displayedClubs.length.toLocaleString()}곳 표시 중)
              </span>
            )}
          </p>
          {userLocation && (
            <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700">
              <Compass className="size-3 text-blue-500" />
              기준 위치: <strong>{userLocation.label}</strong>
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleDownloadCsv}
            className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-xs font-bold text-zinc-700 shadow-2xs hover:bg-zinc-50 hover:text-zinc-900 transition cursor-pointer"
            title="현재 검색된 클럽 목록을 엑셀(CSV) 파일로 저장합니다"
          >
            <Download className="size-3.5 text-emerald-600" />
            엑셀(CSV) 다운로드
          </button>
          <p className="text-xs text-muted-foreground hidden sm:flex items-center gap-1">
            <Building2 className="size-3.5 text-emerald-600" /> 배드민턴타임즈 공식 정보
          </p>
        </div>
      </div>

      {/* 클럽 카드 그리드 */}
      {displayedClubs.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-200 bg-white p-12 text-center text-zinc-500">
          <Info className="mx-auto size-8 text-zinc-400 mb-2" />
          <p className="text-sm font-bold text-zinc-700">조건에 맞는 배드민턴 클럽을 찾지 못했습니다.</p>
          <p className="text-xs text-zinc-400 mt-1">검색어나 선택된 지역/필터 조건을 변경해 보세요.</p>
          <button
            type="button"
            onClick={() => {
              setQuery('');
              setSelectedRegion('전체');
              setSelectedDistrict('전체');
              setSelectedTimeSlot('전체');
              setOnlyBeginner(false);
              setOnlyHasLink(false);
              setOnlyFavorites(false);
            }}
            className="mt-4 inline-flex items-center gap-1 rounded-xl bg-emerald-700 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-800 cursor-pointer"
          >
            필터 전체 초기화
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {displayedClubs.map(club => {
            const isFav = favorites.has(club.id);
            return (
              <div
                key={club.id}
                className="flex flex-col justify-between rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-1 hover:border-emerald-300 hover:shadow-md relative"
              >
                <div>
                  {/* 상단 뱃지 영역 및 찜하기 버튼 */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-800">
                        <MapPin className="size-3" /> {club.region} · {club.district}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-md bg-teal-50 px-2 py-0.5 text-xs font-bold text-teal-800">
                        <Layers className="size-3" /> {club.venueType || '실내체육관'}
                      </span>
                      {club.distanceKm !== undefined && (
                        <span className="inline-flex items-center gap-0.5 rounded-md bg-blue-50 px-1.5 py-0.5 text-[11px] font-bold text-blue-700">
                          📍 {formatDistanceKm(club.distanceKm)}
                        </span>
                      )}
                    </div>

                    {/* ❤️ 찜하기 버튼 */}
                    <button
                      type="button"
                      onClick={(e) => toggleFavorite(club.id, e)}
                      className={`grid size-8 place-items-center rounded-full transition shrink-0 cursor-pointer ${
                        isFav 
                          ? 'bg-rose-50 text-rose-500 hover:bg-rose-100' 
                          : 'bg-zinc-100 text-zinc-400 hover:bg-zinc-200 hover:text-zinc-600'
                      }`}
                      title={isFav ? '찜 해제' : '클럽 찜하기'}
                    >
                      <Heart className={`size-4 ${isFav ? 'fill-rose-500 text-rose-500' : ''}`} />
                    </button>
                  </div>

                  {/* 클럽명 */}
                  <div className="mt-2.5 flex items-start justify-between gap-2">
                    <h3 className="text-lg font-black tracking-tight text-zinc-900 line-clamp-1">{club.name}</h3>
                    {club.link && (
                      <a
                        href={club.link}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-0.5 text-[11px] font-bold text-blue-700 hover:bg-blue-100 transition shrink-0"
                        title="클럽 카페/블로그/밴드 방문"
                      >
                        <LinkIcon className="size-3" /> 링크
                      </a>
                    )}
                  </div>

                  {/* 클럽위치 */}
                  <div className="mt-2 text-xs">
                    <p className="text-[11px] font-bold text-zinc-400">클럽위치</p>
                    <p className="font-semibold text-zinc-800 line-clamp-1 flex items-center gap-1 mt-0.5">
                      <MapPin className="size-3 text-emerald-600 shrink-0" /> {club.location}
                    </p>
                  </div>

                  {/* 운동장소 */}
                  <div className="mt-1.5 rounded-lg bg-emerald-50/80 px-2.5 py-1.5 border border-emerald-100/80">
                    <p className="text-[10px] font-bold text-emerald-700">운동장소</p>
                    <p className="text-xs font-bold text-emerald-950 truncate mt-0.5">
                      🏟️ {club.playVenue}
                    </p>
                  </div>

                  {/* 상세 정보 요약 블록 */}
                  <div className="mt-2.5 space-y-1.5 rounded-xl bg-zinc-50 p-2.5 text-xs text-zinc-700">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-zinc-500 flex items-center gap-1 shrink-0 mt-0.5">
                        <Clock className="size-3.5 text-zinc-400" /> 운동시간
                      </span>
                      <strong className="text-zinc-900 font-semibold text-right line-clamp-2">{club.playHours}</strong>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-500 flex items-center gap-1">
                        <Layers className="size-3.5 text-zinc-400" /> 코트 / 회원
                      </span>
                      <span className="font-semibold text-zinc-900">
                        <strong className="text-emerald-700">{club.courtCount}</strong> · {club.memberCount}
                      </span>
                    </div>
                    {club.feeInfo && club.feeInfo !== '클럽 방문 또는 게시판 문의' && (
                      <div className="flex items-start justify-between border-t border-zinc-100 pt-1">
                        <span className="text-zinc-500 flex items-center gap-1 shrink-0">
                          <Coins className="size-3.5 text-amber-500" /> 회비안내
                        </span>
                        <span className="font-semibold text-amber-800 line-clamp-1 text-right">{club.feeInfo}</span>
                      </div>
                    )}
                    {club.contact && club.contact !== '배드민턴타임즈 게시판 문의' && (
                      <div className="flex items-center justify-between border-t border-zinc-100 pt-1">
                        <span className="text-zinc-500 flex items-center gap-1">
                          <Phone className="size-3.5 text-zinc-400" /> 문의전화
                        </span>
                        <strong className="text-emerald-800 font-semibold">{club.contact}</strong>
                      </div>
                    )}
                  </div>

                  {/* 기타사항 미리보기 (있을 경우) */}
                  {club.description && (
                    <p className="mt-2 text-[11px] text-zinc-500 line-clamp-2 bg-zinc-50/60 p-2 rounded-lg border border-zinc-100">
                      📝 {club.description}
                    </p>
                  )}

                  {/* 공식 데이터 출처 표시 */}
                  <div className="mt-3 flex items-center justify-between rounded-lg bg-emerald-50/70 px-2.5 py-1.5 text-[11px] font-semibold text-emerald-900">
                    <span className="flex items-center gap-1.5 truncate">
                      <Building2 className="size-3 text-emerald-700 shrink-0" />
                      <span className="truncate">출처: {club.source}</span>
                    </span>
                    <a
                      href={club.sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="ml-1 inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-700 hover:text-emerald-900 shrink-0 hover:underline"
                      title="배드민턴타임즈 원문 보기"
                    >
                      원문 <ExternalLink className="size-2.5" />
                    </a>
                  </div>
                </div>

                {/* 하단 액션 버튼 */}
                <div className="mt-5 grid grid-cols-2 gap-2 border-t border-zinc-100 pt-3">
                  <a
                    href={club.mapUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-9 items-center justify-center gap-1 rounded-xl border border-zinc-200 bg-zinc-50 text-xs font-bold text-zinc-700 transition hover:bg-zinc-100 hover:text-zinc-900 cursor-pointer"
                  >
                    <MapPin className="size-3.5 text-emerald-600" /> 길찾기
                  </a>
                  <button
                    type="button"
                    onClick={() => setSelectedClub(club)}
                    className="inline-flex h-9 items-center justify-center gap-1 rounded-xl bg-emerald-700 text-xs font-bold text-white shadow-xs transition hover:bg-emerald-800 cursor-pointer"
                  >
                    <Info className="size-3.5" /> 상세 전체보기
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 하단 더보기 (+36개) 버튼 */}
      {hasMore && (
        <div className="mt-8 flex flex-col items-center justify-center gap-2">
          <button
            type="button"
            onClick={handleLoadMore}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-emerald-800 px-8 text-sm font-bold text-white shadow-md hover:bg-emerald-900 active:scale-95 transition cursor-pointer"
          >
            클럽 더보기 (+{Math.min(PAGE_SIZE, filteredClubs.length - visibleCount)}개)
            <ChevronDown className="size-4" />
          </button>
          <p className="text-xs text-zinc-400">
            전체 {filteredClubs.length.toLocaleString()}곳 중 {displayedClubs.length.toLocaleString()}곳 표시됨
          </p>
        </div>
      )}

      {/* 클럽 상세 전체 모달 */}
      {selectedClub && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <button
              type="button"
              onClick={() => setSelectedClub(null)}
              className="absolute right-4 top-4 grid size-8 place-items-center rounded-full bg-zinc-100 text-zinc-500 hover:bg-zinc-200 cursor-pointer"
            >
              <X className="size-4" />
            </button>

            <div className="flex items-center gap-2 flex-wrap">
              <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-800">
                {selectedClub.region} · {selectedClub.district}
              </span>
              <span className="rounded-md bg-teal-100 px-2 py-0.5 text-xs font-bold text-teal-800">
                {selectedClub.venueType}
              </span>
              {selectedClub.distanceKm !== undefined && (
                <span className="rounded-md bg-blue-100 px-2 py-0.5 text-xs font-bold text-blue-800">
                  📍 {userLocation?.label ? `${userLocation.label} 기준 ` : ''}{formatDistanceKm(selectedClub.distanceKm)}
                </span>
              )}
              {selectedClub.registeredDate && (
                <span className="rounded-md bg-zinc-100 px-2 py-0.5 text-xs font-bold text-zinc-600">
                  등록일: {selectedClub.registeredDate}
                </span>
              )}
            </div>

            <div className="mt-2 flex items-center justify-between gap-3">
              <h3 className="text-2xl font-black text-zinc-900">{selectedClub.name}</h3>
              <button
                type="button"
                onClick={() => toggleFavorite(selectedClub.id)}
                className={`grid size-9 place-items-center rounded-full transition shrink-0 cursor-pointer ${
                  favorites.has(selectedClub.id)
                    ? 'bg-rose-100 text-rose-600'
                    : 'bg-zinc-100 text-zinc-400 hover:bg-zinc-200 hover:text-zinc-600'
                }`}
                title="찜하기"
              >
                <Heart className={`size-5 ${favorites.has(selectedClub.id) ? 'fill-rose-600 text-rose-600' : ''}`} />
              </button>
            </div>

            {/* 배드민턴타임즈 정규 상세 테이블 */}
            <div className="mt-4 overflow-hidden rounded-xl border border-zinc-200 shadow-xs text-xs">
              <table className="w-full text-left border-collapse">
                <tbody>
                  <tr className="border-b border-zinc-200">
                    <td className="w-24 bg-zinc-50/80 px-3.5 py-2.5 font-bold text-zinc-600 border-r border-zinc-200 shrink-0">
                      클럽이름
                    </td>
                    <td className="px-3.5 py-2.5 font-extrabold text-zinc-900 text-sm">
                      {selectedClub.name}
                    </td>
                  </tr>
                  <tr className="border-b border-zinc-200">
                    <td className="w-24 bg-zinc-50/80 px-3.5 py-2.5 font-bold text-zinc-600 border-r border-zinc-200">
                      클럽위치
                    </td>
                    <td className="px-3.5 py-2.5 font-medium text-zinc-800 leading-relaxed">
                      {selectedClub.location}
                    </td>
                  </tr>
                  <tr className="border-b border-zinc-200">
                    <td className="w-24 bg-emerald-50/80 px-3.5 py-2.5 font-bold text-emerald-800 border-r border-zinc-200">
                      운동장소
                    </td>
                    <td className="px-3.5 py-2.5 font-bold text-emerald-900 leading-relaxed bg-emerald-50/30">
                      🏟️ {selectedClub.playVenue}
                    </td>
                  </tr>
                  <tr className="border-b border-zinc-200">
                    <td className="w-24 bg-emerald-50/80 px-3.5 py-2.5 font-bold text-emerald-800 border-r border-zinc-200">
                      운동시간
                    </td>
                    <td className="px-3.5 py-2.5 font-bold text-emerald-950 leading-relaxed bg-emerald-50/30">
                      ⏰ {selectedClub.playHours}
                    </td>
                  </tr>
                  <tr className="border-b border-zinc-200">
                    <td className="w-24 bg-zinc-50/80 px-3.5 py-2.5 font-bold text-zinc-600 border-r border-zinc-200">
                      구장형태
                    </td>
                    <td className="px-3.5 py-2.5 font-semibold text-zinc-800">
                      {selectedClub.venueType}
                    </td>
                  </tr>
                  <tr className="border-b border-zinc-200">
                    <td className="w-24 bg-zinc-50/80 px-3.5 py-2.5 font-bold text-zinc-600 border-r border-zinc-200">
                      코트수
                    </td>
                    <td className="px-3.5 py-2.5 font-semibold text-zinc-800">
                      {selectedClub.courtCount}
                    </td>
                  </tr>
                  <tr className="border-b border-zinc-200">
                    <td className="w-24 bg-zinc-50/80 px-3.5 py-2.5 font-bold text-zinc-600 border-r border-zinc-200">
                      회원수
                    </td>
                    <td className="px-3.5 py-2.5 font-semibold text-zinc-800">
                      {selectedClub.memberCount}
                    </td>
                  </tr>
                  <tr className="border-b border-zinc-200">
                    <td className="w-24 bg-zinc-50/80 px-3.5 py-2.5 font-bold text-zinc-600 border-r border-zinc-200">
                      회비안내
                    </td>
                    <td className="px-3.5 py-2.5 font-bold text-amber-800">
                      {selectedClub.feeInfo}
                    </td>
                  </tr>
                  <tr className="border-b border-zinc-200">
                    <td className="w-24 bg-zinc-50/80 px-3.5 py-2.5 font-bold text-zinc-600 border-r border-zinc-200">
                      문의전화
                    </td>
                    <td className="px-3.5 py-2.5 font-semibold text-zinc-800">
                      {selectedClub.contact}
                    </td>
                  </tr>
                  <tr className="border-b border-zinc-200">
                    <td className="w-24 bg-zinc-50/80 px-3.5 py-2.5 font-bold text-zinc-600 border-r border-zinc-200">
                      관련링크
                    </td>
                    <td className="px-3.5 py-2.5 font-semibold text-zinc-800">
                      {selectedClub.link ? (
                        <a
                          href={selectedClub.link}
                          target="_blank"
                          rel="noreferrer"
                          className="text-blue-600 hover:underline flex items-center gap-1 font-bold"
                        >
                          {selectedClub.link} <ExternalLink className="size-3" />
                        </a>
                      ) : (
                        <span className="text-zinc-400">http://</span>
                      )}
                    </td>
                  </tr>
                  {selectedClub.description && (
                    <tr className="border-b border-zinc-200">
                      <td className="w-24 bg-zinc-50/80 px-3.5 py-2.5 font-bold text-zinc-600 border-r border-zinc-200 align-top">
                        기타사항
                      </td>
                      <td className="px-3.5 py-2.5 font-medium text-zinc-700 leading-relaxed whitespace-pre-line">
                        {selectedClub.description}
                      </td>
                    </tr>
                  )}
                  <tr>
                    <td className="w-24 bg-zinc-50/80 px-3.5 py-2.5 font-bold text-zinc-600 border-r border-zinc-200">
                      등록일자
                    </td>
                    <td className="px-3.5 py-2.5 font-medium text-zinc-600">
                      {selectedClub.registeredDate || '-'}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* 관련링크 (블로그/카페/밴드) */}
            {selectedClub.link && (
              <div className="mt-3">
                <a
                  href={selectedClub.link}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between rounded-xl border border-blue-200 bg-blue-50 px-3.5 py-2.5 text-xs font-bold text-blue-800 transition hover:bg-blue-100"
                >
                  <span className="flex items-center gap-1.5">
                    <LinkIcon className="size-3.5 text-blue-700" />
                    클럽 공식 카페 / 블로그 / 밴드 바로가기
                  </span>
                  <ExternalLink className="size-3.5 text-blue-600" />
                </a>
              </div>
            )}

            {/* 배드민턴타임즈 원문 링크 */}
            <div className="mt-3">
              <a
                href={selectedClub.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2 text-xs font-bold text-emerald-800 transition hover:bg-emerald-100"
              >
                <span className="flex items-center gap-1.5">
                  <Building2 className="size-3.5 text-emerald-700" />
                  배드민턴타임즈 전국클럽 정보 바로가기
                </span>
                <ExternalLink className="size-3.5 text-emerald-600" />
              </a>
            </div>

            {/* 가입 방문 팁 */}
            <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-[11px] text-amber-900">
              💡 <strong>클럽 첫 방문 팁:</strong> 운동 시간대에 라켓과 <strong>실내 전용 배드민턴화</strong>를 지참하시고 체육관에 방문하시면 클럽 임원진에게 가입 상담 및 1일 게스트 게임 참여가 가능합니다!
            </div>

            <div className="mt-5 flex items-center gap-2">
              <a
                href={selectedClub.mapUrl}
                target="_blank"
                rel="noreferrer"
                className="flex-1 inline-flex h-11 items-center justify-center gap-1.5 rounded-xl bg-zinc-900 text-xs font-bold text-white shadow transition hover:bg-zinc-800 cursor-pointer"
              >
                <MapPin className="size-4 text-emerald-400" /> 카카오맵으로 구장 길찾기
              </a>
              <button
                type="button"
                onClick={() => setSelectedClub(null)}
                className="inline-flex h-11 px-5 items-center justify-center rounded-xl border border-zinc-200 text-xs font-bold text-zinc-700 hover:bg-zinc-100 cursor-pointer"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

