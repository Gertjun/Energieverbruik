// Eenmalige import van Geerts eigen Excel-bestand (Gasverbruik.xlsx).
// Blad "DATA": per dag stroom, teruglevering, gas, temperatuur en opmerking.
// Blad "Kosten": per maand het termijnbedrag en de SolarEdge-opbrengst.

import { leesXlsx } from './xlsx.js';
import { fromExcelSerial } from './tijd.js';

const norm = (v) => String(v ?? '').trim().toLowerCase();
const kolomLetter = (i) => { let s = ''; for (let n = i + 1; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s; return s; };
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
  // Controle: wat is er overgeslagen en waarom (met celverwijzingen als voorbeeld).
  const geenDatum = []; const tekstGetal = []; const negatief = [];
  const perDatum = new Map();
  let rijen = 0;
  const cel = (kol, rij) => `${kolomLetter(kol)}${rij + 1}`;
  const getalCel = (rij, kol, r) => {
    if (kol < 0) return null;
    const v = rij[kol];
    if (typeof v === 'number') return Number.isFinite(v) ? v : null;
    if (typeof v === 'string' && /\d/.test(v)) tekstGetal.push(cel(kol, r));
    return null;
  };

  for (let r = kop.index + 1; r < data.length; r++) {
    const rij = data[r];
    if (!rij) continue;
    const waarden = [k.afname, k.terug, k.gas].map((kol) => getalCel(rij, kol, r));
    const heeftWaarde = waarden.some((v) => v != null);
    const serie = num(rij[k.datum]);
    if (!serie || serie < 20000 || serie > 80000) {
      if (heeftWaarde || (rij[k.datum] != null && String(rij[k.datum]).trim())) geenDatum.push(cel(k.datum, r));
      continue;
    }
    rijen++;
    const datum = fromExcelSerial(serie);
    const dag = { datum };
    const [afname, terug, gas] = waarden;
    if (afname != null) dag.afname = afname;
    if (terug != null) dag.terug = terug;
    if (gas != null) dag.gas = gas;
    if ([afname, terug, gas].some((v) => v != null && v < 0)) negatief.push(datum);
    const opm = k.opmerking >= 0 ? String(rij[k.opmerking] ?? '').trim() : '';
    if (opm && opm !== '0') dag.opmerking = opm;
    if (Object.keys(dag).length > 1) {
      if (perDatum.has(datum)) perDatum.get(datum).push(r + 1);
      else perDatum.set(datum, [r + 1]);
      dagen.push(dag);
    }
    const tgem = num(rij[k.tgem]);
    if (tgem != null) weer.push({ datum, tgem, tmax: num(rij[k.tmax]), tmin: num(rij[k.tmin]), bron: 'excel' });
  }

  // Dubbele datums: de laatste regel telt, de eerdere worden overgeslagen.
  const dubbel = [...perDatum.entries()].filter(([, r]) => r.length > 1);
  const uniek = new Map();
  for (const d of dagen) uniek.set(d.datum, d);
  const dagenUniek = [...uniek.values()].sort((x, y) => (x.datum < y.datum ? -1 : 1));

  const overgeslagen = [];
  if (geenDatum.length) overgeslagen.push({ reden: 'Regels zonder geldige datum in kolom Datum', aantal: geenDatum.length, voorbeelden: geenDatum.slice(0, 5) });
  if (tekstGetal.length) overgeslagen.push({ reden: 'Cellen met tekst in plaats van een getal (bijvoorbeeld een punt of komma verkeerd)', aantal: tekstGetal.length, voorbeelden: tekstGetal.slice(0, 5) });
  if (dubbel.length) overgeslagen.push({ reden: 'Datums die meer dan één keer voorkomen (de onderste regel is gebruikt)', aantal: dubbel.length, voorbeelden: dubbel.slice(0, 5).map(([d, r]) => `${d} (regels ${r.join(', ')})`) });
  const meldingen = [];
  if (negatief.length) meldingen.push(`${negatief.length} dag(en) met een negatieve waarde, bijvoorbeeld ${negatief.slice(0, 3).join(', ')}.`);
  const controle = { rijen, overgeslagen, meldingen };

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
  return { dagen: dagenUniek, weer, maanden, controle };
}
