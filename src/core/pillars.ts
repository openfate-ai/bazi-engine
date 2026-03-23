// ============================================================================
// @openfate/bazi-engine — Four Pillars Generator
// ============================================================================

import { Solar } from 'lunar-javascript';
import { FourPillars, Pillar, DayBoundaryMode } from '../types';
import { STEM_TO_ELEMENT, STEM_TO_POLARITY, STEM_TO_PINYIN, BRANCH_HIDDEN_STEMS } from '../constants';

/** Typed interface for the EightChar object returned by lunar-javascript */
export interface LunarEightChar {
    setSect(sect: number): void;
    getYearGan(): string;
    getYearZhi(): string;
    getMonthGan(): string;
    getMonthZhi(): string;
    getDayGan(): string;
    getDayZhi(): string;
    getTimeGan(): string;
    getTimeZhi(): string;
    getYun(gender: number): LunarYun;
}

/** Typed interface for the Yun (Luck Cycles) manager */
export interface LunarYun {
    isForward(): boolean;
    getStartYear(): number;
    getStartMonth(): number;
    getStartDay(): number;
    getDaYun(): LunarDaYun[];
}

/** Typed interface for a single Da Yun period */
export interface LunarDaYun {
    getGanZhi(): string;
    getStartYear(): number;
    getEndYear(): number;
}


function buildPillar(stem: string, branch: string): Pillar {
    return {
        stem,
        branch,
        element: STEM_TO_ELEMENT[stem] ?? 'earth',
    };
}

export interface PillarResult {
    pillars: FourPillars;
    eightChar: LunarEightChar;
    dayStem: string;
}


/**
 * generatePillarsFromSolar
 *
 * Converts a solar datetime (post True Solar Time correction) into the Four Pillars.
 * Uses lunar-javascript for Solar Term (节气) boundary detection and pillar generation.
 *
 * @param year  - Solar year (after TST correction)
 * @param month - Solar month
 * @param day   - Solar day
 * @param hour  - Hour (0-23), undefined if birth time unknown
 * @param minute - Minute
 * @param second - Second
 * @param dayBoundaryMode - MIDNIGHT_00 (default) or ZI_HOUR_23 (traditional)
 */
export function generatePillarsFromSolar(
    year: number,
    month: number,
    day: number,
    hour?: number,
    minute?: number,
    second?: number,
    dayBoundaryMode: DayBoundaryMode = 'MIDNIGHT_00'
): PillarResult {
    const hasTime = hour !== undefined && hour !== null;
    const h = hasTime ? hour! : 0;
    const m = minute ?? 0;
    const s = second ?? 0;

    const solar = hasTime
        ? Solar.fromYmdHms(year, month, day, h, m, s)
        : Solar.fromYmd(year, month, day);

    const lunar = solar.getLunar();
    const eightChar = lunar.getEightChar() as LunarEightChar;


    // Sect 1 = Day shifts at 23:00 (traditional Zi Hour)
    // Sect 2 = Day shifts at 00:00 (midnight, modern default)
    eightChar.setSect(dayBoundaryMode === 'ZI_HOUR_23' ? 1 : 2);

    const dayStem = eightChar.getDayGan();

    return {
        pillars: {
            year:  buildPillar(eightChar.getYearGan(), eightChar.getYearZhi()),
            month: buildPillar(eightChar.getMonthGan(), eightChar.getMonthZhi()),
            day:   buildPillar(dayStem, eightChar.getDayZhi()),
            hour:  hasTime ? buildPillar(eightChar.getTimeGan(), eightChar.getTimeZhi()) : null,
        },
        eightChar,
        dayStem,
    };
}

/**
 * getMainQi - Returns the main hidden stem of a branch
 */
export function getMainQi(branch: string): string {
    const hidden = BRANCH_HIDDEN_STEMS[branch] ?? [];
    const main = hidden.find(h => h.isMain) ?? hidden[0];
    return main?.stem ?? '';
}

/**
 * getStemInfo - Returns enriched stem details
 */
export function getStemInfo(stem: string) {
    return {
        char: stem,
        pinyin: STEM_TO_PINYIN[stem] ?? '',
        element: STEM_TO_ELEMENT[stem] ?? 'earth',
        polarity: STEM_TO_POLARITY[stem] ?? 'yang',
    };
}
