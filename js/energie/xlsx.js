// Minimale .xlsx-lezer zonder externe library.
// Een .xlsx is een zip-bestand met XML. We lezen de zip-index, pakken de nodige
// bestanden uit met de ingebouwde DecompressionStream en halen de cellen uit de XML.
// Alleen waarden worden gelezen (bij formules de laatst berekende waarde).

async function inflate(bytes) {
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function leesZip(buffer) {
  const view = new DataView(buffer);
  const bytes = new Uint8Array(buffer);
  // Einde van de centrale index zoeken.
  let eocd = -1;
  for (let i = buffer.byteLength - 22; i >= Math.max(0, buffer.byteLength - 66_000); i--) {
    if (view.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error('Dit is geen geldig Excel-bestand (.xlsx).');
  const aantal = view.getUint16(eocd + 10, true);
  let p = view.getUint32(eocd + 16, true);
  const dec = new TextDecoder();
  const bestanden = new Map();
  for (let n = 0; n < aantal; n++) {
    if (view.getUint32(p, true) !== 0x02014b50) break;
    const methode = view.getUint16(p + 10, true);
    const compSize = view.getUint32(p + 20, true);
    const naamLen = view.getUint16(p + 28, true);
    const extraLen = view.getUint16(p + 30, true);
    const commentLen = view.getUint16(p + 32, true);
    const offset = view.getUint32(p + 42, true);
    const naam = dec.decode(bytes.subarray(p + 46, p + 46 + naamLen));
    bestanden.set(naam, { methode, compSize, offset });
    p += 46 + naamLen + extraLen + commentLen;
  }
  return {
    namen: [...bestanden.keys()],
    async tekst(naam) {
      const f = bestanden.get(naam);
      if (!f) return null;
      const lnaam = view.getUint16(f.offset + 26, true);
      const lextra = view.getUint16(f.offset + 28, true);
      const start = f.offset + 30 + lnaam + lextra;
      const data = bytes.subarray(start, start + f.compSize);
      const raw = f.methode === 0 ? data : await inflate(data);
      return dec.decode(raw);
    },
  };
}

const entities = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };
const decode = (s) => s.replace(/&(#x?[0-9a-f]+|\w+);/gi, (m, e) => {
  if (e[0] === '#') return String.fromCodePoint(e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : Number(e.slice(1)));
  return entities[e] ?? m;
});
const attr = (tag, naam) => (tag.match(new RegExp(`\\s${naam}="([^"]*)"`)) || [])[1];

function kolomIndex(ref) {
  const letters = ref.match(/^[A-Z]+/)[0];
  let n = 0;
  for (const c of letters) n = n * 26 + (c.charCodeAt(0) - 64);
  return n - 1;
}

/**
 * Leest een .xlsx (ArrayBuffer). Geeft { bladnaam: rijen[][] } met per cel
 * een getal, tekst of null.
 */
export async function leesXlsx(buffer) {
  const zip = await leesZip(buffer);
  const shared = [];
  const sst = await zip.tekst('xl/sharedStrings.xml');
  if (sst) {
    for (const si of sst.match(/<si>[\s\S]*?<\/si>/g) || []) {
      shared.push(decode((si.match(/<t[^>]*>[\s\S]*?<\/t>/g) || []).map((t) => t.replace(/<[^>]+>/g, '')).join('')));
    }
  }
  const wb = await zip.tekst('xl/workbook.xml');
  const rels = await zip.tekst('xl/_rels/workbook.xml.rels');
  if (!wb || !rels) throw new Error('Dit is geen geldig Excel-bestand (.xlsx).');
  const relDoel = new Map();
  for (const r of rels.match(/<Relationship\b[^>]*>/g) || []) relDoel.set(attr(r, 'Id'), attr(r, 'Target'));

  const bladen = {};
  for (const s of wb.match(/<sheet\b[^>]*>/g) || []) {
    const naam = decode(attr(s, 'name') || '');
    let doel = relDoel.get(attr(s, 'r:id'));
    if (!doel) continue;
    doel = doel.startsWith('/') ? doel.slice(1) : `xl/${doel}`;
    const xml = await zip.tekst(doel);
    if (!xml) continue;
    const rijen = [];
    for (const rij of xml.match(/<row\b[\s\S]*?<\/row>/g) || []) {
      const rijNr = Number(attr(rij.slice(0, rij.indexOf('>') + 1), 'r')) - 1;
      const cellen = [];
      for (const c of rij.match(/<c\b[^>]*?(?:\/>|>[\s\S]*?<\/c>)/g) || []) {
        const open = c.slice(0, c.indexOf('>') + 1);
        const ref = attr(open, 'r');
        if (!ref) continue;
        const type = attr(open, 't');
        let waarde = null;
        const v = c.match(/<v>([\s\S]*?)<\/v>/);
        if (type === 'inlineStr') waarde = decode((c.match(/<t[^>]*>([\s\S]*?)<\/t>/) || [])[1] || '');
        else if (v) {
          if (type === 's') waarde = shared[Number(v[1])] ?? null;
          else if (type === 'str' || type === 'e') waarde = decode(v[1]);
          else if (type === 'b') waarde = v[1] === '1';
          else waarde = Number(v[1]);
        }
        cellen[kolomIndex(ref)] = waarde;
      }
      rijen[rijNr] = cellen;
    }
    bladen[naam] = rijen;
  }
  return bladen;
}
