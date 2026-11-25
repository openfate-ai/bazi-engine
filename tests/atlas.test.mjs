import assert from 'node:assert/strict';
import { test } from 'node:test';
import { webcrypto } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { readCorpusSample, topicTitles, parseSampleId } from '../dist/corpus.mjs';
import { evaluate, rules, monthCount, relations } from '../docs/library/atlas/rules.mjs';
import { encode, extras, queryAtlas, slotStatus, verify, width } from '../docs/library/atlas/index-format.mjs';
import { readerHash } from '../docs/library/atlas/view.mjs';
import { describeSlot } from '../docs/library/search/patterns.mjs';
const directory = new URL('../docs/library/atlas/data/', import.meta.url);
const meta = JSON.parse(await readFile(new URL('index.json',directory)));
const bytes = await readFile(new URL(meta.file,directory));
const query = q => queryAtlas(meta,bytes,q);

test('fixed coverage, checksums, annual grid and independent example cases',async()=>{
  await verify(meta,bytes,webcrypto.subtle);
  const bad=Buffer.from(bytes); bad[1]^=1;
  await assert.rejects(verify(meta,bad,webcrypto.subtle),/checksum/i);
  const shifted=structuredClone(meta); shifted.years[2].offset++;
  await assert.rejects(verify(shifted,bytes),/grid/);
  assert.equal(meta.distinct,402736);
  assert.equal(rules.length,28);
  assert.equal(new Set(rules.map(r=>r.id)).size,rules.length);
  assert.equal(meta.rules.slice(0,monthCount).reduce((s,r)=>s+r.match.slots+r.review.slots,0),meta.slots);
  for (const [i,stats] of meta.rules.entries()) {
    for (const status of ['match','review']) {
      const ex = stats.examples[status];
      const sample = describeSlot(ex.slot,0);
      for (const id of [sample.femaleId,sample.maleId]) {
        const params = new URLSearchParams(readerHash(id).slice(1));
        assert.equal(params.get('id'),id); parseSampleId(params.get('id'));
        assert.ok(Object.hasOwn(topicTitles,params.get('chapter') ?? 'work'));
      }
      const chart = readCorpusSample(sample.femaleId).chart;
      assert.equal(chart.fourPillars,ex.pillars);
      const entry = evaluate(chart.fourPillars).entries[i];
      assert.equal(entry.status,status);
      assert.equal(slotStatus(bytes,ex.slot*width,i),status);
      const failed = entry.checks.filter(c=>!c.ok).length;
      assert.equal(failed,status==='match'?0:1);
      assert.equal(query({rule:stats.id,status}).total,stats[status].slots);
      assert.ok(stats[status].distinct>0 && stats[status].distinct<=stats[status].slots);
    }
  }
});

test('one chart per year reproduces flags from natal fields and both onset receipts',()=>{
  for (const y of meta.years) {
    const slot=y.offset+(y.year*13%y.slots);
    const hit=describeSlot(slot,0);
    const f=readCorpusSample(hit.femaleId).chart, m=readCorpusSample(hit.maleId).chart;
    const kinds = new Set(f.interactions.map(e=>e.type));
    const mask = Object.keys(relations).reduce((v,k,i)=>v+(kinds.has(k)?1<<i:0),0);
    let flags=0;
    for (const [i,r] of ['year','month','day','hour'].entries()) {
      if (['CLASH','COMBINATION_2'].every(k=>f.interactions.some(e=>e.type===k && e.pillars.includes(r)))) flags |= 1<<i;
    }
    const start=c=>c.daYun.startDate && Date.parse(c.daYun.startDate.slice(0,10)+'T00:00:00Z');
    if (start(f) !== null && start(m) !== null && Math.abs(start(f)-start(m)) >= 1096*86400000) flags |= 16;
    if (start(f) === null) flags|=32;
    if (start(m) === null) flags|=64;
    assert.deepEqual([...bytes.subarray(slot*width,(slot+1)*width)],[...encode(evaluate(f.fourPillars),mask,flags)]);
  }
});

test('month command, ambiguous exposure, Lu/Blade and hidden-only interference regressions',()=>{
  assert.equal(evaluate('庚子 戊寅 辛亥 甲午').selected,'甲');
  const both=evaluate('庚子 戊寅 辛亥 丙申');
  assert.equal(both.selected,'甲'); assert.equal(both.exposed,'丙戊');
  assert.equal(evaluate('甲子 丙寅 甲戌 丁卯').frame,'lu');
  assert.equal(evaluate('甲子 丁卯 甲戌 丙寅').frame,'blade');
  const evidence=evaluate(readCorpusSample('1900-01-07T02:30:00+08:00/female').chart.fourPillars);
  assert.equal(evidence.entries.find(r=>r.id==='follow-strength').status,'review');
  for (const s of ['甲子', '甲丑 甲子 甲子 甲子', '己亥 丙子 甲戌 甲子 extra']) assert.throws(()=>evaluate(s));
});

test('intersection, year and pagination retain slot identity and zero results',()=>{
  const r=query({rule:'officer',extra:'CLASH',size:1});
  assert.equal(r.total,10511);assert.equal(r.records,21022);
  const second=query({rule:'officer',extra:'CLASH',size:1,page:2});
  assert.ok(second.results[0].femaleId>r.results[0].femaleId);
  assert.equal(query({rule:'follow-power',extra:'boundary'}).total,0);
  for (const extra of Object.keys(extras)) assert.ok(query({rule:'lu',extra,year:1950}).total<=4380);
  for (const q of [{rule:'__proto__'},{extra:'constructor'},{year:2027},{status:'unknown'},{page:0},{size:101}]) assert.throws(()=>query(q));
});
