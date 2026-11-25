import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync, renameSync, mkdtempSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';

const source = process.argv[2];
if (!source) throw Error('Usage: node corpus/build-atlas.mjs EXTRACTED_FACTS [OUTPUT]');
const root = fileURLToPath(new URL('../docs/library/atlas/', import.meta.url));
const output = resolve(process.argv[3] ?? root);
const references = readFileSync(join(source, 'tables.json'), 'utf8');
const tableCode = '// Derived from every natal pair in the pinned corpus. See corpus/ATLAS.md.\nexport const references = ' + references.trim() + ';\n';
const previous = new URL('../docs/library/search/data/', import.meta.url);
const previousManifest = JSON.parse(readFileSync(new URL('index.json', previous)));
const previousBytes = readFileSync(new URL(previousManifest.file, previous));
const hash = data => createHash('sha256').update(data).digest('hex');
if (hash(previousBytes) !== previousManifest.sha256 || previousBytes.length !== previousManifest.totals.slots) throw Error('Pattern index mismatch');
const tmp = mkdtempSync(join(tmpdir(), 'openfate-atlas-'));
function publish(file, data) {
  writeFileSync(file + '.' + process.pid + '.tmp', data);
  renameSync(file + '.' + process.pid + '.tmp', file);
}
try {
  // Import the classifier with the freshly extracted tables, also on clean rebuilds.
  mkdirSync(join(tmp, 'atlas'));
  mkdirSync(join(tmp, 'search'));
  writeFileSync(join(tmp, 'atlas/references.mjs'), tableCode);
  for (const path of ['atlas/rules.mjs', 'atlas/index-format.mjs', 'search/patterns.mjs']) {
    writeFileSync(join(tmp, path), readFileSync(resolve(root, '..', path)));
  }
  const {rules, evaluate, profile} = await import(pathToFileURL(join(tmp, 'atlas/rules.mjs')));
  const {encode, width} = await import(pathToFileURL(join(tmp, 'atlas/index-format.mjs')));
  const stats = rules.map(r => ({id:r.id, match:{slots:0, distinct:0}, review:{slots:0, distinct:0}, examples:{}}));
  const bytes = Buffer.alloc(previousBytes.length * width);
  const seen = new Set(), years = [], examples = rules.map(() => ({}));
  let slot = 0;
  for (const year of previousManifest.years) {
    const lines = readFileSync(join(source, String(year.year)), 'utf8').trimEnd().split('\n');
    if (lines.length !== year.slots || year.offset !== slot) throw Error('Incorrect year grid');
    years.push({year:year.year, offset:slot, slots:lines.length});
    for (const line of lines) {
      const [pillars, rel, flag] = line.split('\t');
      if (Number(flag) !== previousBytes[slot]) throw Error('Existing index differs at '+slot);
      const assessment = evaluate(pillars);
      bytes.set(encode(assessment, Number(rel), Number(flag)), slot * width);
      const fresh = !seen.has(pillars);
      if (fresh) seen.add(pillars);
      for (const [i,e] of assessment.entries.entries()) {
        if (e.status === 'outside') continue;
        const bucket = stats[i][e.status];
        bucket.slots++;
        if (fresh) bucket.distinct++;
        const ex = examples[i];
        if (e.status === 'match' && !ex.match) ex.match = {slot, pillars};
        if (e.status === 'review') {
          // Prefer a real one-condition miss with the greatest number of identical pillars.
          const missed = e.checks.filter(c => !c.ok).length;
          const shared = ex.match ? pillars.split(' ').filter((p,j) => ex.match.pillars.split(' ')[j] === p).length : 0;
          const rank = (5-missed)*10 + shared;
          if (!ex.review || rank > ex.review.rank) ex.review = {slot, pillars, rank};
        }
      }
      slot++;
    }
  }
  if (slot !== previousBytes.length || seen.size !== 402736) throw Error('Unexpected corpus coverage');
  for (const [i, s] of stats.entries()) {
    for (const state of ['match','review']) {
      const ex = examples[i][state];
      if (ex) s.examples[state] = {slot:ex.slot, pillars:ex.pillars};
    }
  }
  const digest = hash(bytes);
  const manifest = { profile, edition:'2.1.0', width, slots:slot, records:slot*2, distinct:seen.size,
    coreManifestSha256:previousManifest.coreManifestSha256, sourcePatternSha256:previousManifest.sha256,
    file:'atlas-'+digest.slice(0,16)+'.bin', sha256:digest, ruleIds:rules.map(r=>r.id), years, rules:stats };
  mkdirSync(join(output,'data'), {recursive:true});
  publish(join(output,'references.mjs'), tableCode);
  publish(join(output,'data',manifest.file), bytes);
  publish(join(output,'data/index.json'), JSON.stringify(manifest,null,2)+'\n');
  console.log(JSON.stringify({records:manifest.records,distinct:seen.size,sha256:digest}));
} finally { rmSync(tmp, {recursive:true, force:true}); }
