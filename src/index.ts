// ============================================================================
// @openfate/bazi-engine — Public Entry Point
// ============================================================================

import { calculateTrueSolarTime } from '@openfate/true-solar-time';
import { Lunar, Solar } from 'lunar-javascript';

import { generatePillarsFromSolar, getStemInfo } from './core/pillars';
import { calculateDaYun } from './core/cycles';
import { detectInteractions } from './core/interactions';
import { BaziInputError, validateBaziInput } from './core/validation';
import { BaziChart, BaziInput, CalendarDateTime, LunarDateTime, SolarTimeInfo } from './types';

// Re-export all public types and constants
export * from './types';
export * from './constants';
export { detectInteractions } from './core/interactions';
export { generatePillarsFromSolar, getStemInfo, getMainQi } from './core/pillars';
export { calculateDaYun } from './core/cycles';
export { calculateTenGod } from './core/tenGods';
export { BaziInputError, validateBaziInput } from './core/validation';

function createDateTime(
    year: number,
    month: number,
    day: number,
    hour: number | undefined,
    minute: number | undefined,
    second: number | undefined,
): CalendarDateTime {
    const hasTime = hour !== undefined;
    return {
        year,
        month,
        day,
        hour: hasTime ? hour : null,
        minute: hasTime ? minute ?? 0 : null,
        second: hasTime ? second ?? 0 : null,
    };
}

function createLunarDateTime(solarDateTime: CalendarDateTime): { lunar: LunarDateTime; zodiac: string } {
    const solar = solarDateTime.hour === null
        ? Solar.fromYmd(solarDateTime.year, solarDateTime.month, solarDateTime.day)
        : Solar.fromYmdHms(
            solarDateTime.year,
            solarDateTime.month,
            solarDateTime.day,
            solarDateTime.hour,
            solarDateTime.minute,
            solarDateTime.second,
        );
    const lunar = solar.getLunar();
    const lunarMonth = lunar.getMonth();

    return {
        lunar: {
            year: lunar.getYear(),
            month: Math.abs(lunarMonth),
            day: lunar.getDay(),
            hour: solarDateTime.hour,
            minute: solarDateTime.minute,
            second: solarDateTime.second,
            isLeapMonth: lunarMonth < 0,
        },
        zodiac: lunar.getYearShengXiao(),
    };
}

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
    validateBaziInput(input);

    let solarYear  = input.year;
    let solarMonth = input.month;
    let solarDay   = input.day;
    let solarHour  = input.hour;
    let solarMinute = input.minute ?? 0;
    let solarSecond = 0;
    let solarTimeInfo: SolarTimeInfo | null = null;
    const inputType = input.calendarType ?? 'solar';

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

    const civilSolar = createDateTime(
        solarYear,
        solarMonth,
        solarDay,
        input.hour,
        input.hour === undefined ? undefined : solarMinute,
        input.hour === undefined ? undefined : solarSecond,
    );

    // ── 2. True Solar Time Correction ───────────────────────────────────────
    const enableTST = (input.enableTrueSolarTime ?? true) &&
        input.longitude !== undefined && input.longitude !== null &&
        input.hour !== undefined;

    if (enableTST) {
        const civilTimeInput = input.timezone !== undefined
            ? {
                year: solarYear,
                month: solarMonth,
                day: solarDay,
                hour: solarHour!,
                minute: solarMinute,
                timeZoneOffset: input.timezone,
                dstOffset: input.dstOffset ?? 0,
            }
            : {
                year: solarYear,
                month: solarMonth,
                day: solarDay,
                hour: solarHour!,
                minute: solarMinute,
                timeZoneId: input.timezoneId!,
            };
        const detail = calculateTrueSolarTime(civilTimeInput, {
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
            standardMeridian: detail.standardMeridian,
            longitudeCorrectionMinutes: detail.longitudeCorrectionMinutes,
            equationOfTimeMinutes: detail.equationOfTimeMinutes,
            algorithm: detail.algorithm,
        };
    } else if ((input.dstOffset ?? 0) !== 0 && input.hour !== undefined) {
        // ── 2b. DST normalization without True Solar Time ────────────────────
        // DST is a civil-clock correction, not a solar-time refinement: a birth
        // recorded at 15:20 during a DST period (e.g. China 1986–1991 summer,
        // Taiwan 1946–1961) actually occurred at 14:20 standard time. The TST
        // path above already subtracts dstOffset inside calculateTrueSolarTime;
        // when TST is disabled it must still be normalized out here, otherwise
        // the pillars use the shifted clock hour — a wrong 时辰, and near
        // midnight a wrong day pillar. Date-based math keeps day/month/year
        // rollover safe (lunar input was already converted to solar above).
        const shifted = new Date(Date.UTC(solarYear, solarMonth - 1, solarDay, solarHour!, solarMinute));
        shifted.setUTCMinutes(shifted.getUTCMinutes() - Math.round((input.dstOffset ?? 0) * 60));
        solarYear   = shifted.getUTCFullYear();
        solarMonth  = shifted.getUTCMonth() + 1;
        solarDay    = shifted.getUTCDate();
        solarHour   = shifted.getUTCHours();
        solarMinute = shifted.getUTCMinutes();
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

    const calculationSolar = createDateTime(
        solarYear,
        solarMonth,
        solarDay,
        input.hour === undefined ? undefined : solarHour,
        input.hour === undefined ? undefined : solarMinute,
        input.hour === undefined ? undefined : solarSecond,
    );
    const lunarCalendar = createLunarDateTime(calculationSolar);

    return {
        pillars,
        dayMaster,
        daYun,
        interactions,
        solarTimeInfo,
        calendar: {
            inputType,
            civilSolar,
            calculationSolar,
            lunar: lunarCalendar.lunar,
            zodiac: lunarCalendar.zodiac,
        },
        metadata: {
            trueSolarTimeApplied: enableTST,
            dayBoundaryMode: input.dayBoundaryMode ?? 'MIDNIGHT_00',
            longitude: input.longitude ?? null,
            timezoneBasis: input.timezone ?? input.timezoneId ?? null,
            dstOffset: input.dstOffset ?? 0,
        },
    };
}
