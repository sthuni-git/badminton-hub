'use client';
import { useEffect, useRef, useState } from 'react';
import { emptyDraft, isRealDate, MANUAL_CATEGORIES, validateDraft, type TournamentDraft } from '../lib/manual-tournament';
import type { Tournament } from '../lib/tournaments';

type Row = { draft: TournamentDraft; poster?: string; filename?: string; error?: string; saved?: boolean };
async function prepareImage(file: File): Promise<string> {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) throw new Error('JPG, PNG, WEBP만 지원합니다.');
  if (file.size > 20_000_000) throw new Error('원본 이미지는 20MB 이하여야 합니다.');
  const bitmap = await createImageBitmap(file);
  try {
    if (bitmap.width * bitmap.height > 60_000_000) throw new Error('이미지 해상도가 너무 큽니다. 크기를 줄여주세요.');
    const scale = Math.min(1, 2600 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('이미지를 처리할 수 없습니다.');
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    for (const quality of [0.9, 0.8, 0.65, 0.5]) {
      const result = canvas.toDataURL('image/jpeg', quality);
      if (result.length < 2_650_000) return result;
    }
    throw new Error('압축 후에도 2MB를 초과합니다. 이미지 크기를 줄여주세요.');
  } finally { bitmap.close(); }
}

export function TournamentRegistrationDialog({ onClose, onCreated }: { onClose: () => void; onCreated: (items: Tournament[]) => void }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  useEffect(() => { dialog.current?.showModal(); }, []);
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => { if (rows.some(r => !r.saved)) { event.preventDefault(); event.returnValue = ''; } };
    window.addEventListener('beforeunload', warn); return () => window.removeEventListener('beforeunload', warn);
  }, [rows]);
  const close = () => {
    if (busy) return;
    if (rows.some(r => !r.saved) && !window.confirm('아직 등록하지 않은 초안이 있습니다. 닫으면 초안이 사라집니다. 닫을까요?')) return;
    onClose();
  };
  const update = (id: string, patch: Partial<TournamentDraft>) => {
    setConfirmed(false);
    setRows(prev => prev.map(r => r.draft.id === id ? { ...r, draft: { ...r.draft, ...patch }, error: undefined } : r));
  };
  async function addFiles(files: FileList | null) {
    if (!files?.length || busy) return;
    if (rows.length + files.length > 20) { setMessage('한 번에 최대 20개 대회를 등록할 수 있습니다.'); return; }
    setBusy(true); setConfirmed(false);
    const added: Row[] = []; const errors: string[] = [];
    for (const file of Array.from(files)) {
      setMessage(`포스터 준비 중: ${file.name}`);
      try { added.push({ draft: emptyDraft(), poster: await prepareImage(file), filename: file.name }); }
      catch (error) { errors.push(`${file.name}: ${(error as Error).message}`); }
    }
    setRows(prev => [...prev, ...added]); setBusy(false);
    setMessage(errors.join('\n') || `${added.length}개 포스터를 준비했습니다. 각 대회의 필수 정보를 입력해주세요.`);
    if (fileInput.current) fileInput.current.value = '';
  }
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy || !confirmed || !password || !rows.some(r => !r.saved)) return;
    let invalid = false;
    const checked = rows.map(row => {
      if (row.saved) return row;
      try { validateDraft(row.draft); return { ...row, error: undefined }; }
      catch (error) { invalid = true; return { ...row, error: (error as Error).message }; }
    });
    setRows(checked);
    if (invalid) { setMessage('오류가 있는 대회 정보를 먼저 확인해주세요. 아직 공개 등록하지 않았습니다.'); return; }
    setBusy(true);
    let done = 0;
    const pending = checked.filter(r => !r.saved);
    // Independent requests stay below Vercel's request-size limit; successes are not retried.
    for (const row of pending) {
      setMessage(`${done + 1}/${pending.length} 등록 중: ${row.draft.name}`);
      try {
        const response = await fetch('/api/tournaments', {
          method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${password}` },
          body: JSON.stringify({ draft: row.draft, poster: row.poster }), signal: AbortSignal.timeout(65_000),
        });
        const data = await response.json() as { tournament?: Tournament; error?: string };
        if (!response.ok || !data.tournament) throw new Error(data.error || '등록에 실패했습니다.');
        setRows(prev => prev.map(r => r.draft.id === row.draft.id ? { ...r, saved: true, error: undefined } : r));
        onCreated([data.tournament]); done++;
      } catch (error) {
        setRows(prev => prev.map(r => r.draft.id === row.draft.id ? { ...r, error: error instanceof Error ? error.message : '등록에 실패했습니다.' } : r));
      }
    }
    setBusy(false); setMessage(`${done}/${pending.length}개 공개 등록 완료.${done < pending.length ? ' 실패한 항목만 다시 등록할 수 있습니다. 응답이 끊긴 항목도 중복 등록되지 않습니다.' : ' 다른 기기에서도 확인할 수 있습니다.'}`);
  }
  const inputClass = 'mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-sm text-slate-900 disabled:bg-slate-100';
  return <dialog ref={dialog} onCancel={e => { e.preventDefault(); close(); }} aria-labelledby="registration-title" className="fixed inset-0 m-auto max-h-[92dvh] w-[min(960px,96vw)] overflow-y-auto rounded-2xl bg-white p-0 text-slate-900 shadow-2xl backdrop:bg-black/60">
    <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-white px-5 py-4">
      <div><h2 id="registration-title" className="text-lg font-bold">대회 공개 등록</h2><p className="text-xs text-slate-500">포스터 여러 장 또는 정보 직접 입력 · 모든 방문자에게 공유</p></div>
      <button type="button" onClick={close} disabled={busy} aria-label="등록 창 닫기" className="rounded-lg border px-3 py-2 disabled:opacity-50">닫기</button>
    </div>
    <form onSubmit={submit} className="space-y-5 p-5">
      <div className="rounded-xl border border-dashed border-emerald-300 bg-emerald-50 p-5">
        <p className="font-semibold">포스터 1장당 대회 초안 1개</p>
        <p className="mt-1 text-sm text-slate-600">최대 20장 · JPG/PNG/WEBP · 장당 20MB 이하. 날짜와 장소는 이미지를 보며 직접 입력해주세요. 자동 추출되지 않습니다.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <input ref={fileInput} type="file" multiple accept="image/jpeg,image/png,image/webp" onChange={e => void addFiles(e.target.files)} disabled={busy} aria-label="대회 포스터 여러 장 선택" className="max-w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-emerald-700 file:px-4 file:py-2 file:text-white" />
          <button type="button" disabled={busy || rows.length >= 20} onClick={() => { setRows(prev => [...prev, { draft: emptyDraft() }]); setConfirmed(false); }} className="rounded-lg border bg-white px-4 py-2 text-sm disabled:opacity-50">+ 직접 입력</button>
        </div>
      </div>
      <p role="status" aria-live="polite" className="whitespace-pre-line text-sm text-emerald-800">{message}</p>
      {rows.map((row, index) => <fieldset key={row.draft.id} disabled={busy || row.saved} className="rounded-xl border border-slate-200 p-4">
        <legend className="px-2 text-sm font-bold">{index + 1}. {row.saved ? '공개 등록 완료' : '대회 초안'}{row.filename ? ` · ${row.filename}` : ''}</legend>
        <div className="grid gap-4 sm:grid-cols-[180px_1fr]">
          <div>{row.poster ? <a href={row.poster} target="_blank" rel="noreferrer"><img src={row.poster} alt={`${index + 1}번 포스터 미리보기`} className="max-h-80 w-full rounded-lg border object-contain" /></a> : <div className="rounded-lg bg-slate-50 p-5 text-sm text-slate-500">포스터 없는 직접 등록</div>}
            {!row.saved && <button type="button" onClick={() => { setRows(prev => prev.filter(r => r.draft.id !== row.draft.id)); setConfirmed(false); }} className="mt-2 text-sm text-rose-700">초안 제외</button>}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-xs sm:col-span-2">대회명 *<input aria-label={`${index + 1}번 대회명`} className={inputClass} value={row.draft.name} onChange={e => update(row.draft.id, { name: e.target.value })} required maxLength={300} /></label>
            <label className="text-xs">대회 구분<select className={inputClass} value={row.draft.category} onChange={e => update(row.draft.id, { category: e.target.value as TournamentDraft['category'] })}>{MANUAL_CATEGORIES.map(c => <option key={c}>{c}</option>)}</select></label>
            <label className="text-xs">개최 장소 *<input aria-label={`${index + 1}번 개최 장소`} className={inputClass} value={row.draft.venue} onChange={e => update(row.draft.id, { venue: e.target.value })} required maxLength={300} placeholder="시·군·구와 체육관명" /></label>
            {([['eventStart', '대회 시작일 *'], ['eventEnd', '대회 종료일 *'], ['registrationStart', '접수 시작일'], ['registrationEnd', '접수 종료일']] as const).map(([key, label]) => <label key={key} className="text-xs">{label}<input aria-label={`${index + 1}번 ${label.replace(' *', '')}`} type="date" required={key.startsWith('event')} className={inputClass} value={row.draft[key]} onChange={e => update(row.draft.id, { [key]: e.target.value })} onBlur={e => { if (key === 'eventStart' && !row.draft.eventEnd && isRealDate(e.target.value)) update(row.draft.id, { eventEnd: e.target.value }); }} /></label>)}
            {([['fee', '참가비'], ['sponsor', '주최·후원'], ['shuttlecock', '사용 셔틀콕'], ['officialLink', '공식 안내 링크 (선택)']] as const).map(([key, label]) => <label key={key} className="text-xs">{label}<input type={key === 'officialLink' ? 'url' : 'text'} className={inputClass} value={row.draft[key]} maxLength={key === 'officialLink' ? 2000 : 300} onChange={e => update(row.draft.id, { [key]: e.target.value })} placeholder="확인한 정보만 입력" /></label>)}
          </div>
        </div>
        {row.error && <p role="alert" className="mt-3 text-sm font-semibold text-rose-700">{row.error}</p>}
      </fieldset>)}
      {rows.some(r => !r.saved) && <div className="space-y-3 rounded-xl bg-slate-50 p-4">
        <label className="block text-sm">공개 등록용 관리자 비밀번호<input type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} required disabled={busy} className={inputClass} /></label>
        <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} disabled={busy} required className="mt-1" /><span>대회명·일정·장소가 원문과 일치하며, 업로드할 포스터를 공개할 권한이 있음을 확인했습니다. 포스터와 입력 정보가 모든 방문자에게 공개됩니다.</span></label>
        <button type="submit" disabled={busy || !confirmed || !password} className="w-full rounded-xl bg-emerald-700 px-5 py-3 font-bold text-white disabled:opacity-40">{busy ? '처리 중…' : `${rows.filter(r => !r.saved).length}개 대회 한 번에 공개 등록`}</button>
      </div>}
    </form>
  </dialog>;
}
