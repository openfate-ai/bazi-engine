import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import {
    BaziInputError,
    calculateBaziChart,
    detectInteractions,
} from '../src/index';

const BEIJING_CHART_INPUT = {
    year: 1998,
    month: 12,
    day: 13,
    hour: 12,
    minute: 0,
    gender: 'female' as const,
    longitude: 116.39,
    timezone: 8,
    dayBoundaryMode: 'ZI_HOUR_23' as const,
};

describe('public chart contract', () => {
    test('returns enriched pillar and transparent calendar metadata', () => {
        const chart = calculateBaziChart(BEIJING_CHART_INPUT);

        assert.equal(chart.pillars.year.ganZhi, '戊寅');
        assert.equal(chart.pillars.year.stemTenGod, '偏财');
        assert.equal(chart.pillars.year.branchElement, 'wood');
        assert.deepEqual(chart.pillars.year.hiddenStems.map(item => item.stem), ['甲', '丙', '戊']);
        assert.equal(chart.pillars.year.hiddenStems[0].isMain, true);
        assert.equal(chart.pillars.year.naYin, '城头土');
        assert.deepEqual(chart.pillars.year.voidBranches, ['申', '酉']);
        assert.equal(chart.calendar.civilSolar.hour, 12);
        assert.equal(chart.calendar.calculationSolar.hour, 11);
        assert.equal(chart.calendar.lunar.month, 10);
        assert.equal(chart.calendar.zodiac, '虎');
        assert.equal(chart.metadata.trueSolarTimeApplied, true);
        assert.equal(chart.metadata.dayBoundaryMode, 'ZI_HOUR_23');
    });

    test('returns correct Da Yun calendar metadata and enriched cycles', () => {
        const daYun = calculateBaziChart(BEIJING_CHART_INPUT).daYun;

        assert.equal(daYun.startYear, 2000);
        assert.equal(daYun.startAge, 2);
        assert.equal(daYun.startDate, '2000-11-23 11:51:34');
        assert.deepEqual(daYun.startOffset, { years: 1, months: 11, days: 10, hours: 0 });
        assert.equal(daYun.cycles[0].endYear, 2009);
        assert.equal(daYun.cycles[0].endAge, 11);
        assert.equal(daYun.cycles[0].stemTenGod, '正印');
        assert.equal(daYun.cycles[0].branchTenGod, '偏印');
    });

    test('keeps solar and equivalent lunar input aligned', () => {
        const solar = calculateBaziChart({ ...BEIJING_CHART_INPUT, enableTrueSolarTime: false });
        const lunar = calculateBaziChart({
            ...BEIJING_CHART_INPUT,
            year: 1998,
            month: 10,
            day: 25,
            calendarType: 'lunar',
            enableTrueSolarTime: false,
        });

        assert.deepEqual(lunar.pillars, solar.pillars);
        assert.deepEqual(lunar.calendar.civilSolar, solar.calendar.civilSolar);
    });

    test('applies both Zi-hour boundary policies deterministically', () => {
        const baseInput = {
            year: 2024,
            month: 6,
            day: 1,
            hour: 23,
            minute: 30,
            gender: 'female' as const,
            enableTrueSolarTime: false,
        };
        const midnight = calculateBaziChart({ ...baseInput, dayBoundaryMode: 'MIDNIGHT_00' });
        const ziHour = calculateBaziChart({ ...baseInput, dayBoundaryMode: 'ZI_HOUR_23' });

        assert.notEqual(midnight.pillars.day.ganZhi, ziHour.pillars.day.ganZhi);
        assert.equal(midnight.pillars.hour.branch, '子');
        assert.equal(ziHour.pillars.hour.branch, '子');
    });

    test('supports fractional timezones, explicit DST, and solar-date rollover', () => {
        const standard = calculateBaziChart({
            year: 2020,
            month: 6,
            day: 1,
            hour: 12,
            gender: 'male',
            longitude: 77.21,
            timezone: 5.5,
        });
        const daylight = calculateBaziChart({
            year: 2020,
            month: 6,
            day: 1,
            hour: 12,
            gender: 'male',
            longitude: 77.21,
            timezone: 5.5,
            dstOffset: 1,
        });
        const rollover = calculateBaziChart({
            year: 2000,
            month: 1,
            day: 1,
            hour: 0,
            minute: 30,
            gender: 'male',
            longitude: 75,
            timezone: 8,
        });

        assert.equal(standard.metadata.timezoneBasis, 5.5);
        assert.notEqual(standard.solarTimeInfo?.trueSolarDateTime, daylight.solarTimeInfo?.trueSolarDateTime);
        assert.equal(rollover.calendar.calculationSolar.day, 31);
        assert.equal(rollover.calendar.calculationSolar.month, 12);
        assert.equal(rollover.calendar.calculationSolar.year, 1999);
    });
});

describe('input validation', () => {
    test('rejects invalid solar and lunar dates', () => {
        assert.throws(
            () => calculateBaziChart({ year: 2023, month: 2, day: 29, gender: 'male' }),
            BaziInputError,
        );
        assert.throws(
            () => calculateBaziChart({
                year: 2021,
                month: 4,
                day: 1,
                gender: 'male',
                calendarType: 'lunar',
                isLeapMonth: true,
            }),
            BaziInputError,
        );
    });

    test('requires a timezone basis for True Solar Time', () => {
        assert.throws(
            () => calculateBaziChart({
                year: 1998,
                month: 12,
                day: 13,
                hour: 12,
                gender: 'female',
                longitude: 116.39,
            }),
            BaziInputError,
        );
    });
});

describe('interaction coverage', () => {
    const cases = [
        { type: 'CLASH', branches: { year: '子', month: '午', day: '辰', hour: '酉' } },
        { type: 'COMBINATION_2', branches: { year: '子', month: '丑', day: '午', hour: '酉' } },
        { type: 'TRINE', branches: { year: '申', month: '子', day: '辰', hour: '酉' } },
        { type: 'DIRECTIONAL', branches: { year: '寅', month: '卯', day: '辰', hour: '酉' } },
        { type: 'PUNISHMENT', branches: { year: '午', month: '午', day: '辰', hour: '酉' } },
        { type: 'DESTRUCTION', branches: { year: '子', month: '酉', day: '辰', hour: '午' } },
        { type: 'HARM', branches: { year: '子', month: '未', day: '辰', hour: '酉' } },
    ] as const;

    for (const item of cases) {
        test(`detects ${item.type}`, () => {
            const interactions = detectInteractions(item.branches);
            assert.ok(interactions.some(interaction => interaction.type === item.type));
        });
    }

    test('does not create a self-punishment from a single branch occurrence', () => {
        const interactions = detectInteractions({ year: '午', month: '子', day: '辰', hour: '酉' });
        const selfPunishment = interactions.find(interaction => interaction.type === 'PUNISHMENT');
        assert.equal(selfPunishment, undefined);
    });
});
