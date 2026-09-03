'use client';

import React, { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import {
  ArrowUpDown,
  Calendar,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Code2,
  Copy,
  Download,
  ExternalLink,
  FileSpreadsheet,
  Flame,
  Globe,
  Heart,
  KeyRound,
  Layers,
  List,
  LocateFixed,
  Lock,
  LogOut,
  MapPin,
  Navigation,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Star,
  Table as TableIcon,
  Trophy,
  Unlock,
  X,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { CRAWLER_SOURCES, CRAWLER_TIPS, type SourceCategory } from '@/lib/crawler-sources';
import { calculateDistanceKm, getVenueCoordinates, isInternationalVenue, PRESET_LOCATIONS, reverseGeocodeCoords, type Coordinates } from '@/lib/geo-utils';
import type { Tournament, TournamentCategory, TournamentSource } from '@/lib/tournaments';

export type Status = '접수중' | '접수예정' | '마감임박' | '접수마감' | '대회종료';
export type StatusFilter = '전체' | '종료 제외' | Status;
type MainTab = 'tournaments' | 'sources';
type View = 'list' | 'table' | 'calendar';
type SortOption = 'eventStart' | 'registrationEnd' | 'name';

interface UserLocation {
  coords: Coordinates;
  label: string;
  isGps: boolean;
}

const regions = ['전체', '수도권', '충청', '전라', '경상', '강원', '기타'] as const;
const categories: readonly (TournamentCategory | '전체')[] = ['전체', '전국오픈', '지역구대회', '브랜드대회', '학생선수권', '국제대회'];
const statuses: readonly StatusFilter[] = ['전체', '종료 제외', '접수중', '마감임박', '접수예정', '접수마감', '대회종료'];
const distanceOptions = ['전체', '5km', '10km', '20km', '30km', '50km', '100km', '200km', '300km'] as const;
export type DistanceFilter = (typeof distanceOptions)[number];

function atMidnight(date: string) {
  return new Date(`${date}T00:00:00+09:00`);
}

function daysFromToday(date: string, baseDate: Date) {
  return Math.ceil((atMidnight(date).getTime() - baseDate.getTime()) / 86400000);
}

export function getStatus(t: Tournament, baseDate: Date): Status {
  const eventEndDays = daysFromToday(t.eventEnd, baseDate);
  if (eventEndDays < 0) return '대회종료';

  const regStartDays = daysFromToday(t.registrationStart, baseDate);
  const regEndDays = daysFromToday(t.registrationEnd, baseDate);

  if (regStartDays > 0) return '접수예정';
  if (regEndDays < 0) return '접수마감';
  if (regEndDays <= 3) return '마감임박';
  return '접수중';
}

function regionOf(venue: string) {
  if (/서울|경기|인천/.test(venue)) return '수도권';
  if (/충북|충남|대전|세종/.test(venue)) return '충청';
  if (/전북|전남|광주/.test(venue)) return '전라';
  if (/경북|경남|부산|대구|울산/.test(venue)) return '경상';
  if (/강원/.test(venue)) return '강원';
  return '기타';
}

function statusStyle(status: Status) {
  switch (status) {
    case '접수중':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200 font-bold';
    case '마감임박':
      return 'bg-rose-50 text-rose-700 border-rose-200 animate-pulse font-bold';
    case '접수예정':
      return 'bg-sky-50 text-sky-700 border-sky-200 font-bold';
    case '접수마감':
      return 'bg-amber-50 text-amber-700 border-amber-200';
    case '대회종료':
      return 'bg-slate-100 text-slate-500 border-slate-200';
    default:
      return 'bg-zinc-100 text-zinc-500 border-zinc-200';
  }
}

function googleCalendarUrl(t: Tournament) {
  const end = new Date(atMidnight(t.eventEnd).getTime() + 86400000).toISOString().slice(0, 10).replaceAll('-', '');
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(
    t.name
  )}&dates=${t.eventStart.replaceAll('-', '')}/${end}&location=${encodeURIComponent(
    t.venue
  )}&details=${encodeURIComponent(`출처: ${t.source} | 공식 안내: ${t.officialLink}`)}`;
}

function getSecurePosterUrl(url?: string): string {
  if (!url) return '';
  if (url.startsWith('data:') || url.startsWith('blob:')) return url;
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return `https://images.weserv.nl/?url=${encodeURIComponent(url)}`;
  }
  return url;
}

