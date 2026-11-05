// Eenmalige import van Geerts eigen Excel-bestand (Gasverbruik.xlsx).
// Blad "DATA": per dag stroom, teruglevering, gas, temperatuur en opmerking.
// Blad "Kosten": per maand het termijnbedrag en de SolarEdge-opbrengst.

import { leesXlsx } from './xlsx.js';
import { fromExcelSerial } from './tijd.js';

const norm = (v) => String(v ?? '').trim().toLowerCase();
const num = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : null);

function kopRij(rijen, moetHebben) {
  for (let i = 0; i < Math.min(rijen.length, 20); i++) {
    const r = (rijen[i] || []).map(norm);
    if (moetHebben.every((k) => r.includes(k))) return { index: i, kol: (naam) => r.indexOf(naam) };
  }
  return null;
}

export async function leesExcel(buffer) {
  const bladen = await leesXlsx(buffer);
  const data = bladen.DATA || Object.values(bladen).find((r) => kopRij(r, ['datum', 'e verbruik']));
  if (!data) throw new Error('Geen blad "DATA" met de kolommen Datum en E verbruik gevonden.');
  const kop = kopRij(data, ['datum', 'e verbruik']);
  const k = {
    datum: kop.kol('datum'), afname: kop.kol('e verbruik'), terug: kop.kol('e terug'),
    gas: kop.kol('gasverbruik'), tgem: kop.kol('gem. temp'), tmax: kop.kol('max'), tmin: kop.kol('min'),
    opmerking: kop.kol('opmerking'),
  };

  const dagen = []; const weer = [];
  for (const rij of data.slice(kop.index + 1)) {
    if (!rij) continue;
    const serie = num(rij[k.datum]);
    if (!serie) continue;
    const datum = fromExcelSerial(serie);
    const dag = { datum };
    if (num(rij[k.afname]) != null) dag.afname = num(rij[k.afname]);
    if (num(rij[k.terug]) != null) dag.terug = num(rij[k.terug]);
    if (num(rij[k.gas]) != null) dag.gas = num(rij[k.gas]);
    const opm = k.opmerking >= 0 ? String(rij[k.opmerking] ?? '').trim() : '';
    if (opm && opm !== '0') dag.opmerking = opm;
    if (Object.keys(dag).length > 1) dagen.push(dag);
    const tgem = num(rij[k.tgem]);
    if (tgem != null) weer.push({ datum, tgem, tmax: num(rij[k.tmax]), tmin: num(rij[k.tmin]), bron: 'excel' });
  }

  const maanden = [];
  const kosten = bladen.Kosten;
  const kk = kosten && kopRij(kosten, ['maand', 'termijn']);
  if (kk) {
    const iZon = kk.kol('solaredge');
    for (const rij of kosten.slice(kk.index + 1)) {
      const serie = num(rij?.[kk.kol('maand')]);
      if (!serie) continue;
      const maand = fromExcelSerial(serie).slice(0, 7);
      const termijn = num(rij[kk.kol('termijn')]);
      const zon = iZon >= 0 ? num(rij[iZon]) : null;
      if (termijn == null && zon == null) continue;
      maanden.push({ maand, termijn: termijn == null ? null : Math.round(termijn * 100), zon });
    }
  }
  return { dagen, weer, maanden };
}
