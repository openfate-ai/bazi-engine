import { LunarYear } from 'lunar-javascript';

import { BaziInput } from '../types';

const MIN_YEAR = 1800;
const MAX_YEAR = 2100;

export class BaziInputError extends RangeError {
    constructor(message: string) {
        super(message);
        this.name = 'BaziInputError';
    }
}

function assertIntegerInRange(value: number, minimum: number, maximum: number, field: string): void {
    if (!Number.isInteger(value) || value < minimum || value > maximum) {
        throw new BaziInputError(`${field} must be an integer between ${minimum} and ${maximum}.`);
    }
}

function assertNumberInRange(value: number, minimum: number, maximum: number, field: string): void {
    if (!Number.isFinite(value) || value < minimum || value > maximum) {
        throw new BaziInputError(`${field} must be between ${minimum} and ${maximum}.`);
    }
}

function assertSolarDate(input: BaziInput): void {
    const date = new Date(Date.UTC(input.year, input.month - 1, input.day));
    const isSameDate = date.getUTCFullYear() === input.year
        && date.getUTCMonth() === input.month - 1
        && date.getUTCDate() === input.day;

    if (!isSameDate) throw new BaziInputError('The supplied solar date does not exist.');
    if (input.isLeapMonth) throw new BaziInputError('isLeapMonth is only valid for lunar calendar input.');
}

function assertLunarDate(input: BaziInput): void {
    const lunarYear = LunarYear.fromYear(input.year);
    const requestedMonth = input.isLeapMonth ? -input.month : input.month;
    const lunarMonth = lunarYear.getMonth(requestedMonth);

    if (!lunarMonth) {
        const label = input.isLeapMonth ? 'leap lunar month' : 'lunar month';
        throw new BaziInputError(`The supplied ${label} does not exist in ${input.year}.`);
    }
    if (input.day > lunarMonth.getDayCount()) {
        throw new BaziInputError('The supplied lunar date does not exist.');
    }
}

/**
 * validateBaziInput - Validates the public calculation contract before invoking calendar libraries.
 */
export function validateBaziInput(input: BaziInput): void {
    assertIntegerInRange(input.year, MIN_YEAR, MAX_YEAR, 'year');
    assertIntegerInRange(input.month, 1, 12, 'month');
    assertIntegerInRange(input.day, 1, 31, 'day');

    if (input.hour !== undefined) assertIntegerInRange(input.hour, 0, 23, 'hour');
    if (input.minute !== undefined) assertIntegerInRange(input.minute, 0, 59, 'minute');
    if (input.minute !== undefined && input.hour === undefined) {
        throw new BaziInputError('hour is required when minute is supplied.');
    }
    if (input.longitude !== undefined) assertNumberInRange(input.longitude, -180, 180, 'longitude');
    if (input.timezone !== undefined) assertNumberInRange(input.timezone, -14, 14, 'timezone');
    if (input.dstOffset !== undefined) assertNumberInRange(input.dstOffset, -2, 2, 'dstOffset');
    if (input.timezoneId !== undefined && input.timezoneId.trim().length === 0) {
        throw new BaziInputError('timezoneId cannot be empty.');
    }

    const trueSolarTimeRequested = (input.enableTrueSolarTime ?? true)
        && input.longitude !== undefined
        && input.hour !== undefined;
    if (trueSolarTimeRequested && input.timezone === undefined && input.timezoneId === undefined) {
        throw new BaziInputError('timezone or timezoneId is required for True Solar Time correction.');
    }

    if ((input.calendarType ?? 'solar') === 'lunar') {
        assertLunarDate(input);
    } else {
        assertSolarDate(input);
    }
}
