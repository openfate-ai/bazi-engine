import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { corpusTopics, parseSampleId, readCorpusSample, readCorpusChapter } from '../dist/corpus.mjs';

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])]));
  }
  return value;
}

test('all chapters and referenced fields agree with edition v2.1.0 samples in every published year', async () => {
  const fixtures = JSON.parse(await readFile(new URL('./fixtures/corpus-v2.1.0.json', import.meta.url)));
  assert.equal(new Set(Object.keys(fixtures).map(id => id.slice(0, 4))).size, 127);
  assert.equal(corpusTopics.length, 13);
  for (const [id, expected] of Object.entries(fixtures)) {
    const { chart, chapters } = readCorpusSample(id);
    assert.equal(chart.id, id);
    assert.equal(chart.fourPillars, expected.fourPillars, id);
    assert.equal(chart.daYun.startDate, expected.startDate, id);
    assert.deepEqual(Object.keys(chapters), corpusTopics);
    const digest = createHash('sha256').update(JSON.stringify(canonical(chapters))).digest('hex');
    assert.equal(digest, expected.chapters, id);
    for (const chapter of Object.values(chapters)) {
      for (const path of new Set([...chapter.evidence, ...chapter.parts.flatMap(part => part.ref)])) {
        assert.notEqual(path.slice(1).split('/').reduce((v,k) => v?.[k], chart), undefined, id + path);
      }
    }
  }
});

test('invalid calendar dates, non-grid clocks and unknown topics are rejected', () => {
  const suffix = 'T00:30:00+08:00/female';
  for (const day of ['1899-12-31','2026-11-23','1900-02-29','2001-02-29','2000-04-31','2026-00-01']) {
    assert.throws(() => parseSampleId(day + suffix), RangeError);
  }
  const id = '2000-02-29' + suffix;
  for (const changed of [id.replace('T00:', 'T01:'), id.replace('T00:', 'T24:'), id.replace(':30:', ':59:'), id.replace('+08', '+09'), id + '\n', id.replace('female','unknown')]) {
    assert.throws(() => parseSampleId(changed), RangeError);
  }
  assert.equal(readCorpusChapter(id, 'work').topic, 'work');
  for (const key of ['__proto__','constructor','career']) assert.throws(() => readCorpusChapter(id,key),RangeError);
  assert.equal(readCorpusSample('1932-02-05T08:30:00+08:00/female').chart.daYun.startDate,null);
});
