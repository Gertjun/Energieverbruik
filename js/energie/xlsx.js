// Minimale .xlsx-lezer zonder externe library.
// Een .xlsx is een zip-bestand met XML. We lezen de zip-index, pakken de nodige
// bestanden uit met de ingebouwde DecompressionStream en halen de cellen uit de XML.
// Alleen waarden worden gelezen (bij formules de laatst berekende waarde).

const MAX_INPUT_BYTES = 25 * 1024 * 1024;
const MAX_ENTRIES = 200;
const MAX_ENTRY_BYTES = 20 * 1024 * 1024;
const MAX_TOTAL_BYTES = 50 * 1024 * 1024;
const MAX_XML_BYTES = 20 * 1024 * 1024;
const decoder = new TextDecoder('utf-8', { fatal: true });

function checkRange(view, offset, length, label) {
  if (!Number.isSafeInteger(offset) || !Number.isSafeInteger(length) ||
      offset < 0 || length < 0 || offset + length > view.byteLength) {
    throw new Error(`Ongeldige Excel: ${label} valt buiten het bestand.`);
  }
}
function u16(view, offset, label) { checkRange(view, offset, 2, label); return view.getUint16(offset, true); }
function u32(view, offset, label) { checkRange(view, offset, 4, label); return view.getUint32(offset, true); }

async function inflateBounded(bytes, limit) {
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
  const reader = stream.getReader();
  const chunks = [];
  let total = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > limit) {
        await reader.cancel();
        throw new Error('Excel bevat te veel uitgepakte gegevens.');
      }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const out = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) { out.set(chunk, offset); offset += chunk.byteLength; }
  return out;
}

