// Datumhulpjes. Datums zijn altijd strings 'yyyy-mm-dd' (lokale kalenderdag).
// Rekenen gebeurt in UTC, zodat zomer-/wintertijd geen dagen verschuift.

const toUtc = (iso) => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
};
const fromUtc = (dt) => dt.toISOString().slice(0, 10);

export const addDays = (iso, n) => {
  const dt = toUtc(iso);
  dt.setUTCDate(dt.getUTCDate() + n);
  return fromUtc(dt);
};

/** Aantal dagen van a naar b (b − a). */
export const daysBetween = (a, b) => Math.round((toUtc(b) - toUtc(a)) / 86_400_000);

/** 0 = zondag … 6 = zaterdag */
export const weekday = (iso) => toUtc(iso).getUTCDay();
export const isWeekend = (iso) => { const w = weekday(iso); return w === 0 || w === 6; };

export const monthKey = (iso) => iso.slice(0, 7);
export const yearKey = (iso) => iso.slice(0, 4);

/** ISO-week als 'yyyy-Www' (week begint op maandag). */
export function isoWeekKey(iso) {
  const dt = toUtc(iso);
  const day = dt.getUTCDay() || 7;
  dt.setUTCDate(dt.getUTCDate() + 4 - day);
  const year = dt.getUTCFullYear();
  const week = Math.ceil(((dt - Date.UTC(year, 0, 1)) / 86_400_000 + 1) / 7);
  return `${year}-W${String(week).padStart(2, '0')}`;
}

/** Maandag van de week van deze datum. */
export const mondayOf = (iso) => addDays(iso, -((weekday(iso) + 6) % 7));

/** Zomer = 1 april t/m 30 september, winter = 1 oktober t/m 31 maart. */
export const isZomer = (iso) => { const m = Number(iso.slice(5, 7)); return m >= 4 && m <= 9; };

/** Dezelfde dag een jaar eerder (29 feb → 28 feb). */
export function sameDayLastYear(iso) {
  const y = Number(iso.slice(0, 4)) - 1;
  const md = iso.slice(5) === '02-29' ? '02-28' : iso.slice(5);
  return `${y}-${md}`;
}

export function* eachDay(from, to) {
  for (let d = from; d <= to; d = addDays(d, 1)) yield d;
}

/** Excel-datumgetal (1900-systeem) naar 'yyyy-mm-dd'. */
export const fromExcelSerial = (n) => fromUtc(new Date(Date.UTC(1899, 11, 30) + Math.round(n) * 86_400_000));

const dagFmt = new Intl.DateTimeFormat('nl-NL', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });
const dagLangFmt = new Intl.DateTimeFormat('nl-NL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
const maandFmt = new Intl.DateTimeFormat('nl-NL', { month: 'long', year: 'numeric', timeZone: 'UTC' });
const maandKortFmt = new Intl.DateTimeFormat('nl-NL', { month: 'short', timeZone: 'UTC' });
const datumKortFmt = new Intl.DateTimeFormat('nl-NL', { day: 'numeric', month: 'short', timeZone: 'UTC' });

export const fmtDag = (iso) => dagFmt.format(toUtc(iso));
export const fmtDagLang = (iso) => dagLangFmt.format(toUtc(iso));
export const fmtDatumKort = (iso) => datumKortFmt.format(toUtc(iso));
export const fmtMaand = (key) => maandFmt.format(toUtc(`${key}-01`));
export const fmtMaandKort = (key) => maandKortFmt.format(toUtc(`${key}-01`)).replace('.', '');

/** Eerste en laatste dag van een maand 'yyyy-mm'. */
export const maandStart = (maand) => `${maand}-01`;
export function maandEinde(maand) {
  const [y, m] = maand.split('-').map(Number);
  return new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
}
/** Maand verschuiven: maandPlus('2026-01', -1) → '2025-12'. */
export function maandPlus(maand, n) {
  const [y, m] = maand.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + n, 1));
  return d.toISOString().slice(0, 7);
}
