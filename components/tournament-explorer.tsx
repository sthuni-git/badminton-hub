'use client';

import { useMemo, useState } from 'react';
import { CalendarDays, ChevronRight, Clock3, ExternalLink, List, MapPin, Search, SlidersHorizontal, Trophy } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import type { Tournament } from '@/lib/tournaments';

type Status = '접수중' | '접수예정' | '마감임박' | '마감';
type View = 'list' | 'calendar';

const TODAY = new Date('2026-09-02T00:00:00+09:00');
const regions = ['전체', '수도권', '충청', '전라', '경상', '강원', '기타'] as const;
const categories = ['전체', '전국오픈', '지역구대회', '브랜드대회', '학생선수권'] as const;
const statuses = ['전체', '접수중', '접수예정', '마감임박', '마감'] as const;

function atMidnight(date: string) { return new Date(`${date}T00:00:00+09:00`); }
function daysFromToday(date: string) { return Math.ceil((atMidnight(date).getTime() - TODAY.getTime()) / 86400000); }
function getStatus(t: Tournament): Status {
  const start = daysFromToday(t.registrationStart);
  const end = daysFromToday(t.registrationEnd);
  if (start > 0) return '접수예정';
  if (end < 0) return '마감';
  if (end <= 3) return '마감임박';
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
  return status === '접수중' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : status === '마감임박' ? 'bg-orange-50 text-orange-700 border-orange-200' : status === '접수예정' ? 'bg-sky-50 text-sky-700 border-sky-200' : 'bg-zinc-100 text-zinc-500 border-zinc-200';
}
function googleCalendarUrl(t: Tournament) {
  const end = new Date(atMidnight(t.eventEnd).getTime() + 86400000).toISOString().slice(0,10).replaceAll('-','');
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(t.name)}&dates=${t.eventStart.replaceAll('-','')}/${end}&location=${encodeURIComponent(t.venue)}&details=${encodeURIComponent(`공식 안내: ${t.officialLink}`)}`;
}

function FilterRow({ label, items, value, onChange }: { label: string; items: readonly string[]; value: string; onChange: (value:string)=>void }) {
  return <div className="flex items-center gap-2"><span className="w-12 shrink-0 text-xs font-semibold text-muted-foreground">{label}</span><div className="no-scrollbar flex gap-1.5 overflow-x-auto py-1">{items.map(item => <button key={item} onClick={()=>onChange(item)} className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition ${value===item ? 'border-emerald-700 bg-emerald-700 text-white shadow-sm' : 'border-border bg-white text-muted-foreground hover:border-emerald-300 hover:text-foreground'}`}>{item}</button>)}</div></div>;
}

