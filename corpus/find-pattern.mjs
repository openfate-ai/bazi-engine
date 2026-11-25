#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { webcrypto } from 'node:crypto';
import { parseArgs } from 'node:util';
import { searchIndex, verifyIndex } from '../docs/library/search/patterns.mjs';

try {
  const { values, positionals } = parseArgs({ allowPositionals: true, options: {
    year: { type: 'string', default: 'all' }, pillar: { type: 'string', default: 'any' },
    page: { type: 'string', default: '1' }, size: { type: 'string', default: '12' },
  } });
  if (positionals.length !== 1) throw Error('Usage: node corpus/find-pattern.mjs mixed|gap|boundary [--year 1991] [--pillar hour] [--page 1] [--size 12]');
  const base = new URL('../docs/library/search/data/', import.meta.url);
  const manifest = JSON.parse(await readFile(new URL('index.json', base), 'utf8'));
  const bytes = await readFile(new URL(manifest.file, base));
  await verifyIndex(manifest, bytes, webcrypto.subtle);
  const query = { question: positionals[0], year: values.year, pillar: values.pillar, page: Number(values.page), size: Number(values.size) };
  const result = searchIndex(manifest, bytes, query);
  console.log(JSON.stringify({ edition: manifest.edition, unit: 'representative birth slots', ...query, ...result }, null, 2));
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
