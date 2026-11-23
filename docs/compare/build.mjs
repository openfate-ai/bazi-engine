import { readFile } from 'node:fs/promises';
import { build } from 'esbuild';

// Bind the link to the exact rule copy and Git revision included in the Pages artifact.
const source = await readFile('src/readings/relationship.ts', 'utf8');
const lines = {};
for (const [index, line] of source.split('\n').entries()) {
    const match = /^    '([a-z-]+)': \{$/.exec(line);
    if (match) lines[match[1]] = index + 1;
}
if (!Object.keys(lines).length) throw new Error('No relationship rule locations found');
const revision = process.env.GITHUB_SHA || 'main';
await build({
    entryPoints: ['docs/compare/app.ts'], outfile: 'docs/compare/app.js', bundle: true,
    minify: true, target: 'es2020', platform: 'browser', legalComments: 'eof',
    define: { __RULE_LINES__: JSON.stringify(lines), __REVISION__: JSON.stringify(revision) },
});
