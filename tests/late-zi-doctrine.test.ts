import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { calculateBaziChart, BaziInput } from '../src/index';

/**
 * Late-Zi (夜子時) day-boundary doctrine — pinned per dayBoundaryMode.
 *
 * School decision (2026-07-08, product-confirmed): both modes keep lunar-javascript's
 * classical semantics. This file exists so a lunar-javascript upgrade (or a refactor of
 * pillars.ts setSect wiring) cannot silently change schools:
 *
 *   ZI_HOUR_23  — day pillar rolls to the NEXT day at 23:00; the zi-hour stem is 五鼠遁 of
 *                 the rolled (displayed) day. Fully self-consistent.
 *   MIDNIGHT_00 — day pillar keeps the birth day, while the LATE-zi hour stem follows the
 *                 NEXT day's stem (古法夜子時: 日用本日、時用明日之干). The departure from
 *                 naive same-day 五鼠遁 is deliberate — it IS the doctrine, not a bug.
 *
 * Early zi (00:00–00:59) must be same-day 五鼠遁-consistent in BOTH modes.
 */

const STEMS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];

/** 五鼠遁: zi-hour stem as a pure function of the day stem. */
function ziHourStem(dayStem: string): string {
    const idx = STEMS.indexOf(dayStem);
    assert.notEqual(idx, -1, `unknown day stem ${dayStem}`);
    return STEMS[(idx % 5) * 2];
}

function chart(y: number, m: number, d: number, hour: number, minute: number, mode: BaziInput['dayBoundaryMode']) {
    return calculateBaziChart({
        year: y, month: m, day: d, hour, minute,
        gender: 'male', calendarType: 'solar',
        enableTrueSolarTime: false, dayBoundaryMode: mode,
    } as BaziInput);
}

function nextDay(y: number, m: number, d: number): [number, number, number] {
    const t = new Date(Date.UTC(y, m - 1, d) + 86_400_000);
    return [t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate()];
}

const SAMPLE_DATES: Array<[number, number, number]> = [
    [1800, 1, 1],
    [1976, 2, 29],
    [1999, 12, 31],
    [2024, 1, 1],
    [2069, 7, 7],
];

describe('late-zi doctrine per dayBoundaryMode', () => {
    for (const [y, m, d] of SAMPLE_DATES) {
        const label = `${y}-${m}-${d}`;
        const [ny, nm, nd] = nextDay(y, m, d);

        test(`${label} ZI_HOUR_23: day rolls at 23:00, hour stem self-consistent`, () => {
            const noonDay = chart(y, m, d, 12, 0, 'ZI_HOUR_23').pillars.day.ganZhi;
            const nextNoonDay = chart(ny, nm, nd, 12, 0, 'ZI_HOUR_23').pillars.day.ganZhi;
            const late = chart(y, m, d, 23, 30, 'ZI_HOUR_23');

            assert.equal(late.pillars.day.ganZhi, nextNoonDay, 'day pillar must roll to the next day');
            assert.equal(late.pillars.hour!.branch, '子');
            assert.equal(
                late.pillars.hour!.stem, ziHourStem(late.pillars.day.stem),
                'hour stem must be 五鼠遁 of the displayed day stem',
            );
            assert.notEqual(late.pillars.day.ganZhi, noonDay, 'rolled day must differ from the birth day');
        });

        test(`${label} MIDNIGHT_00: day keeps birth day, late-zi hour stem follows NEXT day (夜子時)`, () => {
            const noonDay = chart(y, m, d, 12, 0, 'MIDNIGHT_00').pillars.day.ganZhi;
            const nextNoonDay = chart(ny, nm, nd, 12, 0, 'MIDNIGHT_00').pillars.day.ganZhi;
            const late = chart(y, m, d, 23, 30, 'MIDNIGHT_00');

            assert.equal(late.pillars.day.ganZhi, noonDay, 'day pillar must keep the birth day');
            assert.equal(late.pillars.hour!.branch, '子');
            assert.equal(
                late.pillars.hour!.stem, ziHourStem(nextNoonDay.charAt(0)),
                'late-zi hour stem must be 五鼠遁 of the NEXT day\'s stem',
            );
            // Consecutive stems never share a 五鼠遁 image — the doctrine is observable.
            assert.notEqual(late.pillars.hour!.stem, ziHourStem(late.pillars.day.stem));
        });

        test(`${label} early zi 00:30: same-day 五鼠遁-consistent in both modes`, () => {
            for (const mode of ['ZI_HOUR_23', 'MIDNIGHT_00'] as const) {
                const noonDay = chart(y, m, d, 12, 0, mode).pillars.day.ganZhi;
                const early = chart(y, m, d, 0, 30, mode);
                assert.equal(early.pillars.day.ganZhi, noonDay, `${mode}: day pillar must be the birth day`);
                assert.equal(early.pillars.hour!.branch, '子');
                assert.equal(early.pillars.hour!.stem, ziHourStem(early.pillars.day.stem));
            }
        });

        test(`${label} boundary minutes: 23:00 matches 23:30, 22:59 stays 亥 on the birth day`, () => {
            for (const mode of ['ZI_HOUR_23', 'MIDNIGHT_00'] as const) {
                const noonDay = chart(y, m, d, 12, 0, mode).pillars.day.ganZhi;
                const late = chart(y, m, d, 23, 30, mode);
                const boundary = chart(y, m, d, 23, 0, mode);
                assert.equal(boundary.pillars.day.ganZhi, late.pillars.day.ganZhi, `${mode}: 23:00 day == 23:30 day`);
                assert.equal(boundary.pillars.hour!.stem, late.pillars.hour!.stem, `${mode}: 23:00 hour == 23:30 hour`);

                const beforeZi = chart(y, m, d, 22, 59, mode);
                assert.equal(beforeZi.pillars.day.ganZhi, noonDay, `${mode}: 22:59 day pillar is the birth day`);
                assert.equal(beforeZi.pillars.hour!.branch, '亥', `${mode}: 22:59 is 亥 hour`);
            }
        });
    }
});
