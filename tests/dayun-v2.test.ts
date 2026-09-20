import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import {
    addDaYunOffset,
    calculateBaziChart,
    calculateSecondPrecisionDaYun,
    getJieInterval,
    splitDaYunInterval,
    type BaziInput,
    type CalculatedDaYunTimingReceipt,
} from '../src/index';

const KAIPING_INPUT = {
    year: 2001,
    month: 7,
    day: 2,
    hour: 3,
    minute: 14,
    gender: 'male',
    longitude: 112.6986,
    timezoneId: 'Asia/Shanghai',
    dayBoundaryMode: 'ZI_HOUR_23',
    daYunTimingVersion: 'DAYUN_SECOND_V2',
} as const satisfies BaziInput;

function calculatedTiming(input: BaziInput): CalculatedDaYunTimingReceipt {
    const timing = calculateBaziChart(input).daYun.timing;
    assert.equal(timing.status, 'CALCULATED');
    assert.equal(timing.version, 'DAYUN_SECOND_V2');
    return timing as CalculatedDaYunTimingReceipt;
}

describe('DAYUN_SECOND_V2', () => {
    test('keeps the legacy contract as the default', () => {
        const chart = calculateBaziChart({
            year: 1998,
            month: 12,
            day: 13,
            hour: 12,
            minute: 0,
            gender: 'female',
            longitude: 116.39,
            timezone: 8,
        });

        assert.equal(chart.daYun.startDate, '2000-11-23 11:51:34');
        assert.deepEqual(chart.daYun.startOffset, { years: 1, months: 11, days: 10, hours: 0 });
        assert.deepEqual(chart.daYun.timing, {
            status: 'CALCULATED',
            version: 'LEGACY_SHICHEN_V1',
            provider: 'lunar-javascript',
            providerVersion: '1.7.7',
        });
        assert.equal(chart.metadata.daYunTimingVersion, 'LEGACY_SHICHEN_V1');
    });

    test('matches the app second-resolved Kaiping onset and receipt', () => {
        const chart = calculateBaziChart(KAIPING_INPUT);
        const timing = chart.daYun.timing;

        assert.equal(chart.pillars.year.ganZhi, '辛巳');
        assert.equal(chart.pillars.month.ganZhi, '甲午');
        assert.equal(chart.pillars.day.ganZhi, '丙寅');
        assert.equal(chart.pillars.hour?.ganZhi, '己丑');
        assert.equal(chart.solarTimeInfo?.trueSolarDateTime, '2001-07-02 02:40:52');
        assert.equal(chart.daYun.startDate, '2010-03-23 19:14:00');
        assert.deepEqual(chart.daYun.startOffset, { years: 8, months: 8, days: 21, hours: 16 });
        assert.deepEqual(chart.daYun.cycles.map(cycle => cycle.ganZhi),
            ['癸巳', '壬辰', '辛卯', '庚寅', '己丑', '戊子', '丁亥', '丙戌', '乙酉']);
        assert.equal(timing.status, 'CALCULATED');
        assert.equal(timing.version, 'DAYUN_SECOND_V2');
        if (timing.status !== 'CALCULATED' || timing.version !== 'DAYUN_SECOND_V2') return;
        assert.equal(timing.birthUtc, '2001-07-01T19:14:00Z');
        assert.equal(timing.jieName, '芒种');
        assert.equal(timing.jieUtc, '2001-06-05T14:53:35Z');
        assert.equal(timing.intervalSeconds, 2262025);
        assert.equal(timing.sourceRemainderSeconds, 25);
        assert.equal(timing.rounding, 'WHOLE_SYMBOLIC_HOUR_FLOOR');
        assert.equal(timing.startDateBasis, 'NOMINAL_BIRTHPLACE_CIVIL');
        assert.equal(chart.metadata.daYunTimingVersion, 'DAYUN_SECOND_V2');
    });

    test('numeric and IANA timezone inputs resolve the same physical interval', () => {
        const numericInput = {
            ...KAIPING_INPUT,
            timezoneId: undefined,
            timezone: 8,
            dstOffset: 0,
        } satisfies BaziInput;
        const iana = calculateBaziChart(KAIPING_INPUT);
        const numeric = calculateBaziChart(numericInput);

        assert.equal(numeric.daYun.startDate, iana.daYun.startDate);
        assert.deepEqual(numeric.daYun.startOffset, iana.daYun.startOffset);
        assert.deepEqual(numeric.daYun.cycles, iana.daYun.cycles);
        assert.equal(calculatedTiming(numericInput).intervalSeconds,
            calculatedTiming(KAIPING_INPUT).intervalSeconds);
        assert.equal(calculatedTiming(numericInput).timezoneSource, 'NUMERIC_OFFSET');
        assert.equal(calculatedTiming(KAIPING_INPUT).timezoneSource, 'IANA');
    });

    test('True Solar Time changes pillars, not the physical Jie interval', () => {
        const enabled = calculatedTiming(KAIPING_INPUT);
        const disabled = calculatedTiming({ ...KAIPING_INPUT, enableTrueSolarTime: false });

        assert.equal(disabled.birthUtc, enabled.birthUtc);
        assert.equal(disabled.jieUtc, enabled.jieUtc);
        assert.equal(disabled.intervalSeconds, enabled.intervalSeconds);
    });

    test('seconds propagate into the physical interval and receipt', () => {
        const atZero = calculatedTiming({ ...KAIPING_INPUT, second: 0 });
        const atTwentyNine = calculatedTiming({ ...KAIPING_INPUT, second: 29 });

        assert.equal(atTwentyNine.intervalSeconds - atZero.intervalSeconds, 29);
        assert.equal(atTwentyNine.birthUtc, '2001-07-01T19:14:29Z');
    });

    test('withholds V2 timing for missing, invalid, gap, and overlap clocks', () => {
        const cases: Array<{ input: BaziInput; reason: string }> = [
            {
                input: {
                    year: 2001, month: 7, day: 2, gender: 'male',
                    daYunTimingVersion: 'DAYUN_SECOND_V2',
                },
                reason: 'UNKNOWN_BIRTH_TIME',
            },
            {
                input: {
                    year: 2001, month: 7, day: 2, hour: 3, gender: 'male',
                    daYunTimingVersion: 'DAYUN_SECOND_V2', enableTrueSolarTime: false,
                },
                reason: 'MISSING_TIMEZONE',
            },
            {
                input: {
                    year: 2001, month: 7, day: 2, hour: 3, gender: 'male',
                    timezoneId: 'Not/A_Zone', daYunTimingVersion: 'DAYUN_SECOND_V2',
                    enableTrueSolarTime: false,
                },
                reason: 'INVALID_TIMEZONE',
            },
            {
                input: {
                    year: 2021, month: 3, day: 14, hour: 2, minute: 30, gender: 'male',
                    timezoneId: 'America/New_York', daYunTimingVersion: 'DAYUN_SECOND_V2',
                    enableTrueSolarTime: false,
                },
                reason: 'NONEXISTENT_CIVIL_TIME',
            },
            {
                input: {
                    year: 2021, month: 11, day: 7, hour: 1, minute: 30, gender: 'male',
                    timezoneId: 'America/New_York', daYunTimingVersion: 'DAYUN_SECOND_V2',
                    enableTrueSolarTime: false,
                },
                reason: 'AMBIGUOUS_CIVIL_TIME',
            },
        ];

        for (const { input, reason } of cases) {
            const timing = calculateBaziChart(input).daYun.timing;
            assert.equal(timing.status, 'UNAVAILABLE');
            if (timing.status !== 'UNAVAILABLE') continue;
            assert.equal(timing.reason, reason);
            assert.equal(timing.fallbackVersion, 'LEGACY_SHICHEN_V1');
        }
    });

    test('locks the symbolic conversion and nominal calendar clamping', () => {
        assert.deepEqual(splitDaYunInterval(2262025), {
            years: 8,
            months: 8,
            days: 21,
            hours: 16,
            sourceRemainderSeconds: 25,
        });
        assert.equal(addDaYunOffset(
            { year: 2000, month: 2, day: 29, hour: 23, minute: 30, second: 0 },
            { years: 1, months: 0, days: 0, hours: 2 },
        ), '2001-03-01 01:30:00');
        assert.equal(addDaYunOffset(
            { year: 2020, month: 2, day: 29, hour: 23, minute: 59, second: 58 },
            { years: 1, months: 1, days: 1, hours: 1 },
        ), '2021-03-30 00:59:58');
        assert.equal(addDaYunOffset(
            { year: 2021, month: 1, day: 31, hour: 0, minute: 1, second: 2 },
            { years: 0, months: 1, days: 0, hours: 0 },
        ), '2021-02-28 00:01:02');
        assert.throws(() => splitDaYunInterval(-1), RangeError);

        for (const boundary of [0, 30, 720, 21600, 259200, 2592000]) {
            for (const seconds of [boundary - 1, boundary, boundary + 1].filter(value => value >= 0)) {
                const split = splitDaYunInterval(seconds);
                const rebuilt = split.years * 259200 + split.months * 21600 + split.days * 720
                    + split.hours * 30 + split.sourceRemainderSeconds;
                assert.equal(rebuilt, seconds);
            }
        }
        for (const invalid of [0.5, Number.NaN, Number.POSITIVE_INFINITY, Number.MAX_SAFE_INTEGER + 1]) {
            assert.throws(() => splitDaYunInterval(invalid), RangeError);
        }
    });

    test('pins Jie equality semantics and guards the pillar/term frame', () => {
        const jieSecond = Date.UTC(2000, 0, 6, 1, 0, 42) / 1000;
        assert.equal(getJieInterval(jieSecond - 1, true)?.intervalSeconds, 1);
        assert.equal(getJieInterval(jieSecond, false)?.intervalSeconds, 0);
        assert.equal(getJieInterval(jieSecond + 1, false)?.intervalSeconds, 1);
        assert.ok((getJieInterval(jieSecond, true)?.intervalSeconds ?? 0) > 0);
        assert.notEqual(getJieInterval(jieSecond, true)?.jieUtc, '2000-01-06T01:00:42Z');

        const civil = { year: 2000, month: 1, day: 15, hour: 12, minute: 0, second: 0 };
        const legacy = calculateBaziChart({
            ...civil,
            gender: 'male',
            timezone: 8,
            enableTrueSolarTime: false,
        }).daYun;
        const aligned = calculateSecondPrecisionDaYun(legacy, civil, 8, 0, {
            year: '己卯',
            month: '丁丑',
        });
        assert.equal(aligned.startDate, '2003-01-30 10:00:00');
        assert.deepEqual(aligned.startOffset, { years: 3, months: 0, days: 14, hours: 22 });
        const mismatch = calculateSecondPrecisionDaYun(legacy, civil, 8, 0, {
            year: '庚辰',
            month: '丁丑',
        });
        assert.equal(mismatch.timing?.status, 'UNAVAILABLE');
        if (mismatch.timing?.status === 'UNAVAILABLE') {
            assert.equal(mismatch.timing.reason, 'PILLAR_TERM_BOUNDARY_MISMATCH');
        }
    });
});
