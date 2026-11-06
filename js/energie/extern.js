// Gegevens die de analyses zelf ophalen bij een gratis dienst, en op dit apparaat bewaren
// (localStorage, niet versleuteld en niet gesynchroniseerd: het zijn openbare gegevens die
// altijd opnieuw op te halen zijn).
//  - Zoninstraling per dag: Open-Meteo (zoals de temperaturen).
//  - Uurprijzen van de stroombeurs (EPEX day-ahead): EnergyZero.

import { APP } from '../config.js';
import { addDays, daysBetween, eachDay, monthKey, maandStart, maandEinde } from './tijd.js';

const STRALING_KEY = `${APP.storagePrefix}:straling`;
const PRIJZEN_KEY = `${APP.storagePrefix}:beursprijzen`;

function leesCache(key) {
  try { return JSON.parse(localStorage.getItem(key)) || {}; } catch { return {}; }
}
function bewaarCache(key, obj) {
  try { localStorage.setItem(key, JSON.stringify(obj)); } catch { /* geen opslag (privévenster of vol): dan alleen in het geheugen */ }
}

const geheugen = { straling: null, prijzen: null, stralingVernieuwd: null, prijzenGehaald: new Set() };
const bezig = new Map();

/** Eén keer tegelijk per sleutel ophalen; wie later vraagt krijgt dezelfde belofte. */
function eenmalig(sleutel, fn) {
  if (!bezig.has(sleutel)) bezig.set(sleutel, fn().finally(() => bezig.delete(sleutel)));
  return bezig.get(sleutel);
}

// ---------- Zoninstraling (Open-Meteo) ----------

const ARCHIEF = 'https://archive-api.open-meteo.com/v1/archive';
const RECENT = 'https://api.open-meteo.com/v1/forecast';

/** Instraling per dag (MJ per m², horizontaal) als Map datum → waarde. */
export function straling() {
  if (!geheugen.straling) geheugen.straling = new Map(Object.entries(leesCache(STRALING_KEY)));
  return geheugen.straling;
}

/** Datums (t/m gisteren) waarvoor nog geen instraling bekend is. */
export function stralingOntbreekt(datums, vandaag) {
  const s = straling(); const gisteren = addDays(vandaag, -1);
  // De laatste 7 dagen komen uit de voorspellingsdienst en kunnen nog wijzigen: die steeds opnieuw.
  const vers = addDays(vandaag, -7);
  // Eén keer per dag (per sessie), anders blijft de app opnieuw ophalen.
  const verversen = geheugen.stralingVernieuwd !== vandaag;
  return datums.filter((d) => d <= gisteren && (!s.has(d) || (verversen && d >= vers && !s.get(`v:${d}`))));
}

async function haalDaily(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`de weerdienst antwoordde met ${res.status}`);
  const j = await res.json();
  const d = j.daily || {};
  return (d.time || []).map((datum, i) => [datum, d.shortwave_radiation_sum?.[i]]).filter(([, v]) => Number.isFinite(v));
}

/** Haalt de ontbrekende instraling op voor `datums` (gesorteerd) en bewaart die. */
export function haalStraling(datums, { lat, lon }, vandaag) {
  return eenmalig('straling', async () => {
    const nodig = stralingOntbreekt(datums, vandaag);
    geheugen.stralingVernieuwd = vandaag;
    if (!nodig.length) return;
    const loc = `latitude=${lat}&longitude=${lon}&timezone=Europe%2FAmsterdam&daily=shortwave_radiation_sum`;
    const grens = addDays(vandaag, -7);
    const oud = nodig.filter((d) => d < grens); const nieuw = nodig.filter((d) => d >= grens);
    const s = straling();
    if (oud.length) for (const [d, v] of await haalDaily(`${ARCHIEF}?${loc}&start_date=${oud[0]}&end_date=${oud[oud.length - 1]}`)) { s.set(d, v); s.delete(`v:${d}`); }
    if (nieuw.length) {
      const past = Math.min(92, daysBetween(nieuw[0], vandaag) + 1);
      for (const [d, v] of await haalDaily(`${RECENT}?${loc}&past_days=${past}&forecast_days=1`)) {
        if (d >= vandaag) continue;
        if (!s.has(d) || s.get(`v:${d}`) || d >= grens) { s.set(d, v); s.set(`v:${d}`, d < addDays(vandaag, -5) ? 1 : 0); }
      }
    }
    bewaarCache(STRALING_KEY, Object.fromEntries(s));
  });
}

