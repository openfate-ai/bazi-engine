import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';
import { webcrypto } from 'node:crypto';
import { describeSlot, searchIndex, verifyIndex } from '../docs/library/search/patterns.mjs';
import { readCorpusSample } from '../dist/corpus.mjs';

const base = new URL('../docs/library/search/data/', import.meta.url);
const manifest = JSON.parse(await readFile(new URL('index.json', base)));
const bytes = await readFile(new URL(manifest.file, base));
const run = query => searchIndex(manifest, bytes, query);

test('artifact integrity, annual offsets, reserved bits, published counts and grid endpoints', async () => {
  await verifyIndex(manifest, bytes, webcrypto.subtle);
  const bad = Buffer.from(bytes); bad[0] ^= 1;
  await assert.rejects(verifyIndex(manifest, bad, webcrypto.subtle), /checksum/);
  assert.equal(manifest.years.length, 127);
  let end = 0;
  for (const y of manifest.years) {
    assert.equal(y.offset, end);
    for (const [question, count] of [['mixed',y.mixedSlots],['gap',y.gapPairs],['boundary',y.boundarySlots]]) {
      assert.equal(run({ year: y.year, question }).total, count);
    }
    end += y.slots;
  }
  assert.equal(end, bytes.length);
  assert.ok(bytes.every(v => v < 128));
  assert.equal(run({ question:'mixed' }).total, 75159);
  assert.equal(run({ question:'gap' }).total, 391676);
  assert.equal(run({ question:'boundary' }).total, 96);
  assert.equal(bytes.reduce((n,v) => n + Number(Boolean(v & 32)) + Number(Boolean(v & 64)), 0), 192);
  assert.equal(describeSlot(0,bytes[0]).femaleId,'1900-01-01T00:30:00+08:00/female');
  assert.equal(describeSlot(end-1,bytes[end-1]).maleId,'2026-11-22T22:30:00+08:00/male');
});

test('one independently selected pair per year agrees with frozen chart fields', () => {
  const pillars = ['year','month','day','hour'];
  for (const y of manifest.years) {
    const i = y.offset + (y.year * 17 % y.slots);
    const slot = describeSlot(i, bytes[i]);
    const f = readCorpusSample(slot.femaleId).chart, m = readCorpusSample(slot.maleId).chart;
    assert.equal(f.fourPillars, m.fourPillars);
    const mixed = pillars.filter(p => ['CLASH','COMBINATION_2'].every(type =>
      f.interactions.some(item => item.type === type && item.pillars.includes(p))));
    assert.deepEqual(slot.mixed, mixed);
    const starts = [f, m].map(c => c.daYun.startDate && Date.parse(c.daYun.startDate.slice(0,10) + 'T00:00:00Z'));
    assert.equal(Boolean(bytes[i] & 16), starts.every(v => v !== null) && Math.abs(starts[0]-starts[1]) >= 1096 * 86400000);
    assert.deepEqual(slot.withheld, [f,m].flatMap((c,n) => c.daYun.startDate === null ? [n === 0 ? 'female' : 'male'] : []));
  }
});

test('boundary case, empty year, pagination, pillar identity and invalid input', () => {
  const known = run({question:'boundary', year:1932});
  assert.equal(known.total,1);
  assert.equal(known.results[0].date,'1932-02-05');
  assert.deepEqual(known.results[0].withheld,['female','male']);
  const empty = manifest.years.find(y => !y.boundarySlots);
  assert.equal(run({question:'boundary',year:empty.year}).total,0);
  const query = {question:'mixed', year:1991, pillar:'hour', size:3};
  const first = run(query), next = run({...query,page:2});
  assert.ok(first.results.every(r=>r.mixed.includes('hour')));
  assert.equal(next.total,first.total);
  assert.ok(next.results[0].femaleId > first.results.at(-1).femaleId);
  for (const bad of [{year:2027}, {question:'__proto__'}, {pillar:'other'}, {question:'gap',pillar:'day'}, {size:0}, {page:0}, {question:'boundary',year:1932,page:2}]) {
    assert.throws(()=>run(bad));
  }
});
