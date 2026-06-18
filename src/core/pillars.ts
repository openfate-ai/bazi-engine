// ============================================================================
// @openfate/bazi-engine — Four Pillars Generator
// ============================================================================

import { Solar } from 'lunar-javascript';
import { FourPillars, Pillar, DayBoundaryMode, FiveElement, Polarity, StemInfo } from '../types';
import {
    BRANCH_HIDDEN_STEMS,
    BRANCH_TO_ELEMENT,
    STEM_TO_ELEMENT,
    STEM_TO_PINYIN,
    STEM_TO_POLARITY,
} from '../constants';

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
    getYearNaYin(): string;
    getYearShiShenGan(): string;
    getYearShiShenZhi(): string[];
    getYearDiShi(): string;
    getYearXun(): string;
    getYearXunKong(): string;
    getMonthNaYin(): string;
    getMonthShiShenGan(): string;
    getMonthShiShenZhi(): string[];
    getMonthDiShi(): string;
    getMonthXun(): string;
    getMonthXunKong(): string;
    getDayNaYin(): string;
    getDayShiShenGan(): string;
    getDayShiShenZhi(): string[];
    getDayDiShi(): string;
    getDayXun(): string;
    getDayXunKong(): string;
    getTimeNaYin(): string;
    getTimeShiShenGan(): string;
    getTimeShiShenZhi(): string[];
    getTimeDiShi(): string;
    getTimeXun(): string;
    getTimeXunKong(): string;
    getYun(gender: number): LunarYun;
}

/** Typed interface for the Yun (Luck Cycles) manager */
export interface LunarYun {
    isForward(): boolean;
    getStartYear(): number;
    getStartMonth(): number;
    getStartDay(): number;
    getStartHour(): number;
    getStartSolar(): LunarSolar;
    getDaYun(): LunarDaYun[];
}

export interface LunarSolar {
    toYmdHms(): string;
}

/** Typed interface for a single Da Yun period */
export interface LunarDaYun {
    getGanZhi(): string;
    getStartYear(): number;
    getEndYear(): number;
    getStartAge(): number;
    getEndAge(): number;
}

interface PillarDetails {
    stemTenGod: string;
    hiddenStemTenGods: string[];
    naYin: string;
    xun: string;
    voidBranches: string;
    growthStage: string;
}

function getRequiredElement(value: string, mapping: Record<string, FiveElement>, label: string): FiveElement {
    const result = mapping[value];
    if (!result) throw new Error(`Unsupported ${label}: ${value}`);
    return result;
}

function getRequiredPolarity(stem: string): Polarity {
    const polarity = STEM_TO_POLARITY[stem];
    if (!polarity) throw new Error(`Unsupported Heavenly Stem: ${stem}`);
    return polarity;
}

function buildPillar(stem: string, branch: string, details: PillarDetails): Pillar {
    const hiddenStemDefinitions = BRANCH_HIDDEN_STEMS[branch];
    if (!hiddenStemDefinitions) throw new Error(`Unsupported Earthly Branch: ${branch}`);

    return {
        stem,
        branch,
        element: getRequiredElement(stem, STEM_TO_ELEMENT, 'Heavenly Stem'),
        ganZhi: `${stem}${branch}`,
        stemPolarity: getRequiredPolarity(stem),
        stemTenGod: details.stemTenGod,
        branchElement: getRequiredElement(branch, BRANCH_TO_ELEMENT, 'Earthly Branch'),
        hiddenStems: hiddenStemDefinitions.map((hiddenStem, index) => ({
            stem: hiddenStem.stem,
            element: getRequiredElement(hiddenStem.stem, STEM_TO_ELEMENT, 'Hidden Stem'),
            polarity: getRequiredPolarity(hiddenStem.stem),
            tenGod: details.hiddenStemTenGods[index],
            isMain: Boolean(hiddenStem.isMain),
        })),
        naYin: details.naYin,
        xun: details.xun,
        voidBranches: details.voidBranches.split(''),
        growthStage: details.growthStage,
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
            year: buildPillar(eightChar.getYearGan(), eightChar.getYearZhi(), {
                stemTenGod: eightChar.getYearShiShenGan(),
                hiddenStemTenGods: eightChar.getYearShiShenZhi(),
                naYin: eightChar.getYearNaYin(),
                xun: eightChar.getYearXun(),
                voidBranches: eightChar.getYearXunKong(),
                growthStage: eightChar.getYearDiShi(),
            }),
            month: buildPillar(eightChar.getMonthGan(), eightChar.getMonthZhi(), {
                stemTenGod: eightChar.getMonthShiShenGan(),
                hiddenStemTenGods: eightChar.getMonthShiShenZhi(),
                naYin: eightChar.getMonthNaYin(),
                xun: eightChar.getMonthXun(),
                voidBranches: eightChar.getMonthXunKong(),
                growthStage: eightChar.getMonthDiShi(),
            }),
            day: buildPillar(dayStem, eightChar.getDayZhi(), {
                stemTenGod: eightChar.getDayShiShenGan(),
                hiddenStemTenGods: eightChar.getDayShiShenZhi(),
                naYin: eightChar.getDayNaYin(),
                xun: eightChar.getDayXun(),
                voidBranches: eightChar.getDayXunKong(),
                growthStage: eightChar.getDayDiShi(),
            }),
            hour: hasTime ? buildPillar(eightChar.getTimeGan(), eightChar.getTimeZhi(), {
                stemTenGod: eightChar.getTimeShiShenGan(),
                hiddenStemTenGods: eightChar.getTimeShiShenZhi(),
                naYin: eightChar.getTimeNaYin(),
                xun: eightChar.getTimeXun(),
                voidBranches: eightChar.getTimeXunKong(),
                growthStage: eightChar.getTimeDiShi(),
            }) : null,
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
export function getStemInfo(stem: string): StemInfo {
    return {
        char: stem,
        pinyin: STEM_TO_PINYIN[stem],
        element: getRequiredElement(stem, STEM_TO_ELEMENT, 'Heavenly Stem'),
        polarity: getRequiredPolarity(stem),
    };
}
