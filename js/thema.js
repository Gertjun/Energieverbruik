// Kleurthema en licht/donker. Gewoon script (geen module) in <head>, zodat het thema al staat
// voordat de pagina getekend wordt (geen flits). Keuze per apparaat in localStorage.
// De kleuren zelf staan in css/app.css ([data-thema="…"]); hier alleen de lijst en het toepassen.
(function () {
  var KEY = 'energieverbruik:weergave';
  var THEMAS = [
    ['groenblauw', 'Groenblauw'],
    ['blauw', 'Blauw'],
    ['groen', 'Groen'],
    ['paars', 'Paars'],
    ['framboos', 'Framboos'],
    ['grafiet', 'Grafiet'],
  ];
  var MODI = [['auto', 'Automatisch'], ['licht', 'Licht'], ['donker', 'Donker'], ['zwart', 'Zwart']];

  function lees() {
    var w = {};
    try { w = JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { /* geen opslag */ }
    return {
      thema: THEMAS.some(function (t) { return t[0] === w.thema; }) ? w.thema : 'groenblauw',
      modus: MODI.some(function (m) { return m[0] === w.modus; }) ? w.modus : 'auto',
    };
  }

  // Kleur van de statusbalk (iPhone) / titelbalk gelijk aan de achtergrond van de app.
  function statusbalk() {
    if (!document.body) return;
    var kleur = getComputedStyle(document.body).backgroundColor;
    // De browser geeft de kleur soms als oklab(…); via een canvas van 1 pixel wordt het gewone rgb.
    try {
      var c = document.createElement('canvas'); c.width = c.height = 1;
      var g = c.getContext('2d'); g.fillStyle = kleur; g.fillRect(0, 0, 1, 1);
      var d = g.getImageData(0, 0, 1, 1).data;
      kleur = 'rgb(' + d[0] + ', ' + d[1] + ', ' + d[2] + ')';
    } catch (e) { /* dan de oorspronkelijke waarde */ }
    var metas = document.querySelectorAll('meta[name="theme-color"]');
    for (var i = 0; i < metas.length; i++) metas[i].setAttribute('content', kleur);
  }

  function pasToe(w) {
    var root = document.documentElement;
    root.setAttribute('data-thema', w.thema);
    if (w.modus === 'auto') root.removeAttribute('data-modus');
    else root.setAttribute('data-modus', w.modus);
    statusbalk();
  }

  function zet(wijziging) {
    var w = lees();
    if (wijziging.thema) w.thema = wijziging.thema;
    if (wijziging.modus) w.modus = wijziging.modus;
    try { localStorage.setItem(KEY, JSON.stringify(w)); } catch (e) { /* geen opslag */ }
    pasToe(w);
  }

  pasToe(lees());
  document.addEventListener('DOMContentLoaded', statusbalk);
  if (window.matchMedia) {
    var mq = window.matchMedia('(prefers-color-scheme: dark)');
    if (mq.addEventListener) mq.addEventListener('change', statusbalk);
  }

  window.EnergieThema = { THEMAS: THEMAS, MODI: MODI, lees: lees, zet: zet };
})();
