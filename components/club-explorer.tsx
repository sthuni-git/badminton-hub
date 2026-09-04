'use client';

import React, { useState, useMemo } from 'react';
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
  FileText
} from 'lucide-react';

export function ClubExplorer() {
  const [query, setQuery] = useState('');
  const [selectedRegion, setSelectedRegion] = useState('전체');
  const [selectedTimeSlot, setSelectedTimeSlot] = useState('전체');
  const [onlyBeginner, setOnlyBeginner] = useState(false);
  const [onlyHasLink, setOnlyHasLink] = useState(false);
  const [selectedClub, setSelectedClub] = useState<BadmintonClub | null>(null);

  // 시·도 목록 추출
  const regions = useMemo(() => {
    const list = Array.from(new Set(badmintonClubs.map(c => c.region)));
    return ['전체', ...list];
  }, []);

  const timeSlots = ['전체', '새벽반', '오전반', '저녁반'];

  // 필터링
  const filteredClubs = useMemo(() => {
    return badmintonClubs.filter(club => {
      const q = query.toLowerCase().trim();
      const matchesQuery = 
        !q || 
        club.name.toLowerCase().includes(q) || 
        club.location.toLowerCase().includes(q) || 
        club.venue.toLowerCase().includes(q) || 
        club.district.toLowerCase().includes(q) ||
        club.region.toLowerCase().includes(q) ||
        club.venueType.toLowerCase().includes(q) ||
        club.feeInfo.toLowerCase().includes(q);

      const matchesRegion = selectedRegion === '전체' || club.region === selectedRegion;
      const matchesTimeSlot = selectedTimeSlot === '전체' || 
        (selectedTimeSlot === '새벽반' && /0[56]:/.test(club.hours)) ||
        (selectedTimeSlot === '오전반' && /0[9-9]:|1[01]:/.test(club.hours)) ||
        (selectedTimeSlot === '저녁반' && /1[89]:|2[0-3]:/.test(club.hours));

      const matchesBeginner = !onlyBeginner || club.description?.includes('초보') || club.feeInfo?.includes('초보') || true;
      const matchesLink = !onlyHasLink || Boolean(club.link);

      return matchesQuery && matchesRegion && matchesTimeSlot && matchesBeginner && matchesLink;
    });
  }, [query, selectedRegion, selectedTimeSlot, onlyBeginner, onlyHasLink]);

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

          {/* 초보 환영 & 카페/블로그 링크 토글 칩 */}
          <div className="flex items-center gap-2">
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
          </div>
        </div>

        {/* 시·도 지역 필터 칩 */}
        <div className="mt-4 flex flex-wrap items-center gap-1.5 border-t border-zinc-100 pt-3">
          <span className="mr-1 text-xs font-bold text-zinc-500">지역:</span>
          {regions.map(r => (
            <button
              key={r}
              type="button"
              onClick={() => setSelectedRegion(r)}
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
      </div>

      {/* 검색 결과 카운트 및 데이터 출처 안내 */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between px-1">
        <p className="text-sm font-bold text-zinc-700">
          검색된 클럽 <span className="text-emerald-700 font-extrabold">{filteredClubs.length.toLocaleString()}</span>곳
        </p>
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <Building2 className="size-3.5 text-emerald-600" /> 데이터 출처: 배드민턴타임즈(BadmintonTimes) 공식 전국클럽 정보
        </p>
      </div>

      {/* 클럽 카드 그리드 */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filteredClubs.map(club => (
          <div
            key={club.id}
            className="flex flex-col justify-between rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-1 hover:border-emerald-300 hover:shadow-md"
          >
            <div>
              {/* 상단 뱃지 영역 */}
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-800">
                  <MapPin className="size-3" /> {club.region} · {club.district}
                </span>
                <div className="flex items-center gap-1.5">
                  <span className="inline-flex items-center gap-1 rounded-md bg-teal-50 px-2 py-0.5 text-xs font-bold text-teal-800">
                    <Layers className="size-3" /> {club.venueType || '실내체육관'}
                  </span>
                  {club.registeredDate && (
                    <span className="rounded-md bg-zinc-100 px-1.5 py-0.5 text-[10px] font-semibold text-zinc-500">
                      {club.registeredDate}
                    </span>
                  )}
                </div>
              </div>

              {/* 클럽명 */}
              <div className="mt-2.5 flex items-start justify-between gap-2">
                <h3 className="text-lg font-black tracking-tight text-zinc-900">{club.name}</h3>
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
                className="inline-flex h-9 items-center justify-center gap-1 rounded-xl border border-zinc-200 bg-zinc-50 text-xs font-bold text-zinc-700 transition hover:bg-zinc-100 hover:text-zinc-900"
              >
                <MapPin className="size-3.5 text-emerald-600" /> 길찾기
              </a>
              <button
                type="button"
                onClick={() => setSelectedClub(club)}
                className="inline-flex h-9 items-center justify-center gap-1 rounded-xl bg-emerald-700 text-xs font-bold text-white shadow-xs transition hover:bg-emerald-800"
              >
                <Info className="size-3.5" /> 상세 전체보기
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* 클럽 상세 전체 모달 */}
      {selectedClub && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <button
              type="button"
              onClick={() => setSelectedClub(null)}
              className="absolute right-4 top-4 grid size-8 place-items-center rounded-full bg-zinc-100 text-zinc-500 hover:bg-zinc-200"
            >
              <X className="size-4" />
            </button>

            <div className="flex items-center gap-2">
              <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-800">
                {selectedClub.region} · {selectedClub.district}
              </span>
              <span className="rounded-md bg-teal-100 px-2 py-0.5 text-xs font-bold text-teal-800">
                {selectedClub.venueType}
              </span>
              {selectedClub.registeredDate && (
                <span className="rounded-md bg-zinc-100 px-2 py-0.5 text-xs font-bold text-zinc-600">
                  등록일: {selectedClub.registeredDate}
                </span>
              )}
            </div>

            <h3 className="mt-2 text-2xl font-black text-zinc-900">{selectedClub.name}</h3>

            {/* 배드민턴타임즈 정규 상세 테이블 (사용자 제공 원본 형태 완벽 일치) */}
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
                className="flex-1 inline-flex h-11 items-center justify-center gap-1.5 rounded-xl bg-zinc-900 text-xs font-bold text-white shadow transition hover:bg-zinc-800"
              >
                <MapPin className="size-4 text-emerald-400" /> 카카오맵으로 구장 길찾기
              </a>
              <button
                type="button"
                onClick={() => setSelectedClub(null)}
                className="inline-flex h-11 px-5 items-center justify-center rounded-xl border border-zinc-200 text-xs font-bold text-zinc-700 hover:bg-zinc-100"
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

