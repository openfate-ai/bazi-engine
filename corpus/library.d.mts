import type { BaziChart } from './index.js';
export const corpusEdition: '2.1.0';
export const firstDate: '1900-01-01';
export const lastDate: '2026-11-22';
export type CorpusTopic = 'temperament' | 'work' | 'money' | 'love' | 'family' | 'friends' |
  'home' | 'change' | 'learning' | 'care' | 'rest' | 'voice' | 'direction';
export const corpusTopics: readonly CorpusTopic[];
export const topicTitles: Readonly<Record<CorpusTopic, string>>;
export interface ChapterPart {
  name: string; text: string; ref: string[]; caseSignal?: string; side?: boolean;
}
export interface CorpusChapter { title: string; parts: ChapterPart[]; evidence: string[] }
export interface CorpusChart {
  id: string; fourPillars: string; dayMaster: string; trueSolarDateTime: string;
  pillars: BaziChart['pillars']; interactions: BaziChart['interactions']; lunar: BaziChart['calendar']['lunar'];
  daYun: { isForward: boolean | null; startDate: string | null; timing: BaziChart['daYun']['timing']; cycles: BaziChart['daYun']['cycles'] };
}
export function parseSampleId(id: string): { year: number; month: number; day: number; hour: number; minute: 30; second: 0; gender: 'female' | 'male' };
export function readCorpusSample(id: string): { edition: string; chart: CorpusChart; chapters: Record<CorpusTopic, CorpusChapter> };
export function readCorpusChapter(id: string, topic: CorpusTopic): { edition: string; chart: CorpusChart; topic: CorpusTopic; chapter: CorpusChapter };