function getTournamentPosterFallback(name: string, category: string, venue: string, source: string, eventPeriod: string, fee: string = '요강 참조') {
  const safeName = name.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const safeVenue = venue.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const safePeriod = eventPeriod.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const safeSource = source.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const safeCategory = category.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const safeFee = fee.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  let line1 = safeName;
  let line2 = '';
  if (safeName.length > 20) {
    const splitIndex = safeName.lastIndexOf(' ', 18) > 0 ? safeName.lastIndexOf(' ', 18) : 18;
    line1 = safeName.slice(0, splitIndex);
    line2 = safeName.slice(splitIndex).trim();
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 450" width="800" height="450">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#064e3b" />
      <stop offset="100%" stop-color="#022c22" />
    </linearGradient>
    <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="4" stdDeviation="6" flood-opacity="0.5"/>
    </filter>
  </defs>
  <rect width="800" height="450" fill="url(#bg)" />
  <g opacity="0.08" stroke="#ffffff" stroke-width="2" fill="none">
    <rect x="50" y="40" width="700" height="370" rx="8" />
    <line x1="400" y1="40" x2="400" y2="410" stroke-width="3" stroke-dasharray="6,6" />
  </g>
  <rect x="20" y="20" width="760" height="410" rx="16" fill="none" stroke="#34d399" stroke-width="2" stroke-opacity="0.3" />
  <g transform="translate(45, 55)">
    <rect width="130" height="28" rx="14" fill="#047857" />
    <text x="65" y="19" fill="#ffffff" font-size="12" font-weight="900" text-anchor="middle" font-family="Pretendard, sans-serif">★ ${safeCategory}</text>
    <rect x="140" width="160" height="28" rx="14" fill="#ffffff" fill-opacity="0.12" stroke="#ffffff" stroke-width="1" stroke-opacity="0.2" />
    <text x="220" y="19" fill="#ffffff" font-size="12" font-weight="700" text-anchor="middle" font-family="Pretendard, sans-serif">🏷️ 출처: ${safeSource}</text>
  </g>
  <g transform="translate(45, 120)">
    <text x="0" y="25" fill="#34d399" font-size="14" font-weight="800" letter-spacing="2" font-family="Pretendard, sans-serif">2026 전국 배드민턴 대회 공식 요강</text>
    <text x="0" y="65" fill="#ffffff" font-size="${line2 ? '28' : '32'}" font-weight="900" font-family="Pretendard, sans-serif" filter="url(#shadow)">${line1}</text>
    ${line2 ? `<text x="0" y="105" fill="#ffffff" font-size="28" font-weight="900" font-family="Pretendard, sans-serif" filter="url(#shadow)">${line2}</text>` : ''}
  </g>
  <g transform="translate(45, 260)">
    <rect width="710" height="135" rx="16" fill="#000000" fill-opacity="0.45" stroke="#ffffff" stroke-width="1" stroke-opacity="0.15" />
    <g transform="translate(25, 38)">
      <text x="22" y="0" fill="#94a3b8" font-size="12" font-weight="700" font-family="Pretendard, sans-serif">대회 일정</text>
      <text x="100" y="0" fill="#ffffff" font-size="14" font-weight="800" font-family="Pretendard, sans-serif">${safePeriod}</text>
    </g>
    <g transform="translate(370, 38)">
      <text x="22" y="0" fill="#94a3b8" font-size="12" font-weight="700" font-family="Pretendard, sans-serif">개최 장소</text>
      <text x="100" y="0" fill="#ffffff" font-size="14" font-weight="800" font-family="Pretendard, sans-serif">${safeVenue}</text>
    </g>
    <line x1="25" y1="62" x2="685" y2="62" stroke="#ffffff" stroke-opacity="0.1" />
    <g transform="translate(25, 95)">
      <text x="22" y="0" fill="#94a3b8" font-size="12" font-weight="700" font-family="Pretendard, sans-serif">참 가 비</text>
      <text x="100" y="0" fill="#fef08a" font-size="14" font-weight="800" font-family="Pretendard, sans-serif">${safeFee}</text>
    </g>
    <g transform="translate(370, 95)">
      <text x="22" y="0" fill="#94a3b8" font-size="12" font-weight="700" font-family="Pretendard, sans-serif">요강 인증</text>
      <text x="100" y="0" fill="#bae6fd" font-size="13" font-weight="700" font-family="Pretendard, sans-serif">대한민국 배드민턴 허브 실시간 검증 완료</text>
    </g>
  </g>
</svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function FilterRow({
  label,
  items,
  value,
  onChange,
}: {
  label: string;
  items: readonly string[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex items-start gap-2 pt-0.5">
      <span className="w-12 shrink-0 pt-1 text-xs font-semibold text-muted-foreground">{label}</span>
      <div className="flex flex-wrap gap-1.5">
        {items.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => onChange(item)}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
              value === item
                ? 'border-emerald-700 bg-emerald-700 font-bold text-white shadow-sm'
                : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
            }`}
          >
            {item}
          </button>
        ))}
      </div>
    </div>
  );
}

const DEFAULT_LOCATION: UserLocation = {
  coords: { lat: 37.5385, lng: 127.0823 },
  label: '서울 광진구',
  isGps: false,
};

function subscribeLocation(callback: () => void) {
  window.addEventListener('storage', callback);
  window.addEventListener('minton_location_change', callback);
  return () => {
    window.removeEventListener('storage', callback);
    window.removeEventListener('minton_location_change', callback);
  };
}

function getLocationSnapshot(): string {
  if (typeof window === 'undefined') return JSON.stringify(DEFAULT_LOCATION);
  return localStorage.getItem('minton_user_location') || JSON.stringify(DEFAULT_LOCATION);
}

function getLocationServerSnapshot(): string {
  return JSON.stringify(DEFAULT_LOCATION);
}

export function TournamentExplorer({ tournaments }: { tournaments: Tournament[] }) {
  const [activeTab, setActiveTab] = useState<MainTab>('tournaments');
  const [query, setQuery] = useState('');
  const [region, setRegion] = useState('전체');
  const [category, setCategory] = useState('전체');
  const [status, setStatus] = useState<StatusFilter>('전체');
  const [source, setSource] = useState('전체');
  const [distanceFilter, setDistanceFilter] = useState<DistanceFilter>('전체');
  const [sortOption, setSortOption] = useState<SortOption>('eventStart');
  const [view, setView] = useState<View>('list');
  const [selected, setSelected] = useState<Tournament | null>(null);
  const [sourceCategoryFilter, setSourceCategoryFilter] = useState<string>('전체');
  const [isLocating, setIsLocating] = useState(false);

  // 즐겨찾기 (하트 찜하기) 상태 관리 (localStorage 영구 유지)
  const [favorites, setFavorites] = useState<Set<string>>(() => {
    if (typeof window === 'undefined') return new Set();
    try {
      const saved = localStorage.getItem('minton_favorites');
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });

  const [onlyFavorites, setOnlyFavorites] = useState(false);

  const toggleFavorite = (id: string, e?: React.SyntheticEvent) => {
    if (e) e.stopPropagation();
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      try {
        localStorage.setItem('minton_favorites', JSON.stringify(Array.from(next)));
      } catch {
        // ignore
      }
      return next;
    });
  };

  // 관리자 권한 상태 관리 (useState 기반 실시간 반응)
  const [isAdmin, setIsAdmin] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    try {
      return localStorage.getItem('minton_is_admin') === 'true';
    } catch {
      return false;
    }
  });

  // 관리자 인증 모달 상태
  const [adminModalOpen, setAdminModalOpen] = useState(false);
  const [adminInputPassword, setAdminInputPassword] = useState('');
  const [adminErrorMessage, setAdminErrorMessage] = useState('');

  // 구글 시트 복사 알림 상태
  const [copySuccess, setCopySuccess] = useState(false);

  // useSyncExternalStore로 SSR/클라이언트 위치 완벽 동기화
  const locationString = useSyncExternalStore(subscribeLocation, getLocationSnapshot, getLocationServerSnapshot);
  const [runtimeLocation, setRuntimeLocation] = useState<UserLocation | null>(null);

  const userLocation: UserLocation = useMemo(() => {
    if (runtimeLocation) return runtimeLocation;
    try {
      return JSON.parse(locationString) as UserLocation;
    } catch {
      return DEFAULT_LOCATION;
    }
  }, [runtimeLocation, locationString]);

  // 기준 오늘 날짜 (2026년 9월 2일)
  const today = useMemo(() => new Date(2026, 8, 2), []);

  // 브라우저 GPS 위치 요청 핸들러 (역지오코딩 탑재)
  const handleGetGpsLocation = () => {
    if (!navigator.geolocation) {
      alert('접속하신 브라우저가 위치 정보 기능을 지원하지 않습니다.');
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const coords = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        };

        // 실시간 역지오코딩으로 실제 구/동 이름 판별
        const districtName = await reverseGeocodeCoords(coords);
        const newLocation: UserLocation = {
          coords,
          label: `${districtName} (GPS)`,
          isGps: true,
        };

        setRuntimeLocation(newLocation);
        setIsLocating(false);

        try {
          localStorage.setItem('minton_user_location', JSON.stringify(newLocation));
          window.dispatchEvent(new Event('minton_location_change'));
        } catch {
          // ignore
        }
      },
      (err) => {
        setIsLocating(false);
        alert(`위치 정보를 가져오지 못했습니다: ${err.message}\n목록에서 계신 지역(예: 서울 광진구)을 직접 선택해주세요.`);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  // 관리자 인증 핸들러
  const handleLoginAdmin = (e?: React.SyntheticEvent) => {
    if (e) e.preventDefault();
    if (adminInputPassword === '4545') {
      try {
        localStorage.setItem('minton_is_admin', 'true');
      } catch {
        // ignore
      }
      setIsAdmin(true);
      setAdminModalOpen(false);
      setAdminInputPassword('');
      setAdminErrorMessage('');
    } else {
      setAdminErrorMessage('관리자 비밀번호가 올바르지 않습니다.');
    }
  };

  // 관리자 로그아웃 핸들러
  const handleLogoutAdmin = () => {
    try {
      localStorage.removeItem('minton_is_admin');
    } catch {
      // ignore
    }
    setIsAdmin(false);
    setActiveTab('tournaments');
  };

  // 전역 window 트리거 등록 (HTML 레벨 클릭 즉각 반응)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const win = window as unknown as Record<string, unknown>;
      win.__openAdminModal = () => {
        setAdminModalOpen(true);
        setAdminErrorMessage('');
        setAdminInputPassword('');
      };
      win.__loginAdminDirect = (pw: string) => {
        if (pw === '4545') {
          try {
            localStorage.setItem('minton_is_admin', 'true');
          } catch {}
          setIsAdmin(true);
          return true;
        }
        return false;
      };
      win.__logoutAdmin = handleLogoutAdmin;
    }
  }, []);

  // 프리셋 기준 지역 선택 핸들러
  const handleSelectPresetLocation = (presetId: string) => {
    const preset = PRESET_LOCATIONS.find((p) => p.id === presetId);
    if (preset) {
      const newLocation: UserLocation = {
        coords: preset.coords,
        label: preset.name.split(' (')[0], // 깔끔한 표시용
        isGps: false,
      };
      setRuntimeLocation(newLocation);

      try {
        localStorage.setItem('minton_user_location', JSON.stringify(newLocation));
        window.dispatchEvent(new Event('minton_location_change'));
      } catch {
        // ignore
      }
    }
  };

  // 대회 목록 필터 및 정렬 (거리 계산 및 다중 출처 매칭 포함)
  const filtered = useMemo(() => {
    return tournaments
      .map((t) => {
        const venueCoords = getVenueCoordinates(t.venue);
        const distanceKm = calculateDistanceKm(userLocation.coords, venueCoords);
        return { ...t, distanceKm };
      })
      .filter((t) => {
        const allSources = t.sources && t.sources.length > 0 ? t.sources.join(' ') : t.source;
        const text = `${t.name} ${t.venue} ${allSources} ${t.category}`.toLowerCase();
        const matchesSource =
          source === '전체' ||
          (t.sources ? t.sources.includes(source as TournamentSource) : t.source === source);

        const currentStatus = getStatus(t, today);
        const matchesStatus =
          status === '전체'
            ? true
            : status === '종료 제외'
            ? currentStatus !== '대회종료'
            : currentStatus === status;

        const matchesDistance = (() => {
          if (distanceFilter === '전체') return true;
          const maxKm = parseInt(distanceFilter.replace('km', ''), 10);
          return t.distanceKm <= maxKm;
        })();

        const matchesFavorite = onlyFavorites ? favorites.has(t.id) : true;

        return (
          (!query || text.includes(query.toLowerCase())) &&
          (region === '전체' || regionOf(t.venue) === region) &&
          (category === '전체' || t.category === category) &&
          matchesStatus &&
          matchesSource &&
          matchesDistance &&
          matchesFavorite
        );
      })
      .sort((a, b) => {
        // ❤️ 즐겨찾기(하트) 등록된 대회가 항상 최상단에 우선 표시!
        const aFav = favorites.has(a.id) ? 1 : 0;
        const bFav = favorites.has(b.id) ? 1 : 0;
        if (aFav !== bFav) return bFav - aFav;

        if (sortOption === 'eventStart') return a.eventStart.localeCompare(b.eventStart);
        if (sortOption === 'registrationEnd') return a.registrationEnd.localeCompare(b.registrationEnd);
        return a.name.localeCompare(b.name);
      });
  }, [tournaments, query, region, category, status, source, distanceFilter, sortOption, today, userLocation, favorites, onlyFavorites]);

  // 구글 시트 및 엑셀용 CSV 내보내기 핸들러 (한글 깨짐 방지 UTF-8 BOM 적용)
  const handleExportCsv = () => {
    const headers = ['상태', '대회명', '구분', '대회 시작일', '대회 종료일', '대회 기간', '접수 기간', '개최 장소', '거리(km)', '참가비', '공식 요강 링크'];
    if (isAdmin) headers.push('출처');

    const escapeCsv = (val: string | number | undefined) => {
      if (val === undefined || val === null) return '""';
      const str = String(val).replaceAll('"', '""');
      return `"${str}"`;
    };

    const rows = filtered.map((t) => {
      const currentStatus = getStatus(t, today);
      const row = [
        escapeCsv(currentStatus),
        escapeCsv(t.name),
        escapeCsv(t.category),
        escapeCsv(t.eventStart),
        escapeCsv(t.eventEnd),
        escapeCsv(t.eventPeriod),
        escapeCsv(t.registrationPeriod),
        escapeCsv(t.venue),
        escapeCsv(t.distanceKm !== undefined ? `${t.distanceKm}km` : '-'),
        escapeCsv(t.fee || '요강 참조'),
        escapeCsv(t.officialLink),
      ];
      if (isAdmin) row.push(escapeCsv(t.sources && t.sources.length > 0 ? t.sources.join(', ') : t.source));
      return row.join(',');
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `전국_배드민턴대회_일정_2026_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // 구글 시트 붙여넣기용 클립보드 TSV 복사 핸들러
  const handleCopyGoogleSheets = async () => {
    const headers = ['상태', '대회명', '구분', '대회 기간', '접수 기간', '개최 장소', '거리(km)', '참가비', '공식 요강 링크'];
    if (isAdmin) headers.push('출처');

    const rows = filtered.map((t) => {
      const currentStatus = getStatus(t, today);
      const row = [
        currentStatus,
        t.name,
        t.category,
        t.eventPeriod,
        t.registrationPeriod,
        t.venue,
        t.distanceKm !== undefined ? `${t.distanceKm}km` : '-',
        t.fee || '요강 참조',
        t.officialLink,
      ];
      if (isAdmin) row.push(t.sources && t.sources.length > 0 ? t.sources.join(', ') : t.source);
      return row.join('\t');
    });

    const tsvContent = [headers.join('\t'), ...rows].join('\n');
    try {
      await navigator.clipboard.writeText(tsvContent);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 3000);
    } catch {
      alert('클립보드 접근 권한을 허용해주세요.');
    }
  };

  // 수집된 대회 데이터로부터 실제 존재하는 출처 목록 및 개수 동적 추출 (중복 출처 포함)
  const dynamicSources = useMemo(() => {
    const counts = new Map<string, number>();
    for (const t of tournaments) {
      const list = t.sources && t.sources.length > 0 ? t.sources : [t.source];
      for (const s of list) {
        counts.set(s, (counts.get(s) || 0) + 1);
      }
    }
    const sortedSources = Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({ name, count }));

    return [
      { label: `전체 (${tournaments.length})`, value: '전체' },
      ...sortedSources.map(({ name, count }) => ({ label: `${name} (${count})`, value: name })),
    ];
  }, [tournaments]);

  const openCount = useMemo(
    () => tournaments.filter((t) => ['접수중', '마감임박'].includes(getStatus(t, today))).length,
    [tournaments, today]
  );

  const endedCount = useMemo(
    () => tournaments.filter((t) => getStatus(t, today) === '대회종료').length,
    [tournaments, today]
  );

  return (
    <main className="min-h-screen bg-slate-50/50 pb-24">
      {/* 헤더 네비게이션 */}
      <header className="sticky top-0 z-40 border-b border-emerald-950/10 bg-background/95 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <div className="grid size-9 place-items-center rounded-xl bg-emerald-700 text-lg shadow-sm">🏸</div>
            <div>
              <p className="text-[10px] font-bold tracking-[.18em] text-emerald-700">BADMINTON HUB</p>
              <h1 className="-mt-0.5 text-lg font-extrabold tracking-tight">배드민턴 허브</h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* 대회 탐색 / 출처 허브 상시 탭 전환 버튼 */}
            <div className="flex rounded-xl bg-zinc-100 p-1">
              <button
                type="button"
                onClick={() => setActiveTab('tournaments')}
                className={`flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-bold transition ${
                  activeTab === 'tournaments' ? 'bg-white text-emerald-800 shadow-sm' : 'text-muted-foreground'
                }`}
              >
                <Trophy className="size-3.5" /> 대회 탐색
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('sources')}
                className={`flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-bold transition ${
                  activeTab === 'sources' ? 'bg-white text-emerald-800 shadow-sm' : 'text-muted-foreground'
                }`}
              >
                <Globe className="size-3.5" /> 출처 허브 ({tournaments.length}건)
              </button>
            </div>

            {/* 상단 관리자 모드 로그인 / 로그아웃 버튼 */}
            {!isAdmin ? (
              <button
                type="button"
                onClick={() => {
                  setAdminModalOpen(true);
                  setAdminErrorMessage('');
                  setAdminInputPassword('');
                }}
                id="admin-header-btn"
                className="inline-flex h-8 items-center gap-1.5 rounded-xl border border-emerald-300 bg-white px-3 text-xs font-bold text-emerald-900 shadow-xs transition hover:border-emerald-600 hover:bg-emerald-50 active:scale-95"
              >
                <Lock className="size-3.5 text-emerald-700" /> 관리자
              </button>
            ) : (
              <button
                type="button"
                onClick={handleLogoutAdmin}
                title="관리자 권한 해제 (로그아웃)"
                className="inline-flex h-8 items-center gap-1.5 rounded-xl border border-amber-300 bg-amber-50 px-2.5 text-xs font-bold text-amber-900 shadow-xs transition hover:bg-amber-100 active:scale-95"
              >
                <ShieldCheck className="size-3.5 text-amber-700" /> 관리자 ON
                <LogOut className="size-3 text-amber-700" />
              </button>
            )}

            <Badge variant="outline" className="hidden h-8 border-emerald-200 bg-emerald-50 px-3 text-xs text-emerald-700 sm:inline-flex">
              <span className="mr-1.5 size-1.5 rounded-full bg-emerald-500" /> 접수 가능 {openCount}개
            </Badge>
          </div>
        </div>
      </header>

      {/* 메인 컨텐츠 영역 */}
      <div className="mx-auto max-w-6xl px-4 pt-6 sm:px-6 sm:pt-8">
        {activeTab === 'tournaments' ? (
          <>
            {/* 관리자 모드 전용 관제 센터 대시보드 (Admin Control Panel) */}
            {isAdmin && (
              <section className="mb-6 overflow-hidden rounded-3xl border-2 border-amber-300 bg-gradient-to-r from-amber-50 via-amber-100/60 to-emerald-50 p-5 shadow-lg">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div className="flex items-start gap-3.5">
                    <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-amber-500 text-white shadow-md">
                      <ShieldCheck className="size-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-extrabold text-amber-950">🛡️ 배드민턴 허브 관리자 관제 센터</h3>
                        <span className="rounded-full bg-amber-200 px-2 py-0.5 text-[10px] font-bold text-amber-900">
                          ADMIN ACTIVE
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-amber-800">
                        전국 10대 플랫폼 및 35개 네이버 밴드 연합 빅데이터(총 {tournaments.length}건)를 관리하고 데이터를 내보낼 수 있습니다.
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={handleExportCsv}
                      className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-amber-400 bg-white px-3.5 text-xs font-bold text-amber-900 shadow-xs transition hover:bg-amber-100 active:scale-95"
                    >
                      <Download className="size-3.5 text-amber-700" /> CSV 파일 다운로드 ({filtered.length}건)
                    </button>
                    <button
                      type="button"
                      onClick={handleCopyGoogleSheets}
                      className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-amber-400 bg-white px-3.5 text-xs font-bold text-amber-900 shadow-xs transition hover:bg-amber-100 active:scale-95"
                    >
                      <Copy className="size-3.5 text-amber-700" /> {copySuccess ? '복사 완료! (붙여넣기 가능)' : '구글 시트 복사'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('sources')}
                      className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-emerald-700 px-3.5 text-xs font-bold text-white shadow-xs transition hover:bg-emerald-800 active:scale-95"
                    >
                      <Globe className="size-3.5" /> 35개 밴드 & 출처 허브 보기
                    </button>
                    <button
                      type="button"
                      onClick={handleLogoutAdmin}
                      title="관리자 로그아웃"
                      className="inline-flex h-9 items-center gap-1 rounded-xl border border-slate-300 bg-white px-2.5 text-xs font-medium text-slate-600 shadow-xs transition hover:bg-slate-100"
                    >
                      <LogOut className="size-3 text-slate-500" /> 끄기
                    </button>
                  </div>
                </div>
              </section>
            )}

            {/* 히어로 배너 */}
            <section className="mb-6">
              <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
                <div>
                  <p className="mb-1 text-sm font-semibold text-emerald-700">전국 배드민턴 대회 통합 아카이브</p>
                  <h2 className="text-2xl font-extrabold leading-tight tracking-[-.04em] text-slate-900 sm:text-3xl">
                    내 주변에서 열리는 대회를 <br className="sm:hidden" />
                    가장 가까운 순서대로.
                  </h2>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
                  <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-100/70 px-2 py-1 font-bold text-emerald-800">
                    <CheckCircle2 className="size-3.5 text-emerald-600" /> 접수중 {openCount}개
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-lg bg-slate-200/70 px-2 py-1 font-bold text-slate-700">
                    종료된 대회 {endedCount}개
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-lg bg-sky-100/70 px-2 py-1 font-bold text-sky-800">
                    총 {tournaments.length}개 수집됨
                  </span>
                </div>
              </div>

              {/* 검색창 */}
              <div className="relative mt-4 max-w-2xl">
                <Search className="absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  aria-label="대회 검색"
                  placeholder="대회명, 지역, 체육관/경기장을 검색하세요"
                  className="h-12 rounded-2xl border-emerald-950/10 bg-white pl-12 pr-4 shadow-[0_8px_30px_rgb(20_83_45/6%)] focus-visible:border-emerald-500"
                />
              </div>

              {/* 위치 설정 바 (GPS 역지오코딩 & 세부 구 선택) */}
              <div className="mt-3.5 flex flex-wrap items-center justify-between gap-2.5 rounded-2xl border border-emerald-200 bg-emerald-50/80 p-3 text-xs sm:px-4">
                <div className="flex items-center gap-2">
                  <Navigation className={`size-4 ${userLocation.isGps ? 'text-emerald-600 animate-pulse' : 'text-slate-600'}`} />
                  <span className="font-semibold text-slate-700">
                    현재 기준 위치: <strong className="text-emerald-900 font-extrabold" suppressHydrationWarning>{userLocation.label}</strong>
                  </span>
                  {userLocation.isGps && (
                    <Badge variant="outline" className="border-emerald-300 bg-emerald-100/90 text-[10px] font-bold text-emerald-800" suppressHydrationWarning>
                      GPS 자동인식
                    </Badge>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleGetGpsLocation}
                    disabled={isLocating}
                    aria-label="현재 위치 GPS 자동 감지"
                    className="h-8 gap-1 rounded-xl border-emerald-300 bg-white text-xs font-bold text-emerald-800 shadow-sm hover:bg-emerald-50"
                  >
                    <LocateFixed className={`size-3.5 text-emerald-600 ${isLocating ? 'animate-spin' : ''}`} />
                    {isLocating ? '위치 측정 중...' : '내 위치(GPS) 찾기'}
                  </Button>

                  <select
                    value={
                      PRESET_LOCATIONS.find(
                        (p) =>
                          Math.abs(p.coords.lat - userLocation.coords.lat) < 0.01 &&
                          Math.abs(p.coords.lng - userLocation.coords.lng) < 0.01
                      )?.id || ''
                    }
                    onChange={(e) => handleSelectPresetLocation(e.target.value)}
                    aria-label="지역/구 직접 선택"
                    className="h-8 rounded-xl border border-emerald-300 bg-white px-2.5 text-xs font-semibold text-slate-800 outline-none shadow-sm hover:border-emerald-500"
                  >
                    <option value="" disabled>
                      지역/구 직접 선택
                    </option>
                    {PRESET_LOCATIONS.map((preset) => (
                      <option key={preset.id} value={preset.id}>
                        {preset.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </section>

            {/* 필터 섹션 */}
            <section aria-label="대회 맞춤 필터" className="mb-6 space-y-2 rounded-2xl border bg-white/90 p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-bold text-slate-800">
                  <SlidersHorizontal className="size-4 text-emerald-700" /> 맞춤 필터
                </div>
                {(region !== '전체' || category !== '전체' || status !== '전체' || source !== '전체' || distanceFilter !== '전체' || query) && (
                  <button
                    type="button"
                    onClick={() => {
                      setRegion('전체');
                      setCategory('전체');
                      setStatus('전체');
                      setSource('전체');
                      setDistanceFilter('전체');
                      setQuery('');
                    }}
                    className="text-xs font-semibold text-emerald-700 hover:underline"
                  >
                    필터 초기화
                  </button>
                )}
              </div>

              {/* 내 위치 기준 거리 필터 (5km ~ 300km) */}
              <div className="flex items-start gap-2 border-b border-slate-100 pb-2">
                <div className="flex w-12 shrink-0 items-center gap-1 pt-1 text-xs font-semibold text-emerald-800">
                  <MapPin className="size-3 text-emerald-600" />
                  <span>거리</span>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  {distanceOptions.map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setDistanceFilter(opt)}
                      className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                        distanceFilter === opt
                          ? 'border-emerald-700 bg-emerald-700 font-bold text-white shadow-sm'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      {opt === '전체' ? '전체 거리' : `${opt} 이내`}
                    </button>
                  ))}
                  <span className="ml-1 text-[11px] text-muted-foreground">
                    (📍 기준: {userLocation.label})
                  </span>
                </div>
              </div>

              <FilterRow label="상태" items={statuses} value={status} onChange={(val) => setStatus(val as StatusFilter)} />
              <FilterRow label="지역" items={regions} value={region} onChange={setRegion} />
              <FilterRow label="구분" items={categories} value={category} onChange={setCategory} />
              {/* 10대 플랫폼 출처 필터 (모든 사용자에게 상시 노출) */}
              <div className="flex items-start gap-2 border-t border-slate-100 pt-2">
                <span className="w-12 shrink-0 pt-1 text-xs font-semibold text-muted-foreground">출처</span>
                <div className="flex flex-wrap gap-1.5">
                  {dynamicSources.map((item) => (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => setSource(item.value)}
                      className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                        source === item.value
                          ? 'border-emerald-700 bg-emerald-700 font-bold text-white shadow-sm'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            </section>

            {/* 목록 컨트롤 (정렬 & 뷰 3단 전환) */}
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">조회된 대회</p>
                  <p className="text-lg font-extrabold text-slate-900">총 {filtered.length}개</p>
                </div>

                {/* 정렬 드롭다운 */}
                <div className="flex items-center gap-1.5 rounded-xl border bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 shadow-sm">
                  <ArrowUpDown className="size-3.5 text-emerald-700" />
                  <span>정렬:</span>
                  <select
                    value={sortOption}
                    onChange={(e) => setSortOption(e.target.value as SortOption)}
                    aria-label="대회 목록 정렬 기준"
                    suppressHydrationWarning
                    className="bg-transparent font-bold text-emerald-800 outline-none"
                  >
                    <option value="eventStart">대회 시작일순</option>
                    <option value="registrationEnd">접수 마감 임박순</option>
                    <option value="name">대회명 가나다순</option>
                  </select>
                </div>

                {/* ❤️ 찜한 대회(즐겨찾기) 모아보기 토글 버튼 */}
                <button
                  type="button"
                  onClick={() => setOnlyFavorites((prev) => !prev)}
                  className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-extrabold transition shadow-xs ${
                    onlyFavorites
                      ? 'border-rose-500 bg-rose-600 text-white shadow-rose-200'
                      : favorites.size > 0
                      ? 'border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                  title="즐겨찾기(하트) 등록한 대회만 모아서 봅니다."
                >
                  <Heart className={`size-3.5 ${onlyFavorites || favorites.size > 0 ? 'fill-current text-rose-500' : 'text-slate-400'} ${onlyFavorites ? 'text-white fill-white' : ''}`} />
                  <span>찜한 대회 {favorites.size > 0 ? `(${favorites.size})` : ''}</span>
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* 관리자 모드 전용: CSV 내보내기 및 표 복사 액션 버튼 */}
                {isAdmin && (
                  <div className="flex items-center gap-1.5">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={handleExportCsv}
                      title="현재 필터링된 대회 목록을 CSV 파일로 다운로드합니다."
                      className="h-8 gap-1.5 rounded-xl border-emerald-300 bg-emerald-50/80 text-xs font-bold text-emerald-800 shadow-sm transition hover:bg-emerald-100"
                    >
                      <FileSpreadsheet className="size-3.5 text-emerald-700" />
                      <Download className="size-3 text-emerald-700" />
                      CSV 내보내기
                    </Button>

                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={handleCopyGoogleSheets}
                      title="구글 스프레드시트나 엑셀에 바로 붙여넣기(Ctrl+V)할 수 있도록 표 형식으로 복사합니다."
                      className={`h-8 gap-1 rounded-xl border text-xs font-bold shadow-sm transition ${
                        copySuccess
                          ? 'border-emerald-600 bg-emerald-700 text-white'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {copySuccess ? (
                        <>
                          <Check className="size-3.5 text-white" /> 복사 완료! (Ctrl+V)
                        </>
                      ) : (
                        <>
                          <Copy className="size-3.5 text-slate-500" /> 표 복사 (Ctrl+V)
                        </>
                      )}
                    </Button>
                  </div>
                )}

                {/* 3단 뷰 전환 (목록 / 표 / 달력) */}
                <div className="flex rounded-xl border bg-white p-1 shadow-sm">
                  <button
                    type="button"
                    onClick={() => setView('list')}
                    className={`flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold transition ${
                      view === 'list' ? 'bg-emerald-700 text-white' : 'text-muted-foreground hover:text-slate-900'
                    }`}
                  >
                    <List className="size-3.5" /> 목록
                  </button>
                  <button
                    type="button"
                    onClick={() => setView('table')}
                    className={`flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold transition ${
                      view === 'table' ? 'bg-emerald-700 text-white' : 'text-muted-foreground hover:text-slate-900'
                    }`}
                  >
                    <TableIcon className="size-3.5" /> 표
                  </button>
                  <button
                    type="button"
                    onClick={() => setView('calendar')}
                    className={`flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold transition ${
                      view === 'calendar' ? 'bg-emerald-700 text-white' : 'text-muted-foreground hover:text-slate-900'
                    }`}
                  >
                    <CalendarDays className="size-3.5" /> 달력
                  </button>
                </div>
              </div>
            </div>

            {/* 대회 목록 / 표 / 달력 표시 */}
            {filtered.length === 0 ? (
              <div className="rounded-3xl border border-dashed bg-white/80 px-5 py-16 text-center">
                <Search className="mx-auto mb-3 size-8 text-muted-foreground" />
                <p className="font-bold text-slate-800">조건에 맞는 대회가 없어요</p>
                <p className="mt-1 text-sm text-muted-foreground">검색어 또는 필터 조건을 변경해 보세요.</p>
              </div>
            ) : view === 'list' ? (
              <div className="grid gap-3.5 md:grid-cols-2">
                {filtered.map((t) => (
                  <TournamentCard
                    key={t.id}
                    tournament={t}
                    baseDate={today}
                    userLocationLabel={userLocation.label}
                    isAdmin={isAdmin}
                    isFavorite={favorites.has(t.id)}
                    onToggleFavorite={(e) => toggleFavorite(t.id, e)}
                    onSelect={() => setSelected(t)}
                  />
                ))}
              </div>
            ) : view === 'table' ? (
              <TableView
                tournaments={filtered}
                baseDate={today}
                userLocationLabel={userLocation.label}
                isAdmin={isAdmin}
                favorites={favorites}
                onToggleFavorite={toggleFavorite}
                onSelect={setSelected}
              />
            ) : (
              <CalendarView tournaments={filtered} baseDate={today} favorites={favorites} onSelect={setSelected} />
            )}
          </>
        ) : (
          /* 출처 및 크롤링 채널 허브 탭 */
          <SourcesHubSection
            tournaments={tournaments}
            categoryFilter={sourceCategoryFilter}
            onCategoryChange={setSourceCategoryFilter}
          />
        )}
      </div>

      {/* 대회 상세 보기 바텀 시트 */}
      <Sheet open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        {selected && (
          <SheetContent
            side="bottom"
            className="mx-auto max-h-[90vh] max-w-2xl overflow-y-auto rounded-t-[28px] border-x bg-white px-0 pb-6 sm:bottom-6 sm:rounded-[28px] sm:border sm:shadow-2xl"
          >
            <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-zinc-200 sm:hidden" />
            <SheetHeader className="px-5 pb-3 pt-5 sm:px-7">
              <div className="mb-2 flex flex-wrap gap-2">
                <Badge variant="outline" className={statusStyle(getStatus(selected, today))}>
                  {getStatus(selected, today)}
                </Badge>
                <Badge variant="secondary">{selected.category}</Badge>
                {selected.sources && selected.sources.length > 1 ? (
                  <Badge variant="outline" className="border-emerald-400 bg-emerald-100/90 font-bold text-emerald-900">
                    🏷️ {selected.sources.length}개 출처 동시 등록 ({selected.sources.join(', ')})
                  </Badge>
                ) : (
                  <Badge variant="outline" className="border-emerald-300 bg-emerald-50 text-emerald-800">
                    출처: {selected.source}
                  </Badge>
                )}
                {/* 거리 정보 뱃지 */}
                <Badge variant="outline" className="border-amber-300 bg-amber-50 font-bold text-amber-800">
                  📍 {userLocation.label} 기준 약 {calculateDistanceKm(userLocation.coords, getVenueCoordinates(selected.venue))}km
                </Badge>
              </div>
              <div className="flex items-start justify-between gap-3 pr-8">
                <SheetTitle className="text-xl font-extrabold leading-snug text-slate-900">
                  {selected.name}
                </SheetTitle>
                <button
                  type="button"
                  onClick={(e) => toggleFavorite(selected.id, e)}
                  className={`shrink-0 inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold transition shadow-xs ${
                    favorites.has(selected.id)
                      ? 'border-rose-400 bg-rose-50 text-rose-600'
                      : 'border-slate-200 bg-white text-slate-500 hover:border-rose-300 hover:text-rose-500'
                  }`}
                  title={favorites.has(selected.id) ? '즐겨찾기 해제' : '즐겨찾기(하트) 추가 - 항상 최상단 고정'}
                >
                  <Heart className={`size-4 ${favorites.has(selected.id) ? 'fill-rose-500 text-rose-500' : ''}`} />
                  <span>{favorites.has(selected.id) ? '찜 완료' : '찜하기'}</span>
                </button>
              </div>
              <SheetDescription className="text-xs text-muted-foreground">
                {selected.sources && selected.sources.length > 1
                  ? `${selected.sources.join(', ')} 등 ${selected.sources.length}개 공식 출처에서 제공하는 대회 요강 정보입니다.`
                  : `${selected.source}에서 제공하는 공식 대회 요강 및 접수 정보입니다.`}
              </SheetDescription>
            </SheetHeader>

            {/* 대회 공식 요강 포스터 이미지 뷰어 */}
            {selected.posterImage && (
              <div className="mx-5 mb-4 overflow-hidden rounded-2xl border border-emerald-200 bg-slate-900 shadow-md sm:mx-7">
                <div className="relative aspect-[16/9] w-full overflow-hidden bg-slate-950 sm:aspect-[2/1]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={getSecurePosterUrl(selected.posterImage)}
                    alt={`${selected.name} 공식 요강 포스터`}
                    className="size-full object-cover opacity-90 transition duration-300 hover:scale-105 hover:opacity-100"
                    loading="lazy"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = getTournamentPosterFallback(
                        selected.name,
                        selected.category,
                        selected.venue,
                        selected.source,
                        selected.eventPeriod,
                        selected.fee
                      );
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent pointer-events-none" />
                  <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between">
                    <span className="inline-flex items-center gap-1 rounded-md bg-emerald-700/90 px-2 py-0.5 text-[11px] font-bold text-white shadow-xs backdrop-blur-xs">
                      🖼️ 대회 공식 요강 포스터
                    </span>
                    <a
                      href={selected.posterImage}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-md bg-black/60 px-2 py-0.5 text-[10px] font-bold text-white hover:bg-black/90"
                    >
                      원본 확대 보기 🔍
                    </a>
                  </div>
                </div>
              </div>
            )}

            <div className="mx-5 grid gap-3 rounded-2xl bg-emerald-50/60 p-4 sm:mx-7">
              <Detail icon={<CalendarDays />} label="대회 일정" value={selected.eventPeriod} />
              <Detail icon={<Clock3 />} label="접수 기간" value={selected.registrationPeriod} />
              <Detail
                icon={<MapPin />}
                label="장소 및 거리"
                value={
                  isInternationalVenue(selected.venue) || selected.category === '국제대회'
                    ? `✈️ 해외 개최: ${selected.venue} (약 ${calculateDistanceKm(userLocation.coords, getVenueCoordinates(selected.venue)).toLocaleString()}km)`
                    : `${selected.venue} (${userLocation.label} 기준 약 ${calculateDistanceKm(userLocation.coords, getVenueCoordinates(selected.venue))}km)`
                }
              />
              <Detail icon={<Trophy />} label="참가비" value={selected.fee} />
              {selected.sources && selected.sources.length > 1 && (
                <Detail
                  icon={<Layers className="size-4" />}
                  label="동시 등록 출처"
                  value={selected.sources.join(' / ')}
                />
              )}
            </div>

            <div className="space-y-2.5 px-5 pt-5 sm:px-7">
              <div className="grid grid-cols-2 gap-2.5">
                <a
                  href={`https://map.naver.com/p/search/${encodeURIComponent(selected.venue)}`}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={`${selected.venue} 네이버 지도 길찾기 새창 열기`}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-input bg-white text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 hover:text-emerald-700"
                >
                  <MapPin className="size-4 text-emerald-600" />
                  길찾기 (네이버)
                </a>

                <a
                  href={googleCalendarUrl(selected)}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={`${selected.name} 구글 캘린더에 일정 추가 새창 열기`}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-input bg-white text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 hover:text-emerald-700"
                >
                  <Calendar className="size-4 text-emerald-600" />
                  캘린더 등록
                </a>
              </div>

              {/* 출처별 공식 링크 버튼 렌더링 */}
              {selected.sourceLinks && selected.sourceLinks.length > 1 ? (
                <div className="space-y-2 pt-1">
                  <p className="text-xs font-bold text-slate-700">🏷️ 각 플랫폼별 공식 접수처·요강 바로가기:</p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {selected.sourceLinks.map((sl) => (
                      <a
                        key={sl.source}
                        href={sl.link}
                        target="_blank"
                        rel="noreferrer"
                        aria-label={`${selected.name} ${sl.source} 공식 페이지 새창 열기`}
                        className="inline-flex h-11 items-center justify-center gap-1.5 rounded-xl bg-emerald-700 px-3 text-xs font-bold text-white shadow transition hover:bg-emerald-800"
                      >
                        {sl.source === 'BKPLAY' ? '대한배드민턴협회 (BKPLAY)' : `${sl.source} 접수·요강`} <ExternalLink className="size-3.5" />
                      </a>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <a
                    href={selected.officialLink}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={`${selected.name} 공식 요강 및 참가 접수 사이트로 이동`}
                    className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-700 text-sm font-bold text-white shadow transition hover:bg-emerald-800"
                  >
                    {selected.source === '페이스콕' && '📄 페이스콕 공식 접수처 바로가기'}
                    {selected.source === '코트엑스' && '📄 코트엑스 공식 접수처 바로가기'}
                    {selected.source === '스포넷' && '📄 스포넷 공식 접수처 바로가기'}
                    {selected.source === 'BKPLAY' && '📄 대한배드민턴협회 (BKPLAY) 공고 보기'}
                    {selected.source === '배드민톡' && '📄 배드민톡 세부 요강 바로가기'}
                    {selected.source === '배드민턴타임즈' && '📄 배드민턴타임즈 공식 요강 보기'}
                    {selected.source === '배드민턴게임' && '📄 배드민턴게임 공식 일정 보기'}
                    {selected.source === 'BWF' && '🌏 BWF World Tour 공식 캘린더 보기'}
                    {selected.source === '네이버밴드' && (getStatus(selected, today) === '대회종료' ? '📄 대회 결과 및 요강 보기' : '📄 대회 공식 요강 및 접수글 보기')}
                    <ExternalLink className="size-4" />
                  </a>

                  {selected.source === '네이버밴드' && selected.bandUrl && (
                    <a
                      href={selected.bandUrl}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={`${selected.bandName || '네이버 밴드'} 공식 밴드 홈 이동`}
                      className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border-2 border-emerald-600 bg-emerald-50/70 text-xs font-extrabold text-emerald-900 transition hover:bg-emerald-100"
                    >
                      📱 출처 밴드: {selected.bandName || '네이버 밴드 채널 홈 바로가기'} <ExternalLink className="size-3.5" />
                    </a>
                  )}
                </div>
              )}

              {/* 보조 링크: 네이버 포털 검색 & 네이버 지도 길찾기 */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <a
                  href={`https://search.naver.com/search.naver?where=article&query=${encodeURIComponent(selected.name + ' 배드민턴대회 요강')}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50/60 text-xs font-bold text-emerald-800 transition hover:bg-emerald-100"
                >
                  <Search className="size-3.5 text-emerald-600" />
                  네이버 요강 검색
                </a>
                <a
                  href={`https://map.naver.com/p/search/${encodeURIComponent(selected.venue)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 transition hover:bg-slate-50"
                >
                  <MapPin className="size-3.5 text-slate-500" />
                  체육관 지도·길찾기
                </a>
              </div>
            </div>
          </SheetContent>
        )}
      </Sheet>

      {/* 하단 푸터 */}
      <footer className="mt-16 border-t border-slate-200/80 bg-white/60 py-8 text-center text-xs text-muted-foreground">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 sm:flex-row sm:px-6">
          <p>© 2026 배드민턴 허브(BadmintonHub). 전국 배드민턴 동호인을 위한 통합 대회 아카이브.</p>
          <div>
            {!isAdmin ? (
              <button
                type="button"
                onClick={() => {
                  setAdminModalOpen(true);
                  setAdminErrorMessage('');
                  setAdminInputPassword('');
                }}
                className="inline-flex items-center gap-1 text-[11px] text-slate-400 transition hover:text-slate-700"
              >
                <Lock className="size-3" /> 관리자 모드
              </button>
            ) : (
              <button
                type="button"
                onClick={handleLogoutAdmin}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 transition hover:underline"
              >
                <Unlock className="size-3" /> 관리자 모드 활성 중 (로그아웃)
              </button>
            )}
          </div>
        </div>
      </footer>

      {/* 관리자 인증 모달 */}
      {adminModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="grid size-8 place-items-center rounded-xl bg-amber-100 text-amber-800">
                  <KeyRound className="size-4" />
                </div>
                <h3 className="text-base font-bold text-slate-900">관리자 인증</h3>
              </div>
              <button
                type="button"
                onClick={() => setAdminModalOpen(false)}
                className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="size-4" />
              </button>
            </div>

            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              출처 필터, 크롤링 채널 허브 및 데이터 내보내기 권한을 활성화하려면 관리자 비밀번호를 입력해주세요.
            </p>

            <form onSubmit={handleLoginAdmin} className="mt-4 space-y-3">
              <div>
                <Input
                  type="password"
                  placeholder="관리자 비밀번호 입력"
                  value={adminInputPassword}
                  onChange={(e) => {
                    setAdminInputPassword(e.target.value);
                    setAdminErrorMessage('');
                  }}
                  className="rounded-xl border-slate-300"
                />
                {adminErrorMessage && (
                  <p className="mt-1.5 text-xs font-semibold text-rose-600">{adminErrorMessage}</p>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setAdminModalOpen(false)}
                  className="rounded-xl"
                >
                  취소
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  className="rounded-xl bg-emerald-700 font-bold hover:bg-emerald-800"
                >
                  관리자 모드 켜기
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}

function Detail({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex gap-3 text-sm">
      <span className="mt-0.5 text-emerald-700 [&_svg]:size-4">{icon}</span>
      <div>
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p className="mt-0.5 font-semibold text-slate-800">{value}</p>
      </div>
    </div>
  );
}

// 1. 카드 뷰 컴포넌트
function TournamentCard({
  tournament: t,
  baseDate,
  userLocationLabel,
  isAdmin = false,
  isFavorite = false,
  onToggleFavorite,
  onSelect,
}: {
  tournament: Tournament & { distanceKm?: number };
  baseDate: Date;
  userLocationLabel: string;
  isAdmin?: boolean;
  isFavorite?: boolean;
  onToggleFavorite: (e: React.SyntheticEvent) => void;
  onSelect: () => void;
}) {
  const status = getStatus(t, baseDate);
  const eventD = daysFromToday(t.eventStart, baseDate);
  const regD = daysFromToday(t.registrationEnd, baseDate);

  return (
    <article
      className={`group relative rounded-2xl border p-4 transition hover:-translate-y-0.5 sm:p-5 ${
        isFavorite
          ? 'border-rose-300 bg-rose-50/25 shadow-[0_4px_24px_rgb(225_29_72/8%)] hover:border-rose-400 hover:shadow-[0_10px_32px_rgb(225_29_72/14%)]'
          : 'border-slate-200/90 bg-white shadow-[0_4px_20px_rgb(20_83_45/5%)] hover:border-emerald-300 hover:shadow-[0_10px_32px_rgb(20_83_45/10%)]'
      }`}
    >
      {/* 카드 상단 상태 뱃지 & 하트 찜하기 버튼 */}
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          {/* ❤️ 즐겨찾기 고정 뱃지 */}
          {isFavorite && (
            <span className="inline-flex items-center gap-1 rounded-full border border-rose-300 bg-rose-50 px-2 py-0.5 text-[11px] font-extrabold text-rose-700 shadow-xs">
              <Heart className="size-3 fill-rose-500 text-rose-500" />
              찜한 대회
            </span>
          )}
          <Badge variant="outline" className={statusStyle(status)}>
            {status}
          </Badge>
          <Badge variant="secondary">{t.category}</Badge>
          {/* 거리 표시 뱃지 */}
          {t.distanceKm !== undefined && (
            isInternationalVenue(t.venue) || t.category === '국제대회' ? (
              <span className="inline-flex items-center gap-0.5 rounded-full border border-sky-300 bg-sky-50 px-2 py-0.5 text-[11px] font-extrabold text-sky-800">
                ✈️ 해외 ({t.venue.split(' ')[0]} · 약 {t.distanceKm.toLocaleString()}km)
              </span>
            ) : (
              <span className="inline-flex items-center gap-0.5 rounded-full border border-amber-200 bg-amber-50/90 px-2 py-0.5 text-[11px] font-extrabold text-amber-800">
                📍 {t.distanceKm}km
              </span>
            )
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <span className={`rounded-lg px-2 py-1 text-xs font-extrabold ${status === '대회종료' ? 'bg-slate-100 text-slate-500' : 'bg-amber-50 text-amber-700'}`}>
            {status === '대회종료' ? (eventD < 0 ? `종료 (${Math.abs(eventD)}일 전)` : '대회 종료') : eventD > 0 ? `대회 D-${eventD}` : '오늘 대회'}
          </span>
          {/* 하트 찜하기 버튼 */}
          <button
            type="button"
            onClick={onToggleFavorite}
            className={`flex size-8 items-center justify-center rounded-full border transition hover:scale-115 active:scale-95 ${
              isFavorite
                ? 'border-rose-400 bg-rose-50 text-rose-600 shadow-sm'
                : 'border-slate-200 bg-white text-slate-400 hover:border-rose-200 hover:text-rose-500'
            }`}
            title={isFavorite ? '즐겨찾기 해제' : '즐겨찾기(하트) 등록 - 항상 최상단 고정'}
            aria-label={`${t.name} 즐겨찾기 토글`}
          >
            <Heart className={`size-4.5 ${isFavorite ? 'fill-rose-500 text-rose-500' : ''}`} />
          </button>
        </div>
      </div>

      {/* 카드 본문 클릭 영역 */}
      <div
        role="button"
        tabIndex={0}
        onClick={onSelect}
        onKeyDown={(e) => e.key === 'Enter' && onSelect()}
        className="cursor-pointer text-left focus:outline-none"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <h3 className="line-clamp-2 text-[17px] font-extrabold leading-snug tracking-tight text-slate-900 group-hover:text-emerald-800">
              {t.name}
            </h3>

            <div className="mt-3 space-y-1.5 text-sm text-muted-foreground">
              <p className="flex items-start gap-2">
                <CalendarDays className="mt-0.5 size-4 shrink-0 text-emerald-600" />
                <span className="font-medium text-slate-700">{t.eventPeriod}</span>
              </p>
              <p className="flex items-start gap-2">
                <MapPin className="mt-0.5 size-4 shrink-0 text-emerald-600" />
                <span className="line-clamp-1">
                  {t.venue}{' '}
                  {t.distanceKm !== undefined &&
                    (isInternationalVenue(t.venue) || t.category === '국제대회'
                      ? `(약 ${t.distanceKm.toLocaleString()}km)`
                      : `(${userLocationLabel} 기준 ${t.distanceKm}km)`)}
                </span>
              </p>
            </div>
          </div>

          {t.posterImage && (
            <div className="relative size-20 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-100 shadow-xs sm:size-22">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={getSecurePosterUrl(t.posterImage)}
                alt={`${t.name} 썸네일`}
                className="size-full object-cover transition duration-300 group-hover:scale-105"
                loading="lazy"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = getTournamentPosterFallback(
                    t.name,
                    t.category,
                    t.venue,
                    t.source,
                    t.eventPeriod,
                    t.fee
                  );
                }}
              />
              <span className="absolute bottom-0 inset-x-0 bg-black/60 py-0.5 text-center text-[9px] font-bold text-white">
                요강 포스터
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 flex-wrap">
          {t.source === '네이버밴드' && t.bandName ? (
            <a
              href={t.bandUrl || 'https://band.us/band/63083777'}
              target="_blank"
              rel="noreferrer"
              aria-label={`${t.bandName} 밴드 홈 새창 열기`}
              className="inline-flex items-center gap-1 rounded-md bg-emerald-50 border border-emerald-300 px-2 py-0.5 text-[11px] font-bold text-emerald-800 transition hover:bg-emerald-100"
            >
              📱 {t.bandName.length > 12 ? `${t.bandName.slice(0, 12)}...` : t.bandName}
            </a>
          ) : isAdmin && (
            t.sources && t.sources.length > 1 ? (
              <span className="rounded bg-emerald-50 border border-emerald-300 px-1.5 py-0.5 text-[11px] font-extrabold text-emerald-900">
                🏷️ {t.sources.join(' + ')} ({t.sources.length}개 출처)
              </span>
            ) : (
              <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-bold text-slate-700">{t.source}</span>
            )
          )}
          <span className="inline-flex items-center rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-800 border border-emerald-200">
            {status === '대회종료' ? '대회 종료' : status === '접수마감' ? '접수 마감' : regD === 0 ? '오늘 마감' : regD > 0 ? `접수 D-${regD}` : '접수 마감'}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {t.source === '네이버밴드' && t.bandUrl && (
            <a
              href={t.bandUrl}
              target="_blank"
              rel="noreferrer"
              aria-label={`${t.name} 네이버 밴드 채널 홈 열기`}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-700 shadow-xs transition hover:bg-slate-50 hover:text-emerald-700"
            >
              밴드 홈
            </a>
          )}
          <a
            href={t.officialLink}
            target="_blank"
            rel="noreferrer"
            aria-label={`${t.name} 공식 요강 페이지 보기`}
            className="inline-flex items-center gap-1 rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-emerald-800"
          >
            {status === '대회종료' ? '결과·요강' : '요강 보기'} <ChevronRight className="size-3.5" />
          </a>
        </div>
      </div>
    </article>
  );
}

// 2. 표(Table) 뷰 컴포넌트
function TableView({
  tournaments,
  baseDate,
  userLocationLabel,
  isAdmin = false,
  favorites = new Set(),
  onToggleFavorite,
  onSelect,
}: {
  tournaments: (Tournament & { distanceKm?: number })[];
  baseDate: Date;
  userLocationLabel: string;
  isAdmin?: boolean;
  favorites?: Set<string>;
  onToggleFavorite?: (id: string, e: React.SyntheticEvent) => void;
  onSelect: (t: Tournament) => void;
}) {
  return (
    <section aria-label="대회 목록 표" className="overflow-hidden rounded-2xl border bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="border-b bg-slate-50/80 text-slate-700">
            <tr>
              <th scope="col" className="py-3 pl-3 pr-1 text-center font-bold w-9">찜</th>
              <th scope="col" className="py-3 pl-2 pr-2 font-bold">상태 / D-Day</th>
              <th scope="col" className="px-3 py-3 font-bold">대회명</th>
              <th scope="col" className="px-3 py-3 font-bold">구분</th>
              <th scope="col" className="px-3 py-3 font-bold">대회 일정</th>
              <th scope="col" className="px-3 py-3 font-bold">접수 기간</th>
              <th scope="col" className="px-3 py-3 font-bold">장소 및 거리 ({userLocationLabel} 기준)</th>
              {isAdmin && <th scope="col" className="px-3 py-3 font-bold">출처 (동시 등록 포함)</th>}
              <th scope="col" className="py-3 pl-2 pr-4 text-center font-bold">요강 / 신청</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {tournaments.map((t) => {
              const status = getStatus(t, baseDate);
              const eventD = daysFromToday(t.eventStart, baseDate);
              const isFav = favorites.has(t.id);

              return (
                <tr
                  key={t.id}
                  className={`transition ${isFav ? 'bg-rose-50/30 hover:bg-rose-50/60' : 'hover:bg-emerald-50/50'}`}
                >
                  <td aria-label="즐겨찾기" className="py-3 pl-3 pr-1 text-center whitespace-nowrap">
                    <button
                      type="button"
                      onClick={(e) => onToggleFavorite && onToggleFavorite(t.id, e)}
                      className={`inline-flex size-6 items-center justify-center rounded-full transition hover:scale-110 ${
                        isFav ? 'text-rose-500' : 'text-slate-300 hover:text-rose-400'
                      }`}
                      title={isFav ? '즐겨찾기 해제' : '즐겨찾기(하트) 등록 - 항상 최상단 고정'}
                    >
                      <Heart className={`size-3.5 ${isFav ? 'fill-rose-500' : ''}`} />
                    </button>
                  </td>
                  <td aria-label="상태 및 D-Day" className="py-3 pl-2 pr-2 whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <Badge variant="outline" className={statusStyle(status)}>
                        {status}
                      </Badge>
                      <span className={`text-[11px] font-bold ${status === '대회종료' ? 'text-slate-400' : 'text-amber-700'}`}>
                        {status === '대회종료' ? '종료' : eventD > 0 ? `D-${eventD}` : '오늘'}
                      </span>
                    </div>
                  </td>
                  <td aria-label="대회명" className="px-3 py-3 font-extrabold text-slate-900 max-w-[260px]">
                    <button
                      type="button"
                      onClick={() => onSelect(t)}
                      aria-label={`${t.name} 상세 정보 보기`}
                      className="text-left font-extrabold text-slate-900 hover:text-emerald-700 hover:underline truncate block w-full"
                    >
                      {t.name}
                    </button>
                  </td>
                  <td aria-label="대회 구분" className="px-3 py-3 whitespace-nowrap">
                    <Badge variant="secondary" className="text-[10px] font-semibold">
                      {t.category}
                    </Badge>
                  </td>
                  <td aria-label="대회 일정" className="px-3 py-3 whitespace-nowrap font-medium text-slate-700">{t.eventPeriod}</td>
                  <td aria-label="접수 기간" className="px-3 py-3 whitespace-nowrap text-muted-foreground">{t.registrationPeriod}</td>
                  <td aria-label="장소 및 거리" className="px-3 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <span className="max-w-[160px] truncate text-slate-700">{t.venue}</span>
                      {t.distanceKm !== undefined && (
                        <span className="rounded-full border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold text-amber-800">
                          📍 {t.distanceKm}km
                        </span>
                      )}
                    </div>
                  </td>
                  {isAdmin && (
                    <td aria-label="출처" className="px-3 py-3 whitespace-nowrap">
                      {t.sources && t.sources.length > 1 ? (
                        <div className="flex flex-wrap items-center gap-1">
                          {t.sources.map((s) => (
                            <span key={s} className="rounded border border-emerald-300 bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800">
                              {s}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-bold text-slate-700">{t.source}</span>
                      )}
                    </td>
                  )}
                  <td aria-label="요강 바로가기" className="py-3 pl-2 pr-4 text-center whitespace-nowrap">
                    <a
                      href={t.officialLink}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={`${t.name} 공식 요강 페이지 새창 열기`}
                      className="inline-flex items-center gap-1 rounded-lg bg-emerald-700 px-2.5 py-1 text-[11px] font-bold text-white transition hover:bg-emerald-800"
                    >
                      요강 <ExternalLink className="size-3" />
                    </a>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

// 3. 달력(Calendar) 뷰 컴포넌트
function CalendarView({
  tournaments,
  baseDate,
  favorites = new Set(),
  onSelect,
}: {
  tournaments: Tournament[];
  baseDate: Date;
  favorites?: Set<string>;
  onSelect: (t: Tournament) => void;
}) {
  const [viewDate, setViewDate] = useState<Date>(() => new Date(baseDate.getFullYear(), baseDate.getMonth(), 1));

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const prevMonth = () => setViewDate(new Date(year, month - 1, 1));
  const nextMonth = () => setViewDate(new Date(year, month + 1, 1));
  const resetToToday = () => setViewDate(new Date(baseDate.getFullYear(), baseDate.getMonth(), 1));

  const firstDayIndex = new Date(year, month, 1).getDay();
  const totalDays = new Date(year, month + 1, 0).getDate();
  const cells = Array.from({ length: firstDayIndex + totalDays }, (_, i) =>
    i < firstDayIndex ? null : i - firstDayIndex + 1
  );

  return (
    <section aria-label="월간 대회 캘린더" className="overflow-hidden rounded-2xl border bg-white shadow-sm">
      <div className="flex items-center justify-between border-b px-4 py-3 sm:px-6">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={prevMonth}
            aria-label="이전 달 보기"
            className="h-8 rounded-lg px-2 text-xs"
          >
            <ChevronLeft className="size-4" /> 이전달
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={nextMonth}
            aria-label="다음 달 보기"
            className="h-8 rounded-lg px-2 text-xs"
          >
            다음달 <ChevronRight className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={resetToToday}
            aria-label="이번 달로 돌아가기"
            className="h-8 text-xs font-semibold text-emerald-800 hover:bg-emerald-50"
          >
            오늘
          </Button>
        </div>

        <h3 className="text-base font-extrabold text-slate-900 sm:text-lg">
          {year}년 {month + 1}월
        </h3>
      </div>

      <div className="grid grid-cols-7 border-b bg-muted/30 py-2 text-center text-xs font-bold text-muted-foreground">
        {['일', '월', '화', '수', '목', '금', '토'].map((d, idx) => (
          <span key={d} className={idx === 0 ? 'text-red-500' : idx === 6 ? 'text-blue-500' : ''}>
            {d}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-7 divide-x divide-y divide-slate-100">
        {cells.map((day, i) => {
          const events = day
            ? tournaments.filter((t) => {
                const d = atMidnight(t.eventStart);
                return d.getFullYear() === year && d.getMonth() === month && d.getDate() === day;
              })
            : [];

          const isTodayCell =
            day === baseDate.getDate() && month === baseDate.getMonth() && year === baseDate.getFullYear();

          return (
            <div
              key={`cell-${i}`}
              className={`min-h-24 p-1.5 transition sm:min-h-32 ${
                day ? 'bg-white hover:bg-slate-50/70' : 'bg-slate-50/40'
              }`}
            >
              {day && (
                <>
                  <div className="flex items-center justify-between">
                    <span
                      className={`inline-grid size-5 place-items-center rounded-full text-xs font-bold ${
                        isTodayCell
                          ? 'bg-emerald-700 text-white'
                          : i % 7 === 0
                          ? 'text-red-500'
                          : i % 7 === 6
                          ? 'text-blue-500'
                          : 'text-slate-700'
                      }`}
                    >
                      {day}
                    </span>
                    {events.length > 0 && (
                      <span className="text-[10px] font-bold text-emerald-700 sm:hidden">{events.length}건</span>
                    )}
                  </div>

                  <div className="mt-1 space-y-1">
                    {events.slice(0, 3).map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => onSelect(t)}
                        className="block w-full truncate rounded-md bg-emerald-100/80 px-1.5 py-0.5 text-left text-[10px] font-bold text-emerald-900 transition hover:bg-emerald-200"
                        title={t.name}
                      >
                        {t.name}
                      </button>
                    ))}
                    {events.length > 3 && (
                      <p className="text-[10px] font-semibold text-muted-foreground">+{events.length - 3}개 더보기</p>
                    )}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

// 4. 출처 및 크롤링 채널 허브 컴포넌트
function SourcesHubSection({
  tournaments,
  categoryFilter,
  onCategoryChange,
}: {
  tournaments: Tournament[];
  categoryFilter: string;
  onCategoryChange: (cat: string) => void;
}) {
  const categories: readonly (SourceCategory | '전체')[] = [
    '전체',
    '모바일·온라인 접수 플랫폼',
    '협회 및 공공 체육 기관',
    '네이버 밴드 & 커뮤니티',
    '전문 언론 및 국제기구',
  ];

  // 각 출처별 실시간 수집 개수 집계 (중복 출처 포함)
  const sourceCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of tournaments) {
      const list = t.sources && t.sources.length > 0 ? t.sources : [t.source];
      for (const src of list) {
        map.set(src, (map.get(src) || 0) + 1);
      }
    }
    return map;
  }, [tournaments]);

  // CrawlerSource ID/이름을 TournamentSource 이름과 매핑
  const getSourceScrapedCount = (s: { id: string; name: string }) => {
    if (s.id === 'badmintontimes') return sourceCounts.get('배드민턴타임즈') || 0;
    if (s.id === 'badmintok') return sourceCounts.get('배드민톡') || 0;
    if (s.id === 'facecock') return sourceCounts.get('페이스콕') || 0;
    if (s.id === 'courtx') return sourceCounts.get('코트엑스') || 0;
    if (s.id === 'sponet') return sourceCounts.get('스포넷') || 0;
    if (s.id === 'badmintongame') return sourceCounts.get('배드민턴게임') || 0;
    if (s.id === 'ohmyplay') return sourceCounts.get('오마이플레이') || 0;
    if (s.id === 'baef') return sourceCounts.get('배프') || 0;
    if (s.id === 'wecook') return sourceCounts.get('위꾹') || 0;
    if (s.id === 'ddakple') return sourceCounts.get('딱플') || 0;
    if (s.id === 'band') return sourceCounts.get('네이버밴드') || 0;
    if (s.id === 'bkplay') return sourceCounts.get('BKPLAY') || 0;
    if (s.id === 'reboot') return sourceCounts.get('리부트아카데미') || 0;
    if (s.id === 'bwf') return sourceCounts.get('BWF') || 0;
    if (s.id === 'kspo' || s.id === 'koreabadminton') return sourceCounts.get('대한체육회') || 0;

    // 이름 기반 탐색
    for (const [key, val] of sourceCounts.entries()) {
      if (s.name.includes(key)) return val;
    }
    return 0;
  };

  const filteredSources = useMemo(() => {
    if (categoryFilter === '전체') return CRAWLER_SOURCES;
    return CRAWLER_SOURCES.filter((s) => s.category === categoryFilter);
  }, [categoryFilter]);

  return (
    <div className="space-y-6">
      {/* 소개 및 종합 통계 배너 */}
      <section className="rounded-3xl border border-emerald-200/60 bg-gradient-to-br from-emerald-900 to-emerald-950 p-6 text-white shadow-xl sm:p-8">
        <div className="max-w-3xl">
          <Badge variant="outline" className="border-emerald-400 bg-emerald-800/60 text-emerald-200">
            데이터 수집 & 크롤링 허브
          </Badge>
          <h2 className="mt-2 text-2xl font-extrabold tracking-tight sm:text-3xl">
            전국 배드민턴 대회 공식 출처 및 실시간 수집 현황
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-emerald-100 sm:text-base">
            배드민턴타임즈, 배드민톡, 스포넷, 페이스콕 등 주요 공식 플랫폼에서 실시간 자동 크롤러를 가동하여 전국 대회를 전수 수집하고 있습니다.
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <div className="rounded-xl border border-emerald-600/60 bg-emerald-800/80 px-4 py-2.5 shadow-sm">
              <p className="text-[11px] font-semibold text-emerald-200">총 연동 전국 대회</p>
              <p className="text-xl font-extrabold text-white">{tournaments.length}건 수집 완료</p>
            </div>
            <div className="rounded-xl border border-emerald-600/60 bg-emerald-800/80 px-4 py-2.5 shadow-sm">
              <p className="text-[11px] font-semibold text-emerald-200">등록 크롤링 채널</p>
              <p className="text-xl font-extrabold text-white">{CRAWLER_SOURCES.length}개 공식 플랫폼</p>
            </div>
          </div>
        </div>
      </section>

      {/* 크롤링 실전 팁 카드 (우선순위 가이드) */}
      <section aria-label="크롤링 우선순위 가이드" className="grid gap-3.5 sm:grid-cols-3">
        {CRAWLER_TIPS.map((tip, idx) => (
          <div key={tip.phase} className="rounded-2xl border bg-white p-4 shadow-sm">
            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700">
              {idx === 0 ? <Flame className="size-4 text-emerald-600" /> : idx === 1 ? <Code2 className="size-4 text-sky-600" /> : <Layers className="size-4 text-amber-600" />}
              {tip.phase}
            </div>
            <p className="mt-2 text-xs font-extrabold text-slate-900">추천 대상: {tip.targets}</p>
            <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{tip.guide}</p>
          </div>
        ))}
      </section>

      {/* 카테고리 필터 */}
      <div className="no-scrollbar flex gap-2 overflow-x-auto py-1">
        {categories.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => onCategoryChange(cat)}
            className={`shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-bold transition ${
              categoryFilter === cat
                ? 'border-emerald-700 bg-emerald-700 text-white shadow-sm'
                : 'border-slate-200 bg-white text-muted-foreground hover:border-emerald-300 hover:text-foreground'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* 출처 목록 카드 그리드 */}
      <div className="grid gap-4 md:grid-cols-2">
        {filteredSources.map((s) => {
          const count = getSourceScrapedCount(s);

          return (
            <article
              key={s.id}
              className="flex flex-col justify-between rounded-2xl border bg-white p-5 shadow-sm transition hover:border-emerald-300 hover:shadow-md"
            >
              <div>
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <Badge variant="secondary" className="text-xs">
                      {s.category}
                    </Badge>
                    {/* 실제 스크랩된 개수 뱃지 */}
                    {count > 0 ? (
                      <span className="inline-flex items-center gap-1 rounded-md border border-emerald-300 bg-emerald-50 px-2 py-0.5 text-xs font-extrabold text-emerald-800">
                        🏸 수집 완료: {count}개 대회
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-500">
                        연동 준비 중
                      </span>
                    )}
                  </div>
                  <span
                    className={`rounded-md px-2 py-0.5 text-xs font-extrabold ${
                      s.difficulty === '매우 쉬움' || s.difficulty === '쉬움'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : s.difficulty === '보통'
                        ? 'bg-sky-50 text-sky-700 border border-sky-200'
                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}
                  >
                    난이도: {s.difficulty}
                  </span>
                </div>

                <h3 className="mt-3 text-lg font-extrabold text-slate-900">{s.name}</h3>
                <p className="mt-1 text-xs text-muted-foreground">{s.description}</p>

                <div className="mt-4 space-y-2 rounded-xl bg-slate-50 p-3 text-xs text-slate-700">
                  <p>
                    <strong className="text-slate-900">수집 데이터:</strong> {s.collectedData}
                  </p>
                  <p>
                    <strong className="text-slate-900">수집 방식:</strong> {s.method}
                  </p>
                  <p>
                    <strong className="text-slate-900">추천 도구:</strong>{' '}
                    <span className="font-semibold text-emerald-800">{s.recommendedTool}</span>
                  </p>
                </div>
              </div>

              <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-3">
                <span className="text-xs font-semibold text-slate-500">{s.phase}</span>
                <a
                  href={s.targetUrl}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={`${s.name} 공식 사이트 새창 열기`}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-3.5 py-1.5 text-xs font-bold text-white transition hover:bg-emerald-800"
                >
                  사이트 바로가기 <ExternalLink className="size-3.5" />
                </a>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
