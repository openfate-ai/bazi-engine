import { monthCount, profile, relations, rules } from './rules.mjs';
import { describeSlot } from '../search/patterns.mjs';

export const width = 7;
export const extras = { all:'全部條件', ...relations, mixed:'同柱六合與相沖', gap:'女男起運日期差至少 1,096 天', boundary:'交節起運待定' };
export function slotStatus(bytes, offset, ruleIndex) {
  if (ruleIndex < monthCount) return (bytes[offset] & 15) !== ruleIndex ? 'outside' :
    bytes[offset] & 16 ? 'match' : 'review';
  const i = ruleIndex - monthCount, bit = 1 << (i % 8), byte = i >> 3;
  if (bytes[offset+1+byte] & bit) return 'match';
  return bytes[offset+3+byte] & bit ? 'review' : 'outside';
}
export function encode(assessment, relationBits, previousFlags) {
  const frame = rules.findIndex(rule => rule.id === assessment.frame);
  const data = Uint8Array.of(frame, 0, 0, 0, 0, relationBits, previousFlags);
  for (const [i, e] of assessment.entries.entries()) {
    if (e.status === 'outside') continue;
    if (i < monthCount) {
      if (i !== frame) throw Error('Multiple monthly frames');
      if (e.status === 'match') data[0] |= 16;
    } else {
      const j = i - monthCount;
      data[(e.status === 'match' ? 1 : 3) + (j >> 3)] |= 1 << (j % 8);
    }
  }
  return data;
}
export async function verify(manifest, bytes, subtle = globalThis.crypto.subtle) {
  if (manifest.profile !== profile || manifest.width !== width || manifest.edition !== '2.1.0' ||
      manifest.slots !== 556164 || manifest.records !== 2 * manifest.slots ||
      bytes.length !== manifest.slots * width || manifest.ruleIds.join() !== rules.map(r => r.id).join()) throw Error('Unexpected atlas format');
  let offset = 0;
  if (manifest.years.length !== 127 || manifest.rules.length !== rules.length ||
      manifest.rules.some((s,i)=>s.id !== rules[i].id)) throw Error('Invalid atlas catalog');
  for (const [i,y] of manifest.years.entries()) {
    const year = 1900 + i;
    const end = year === 2026 ? Date.UTC(2026,10,23) : Date.UTC(year+1,0,1);
    const slots = (end-Date.UTC(year,0,1)) / 86400000 * 12;
    if (y.year !== year || y.offset !== offset || y.slots !== slots) throw Error('Invalid annual atlas grid');
    offset += slots;
  }
  if (offset !== manifest.slots) throw Error('Incomplete atlas grid');
  const digest = Array.from(new Uint8Array(await subtle.digest('SHA-256', bytes)), b => b.toString(16).padStart(2, '0')).join('');
  if (digest !== manifest.sha256) throw Error('Atlas checksum mismatch');
}
export function queryAtlas(manifest, bytes, {rule='officer', status='match', extra='all', year='all', page=1, size=12}={}) {
  const ri = rules.findIndex(r => r.id === rule);
  const block = year === 'all' ? {offset:0,slots:manifest.slots} : manifest.years.find(y => String(y.year) === String(year));
  if (ri < 0 || !block || !Object.hasOwn(extras, extra) || !['match','review'].includes(status) ||
      !Number.isSafeInteger(page) || page < 1 || !Number.isInteger(size) || size < 1 || size > 100) throw Error('Invalid atlas query');
  const ei = Object.keys(relations).indexOf(extra);
  const flag = {mixed:15, gap:16, boundary:96}[extra];
  const first = (page-1) * size, results = [];
  let total = 0;
  for (let slot=block.offset; slot < block.offset + block.slots; slot++) {
    const offset = slot * width;
    if (slotStatus(bytes, offset, ri) !== status ||
        (ei >= 0 && !(bytes[offset+5] & (1 << ei))) || (flag && !(bytes[offset+6] & flag))) continue;
    if (total >= first && results.length < size) results.push(describeSlot(slot, bytes[offset+6]));
    total++;
  }
  const pages = Math.ceil(total / size);
  if (page > Math.max(1, pages)) throw Error('Page out of range');
  return {total, records:total*2, page, pages, results};
}