// ---------- Uurprijzen stroombeurs (EnergyZero) ----------

const ENERGYZERO = 'https://api.energyzero.nl/v1/energyprices';

/** Uurprijzen in € per kWh zonder btw, als Map "2026-10-01T05" (lokale tijd) → prijs. */
export function beursprijzen() {
  if (!geheugen.prijzen) {
    const c = leesCache(PRIJZEN_KEY);
    geheugen.prijzen = new Map(Object.entries(c.uren || {}));
    geheugen.prijzen.klaar = new Set(c.klaar || []);
  }
  return geheugen.prijzen;
}

/** Maanden (yyyy-mm) tussen van en tot waarvan de prijzen nog niet (volledig) binnen zijn. */
export function prijzenOntbreken(van, tot, vandaag) {
  const p = beursprijzen(); const out = [];
  for (let mk = monthKey(van); mk <= monthKey(tot); mk = volgende(mk)) {
    if (maandStart(mk) >= vandaag) break;
    // Een maand die deze sessie al is opgehaald maar niet compleet was (de lopende maand, of de dienst
    // had nog niet alles) niet steeds opnieuw: anders blijft de app ophalen.
    if (!p.klaar.has(mk) && !geheugen.prijzenGehaald.has(mk)) out.push(mk);
  }
  return out;
}

const lokaal = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Amsterdam', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23' });
/** UTC-tijdstip → "2026-10-01T05" in Nederlandse tijd. */
export function lokaleSleutel(iso) {
  const t = lokaal.format(new Date(iso)); // "2026-10-01 05"
  return `${t.slice(0, 10)}T${t.slice(11, 13)}`;
}

/** Haalt de uurprijzen op van de maanden die nog ontbreken (per maand één verzoek). */
export function haalPrijzen(van, tot, vandaag) {
  return eenmalig(`prijzen:${van}:${tot}`, async () => {
    const p = beursprijzen();
    for (const mk of prijzenOntbreken(van, tot, vandaag)) {
      // Ruim genoeg: de lokale dag begint in UTC al de avond ervoor.
      const vanU = `${addDays(maandStart(mk), -1)}T22:00:00.000Z`;
      const eind = maandEinde(mk) < vandaag ? maandEinde(mk) : addDays(vandaag, -1);
      const totU = `${eind}T23:59:59.999Z`;
      const url = `${ENERGYZERO}?fromDate=${vanU}&tillDate=${totU}&interval=4&usageType=1&inclBtw=false`;
      let res;
      try { res = await fetch(url); } catch { throw new Error('geen verbinding met EnergyZero (de dienst voor beursprijzen)'); }
      if (!res.ok) throw new Error(`EnergyZero antwoordde met ${res.status}`);
      const j = await res.json();
      const som = new Map();
      for (const x of j.Prices || j.prices || []) {
        const tijd = x.readingDate || x.fromDate || x.date; const prijs = Number(x.price);
        if (!tijd || !Number.isFinite(prijs)) continue;
        const k = lokaleSleutel(tijd);
        if (k.slice(0, 7) !== mk) continue;
        const s = som.get(k) || { s: 0, n: 0 }; s.s += prijs; s.n++; som.set(k, s);
      }
      // Kwartierprijzen (vanaf oktober 2025 handelt de beurs per kwartier) en het dubbele uur bij
      // wintertijd worden gemiddeld tot één prijs per uur.
      for (const [k, s] of som) p.set(k, s.s / s.n);
      const dagen = [...eachDay(maandStart(mk), eind)];
      const compleet = dagen.every((d) => p.has(`${d}T00`) && p.has(`${d}T23`));
      if (compleet && eind === maandEinde(mk)) p.klaar.add(mk);
      geheugen.prijzenGehaald.add(mk);
    }
    bewaarCache(PRIJZEN_KEY, { uren: Object.fromEntries(p), klaar: [...p.klaar] });
  });
}

function volgende(mk) {
  const [y, m] = mk.split('-').map(Number);
  return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`;
}
