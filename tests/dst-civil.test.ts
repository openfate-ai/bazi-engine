import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { calculateBaziChart, BaziInput } from '../src/index';

/**
 * DST civil-clock correction with True Solar Time DISABLED.
 *
 * DST is a civil-clock correction, not a solar-time refinement: a birth recorded at
 * 15:20 during a DST period (China 1986–1991 summer, Taiwan 1946–1961, etc.) occurred
 * at 14:20 standard time. The TST path already subtracts dstOffset inside
 * calculateTrueSolarTime; before v1.1.1 the non-TST path silently dropped it — a wrong
 * 时辰, and near midnight a wrong DAY pillar.
 *
 * Locks the equivalence: chart(clock T, dstOffset=1, TST off) === chart(clock T-1h,
 * dstOffset=0, TST off) for all pillars, including midnight day-rollover and lunar input.
 */

function base(overrides: Partial<BaziInput>): BaziInput {
    return {
        year: 1988, month: 7, day: 15, hour: 15, minute: 20,
        gender: 'male', longitude: 116.4074, timezone: 8,
        dstOffset: 0, enableTrueSolarTime: false,
        ...overrides,
    } as BaziInput;
}

function pillarString(input: BaziInput): string {
    const c = calculateBaziChart(input);
    return [c.pillars.year, c.pillars.month, c.pillars.day, c.pillars.hour]
        .map(p => p?.ganZhi ?? '')
        .join(' ');
}

describe('DST civil correction with True Solar Time disabled', () => {
    test('dstOffset=1 shifts the 时辰: 15:20 DST clock === 14:20 standard (未时, not 申时)', () => {
        const dstChart = pillarString(base({ dstOffset: 1 }));
        const standardChart = pillarString(base({ hour: 14 }));
        assert.equal(dstChart, standardChart);
        assert.ok(dstChart.endsWith('乙未'), `expected 未时 hour pillar, got: ${dstChart}`);
        assert.notEqual(dstChart, pillarString(base({})), 'dst=1 must differ from dst=0 at the same clock time');
    });

    test('midnight rollover: 00:20 DST === 23:20 previous civil day (day pillar rolls)', () => {
        assert.equal(
            pillarString(base({ day: 16, hour: 0, dstOffset: 1 })),
            pillarString(base({ day: 15, hour: 23 })),
        );
    });

    test('TST enabled path is unchanged (no double subtraction)', () => {
        assert.equal(
            pillarString(base({ dstOffset: 1, enableTrueSolarTime: true })),
            pillarString(base({ hour: 14, enableTrueSolarTime: true })),
        );
    });

    test('dstOffset=0 charts are untouched', () => {
        assert.ok(pillarString(base({})).endsWith('丙申'), 'dst=0 15:20 stays 申时');
    });

    test('lunar input converts to solar before DST normalization (1988 六月初二 = 1988-07-15)', () => {
        const lunarDst = pillarString(base({
            calendarType: 'lunar', year: 1988, month: 6, day: 2, hour: 15, dstOffset: 1,
        }));
        assert.equal(lunarDst, pillarString(base({ hour: 14 })));
    });

    test('UK 1944 double DST (dstOffset=2) shifts two hours without TST', () => {
        const doubleDst = pillarString(base({
            year: 1944, month: 7, day: 1, hour: 12, minute: 0,
            longitude: 0, timezone: 0, dstOffset: 2,
        }));
        const standard = pillarString(base({
            year: 1944, month: 7, day: 1, hour: 10, minute: 0,
            longitude: 0, timezone: 0,
        }));
        assert.equal(doubleDst, standard);
    });
});
