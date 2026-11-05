// =============================================================
//  Energieverbruik — app-specifieke code
// =============================================================
// Schermen: Overzicht, Invoer, Historie, Analyse, Instellingen.
// iPhone/iPad: tabbalk onderin. Laptop: inklapbare zijbalk links.

import { h, today } from './core/dom.js';
import { APP } from './config.js';
import { SCHEMA, initialData, migrate, merge, afgeleid, upsert, weerId } from './energie/model.js';
import { haalTemperaturen } from './energie/weer.js';
import { renderOverzicht, BREED_SCHERM } from './energie/scherm-overzicht.js';
import { renderInvoer } from './energie/scherm-invoer.js';
import { renderHistorie } from './energie/scherm-historie.js';
import { renderAnalyse } from './energie/scherm-analyse.js';
import { renderInstellingen, schilGroep } from './energie/scherm-instellingen.js';

const TABS = [
  { key: 'overzicht', label: 'Overzicht', icoon: 'M4 20V10M10 20V4M16 20v-7M22 20H2' },
  { key: 'invoer', label: 'Invoer', icoon: 'M12 5v14M5 12h14' },
  { key: 'historie', label: 'Historie', icoon: 'M4 6h16M4 12h16M4 18h16' },
  { key: 'analyse', label: 'Analyse', icoon: 'M3 17l6-6 4 4 8-8M15 7h6v6' },
  { key: 'instellingen', label: 'Instellingen', icoon: 'M4 7h10M18 7h2M4 17h4M12 17h8M14 4v6M8 14v6' },
];

// Schermtoestand (niet opgeslagen in de kluis).
const staat = { tab: null, periode: 'maand', maat: 'afname', historieMaand: null, open: null };
let laatsteRoot = null; let laatsteCtx = null;
const opnieuw = () => { if (laatsteRoot) app.render(laatsteRoot, laatsteCtx); };

// Ingeklapte zijbalk is een weergavevoorkeur (geen gegevens), dus buiten de kluis.
const ZIJBALK_KEY = `${APP.storagePrefix}:zijbalk-ingeklapt`;
const zijbalkIngeklapt = () => { try { return localStorage.getItem(ZIJBALK_KEY) === '1'; } catch { return false; } };

// Wordt het venster breder of smaller dan de grens voor de brede indeling van het Overzicht,
// dan opnieuw tekenen (bijv. venster verkleind of iPad gedraaid).
window.matchMedia?.(BREED_SCHERM).addEventListener?.('change', () => { if (staat.tab === 'overzicht') opnieuw(); });

function icoon(pad) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  p.setAttribute('d', pad);
  svg.append(p);
  return svg;
}

function navigatie() {
  const ingeklapt = zijbalkIngeklapt();
  document.body.classList.add('energie-app');
  document.body.classList.toggle('zijbalk-in', ingeklapt);
  const knop = (t) => h('button', {
    type: 'button', class: 'nav-knop', 'aria-current': staat.tab === t.key ? 'page' : null, title: t.label,
    onClick: () => { staat.tab = t.key; staat.open = null; opnieuw(); window.scrollTo({ top: 0 }); },
  }, icoon(t.icoon), h('span', {}, t.label));
  // Logo, naam en versie bovenin de zijbalk (alleen laptop; op iPhone/iPad staat dit in de kopbalk).
  const merk = h('div', { class: 'nav-merk' },
    h('img', { src: 'icons/icon-192.png', alt: '', class: 'nav-logo', width: 36, height: 36 }),
    h('div', { class: 'nav-merk-tekst' },
      h('strong', {}, APP.name),
      h('span', { class: 'nav-versie' }, `v${APP.version}`)),
    h('button', {
      type: 'button', class: 'nav-inklap', 'aria-label': ingeklapt ? 'Zijbalk uitklappen' : 'Zijbalk inklappen',
      title: ingeklapt ? 'Zijbalk uitklappen' : 'Zijbalk inklappen',
      onClick: () => { try { localStorage.setItem(ZIJBALK_KEY, ingeklapt ? '0' : '1'); } catch { /* geen opslag */ } opnieuw(); },
    }, icoon(ingeklapt ? 'M9 6l6 6-6 6' : 'M15 6l-6 6 6 6')));
  return h('nav', { class: 'app-nav', 'aria-label': 'Schermen' }, merk, TABS.map(knop));
}

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

  /** Door de schil aangeroepen (bijv. sync-knop zonder koppeling): naar Instellingen → App en sync. */
  openSettings(section) {
    staat.tab = 'instellingen';
    staat.instellingenDeel = section === 'backup' ? 'gegevens' : 'app';
    opnieuw();
  },

  render(root, ctx) {
    laatsteRoot = root; laatsteCtx = ctx;
    const a = afgeleid(ctx.data);
    staat.tab ??= a.eerste ? 'overzicht' : 'invoer';
    staat.zijbalkIn = zijbalkIngeklapt();
    staat.indeling = 'standaard'; // het Overzicht zet hier zijn brede indeling in
    staat.titelExtra = null; // een scherm kan hier iets rechts naast de titel zetten
    let inhoud;
    if (staat.tab === 'invoer') inhoud = renderInvoer(a, staat, opnieuw, ctx);
    else if (staat.tab === 'historie') inhoud = renderHistorie(a, staat, opnieuw, ctx);
    else if (staat.tab === 'analyse') inhoud = renderAnalyse(a, staat, opnieuw, ctx);
    else if (staat.tab === 'instellingen') inhoud = renderInstellingen(a, staat, opnieuw, ctx);
    else inhoud = renderOverzicht(a, staat, opnieuw);
    // Brede indeling van het Overzicht: de inhoud mag dan breder worden (zie app.css).
    document.body.dataset.indeling = staat.tab === 'overzicht' ? staat.indeling : 'standaard';
    document.querySelectorAll('[data-app-version]').forEach((el) => { el.textContent = `v${APP.version}`; });
    root.replaceChildren(navigatie(), h('div', { class: 'scherm-kop' }, h('h1', { class: 'scherm-titel' }, TABS.find((t) => t.key === staat.tab).label), staat.titelExtra), ...inhoud.filter(Boolean));
    ctx.toonSchilInstellingen?.(schilGroep(staat));
    zorgVoorWeer(ctx, a);
  },
};