async function leesZip(buffer) {
  if (!(buffer instanceof ArrayBuffer) || buffer.byteLength === 0 || buffer.byteLength > MAX_INPUT_BYTES) {
    throw new Error('Excel-bestand is leeg of groter dan 25 MB.');
  }
  const view = new DataView(buffer), bytes = new Uint8Array(buffer);
  let eocd = -1;
  const start = Math.max(0, buffer.byteLength - 65_557);
  for (let i = buffer.byteLength - 22; i >= start; i--) {
    if (u32(view, i, 'ZIP-einde') === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error('Dit is geen geldig Excel-bestand (.xlsx).');
  const disk = u16(view, eocd + 4, 'ZIP-einde');
  const cdDisk = u16(view, eocd + 6, 'ZIP-einde');
  const diskCount = u16(view, eocd + 8, 'ZIP-einde');
  const count = u16(view, eocd + 10, 'ZIP-einde');
  const cdSize = u32(view, eocd + 12, 'ZIP-einde');
  const cdOffset = u32(view, eocd + 16, 'ZIP-einde');
  const comment = u16(view, eocd + 20, 'ZIP-einde');
  checkRange(view, eocd, 22 + comment, 'ZIP-einde');
  if (disk || cdDisk || diskCount !== count || count === 0xffff || cdSize === 0xffffffff || cdOffset === 0xffffffff) {
    throw new Error('Dit ZIP-formaat wordt niet ondersteund (multi-disk/ZIP64).');
  }
  if (count > MAX_ENTRIES) throw new Error('Excel bevat te veel ZIP-onderdelen.');
  checkRange(view, cdOffset, cdSize, 'centrale ZIP-index');
  if (cdOffset + cdSize > eocd) throw new Error('Ongeldige ZIP-index.');
  const files = new Map();
  let p = cdOffset, total = 0;
  for (let n = 0; n < count; n++) {
    checkRange(view, p, 46, 'ZIP-index');
    if (u32(view, p, 'ZIP-index') !== 0x02014b50) throw new Error('Ongeldige ZIP-index.');
    const flags = u16(view, p + 8, 'ZIP-index'), method = u16(view, p + 10, 'ZIP-index');
    const comp = u32(view, p + 20, 'ZIP-index'), uncomp = u32(view, p + 24, 'ZIP-index');
    const nl = u16(view, p + 28, 'ZIP-index'), el = u16(view, p + 30, 'ZIP-index'), cl = u16(view, p + 32, 'ZIP-index');
    const local = u32(view, p + 42, 'ZIP-index'), len = 46 + nl + el + cl;
    checkRange(view, p, len, 'ZIP-index');
    if (flags & 1) throw new Error('Versleutelde Excel-bestanden worden niet ondersteund.');
    if (flags & ~0x800) throw new Error('ZIP gebruikt niet-ondersteunde flags.');
    if (flags & 8) throw new Error('ZIP-data-descriptors worden niet ondersteund.');
    if (method !== 0 && method !== 8) throw new Error('Niet-ondersteunde ZIP-compressiemethode.');
    if (comp === 0xffffffff || uncomp === 0xffffffff || local === 0xffffffff) throw new Error('ZIP64 wordt niet ondersteund.');
    if (uncomp > MAX_ENTRY_BYTES) throw new Error('Een Excel-onderdeel is te groot.');
    total += uncomp;
    if (total > MAX_TOTAL_BYTES) throw new Error('Excel bevat te veel uitgepakte gegevens.');
    const name = decoder.decode(bytes.subarray(p + 46, p + 46 + nl));
    if (!name || name.startsWith('/') || name.includes(String.fromCharCode(92)) || name.split('/').includes('..')) throw new Error('Ongeldige ZIP-bestandsnaam.');
    if (files.has(name)) throw new Error('Dubbele ZIP-onderdelen zijn niet toegestaan.');
    files.set(name, { method, comp, uncomp, local, flags });
    p += len;
  }
  if (p !== cdOffset + cdSize) throw new Error('ZIP-indexlengte klopt niet.');
  return {
    namen: [...files.keys()],
    async tekst(name) {
      const f = files.get(name);
      if (!f) return null;
      checkRange(view, f.local, 30, 'lokale ZIP-header');
      if (u32(view, f.local, 'lokale ZIP-header') !== 0x04034b50) throw new Error('Ongeldige lokale ZIP-header.');
      const flags = u16(view, f.local + 6, 'lokale ZIP-header'), method = u16(view, f.local + 8, 'lokale ZIP-header');
      const nl = u16(view, f.local + 26, 'lokale ZIP-header'), el = u16(view, f.local + 28, 'lokale ZIP-header');
      if (flags !== f.flags || (flags & ~0x800) !== 0 || method !== f.method) throw new Error('ZIP-header komt niet overeen met de index.');
      const dataStart = f.local + 30 + nl + el;
      checkRange(view, dataStart, f.comp, 'ZIP-data');
      const localName = decoder.decode(bytes.subarray(f.local + 30, f.local + 30 + nl));
      if (localName !== name) throw new Error('ZIP-bestandsnaam komt niet overeen.');
      const compressed = bytes.subarray(dataStart, dataStart + f.comp);
      const raw = f.method === 0 ? compressed : await inflateBounded(compressed, Math.min(MAX_ENTRY_BYTES, f.uncomp));
      if (raw.byteLength !== f.uncomp || raw.byteLength > MAX_XML_BYTES) throw new Error('ZIP-uitpaklengte is ongeldig.');
      const xml = decoder.decode(raw);
      if (/<!DOCTYPE|<!ENTITY/i.test(xml)) throw new Error('XML DTD/entities zijn niet toegestaan.');
      if (typeof DOMParser === 'function') {
        const document = new DOMParser().parseFromString(xml, 'application/xml');
        if (document.querySelector('parsererror')) throw new Error('Excel bevat ongeldige XML.');
      }
      return xml;
    },
  };
}
const entities = Object.freeze({ amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" });
const decode = (s) => s.replace(/&(#x[0-9a-f]+|#\\d+|[a-z]+);/gi, (m, entity) => {
  if (entity.startsWith('#')) {
    const cp = entity.toLowerCase().startsWith('#x') ? parseInt(entity.slice(2), 16) : Number(entity.slice(1));
    if (!Number.isInteger(cp) || cp < 1 || cp > 0x10ffff || (cp >= 0xd800 && cp <= 0xdfff)) {
      throw new Error('Excel bevat een ongeldige XML-entiteit.');
    }
    return String.fromCodePoint(cp);
  }
  if (!(entity in entities)) throw new Error('Excel bevat een niet-ondersteunde XML-entiteit.');
  return entities[entity];
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
  for (const r of rels.match(/<Relationship\b[^>]*>/g) || []) {
    if (attr(r, 'TargetMode') === 'External') throw new Error('Externe Excel-verwijzingen worden niet ondersteund.');
    const id = attr(r, 'Id'), target = attr(r, 'Target');
    if (!id || !target || target.includes('://') || target.includes(String.fromCharCode(92))) throw new Error('Excel bevat een ongeldige bladverwijzing.');
    relDoel.set(id, target);
  }
  const bladen = Object.create(null);
  for (const s of wb.match(/<sheet\b[^>]*>/g) || []) {
    const naam = decode(attr(s, 'name') || '');
    let doel = relDoel.get(attr(s, 'r:id'));
    if (!doel) continue;
    doel = doel.startsWith('/') ? doel.slice(1) : `xl/${doel}`;
    if (doel.split('/').some((part) => part === '..') || !doel.startsWith('xl/')) throw new Error('Excel bevat een ongeldige bladlocatie.');
    if (!naam || naam.length > 128 || Object.hasOwn(bladen, naam)) throw new Error('Excel bevat een ongeldige bladnaam.');
    const xml = await zip.tekst(doel);
    if (!xml) continue;
    const rijen = [];
    for (const rij of xml.match(/<row\b[\s\S]*?<\/row>/g) || []) {
      const rijNr = Number(attr(rij.slice(0, rij.indexOf('>') + 1), 'r')) - 1;
      if (!Number.isInteger(rijNr) || rijNr < 0 || rijNr >= 1_048_576) throw new Error('Excel bevat een ongeldige rijnummering.');
      const cellen = [];
      for (const c of rij.match(/<c\b[^>]*?(?:\/>|>[\s\S]*?<\/c>)/g) || []) {
        const open = c.slice(0, c.indexOf('>') + 1);
        const ref = attr(open, 'r');
        if (!ref) continue;
        const columnIndex = kolomIndex(ref);
        if (columnIndex < 0 || columnIndex >= 16_384) throw new Error('Excel bevat een ongeldige kolomverwijzing.');
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
        cellen[columnIndex] = waarde;
      }
      rijen[rijNr] = cellen;
    }
    bladen[naam] = rijen;
  }
  return bladen;
}
