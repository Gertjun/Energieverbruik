// =============================================================
//  Energieverbruik — app-specifieke code
// =============================================================
// Schermen: Overzicht, Invoer, Historie, Analyse. De navigatie en het scherm Instellingen zijn van de
// schil (core/nav.js); de eigen instellingenpagina's (tarieven, gegevens, weergave) vult renderSettings().

import { h, today } from './core/dom.js';
import { SCHEMA, initialData, migrate, merge, afgeleid, upsert, weerId } from './energie/model.js';
import { haalTemperaturen } from './energie/weer.js';
import { zorgVoorSolarEdge } from './energie/solaredge-auto.js';
import { renderOverzicht, BREED_SCHERM } from './energie/scherm-overzicht.js';
import { renderInvoer } from './energie/scherm-invoer.js';
import { renderHistorie } from './energie/scherm-historie.js';
import { renderAnalyse } from './energie/scherm-analyse.js';
import { renderInstellingen } from './energie/scherm-instellingen.js';

const SCHERMEN = [
  { id: 'overzicht', label: 'Overzicht', icon: ['M4 20V10M10 20V4M16 20v-7M22 20H2'] },
  { id: 'invoer', label: 'Invoer', icon: ['M12 5v14M5 12h14'] },
  { id: 'historie', label: 'Historie', icon: ['M4 6h16M4 12h16M4 18h16'] },
  { id: 'analyse', label: 'Analyse', icon: ['M3 17l6-6 4 4 8-8M15 7h6v6'] },
];

// Schermtoestand (niet opgeslagen in de kluis). staat.tab is het scherm van de schil (ctx.screen);
// een scherm mag staat.tab zelf zetten en opnieuw() aanroepen om naar een ander scherm te gaan.
const staat = { tab: null, periode: 'maand', historieMaand: null, open: null };
let laatsteRoot = null; let laatsteCtx = null;
const opnieuw = () => {
  if (!laatsteRoot) return;
  if (staat.tab && staat.tab !== laatsteCtx.screen) laatsteCtx.go(staat.tab); // de schil tekent dan opnieuw
  else app.render(laatsteRoot, laatsteCtx);
};

// Wordt het venster breder of smaller dan de grens voor de brede schermen (1200 px), dan opnieuw tekenen
// (bijv. venster verkleind of iPad gedraaid): het Overzicht kiest dan een andere indeling, grafieken een andere breedte.
window.matchMedia?.(BREED_SCHERM).addEventListener?.('change', () => opnieuw());

// Zijbalk in- of uitgeklapt (core/nav.js zet de class nav-collapsed op #screen-app): grafieken opnieuw op maat.
const schermApp = document.getElementById('screen-app');
const zijbalkIngeklapt = () => schermApp?.classList.contains('nav-collapsed') ?? false;
if (schermApp) new MutationObserver(() => { if (zijbalkIngeklapt() !== staat.zijbalkIn) opnieuw(); }).observe(schermApp, { attributes: true, attributeFilter: ['class'] });

// ---------- Temperaturen automatisch aanvullen ----------

let weerBezig = false; let weerLaatstePoging = 0;

function zorgVoorWeer(ctx, a) {
  if (weerBezig || !a.eerste || !navigator.onLine) return;
  if (!staat.weerOpnieuw && Date.now() - weerLaatstePoging < 30 * 60_000) return;
  const gisteren = new Date(Date.now() - 86_400_000);
  const grens = `${gisteren.getFullYear()}-${String(gisteren.getMonth() + 1).padStart(2, '0')}-${String(gisteren.getDate()).padStart(2, '0')}`;
  const nodig = [...a.perDag.keys()].filter((d) => d <= grens && !a.weer.has(d));
  staat.weerOpnieuw = false;
  if (!nodig.length) return;
  weerBezig = true; weerLaatstePoging = Date.now();
  const loc = ctx.data.instellingen || {};
  haalTemperaturen(nodig, { lat: loc.lat ?? 51.44, lon: loc.lon ?? 5.48 }, today())
    .then(async (lijst) => {
      staat.weerFout = null;
      if (lijst.length) await ctx.update((d) => { for (const w of lijst) upsert(d.weer, weerId(w.datum), w); });
    })
    .catch((err) => { staat.weerFout = err.message === 'Failed to fetch' ? 'geen verbinding met de weerdienst' : err.message; opnieuw(); })
    .finally(() => { weerBezig = false; });
}

export const app = {
  schemaVersion: SCHEMA,
  initialData,
  migrate,
  merge,

  screens: SCHERMEN,

  /** Eigen instellingenpagina's (tarieven, gegevens, weergave) in het instellingenscherm van de schil. */
  renderSettings(pagina, el, ctx) {
    const a = afgeleid(ctx.data);
    const weer = () => app.renderSettings(pagina, el, ctx);
    el.replaceChildren(...renderInstellingen(pagina, a, staat, weer, ctx).filter(Boolean));
  },

  render(root, ctx) {
    laatsteRoot = root; laatsteCtx = ctx;
    const a = afgeleid(ctx.data);
    // Eerste keer zonder gegevens: begin bij Invoer.
    if (!staat.gestart) {
      staat.gestart = true;
      if (!a.eerste && ctx.screen === 'overzicht') { ctx.go('invoer'); return; }
    }
    if (staat.tab !== ctx.screen) { staat.tab = ctx.screen; staat.open = null; }
    document.body.classList.add('energie-app');
    staat.zijbalkIn = zijbalkIngeklapt();
    // Vóór het tekenen zetten: grafieken rekenen hun breedte uit met het scherm en de zijbalk (grafiek.js).
    document.body.dataset.scherm = staat.tab;
    document.body.classList.toggle('zijbalk-in', staat.zijbalkIn);
    staat.indeling = 'standaard'; // het Overzicht zet hier zijn brede indeling in
    staat.titelExtra = null; // een scherm kan hier iets rechts naast de titel zetten
    let inhoud;
    if (staat.tab === 'invoer') inhoud = renderInvoer(a, staat, opnieuw, ctx);
    else if (staat.tab === 'historie') inhoud = renderHistorie(a, staat, opnieuw, ctx);
    else if (staat.tab === 'analyse') inhoud = renderAnalyse(a, staat, opnieuw, ctx);
    else inhoud = renderOverzicht(a, staat, opnieuw);
    // Brede indeling van het Overzicht: de inhoud mag dan breder worden (zie app.css).
    document.body.dataset.indeling = staat.tab === 'overzicht' ? staat.indeling : 'standaard';
    // Een scherm kan iets rechts boven de inhoud zetten (staat.titelExtra); de titel zelf staat in de kopbalk.
    const kop = staat.titelExtra ? h('div', { class: 'scherm-kop' }, h('div', { class: 'scherm-kop-rechts' }, staat.titelExtra)) : null;
    root.replaceChildren(...[kop, ...inhoud].filter(Boolean));
    zorgVoorWeer(ctx, a);
    zorgVoorSolarEdge(ctx, opnieuw);
  },
};
