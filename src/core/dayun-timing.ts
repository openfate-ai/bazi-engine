// ============================================================================
// @openfate/bazi-engine — Versioned, second-resolved Da Yun onset
// ============================================================================

import { resolveCivilTime } from '@openfate/true-solar-time';
import { Solar } from 'lunar-javascript';

import {
    CalculatedDaYunTimingReceipt,
    DaYunInfo,
    DaYunTimingUnavailableReason,
    UnavailableDaYunTimingReceipt,
} from '../types';

export interface DaYunCivilDateTime {
    year: number;
    month: number;
    day: number;
    hour: number;
    minute: number;
    second: number;
}

export interface DaYunOffset {
    years: number;
    months: number;
    days: number;
    hours: number;
    sourceRemainderSeconds: number;
}

interface BirthInstant {
    utcSeconds: number;
    offsetSeconds: number;
    timezoneSource: 'NUMERIC_OFFSET' | 'IANA';
    timezoneBasis: number | string;
    timezoneDatabase: 'HOST_INTL' | 'NOT_APPLICABLE';
}

export interface JieInterval {
    jieName: string;
    jieUtc: string;
    intervalSeconds: number;
}

interface SolarTermLike {
    getName(): string;
    getSolar(): {
        getYear(): number;
        getMonth(): number;
        getDay(): number;
        getHour(): number;
        getMinute(): number;
        getSecond(): number;
    };
}

interface LunarTermProviderLike {
    getYearInGanZhiExact(): string;
    getMonthInGanZhiExact(): string;
    getNextJie(wholeDay: boolean): SolarTermLike | null;
    getPrevJie(wholeDay: boolean): SolarTermLike | null;
}

const TERM_OFFSET_SECONDS = 8 * 60 * 60;
const SECONDS_PER_SYMBOLIC_YEAR = 3 * 24 * 60 * 60;
const SECONDS_PER_SYMBOLIC_MONTH = 6 * 60 * 60;
const SECONDS_PER_SYMBOLIC_DAY = 12 * 60;
const SECONDS_PER_SYMBOLIC_HOUR = 30;

function pad(value: number, length = 2): string {
    return String(value).padStart(length, '0');
}

function civilEpochSeconds(civil: DaYunCivilDateTime): number | null {
    const fields = [civil.year, civil.month, civil.day, civil.hour, civil.minute, civil.second];
    if (!fields.every(Number.isInteger) || civil.year < 1 || civil.year > 9999) return null;
    const date = new Date(0);
    date.setUTCFullYear(civil.year, civil.month - 1, civil.day);
    date.setUTCHours(civil.hour, civil.minute, civil.second, 0);
    if (!Number.isFinite(date.getTime())
        || date.getUTCFullYear() !== civil.year
        || date.getUTCMonth() !== civil.month - 1
        || date.getUTCDate() !== civil.day
        || date.getUTCHours() !== civil.hour
        || date.getUTCMinutes() !== civil.minute
        || date.getUTCSeconds() !== civil.second) return null;
    return date.getTime() / 1000;
}

function civilFromEpochSeconds(seconds: number): DaYunCivilDateTime | null {
    if (!Number.isSafeInteger(seconds)) return null;
    const date = new Date(seconds * 1000);
    if (!Number.isFinite(date.getTime())) return null;
    return {
        year: date.getUTCFullYear(),
        month: date.getUTCMonth() + 1,
        day: date.getUTCDate(),
        hour: date.getUTCHours(),
        minute: date.getUTCMinutes(),
        second: date.getUTCSeconds(),
    };
}

function formatCivil(civil: DaYunCivilDateTime): string {
    return `${pad(civil.year, 4)}-${pad(civil.month)}-${pad(civil.day)} `
        + `${pad(civil.hour)}:${pad(civil.minute)}:${pad(civil.second)}`;
}

function formatUtc(seconds: number): string | null {
    const civil = civilFromEpochSeconds(seconds);
    return civil ? `${formatCivil(civil).replace(' ', 'T')}Z` : null;
}

function unavailableReceipt(
    reason: DaYunTimingUnavailableReason,
    timezoneBasis: number | string | null,
): UnavailableDaYunTimingReceipt {
    return {
        status: 'UNAVAILABLE',
        version: 'DAYUN_SECOND_V2',
        reason,
        fallbackVersion: 'LEGACY_SHICHEN_V1',
        timezoneSource: typeof timezoneBasis === 'number'
            ? 'NUMERIC_OFFSET'
            : typeof timezoneBasis === 'string' ? 'IANA' : 'MISSING',
        timezoneBasis,
        timezoneDatabase: typeof timezoneBasis === 'string' ? 'HOST_INTL' : 'NOT_APPLICABLE',
        disambiguation: 'REJECT',
    };
}

export function retainLegacyDaYun(
    legacy: DaYunInfo,
    reason: DaYunTimingUnavailableReason,
    timezoneBasis: number | string | null,
): DaYunInfo {
    return { ...legacy, timing: unavailableReceipt(reason, timezoneBasis) };
}