export function TournamentExplorer({ tournaments }: { tournaments: Tournament[] }) {
  const [query, setQuery] = useState('');
  const [region, setRegion] = useState('전체');
  const [category, setCategory] = useState('전체');
  const [status, setStatus] = useState('전체');
  const [view, setView] = useState<View>('list');
  const [selected, setSelected] = useState<Tournament | null>(null);

  const filtered = useMemo(() => tournaments.filter(t => {
    const text = `${t.name} ${t.venue} ${t.source}`.toLowerCase();
    return (!query || text.includes(query.toLowerCase())) && (region==='전체' || regionOf(t.venue)===region) && (category==='전체' || t.category===category) && (status==='전체' || getStatus(t)===status);
  }).sort((a,b)=>a.eventStart.localeCompare(b.eventStart)), [tournaments, query, region, category, status]);
  const openCount = tournaments.filter(t => ['접수중','마감임박'].includes(getStatus(t))).length;

  return <main className="min-h-screen pb-24">
    <header className="sticky top-0 z-40 border-b border-emerald-950/5 bg-background/90 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-2.5"><div className="grid size-9 place-items-center rounded-xl bg-emerald-700 text-lg shadow-sm">🏸</div><div><p className="text-[10px] font-bold tracking-[.18em] text-emerald-700">MINTON FINDER</p><h1 className="-mt-0.5 text-lg font-extrabold tracking-tight">민턴파인더</h1></div></div>
        <Badge variant="outline" className="h-7 border-emerald-200 bg-emerald-50 px-3 text-emerald-700"><span className="mr-1 size-1.5 rounded-full bg-emerald-500" /> 접수 가능 {openCount}개</Badge>
      </div>
    </header>

    <div className="mx-auto max-w-6xl px-4 pt-6 sm:px-6 sm:pt-9">
      <section className="mb-5">
        <p className="mb-1 text-sm font-semibold text-emerald-700">이번 주, 어디서 셔틀콕을 칠까요?</p>
        <h2 className="text-2xl font-extrabold leading-tight tracking-[-.04em] sm:text-4xl">놓치기 아까운 대회를<br className="sm:hidden" /> 한곳에서 찾아보세요.</h2>
        <div className="relative mt-5 max-w-2xl"><Search className="absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground"/><Input value={query} onChange={e=>setQuery(e.target.value)} aria-label="대회 검색" placeholder="대회명, 지역, 경기장을 검색하세요" className="h-12 rounded-2xl border-white bg-white pl-12 pr-4 shadow-[0_8px_30px_rgb(20_83_45/8%)] focus-visible:border-emerald-400"/></div>
      </section>

      <section aria-label="대회 필터" className="mb-6 space-y-1.5 rounded-2xl border bg-white/75 p-3 shadow-sm sm:p-4">
        <div className="mb-2 flex items-center gap-2 text-sm font-bold"><SlidersHorizontal className="size-4 text-emerald-700"/> 맞춤 필터</div>
        <FilterRow label="지역" items={regions} value={region} onChange={setRegion}/>
        <FilterRow label="구분" items={categories} value={category} onChange={setCategory}/>
        <FilterRow label="상태" items={statuses} value={status} onChange={setStatus}/>
      </section>

      <div className="mb-4 flex items-end justify-between gap-3"><div><p className="text-xs text-muted-foreground">조건에 맞는 대회</p><p className="text-lg font-extrabold">총 {filtered.length}개</p></div><div className="flex rounded-xl border bg-white p-1"><button onClick={()=>setView('list')} className={`flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold ${view==='list'?'bg-emerald-700 text-white':'text-muted-foreground'}`}><List className="size-3.5"/>목록</button><button onClick={()=>setView('calendar')} className={`flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold ${view==='calendar'?'bg-emerald-700 text-white':'text-muted-foreground'}`}><CalendarDays className="size-3.5"/>달력</button></div></div>

      {filtered.length === 0 ? <div className="rounded-3xl border border-dashed bg-white/60 px-5 py-16 text-center"><Search className="mx-auto mb-3 size-8 text-muted-foreground"/><p className="font-bold">조건에 맞는 대회가 없어요</p><p className="mt-1 text-sm text-muted-foreground">검색어나 필터를 바꿔보세요.</p></div> : view==='list' ?
        <div className="grid gap-3 md:grid-cols-2">{filtered.map(t => <TournamentCard key={t.id} tournament={t} onSelect={()=>setSelected(t)}/>)}</div> :
        <CalendarView tournaments={filtered} onSelect={setSelected}/>
      }
    </div>

    <Sheet open={!!selected} onOpenChange={open=>!open&&setSelected(null)}>
      {selected && <SheetContent side="bottom" className="mx-auto max-h-[90vh] max-w-2xl overflow-y-auto rounded-t-[28px] border-x px-0 pb-5 sm:bottom-6 sm:rounded-[28px] sm:border">
        <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-zinc-200 sm:hidden"/>
        <SheetHeader className="px-5 pb-3 pt-5 sm:px-7"><div className="mb-2 flex gap-2"><Badge variant="outline" className={statusStyle(getStatus(selected))}>{getStatus(selected)}</Badge><Badge variant="secondary">{selected.category}</Badge></div><SheetTitle className="pr-8 text-xl font-extrabold leading-snug">{selected.name}</SheetTitle><SheetDescription>{selected.source}에서 제공하는 공식 대회 정보예요.</SheetDescription></SheetHeader>
        <div className="mx-5 grid gap-3 rounded-2xl bg-emerald-50/70 p-4 sm:mx-7"><Detail icon={<CalendarDays/>} label="대회 일정" value={selected.eventPeriod}/><Detail icon={<Clock3/>} label="접수 기간" value={selected.registrationPeriod}/><Detail icon={<MapPin/>} label="장소" value={selected.venue}/><Detail icon={<Trophy/>} label="참가비" value={selected.fee}/></div>
        <div className="grid grid-cols-2 gap-2 px-5 pt-4 sm:px-7"><Button nativeButton={false} variant="outline" className="h-11 rounded-xl" render={<a href={`https://map.naver.com/p/search/${encodeURIComponent(selected.venue)}`} target="_blank" rel="noreferrer"/>}><MapPin/> 길찾기</Button><Button nativeButton={false} variant="outline" className="h-11 rounded-xl" render={<a href={googleCalendarUrl(selected)} target="_blank" rel="noreferrer"/>}><CalendarDays/> 캘린더 추가</Button><Button nativeButton={false} className="col-span-2 h-12 rounded-xl bg-emerald-700 text-base hover:bg-emerald-800" render={<a href={selected.officialLink} target="_blank" rel="noreferrer"/>}>접수·요강 보러가기 <ExternalLink/></Button></div>
      </SheetContent>}
    </Sheet>
  </main>;
}

