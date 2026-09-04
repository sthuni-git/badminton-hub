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
  Building2
} from 'lucide-react';

export function ClubExplorer() {
  const [query, setQuery] = useState('');
  const [selectedSource, setSelectedSource] = useState('전체');
  const [selectedRegion, setSelectedRegion] = useState('전체');
  const [selectedTimeSlot, setSelectedTimeSlot] = useState('전체');
  const [onlyBeginner, setOnlyBeginner] = useState(false);
  const [onlyLesson, setOnlyLesson] = useState(false);
  const [selectedClub, setSelectedClub] = useState<BadmintonClub | null>(null);

  // 출처 그룹 목록
  const sources = ['전체', '배드민턴타임즈', '배드민턴게임', '지자체 협회/체육회'];

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
        club.venue.toLowerCase().includes(q) || 
        club.district.toLowerCase().includes(q) ||
        club.region.toLowerCase().includes(q) ||
        club.source.toLowerCase().includes(q);

      const matchesSource = 
        selectedSource === '전체' ||
        (selectedSource === '배드민턴타임즈' && club.source === '배드민턴타임즈') ||
        (selectedSource === '배드민턴게임' && club.source === '배드민턴게임') ||
        (selectedSource === '지자체 협회/체육회' && club.source !== '배드민턴타임즈' && club.source !== '배드민턴게임');

      const matchesRegion = selectedRegion === '전체' || club.region === selectedRegion;
      const matchesTimeSlot = selectedTimeSlot === '전체' || club.timeSlot === selectedTimeSlot;
      const matchesBeginner = !onlyBeginner || club.features.includes('초보환영');
      const matchesLesson = !onlyLesson || club.features.some(f => f.includes('레슨'));

      return matchesQuery && matchesSource && matchesRegion && matchesTimeSlot && matchesBeginner && matchesLesson;
    });
  }, [query, selectedSource, selectedRegion, selectedTimeSlot, onlyBeginner, onlyLesson]);

  return (
    <div className="space-y-6 pb-20">
      {/* 클럽 찾기 헤더 안내 배너 */}
      <div className="rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-800 to-teal-900 p-6 text-white shadow-md">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-700/80 px-3 py-1 text-xs font-semibold text-emerald-100 backdrop-blur-sm">
              <ShieldCheck className="size-3.5 text-emerald-300" /> 지자체 체육회 & 공식 배드민턴협회 인증 데이터
            </div>
            <h2 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">내 주변 배드민턴 클럽 찾기</h2>
            <p className="mt-1 text-sm text-emerald-100/90">
              새벽반부터 직장인 저녁반, 초보자 환영 클럽까지! 전국 전용구장 및 공공체육관 공식 등록 클럽을 만나보세요.
            </p>
          </div>
          <div className="mt-4 flex items-center gap-3 md:mt-0">
            <div className="rounded-xl bg-white/10 p-3 text-center backdrop-blur-sm">
              <p className="text-xs font-bold text-emerald-200">인증 클럽</p>
              <p className="text-xl font-black text-white">{badmintonClubs.length}개소</p>
            </div>
            <div className="rounded-xl bg-white/10 p-3 text-center backdrop-blur-sm">
              <p className="text-xs font-bold text-emerald-200">초보 환영</p>
              <p className="text-xl font-black text-white">{badmintonClubs.filter(c => c.features.includes('초보환영')).length}개소</p>
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
              placeholder="클럽명, 체육관명, 지역(예: 강서구, 수원, 만석공원), 관할 체육회 검색..."
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

          {/* 초보 환영 & 레슨 토글 칩 */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setOnlyBeginner(!onlyBeginner)}
              className={`h-11 rounded-xl px-3.5 text-xs font-bold transition ${
                onlyBeginner
                  ? 'border-emerald-600 bg-emerald-700 text-white shadow-sm'
                  : 'border border-zinc-200 bg-zinc-50 text-zinc-700 hover:bg-zinc-100'
              }`}
            >
              🌱 초보 환영만
            </button>
            <button
              type="button"
              onClick={() => setOnlyLesson(!onlyLesson)}
              className={`h-11 rounded-xl px-3.5 text-xs font-bold transition ${
                onlyLesson
                  ? 'border-emerald-600 bg-emerald-700 text-white shadow-sm'
                  : 'border border-zinc-200 bg-zinc-50 text-zinc-700 hover:bg-zinc-100'
              }`}
            >
              🏸 레슨 운영 클럽
            </button>
          </div>
        </div>

        {/* 출처 필터 칩 */}
        <div className="mt-4 flex flex-wrap items-center gap-1.5 border-t border-zinc-100 pt-3">
          <span className="mr-1 text-xs font-bold text-zinc-500">출처:</span>
          {sources.map(s => (
            <button
              key={s}
              type="button"
              onClick={() => setSelectedSource(s)}
              className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                selectedSource === s
                  ? 'bg-emerald-800 text-white shadow-xs'
                  : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        {/* 시·도 지역 필터 칩 */}
        <div className="mt-2.5 flex flex-wrap items-center gap-1.5 border-t border-zinc-100 pt-2.5">
          <span className="mr-1 text-xs font-bold text-zinc-500">지역:</span>
          {regions.map(r => (
            <button
              key={r}
              type="button"
              onClick={() => setSelectedRegion(r)}
              className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                selectedRegion === r
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
              }`}
            >
              {r}
            </button>
          ))}
        </div>

        {/* 시간대 필터 칩 */}
        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-xs font-bold text-zinc-500">시간대:</span>
          {timeSlots.map(t => (
            <button
              key={t}
              type="button"
              onClick={() => setSelectedTimeSlot(t)}
              className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                selectedTimeSlot === t
                  ? 'bg-teal-700 text-white shadow-xs'
                  : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* 검색 결과 카운트 및 데이터 출처 안내 */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between px-1">
        <p className="text-sm font-bold text-zinc-700">
          검색된 클럽 <span className="text-emerald-700 font-extrabold">{filteredClubs.length}</span>곳
        </p>
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <Building2 className="size-3.5 text-emerald-600" /> 데이터 출처: 전국 시·도 배드민턴협회 및 지자체 체육회 공식 공고
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
                <span className="inline-flex items-center gap-1 rounded-md bg-teal-50 px-2 py-0.5 text-xs font-bold text-teal-800">
                  <Clock className="size-3" /> {club.timeSlot}
                </span>
              </div>

              {/* 클럽명 및 체육관 */}
              <h3 className="mt-2.5 text-lg font-black tracking-tight text-zinc-900">{club.name}</h3>
              <p className="text-xs font-semibold text-emerald-700 flex items-center gap-1 mt-0.5">
                🏟️ {club.venue} ({club.courtCount}코트)
              </p>
              <p className="mt-1 text-[11px] text-zinc-500 line-clamp-1">{club.address}</p>

              {/* 활동 요일 및 시간 */}
              <div className="mt-3 space-y-1 rounded-xl bg-zinc-50 p-2.5 text-xs text-zinc-700">
                <div className="flex items-center gap-1.5 font-medium">
                  <Calendar className="size-3.5 text-zinc-400" />
                  <span>요일: <strong className="text-zinc-900">{club.days}</strong></span>
                </div>
                <div className="flex items-center gap-1.5 font-medium">
                  <Clock className="size-3.5 text-zinc-400" />
                  <span>시간: <strong className="text-zinc-900">{club.hours}</strong></span>
                </div>
                <div className="flex items-center gap-1.5 font-medium">
                  <Users className="size-3.5 text-zinc-400" />
                  <span>대상: <strong className="text-zinc-900">{club.targetLevel}</strong></span>
                </div>
              </div>

              {/* 특징 태그들 */}
              <div className="mt-3 flex flex-wrap gap-1">
                {club.features.map(f => (
                  <span
                    key={f}
                    className="rounded-md border border-zinc-200 bg-white px-1.5 py-0.5 text-[10px] font-medium text-zinc-600"
                  >
                    #{f}
                  </span>
                ))}
              </div>

              {/* 공식 데이터 출처 표시 */}
              <div className="mt-3 flex items-center justify-between rounded-lg bg-emerald-50/70 px-2.5 py-1.5 text-[11px] font-semibold text-emerald-900">
                <span className="flex items-center gap-1.5 truncate">
                  <Building2 className="size-3 text-emerald-700 shrink-0" />
                  <span className="truncate">출처: {club.source}</span>
                </span>
                {club.sourceUrl && (
                  <a
                    href={club.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="ml-1 inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-700 hover:text-emerald-900 shrink-0 hover:underline"
                    title={`${club.source} 원본 보기`}
                  >
                    원문 <ExternalLink className="size-2.5" />
                  </a>
                )}
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
                <Info className="size-3.5" /> 상세/출처
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* 클럽 상세 및 회비 안내 모달 */}
      {selectedClub && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
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
                {selectedClub.timeSlot}
              </span>
            </div>

            <h3 className="mt-2 text-2xl font-black text-zinc-900">{selectedClub.name}</h3>
            <p className="text-sm font-semibold text-emerald-700">🏟️ {selectedClub.venue}</p>
            <p className="text-xs text-zinc-500">{selectedClub.address}</p>

            <div className="mt-4 space-y-2 rounded-xl bg-zinc-50 p-4 text-xs">
              <div className="flex justify-between border-b border-zinc-200 pb-2">
                <span className="text-zinc-500">활동 요일</span>
                <span className="font-bold text-zinc-900">{selectedClub.days}</span>
              </div>
              <div className="flex justify-between border-b border-zinc-200 pb-2">
                <span className="text-zinc-500">활동 시간</span>
                <span className="font-bold text-zinc-900">{selectedClub.hours}</span>
              </div>
              <div className="flex justify-between border-b border-zinc-200 pb-2">
                <span className="text-zinc-500">코트 수</span>
                <span className="font-bold text-zinc-900">{selectedClub.courtCount}코트</span>
              </div>
              <div className="flex justify-between border-b border-zinc-200 pb-2">
                <span className="text-zinc-500">월 회비</span>
                <span className="font-extrabold text-emerald-800">{selectedClub.monthlyFee}</span>
              </div>
              <div className="flex justify-between border-b border-zinc-200 pb-2">
                <span className="text-zinc-500">가입비 (입회비)</span>
                <span className="font-bold text-zinc-900">{selectedClub.entryFee}</span>
              </div>
              <div className="flex justify-between border-b border-zinc-200 pb-2">
                <span className="text-zinc-500">모집 대상</span>
                <span className="font-bold text-zinc-900">{selectedClub.targetLevel}</span>
              </div>
              <div className="flex justify-between border-b border-zinc-200 pb-2">
                <span className="text-zinc-500">가입 및 방문 문의</span>
                <span className="font-bold text-emerald-700">{selectedClub.contact}</span>
              </div>
              <div className="flex items-center justify-between pt-1">
                <span className="text-zinc-500 font-semibold">데이터 공식 출처</span>
                <span className="font-bold text-emerald-900 text-[11px]">{selectedClub.source}</span>
              </div>
            </div>

            {/* 공식 출처 바로가기 링크 (있을 경우) */}
            {selectedClub.sourceUrl && (
              <div className="mt-3">
                <a
                  href={selectedClub.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2 text-xs font-bold text-emerald-800 transition hover:bg-emerald-100"
                >
                  <span className="flex items-center gap-1.5">
                    <Building2 className="size-3.5 text-emerald-700" />
                    {selectedClub.source === '배드민턴타임즈'
                      ? '배드민턴타임즈 전국클럽 정보 바로가기'
                      : selectedClub.source === '배드민턴게임'
                      ? '배드민턴게임 클럽 정보 바로가기'
                      : '관할 체육회 / 시설관리공단 홈페이지'}
                  </span>
                  <ExternalLink className="size-3.5 text-emerald-600" />
                </a>
              </div>
            )}

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