function resolveBirthInstant(
    civil: DaYunCivilDateTime,
    timezoneBasis: number | string | null,
    dstOffset: number,
): BirthInstant | DaYunTimingUnavailableReason {
    const clockSeconds = civilEpochSeconds(civil);
    if (clockSeconds === null) return 'TERM_LOOKUP_UNAVAILABLE';
    if (timezoneBasis === null) return 'MISSING_TIMEZONE';

    if (typeof timezoneBasis === 'number') {
        const offsetSeconds = (timezoneBasis + dstOffset) * 60 * 60;
        if (!Number.isSafeInteger(offsetSeconds)) return 'INVALID_TIMEZONE';
        return {
            utcSeconds: clockSeconds - offsetSeconds,
            offsetSeconds,
            timezoneSource: 'NUMERIC_OFFSET',
            timezoneBasis,
            timezoneDatabase: 'NOT_APPLICABLE',
        };
    }

    try {
        const resolved = resolveCivilTime({
            ...civil,
            timeZoneId: timezoneBasis,
            disambiguation: 'reject',
        });
        if (!Number.isSafeInteger(resolved.utcTimestamp / 1000)
            || !Number.isSafeInteger(resolved.totalOffsetMinutes * 60)) return 'INVALID_TIMEZONE';
        return {
            utcSeconds: resolved.utcTimestamp / 1000,
            offsetSeconds: resolved.totalOffsetMinutes * 60,
            timezoneSource: 'IANA',
            timezoneBasis,
            timezoneDatabase: 'HOST_INTL',
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : '';
        if (message.includes('ambiguous')) return 'AMBIGUOUS_CIVIL_TIME';
        if (message.includes('does not exist')) return 'NONEXISTENT_CIVIL_TIME';
        return 'INVALID_TIMEZONE';
    }
}

/** Three source days become one symbolic year; fractions are floored at one symbolic hour. */
export function splitDaYunInterval(intervalSeconds: number): DaYunOffset {
    if (!Number.isSafeInteger(intervalSeconds) || intervalSeconds < 0) {
        throw new RangeError('Da Yun interval must be non-negative integer seconds.');
    }
    let remainder = intervalSeconds;
    const years = Math.floor(remainder / SECONDS_PER_SYMBOLIC_YEAR);
    remainder %= SECONDS_PER_SYMBOLIC_YEAR;
    const months = Math.floor(remainder / SECONDS_PER_SYMBOLIC_MONTH);
    remainder %= SECONDS_PER_SYMBOLIC_MONTH;
    const days = Math.floor(remainder / SECONDS_PER_SYMBOLIC_DAY);
    remainder %= SECONDS_PER_SYMBOLIC_DAY;
    const hours = Math.floor(remainder / SECONDS_PER_SYMBOLIC_HOUR);
    return { years, months, days, hours, sourceRemainderSeconds: remainder % SECONDS_PER_SYMBOLIC_HOUR };
}

function daysInMonth(year: number, month: number): number {
    const date = new Date(0);
    date.setUTCFullYear(year, month, 0);
    date.setUTCHours(0, 0, 0, 0);
    return date.getUTCDate();
}

/** Add nominal calendar units in order, clamping leap-day and month-end transitions. */
export function addDaYunOffset(
    civil: DaYunCivilDateTime,
    offset: Omit<DaYunOffset, 'sourceRemainderSeconds'>,
): string {
    if (civilEpochSeconds(civil) === null
        || !Object.values(offset).every(value => Number.isSafeInteger(value) && value >= 0)) {
        throw new RangeError('Da Yun onset requires a valid civil datetime and non-negative integer offsets.');
    }

    let year = civil.year + offset.years;
    let month = civil.month;
    let day = Math.min(civil.day, daysInMonth(year, month));
    const monthIndex = year * 12 + month - 1 + offset.months;
    year = Math.floor(monthIndex / 12);
    month = monthIndex % 12 + 1;
    day = Math.min(day, daysInMonth(year, month));

    const base = new Date(0);
    base.setUTCFullYear(year, month - 1, day + offset.days);
    base.setUTCHours(civil.hour + offset.hours, civil.minute, civil.second, 0);
    const onset = civilFromEpochSeconds(base.getTime() / 1000);
    if (!onset || onset.year < 1 || onset.year > 9999) {
        throw new RangeError('Da Yun onset is outside the supported civil calendar.');
    }
    return formatCivil(onset);
}

function getTermBasisLunar(birthUtcSeconds: number): LunarTermProviderLike | null {
    const termWall = civilFromEpochSeconds(birthUtcSeconds + TERM_OFFSET_SECONDS);
    if (!termWall) return null;
    try {
        return Solar.fromYmdHms(
            termWall.year,
            termWall.month,
            termWall.day,
            termWall.hour,
            termWall.minute,
            termWall.second,
        ).getLunar() as unknown as LunarTermProviderLike;
    } catch {
        return null;
    }
}

export function getJieInterval(birthUtcSeconds: number, forward: boolean): JieInterval | null {
    const lunar = getTermBasisLunar(birthUtcSeconds);
    if (!lunar) return null;
    try {
        const term = forward ? lunar.getNextJie(false) : lunar.getPrevJie(false);
        if (!term) return null;
        const solar = term.getSolar();
        const termClockSeconds = civilEpochSeconds({
            year: solar.getYear(),
            month: solar.getMonth(),
            day: solar.getDay(),
            hour: solar.getHour(),
            minute: solar.getMinute(),
            second: solar.getSecond(),
        });
        if (termClockSeconds === null) return null;
        const termUtcSeconds = termClockSeconds - TERM_OFFSET_SECONDS;
        const intervalSeconds = forward
            ? termUtcSeconds - birthUtcSeconds
            : birthUtcSeconds - termUtcSeconds;
        const jieUtc = formatUtc(termUtcSeconds);
        if (!jieUtc || !Number.isSafeInteger(intervalSeconds) || intervalSeconds < 0
            || (forward && intervalSeconds === 0)) return null;
        return { jieName: term.getName(), jieUtc, intervalSeconds };
    } catch {
        return null;
    }
}

/** Replace legacy onset scalars only after a complete V2 calculation succeeds. */
export function calculateSecondPrecisionDaYun(
    legacy: DaYunInfo,
    civil: DaYunCivilDateTime,
    timezoneBasis: number | string | null,
    dstOffset: number,
    expectedPillars?: { year: string; month: string },
): DaYunInfo {
    const instant = resolveBirthInstant(civil, timezoneBasis, dstOffset);
    if (typeof instant === 'string') return retainLegacyDaYun(legacy, instant, timezoneBasis);
    if (expectedPillars) {
        const termBasisLunar = getTermBasisLunar(instant.utcSeconds);
        if (!termBasisLunar) return retainLegacyDaYun(legacy, 'TERM_LOOKUP_UNAVAILABLE', timezoneBasis);
        if (termBasisLunar.getYearInGanZhiExact() !== expectedPillars.year
            || termBasisLunar.getMonthInGanZhiExact() !== expectedPillars.month) {
            return retainLegacyDaYun(legacy, 'PILLAR_TERM_BOUNDARY_MISMATCH', timezoneBasis);
        }
    }
    const interval = getJieInterval(instant.utcSeconds, legacy.isForward);
    if (!interval) return retainLegacyDaYun(legacy, 'TERM_LOOKUP_UNAVAILABLE', timezoneBasis);
    const offset = splitDaYunInterval(interval.intervalSeconds);

    let startDate: string;
    try {
        startDate = addDaYunOffset(civil, offset);
    } catch {
        return retainLegacyDaYun(legacy, 'TERM_LOOKUP_UNAVAILABLE', timezoneBasis);
    }
    const firstStartYear = Number(startDate.slice(0, 4));
    if (!Number.isSafeInteger(firstStartYear)) {
        return retainLegacyDaYun(legacy, 'TERM_LOOKUP_UNAVAILABLE', timezoneBasis);
    }
    const startYearDelta = firstStartYear - legacy.startYear;
    const ageDelta = firstStartYear - civil.year - legacy.startAge;
    const cycles = legacy.cycles.map(cycle => ({
        ...cycle,
        startYear: cycle.startYear + startYearDelta,
        endYear: cycle.endYear + startYearDelta,
        startAge: cycle.startAge + ageDelta,
        endAge: cycle.endAge + ageDelta,
    }));
    const birthUtc = formatUtc(instant.utcSeconds);
    if (!birthUtc || !cycles[0]) return retainLegacyDaYun(legacy, 'TERM_LOOKUP_UNAVAILABLE', timezoneBasis);

    const timing: CalculatedDaYunTimingReceipt = {
        status: 'CALCULATED',
        version: 'DAYUN_SECOND_V2',
        intervalBasis: 'CIVIL_INSTANT',
        conversionPolicy: 'THREE_DAYS_PER_YEAR',
        termProvider: 'lunar-javascript',
        termProviderVersion: '1.7.7',
        termTimezone: 'UTC+08:00',
        selectionPolicy: 'PREVIOUS_INCLUSIVE_NEXT_EXCLUSIVE',
        rounding: 'WHOLE_SYMBOLIC_HOUR_FLOOR',
        startDateBasis: 'NOMINAL_BIRTHPLACE_CIVIL',
        timezoneSource: instant.timezoneSource,
        timezoneBasis: instant.timezoneBasis,
        timezoneDatabase: instant.timezoneDatabase,
        disambiguation: 'REJECT',
        resolvedOffsetSeconds: instant.offsetSeconds,
        birthUtc,
        ...interval,
        sourceRemainderSeconds: offset.sourceRemainderSeconds,
    };

    return {
        ...legacy,
        cycles,
        startYear: firstStartYear,
        startAge: cycles[0].startAge,
        startDate,
        startOffset: {
            years: offset.years,
            months: offset.months,
            days: offset.days,
            hours: offset.hours,
        },
        timing,
    };
}
