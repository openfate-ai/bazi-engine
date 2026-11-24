import { calculate } from './facts.mjs';
import { lifeBook } from './book.mjs';
import { chapters } from './chapters.mjs';

export const corpusEdition = '2.1.0';
export const corpusTopics = Object.freeze(Object.keys(chapters));
export const firstDate = '1900-01-01';
export const lastDate = '2026-11-22';
export const topicTitles = Object.freeze(Object.fromEntries(
  Object.entries(chapters).map(([key, spec]) => [key, spec.title])
));

export function parseSampleId(id) {
  const match = typeof id === 'string' && /^(\d{4}-\d{2}-\d{2})T(\d{2}):30:00\+08:00\/(female|male)$/.exec(id);
  if (!match || match[0] !== id) throw new RangeError('Use YYYY-MM-DDTHH:30:00+08:00/female or /male.');
  const [, date, clock, gender] = match;
  const [year, month, day] = date.split('-').map(Number);
  const hour = Number(clock);
  if (date < firstDate || date > lastDate || hour > 22 || hour % 2 ||
      new Date(Date.UTC(year, month - 1, day)).toISOString().slice(0, 10) !== date) {
    throw new RangeError('Outside the corpus grid: 1900-01-01 through 2026-11-22, even hours at :30, UTC+08:00.');
  }
  return { year, month, day, hour, minute: 30, second: 0, gender };
}

export function readCorpusSample(id) {
  const chart = calculate(parseSampleId(id));
  return { edition: corpusEdition, chart, chapters: lifeBook(chart) };
}

export function readCorpusChapter(id, topic) {
  if (!corpusTopics.includes(topic)) throw new RangeError('Unknown corpus chapter: ' + topic);
  const { edition, chart, chapters: book } = readCorpusSample(id);
  return { edition, chart, topic, chapter: book[topic] };
}
