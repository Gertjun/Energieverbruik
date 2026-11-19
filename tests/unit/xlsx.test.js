import test from 'node:test';
import assert from 'node:assert/strict';
import { leesXlsx } from '../../js/energie/xlsx.js';

function zipStored(entries) {
  const chunks = [];
  const central = [];
  let offset = 0;
  const u16 = (n) => Buffer.from([n & 255, (n >>> 8) & 255]);
  const u32 = (n) => Buffer.from([n & 255, (n >>> 8) & 255, (n >>> 16) & 255, (n >>> 24) & 255]);
  for (const [name, content] of entries) {
    const nameBytes = Buffer.from(name);
    const data = Buffer.from(content);
    const local = Buffer.concat([
      u32(0x04034b50), u16(20), u16(0), u16(0), u16(0), u16(0),
      u32(0), u32(data.length), u32(data.length), u16(nameBytes.length), u16(0),
      nameBytes, data,
    ]);
    chunks.push(local);
    central.push(Buffer.concat([
      u32(0x02014b50), u16(20), u16(20), u16(0), u16(0), u16(0), u16(0),
      u32(0), u32(data.length), u32(data.length), u16(nameBytes.length), u16(0), u16(0),
      u16(0), u16(0), u32(0), u32(offset), nameBytes,
    ]));
    offset += local.length;
  }
  const cd = Buffer.concat(central);
  const eocd = Buffer.concat([
    u32(0x06054b50), u16(0), u16(0), u16(entries.length), u16(entries.length),
    u32(cd.length), u32(offset), u16(0),
  ]);
  return Uint8Array.from(Buffer.concat([...chunks, cd, eocd])).buffer;
}

const workbook = (sheetXml) => zipStored([
  ['xl/workbook.xml', '<workbook><sheets><sheet name="DATA" r:id="rId1"/></sheets></workbook>'],
  ['xl/_rels/workbook.xml.rels', '<Relationships><Relationship Id="rId1" Target="worksheets/sheet1.xml"/></Relationships>'],
  ['xl/worksheets/sheet1.xml', sheetXml],
]);

test('leest een eenvoudige XLSX en decodeert veilige XML-entiteiten', async () => {
  const result = await leesXlsx(workbook('<worksheet><sheetData><row r="1"><c r="A1" t="inlineStr"><is><t>Stroom &amp; gas</t></is></c><c r="B1"><v>123.5</v></c></row></sheetData></worksheet>'));
  assert.equal(result.DATA[0][0], 'Stroom & gas');
  assert.equal(result.DATA[0][1], 123.5);
});

test('weigert een bestand boven de inputlimiet', async () => {
  await assert.rejects(() => leesXlsx(new ArrayBuffer(25 * 1024 * 1024 + 1)), /25 MB/);
});

test('weigert ZIP met DTD/entity payload', async () => {
  await assert.rejects(() => leesXlsx(workbook('<!DOCTYPE x [<!ENTITY y "boom">]><worksheet/>')), /DTD|entities/);
});

test('weigert ZIP met dubbele entrynamen', async () => {
  const duplicate = zipStored([
    ['xl/workbook.xml', '<workbook/>'],
    ['xl/workbook.xml', '<workbook/>'],
  ]);
  await assert.rejects(() => leesXlsx(duplicate), /Dubbele ZIP/);
});

test('weigert een ongeldige ZIP-index', async () => {
  const invalid = new Uint8Array(zipStored([['xl/workbook.xml', '<workbook/>']]));
  // Maak de centrale directory-offset groter dan het bestand.
  const eocd = invalid.length - 22;
  invalid[eocd + 16] = 0xff;
  invalid[eocd + 17] = 0xff;
  invalid[eocd + 18] = 0xff;
  invalid[eocd + 19] = 0x7f;
  await assert.rejects(() => leesXlsx(invalid.buffer), /centrale ZIP-index/);
});
