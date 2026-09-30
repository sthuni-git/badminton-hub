import type { Tournament, TournamentCategory } from './tournaments';

export const MANUAL_CATEGORIES: TournamentCategory[] = ['전국오픈', '지역구대회', '학생선수권', '브랜드대회', '국제대회'];
export interface TournamentDraft {
  id: string; name: string; category: TournamentCategory; venue: string;
  eventStart: string; eventEnd: string; registrationStart: string; registrationEnd: string;
  officialLink: string; fee: string; sponsor: string; shuttlecock: string;
}
export const emptyDraft = (): TournamentDraft => ({
  id: `shared-${crypto.randomUUID()}`, name: '', category: '전국오픈', venue: '',
  eventStart: '', eventEnd: '', registrationStart: '', registrationEnd: '',
  officialLink: '', fee: '', sponsor: '', shuttlecock: '',
});
export function isRealDate(value: string) {
  return /^(19|20|21)\d{2}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
}
export function validateDraft(input: unknown): TournamentDraft {
  if (!input || typeof input !== 'object') throw new Error('대회 정보를 입력해주세요.');
  const raw = input as Record<string, unknown>;
  const out: Record<string, string> = {};
  for (const key of ['id', 'name', 'category', 'venue', 'eventStart', 'eventEnd', 'registrationStart', 'registrationEnd', 'officialLink', 'fee', 'sponsor', 'shuttlecock']) {
    if (typeof raw[key] !== 'string' || raw[key].length > (key === 'officialLink' ? 2000 : 300)) throw new Error('입력값의 형식이나 길이를 확인해주세요.');
    out[key] = raw[key].trim();
  }
  if (!/^shared-[0-9a-f-]{36}$/.test(out.id)) throw new Error('잘못된 등록 ID입니다.');
  if (!out.name || !out.venue) throw new Error('대회명과 개최 장소를 입력해주세요.');
  if (!MANUAL_CATEGORIES.includes(out.category as TournamentCategory)) throw new Error('대회 구분을 확인해주세요.');
  if (!isRealDate(out.eventStart) || !isRealDate(out.eventEnd) || out.eventStart > out.eventEnd) throw new Error('실제 대회 시작일과 종료일을 확인해주세요.');
  if (out.registrationStart || out.registrationEnd) {
    if (!isRealDate(out.registrationStart) || !isRealDate(out.registrationEnd) || out.registrationStart > out.registrationEnd) throw new Error('접수 기간은 시작일과 종료일을 함께 올바르게 입력해주세요.');
  }
  if (out.officialLink) {
    try { const url = new URL(out.officialLink); if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) throw new Error(); }
    catch { throw new Error('안내 링크는 올바른 http/https 주소로 입력해주세요.'); }
  }
  return out as unknown as TournamentDraft;
}
export function toTournament(draft: TournamentDraft, posterImage?: string): Tournament {
  const period = (a: string, b: string) => a === b ? a.replaceAll('-', '.') : `${a.replaceAll('-', '.')} ~ ${b.replaceAll('-', '.')}`;
  return { ...draft, source: '관리자수동등록', sources: ['관리자수동등록'],
    officialLink: draft.officialLink || posterImage || '',
    sourceLinks: draft.officialLink ? [{ source: '관리자수동등록', link: draft.officialLink }] : [],
    posterImage, eventPeriod: period(draft.eventStart, draft.eventEnd),
    registrationPeriod: draft.registrationStart ? period(draft.registrationStart, draft.registrationEnd) : '접수 일정 미등록',
    fee: draft.fee || '미등록',
  };
}
