import { build } from 'esbuild';
import { copyFile, mkdir, readFile } from 'node:fs/promises';

// The corpus was published with engine 2.0.0. Keep its calculation independent of SDK upgrades.
const target = process.argv[2];
if (!['sdk', 'pages'].includes(target)) throw Error('Use sdk or pages');
const directory = target === 'sdk' ? 'dist' : 'docs/library';
await mkdir(directory, { recursive: true });
const notices = await Promise.all(['corpus-engine-v2', 'lunar-javascript'].map(async name =>
  readFile('node_modules/' + name + '/LICENSE', 'utf8')));
const attribution = 'OpenFate Bazi Corpus v2.1.0 · CC BY 4.0 · https://creativecommons.org/licenses/by/4.0/';
await build({
  banner: { js: '/*! ' + [attribution, ...notices].join('\n') + ' */' },
  entryPoints: ['corpus/library.mjs'], outfile: directory + '/corpus.mjs',
  bundle: true, format: 'esm', platform: 'browser', minify: true, target: 'es2020',
  alias: { '@openfate/bazi-engine': 'corpus-engine-v2' }, legalComments: 'eof',
});
if (target === 'sdk') await copyFile('corpus/library.d.mts', directory + '/corpus.d.mts');
