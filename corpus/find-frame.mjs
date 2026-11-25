import { readFile } from 'node:fs/promises';
import { queryAtlas, verify } from '../docs/library/atlas/index-format.mjs';
const [rule, ...options] = process.argv.slice(2);
try {
  if (!rule || options.length % 2) throw Error('Usage: node corpus/find-frame.mjs RULE [--status match|review] [--extra CLASH|gap|...] [--year YYYY] [--page N] [--size N]');
  const query = {rule};
  for (let i=0; i<options.length; i+=2) {
    const key = options[i].slice(2);
    if (!options[i].startsWith('--') || !['status','extra','year','page','size'].includes(key) ||
        Object.hasOwn(query,key)) throw Error('Unknown or repeated option: '+options[i]);
    query[key] = ['page','size'].includes(key) ? Number(options[i+1]) : options[i+1];
  }
  const base = new URL('../docs/library/atlas/data/', import.meta.url);
  const manifest = JSON.parse(await readFile(new URL('index.json', base)));
  const bytes = await readFile(new URL(manifest.file, base));
  await verify(manifest,bytes);
  console.log(JSON.stringify(queryAtlas(manifest,bytes,query),null,2));
} catch (e) { console.error(e.message); process.exitCode=1; }
