// ============================================================================
// @openfate/bazi-engine — Public Entry Point
// ============================================================================

import { calculateTrueSolarTime } from '@openfate/true-solar-time';
import { Lunar } from 'lunar-javascript';

import { generatePillarsFromSolar, getStemInfo } from './core/pillars';
import { calculateDaYun } from './core/cycles';
import { detectInteractions } from './core/interactions';
import { BaziChart, BaziInput, SolarTimeInfo } from './types';

// Re-export all public types and constants
export * from './types';
export * from './constants';
export { detectInteractions } from './core/interactions';
export { generatePillarsFromSolar, getStemInfo, getMainQi } from './core/pillars';
export { calculateDaYun } from './core/cycles';

/**
 * calculateBaziChart
 *
 * The main entry point. Takes a birth configuration and returns a fully
 * calculated Bazi chart with Four Pillars, Da Yun cycles, and branch interactions.
 *
 * True Solar Time correction is applied automatically if longitude is provided.
 *
 * @example
 * ```typescript
 * const chart = calculateBaziChart({
 *   year: 1998, month: 12, day: 13, hour: 12, minute: 0,
 *   gender: 'female', longitude: 116.39, timezone: 8,
 * });
 *
 * console.log(chart.pillars.year.stem);   // '戊'
 * console.log(chart.pillars.year.branch); // '寅'
 * console.log(chart.daYun.cycles[0].ganZhi); // First major cycle
 * ```
 */
export function calculateBaziChart(input: BaziInput): BaziChart {
    let solarYear  = input.year;
    let solarMonth = input.month;
    let solarDay   = input.day;
    let solarHour  = input.hour;
    let solarMinute = input.minute ?? 0;
    let solarSecond = 0;
    let solarTimeInfo: SolarTimeInfo | null = null;

    // ── 1. Lunar → Solar Calendar Conversion ────────────────────────────────
    if (input.calendarType === 'lunar') {
        // lunar-javascript: negative month represents a leap month
        const lunarMonth = input.isLeapMonth ? -input.month : input.month;
        const lunar = Lunar.fromYmd(input.year, lunarMonth, input.day);
        const solar = lunar.getSolar();
        solarYear = solar.getYear();
        solarMonth = solar.getMonth();
        solarDay = solar.getDay();
    }

    // ── 2. True Solar Time Correction ───────────────────────────────────────
    const enableTST = (input.enableTrueSolarTime ?? true) &&
        input.longitude !== undefined && input.longitude !== null &&
        input.hour !== undefined;

    if (enableTST) {
        const detail = calculateTrueSolarTime({
            year: solarYear, month: solarMonth, day: solarDay,
            hour: solarHour!, minute: solarMinute,
            timeZoneOffset: input.timezone,
            dstOffset: input.dstOffset ?? 0,
            timeZoneId: input.timezoneId,
        }, {
            longitude: input.longitude!,
        });

        const [dateStr, timeStr] = detail.trueSolarDateTime.split(' ');
        const [yS, mS, dS] = dateStr.split('-');
        const [hS, minS, secS] = timeStr.split(':');

        solarYear   = parseInt(yS, 10);
        solarMonth  = parseInt(mS, 10);
        solarDay    = parseInt(dS, 10);
        solarHour   = parseInt(hS, 10);
        solarMinute = parseInt(minS, 10);
        solarSecond = parseInt(secS, 10);

        solarTimeInfo = {
            trueSolarTime: detail.trueSolarTime.substring(0, 5),
            trueSolarDateTime: detail.trueSolarDateTime,
            solarDate: dateStr,
            longitudeCorrectionMinutes: detail.longitudeCorrectionMinutes,
            equationOfTimeMinutes: detail.equationOfTimeMinutes,
            algorithm: detail.algorithm,
        };
    }

    // ── 3. Generate Four Pillars ─────────────────────────────────────────────
    const { pillars, eightChar, dayStem } = generatePillarsFromSolar(
        solarYear, solarMonth, solarDay,
        solarHour, solarMinute, solarSecond,
        input.dayBoundaryMode ?? 'MIDNIGHT_00'
    );

    // ── 4. Day Master ────────────────────────────────────────────────────────
    const dayMaster = getStemInfo(dayStem);

    // ── 5. Da Yun Cycles ─────────────────────────────────────────────────────
    const daYun = calculateDaYun(eightChar, input.gender, solarYear);

    // ── 6. Branch Interactions ───────────────────────────────────────────────
    const interactions = detectInteractions({
        year:  pillars.year.branch,
        month: pillars.month.branch,
        day:   pillars.day.branch,
        hour:  pillars.hour?.branch ?? '',
    });

    return { pillars, dayMaster, daYun, interactions, solarTimeInfo };
}
