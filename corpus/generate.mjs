import { join } from 'node:path';
import { calculate, afterLastDay, firstDay, inputs, rowId } from './facts.mjs';
import { readGzipLines, writeGzipLines } from './io.mjs';

const [stage, yearText, directory, destination, ...extra] = process.argv.slice(2);
const year = Number(yearText);
if (!['facts','readings'].includes(stage) || !Number.isInteger(year) || year < 1900 || year > 2026 ||
    !directory || (stage === 'readings') !== Boolean(destination) || extra.length) {
  throw new Error('Usage: node generate.mjs facts YEAR CACHE | readings YEAR CACHE DATA');
}
const filename = year + '.jsonl.gz';
const expected = (afterLastDay(year) - firstDay(year)) / 86400000 * 24;
function* calculatedRows() {
  for (const input of inputs(year)) yield calculate(input);
}
async function* interpretedRows() {
  const { interpret } = await import('./readings.mjs');
  const keys = inputs(year);
  for await (const facts of readGzipLines(join(directory, filename))) {
    const next = keys.next();
    if (next.done || facts.id !== rowId(next.value)) throw new Error('Invalid cached row ' + facts.id);
    yield { ...facts, ...interpret(facts) };
  }
}
await writeGzipLines(join(destination || directory, filename), stage === 'facts' ? calculatedRows() : interpretedRows(), expected);
console.log(stage, year, expected);
