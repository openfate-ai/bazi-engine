export const questions = Object.freeze({
  mixed: '哪一柱同時有六合與相沖？',
  gap: '四柱相同，起運日期相差多久？',
  boundary: '哪些時刻遇到交節，起運日期待定？',
});
export const roles = Object.freeze({ any: '任一柱', year: '年柱', month: '月柱', day: '日柱', hour: '時柱' });
const mixedBits = { any: 15, year: 1, month: 2, day: 4, hour: 8 };

export async function verifyIndex(manifest, bytes, subtle = globalThis.crypto.subtle) {
  if (manifest.format !== 1 || manifest.edition !== '2.1.0' || bytes.length !== manifest.totals.slots ||
      bytes.length * 2 !== manifest.records) throw Error('Index format or length mismatch');
  const hash = await subtle.digest('SHA-256', bytes);
  const hex = Array.from(new Uint8Array(hash), byte => byte.toString(16).padStart(2, '0')).join('');
  if (hex !== manifest.sha256) throw Error('Index checksum mismatch');
}

export function describeSlot(index, code) {
  const date = new Date(Date.UTC(1900, 0, 1 + Math.floor(index / 12))).toISOString().slice(0, 10);
  const hour = String(index % 12 * 2).padStart(2, '0') + ':30';
  const prefix = date + 'T' + hour + ':00+08:00/';
  const mixed = Object.keys(mixedBits).filter(key => key !== 'any' && (code & mixedBits[key]));
  const withheld = [];
  if (code & 32) withheld.push('female');
  if (code & 64) withheld.push('male');
  return { date, hour, femaleId: prefix + 'female', maleId: prefix + 'male', mixed, withheld };
}

export function searchIndex(manifest, bytes, { question = 'mixed', year = 'all', pillar = 'any', page = 1, size = 12 } = {}) {
  if (!Object.hasOwn(questions, question) || !Object.hasOwn(roles, pillar) ||
      (question !== 'mixed' && pillar !== 'any')) throw Error('Invalid pattern or pillar');
  const block = year === 'all' ? { offset: 0, slots: bytes.length } : manifest.years.find(v => String(v.year) === String(year));
  if (!block || !Number.isSafeInteger(page) || page < 1 || !Number.isInteger(size) || size < 1 || size > 100) {
    throw Error('Invalid year, page or page size');
  }
  const mask = question === 'mixed' ? mixedBits[pillar] : question === 'gap' ? 16 : 96;
  let total = 0;
  const results = [];
  const first = (page - 1) * size;
  for (let i = block.offset; i < block.offset + block.slots; i++) {
    if (!(bytes[i] & mask)) continue;
    if (total >= first && results.length < size) results.push(describeSlot(i, bytes[i]));
    total++;
  }
  const pages = Math.ceil(total / size);
  if (page > Math.max(1, pages)) throw Error('Page out of range');
  return { total, page, pages, results };
}
