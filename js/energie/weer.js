// Dagtemperaturen ophalen bij Open-Meteo (gratis, geen account of sleutel nodig).
// Oudere dagen komen uit het archief (loopt ~5 dagen achter), recente dagen
// uit de weersvoorspellingsdienst.

import { addDays, daysBetween } from './tijd.js';

const ARCHIEF = 'https://archive-api.open-meteo.com/v1/archive';
const RECENT = 'https://api.open-meteo.com/v1/forecast';
const DAILY = 'temperature_2m_mean,temperature_2m_max,temperature_2m_min';

const r1 = (v) => (Number.isFinite(v) ? Math.round(v * 10) / 10 : null);

async function haal(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Weerdienst antwoordde met ${res.status}`);
  const j = await res.json();
  const d = j.daily || {};
  return (d.time || []).map((datum, i) => ({
    datum, tgem: r1(d.temperature_2m_mean?.[i]), tmax: r1(d.temperature_2m_max?.[i]), tmin: r1(d.temperature_2m_min?.[i]),
  })).filter((w) => w.tgem != null);
}

/** Haalt temperaturen op voor de datums in `nodig` (gesorteerd), tot en met gisteren. */
export async function haalTemperaturen(nodig, { lat, lon }, vandaag) {
  const gisteren = addDays(vandaag, -1);
  const lijst = nodig.filter((d) => d <= gisteren);
  if (!lijst.length) return [];
  const loc = `latitude=${lat}&longitude=${lon}&timezone=Europe%2FAmsterdam&daily=${DAILY}`;
  const grens = addDays(vandaag, -7);
  const oud = lijst.filter((d) => d < grens);
  const nieuw = lijst.filter((d) => d >= grens);
  const out = [];
  if (oud.length) {
    out.push(...await haal(`${ARCHIEF}?${loc}&start_date=${oud[0]}&end_date=${oud[oud.length - 1]}`));
  }
  if (nieuw.length) {
    const past = Math.min(92, daysBetween(nieuw[0], vandaag) + 1);
    out.push(...await haal(`${RECENT}?${loc}&past_days=${past}&forecast_days=1`));
  }
  const gevraagd = new Set(lijst);
  return out.filter((w) => gevraagd.has(w.datum)).map((w) => ({ ...w, bron: 'open-meteo' }));
}