function Detail({ icon, label, value }: { icon: React.ReactNode; label:string; value:string }) { return <div className="flex gap-3 text-sm"><span className="mt-0.5 text-emerald-700 [&_svg]:size-4">{icon}</span><div><p className="text-xs font-medium text-muted-foreground">{label}</p><p className="mt-0.5 font-semibold">{value}</p></div></div>; }

function TournamentCard({ tournament:t, onSelect }: { tournament:Tournament; onSelect:()=>void }) {
  const status = getStatus(t); const eventD = daysFromToday(t.eventStart); const regD = daysFromToday(t.registrationEnd);
  return <article className="group rounded-2xl border bg-white p-4 shadow-[0_4px_20px_rgb(20_83_45/5%)] transition hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-[0_10px_32px_rgb(20_83_45/10%)] sm:p-5">
    <button onClick={onSelect} className="w-full text-left"><div className="mb-3 flex items-center justify-between gap-2"><div className="flex gap-1.5"><Badge variant="outline" className={statusStyle(status)}>{status}</Badge><Badge variant="secondary">{t.category}</Badge></div><span className="rounded-lg bg-amber-50 px-2 py-1 text-xs font-extrabold text-amber-700">{eventD>=0?`대회 D-${eventD}`:'대회 종료'}</span></div><h3 className="line-clamp-2 text-[17px] font-extrabold leading-snug tracking-tight group-hover:text-emerald-800">{t.name}</h3><div className="mt-3 space-y-2 text-sm text-muted-foreground"><p className="flex items-start gap-2"><CalendarDays className="mt-0.5 size-4 shrink-0 text-emerald-600"/><span>{t.eventPeriod}</span></p><p className="flex items-start gap-2"><MapPin className="mt-0.5 size-4 shrink-0 text-emerald-600"/><span className="line-clamp-1">{t.venue}</span></p></div></button>
    <div className="mt-4 flex items-center justify-between border-t pt-3"><div><span className="text-xs font-bold text-foreground">{t.source}</span><span className="ml-2 text-xs text-muted-foreground">{status==='마감'?'접수 마감':regD===0?'오늘 마감':regD>0?`접수 D-${regD}`:'접수 종료'}</span></div><Button nativeButton={false} size="sm" className="rounded-lg bg-emerald-700" render={<a href={t.officialLink} target="_blank" rel="noreferrer"/>}>요강 보기 <ChevronRight/></Button></div>
  </article>;
}

function CalendarView({ tournaments, onSelect }: { tournaments:Tournament[]; onSelect:(t:Tournament)=>void }) {
  const [month, setMonth] = useState(8); const year=2026; const first=new Date(year,month,1).getDay(); const days=new Date(year,month+1,0).getDate();
  const cells = Array.from({length:first+days},(_,i)=>i<first?null:i-first+1);
  return <section className="overflow-hidden rounded-2xl border bg-white shadow-sm"><div className="flex items-center justify-between border-b px-4 py-4"><Button variant="ghost" size="sm" onClick={()=>setMonth(m=>Math.max(8,m-1))}>이전</Button><h3 className="font-extrabold">{year}년 {month+1}월</h3><Button variant="ghost" size="sm" onClick={()=>setMonth(m=>Math.min(9,m+1))}>다음</Button></div><div className="grid grid-cols-7 border-b bg-muted/40 py-2 text-center text-xs font-semibold text-muted-foreground">{['일','월','화','수','목','금','토'].map(d=><span key={d}>{d}</span>)}</div><div className="grid grid-cols-7">{cells.map((day,i)=>{const events=day?tournaments.filter(t=>{const d=atMidnight(t.eventStart); return d.getFullYear()===year&&d.getMonth()===month&&d.getDate()===day;}):[]; return <div key={i} className="min-h-24 border-b border-r p-1.5 sm:min-h-32"><span className={`text-xs font-semibold ${i%7===0?'text-red-500':''}`}>{day}</span><div className="mt-1 space-y-1">{events.slice(0,2).map(t=><button key={t.id} onClick={()=>onSelect(t)} className="block w-full truncate rounded-md bg-emerald-100 px-1.5 py-1 text-left text-[10px] font-bold text-emerald-800 hover:bg-emerald-200">{t.name}</button>)}</div></div>})}</div></section>;
}
