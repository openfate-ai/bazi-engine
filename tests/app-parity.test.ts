import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { BaziInput, calculateBaziChart } from '../src/index';

interface ProductionParityFixture {
    name: string;
    input: BaziInput;
    expected: {
        pillars: [string, string, string, string];
        trueSolarDateTime: string | null;
    };
}

const FIXTURES: ProductionParityFixture[] = [
    {
        name: 'Beijing reference chart',
        input: {
            year: 1998,
            month: 12,
            day: 13,
            hour: 12,
            minute: 0,
            gender: 'female',
            longitude: 116.39,
            timezone: 8,
            dayBoundaryMode: 'ZI_HOUR_23',
        },
        expected: {
            pillars: ['戊寅', '甲子', '甲午', '庚午'],
            trueSolarDateTime: '1998-12-13 11:51:34',
        },
    },
    {
        name: 'Li Chun boundary reference',
        input: {
            year: 2024,
            month: 2,
            day: 4,
            hour: 16,
            minute: 30,
            gender: 'male',
            enableTrueSolarTime: false,
            dayBoundaryMode: 'ZI_HOUR_23',
        },
        expected: {
            pillars: ['甲辰', '丙寅', '戊戌', '庚申'],
            trueSolarDateTime: null,
        },
    },
    {
        name: 'lunar conversion reference',
        input: {
            year: 1998,
            month: 10,
            day: 25,
            hour: 12,
            gender: 'female',
            calendarType: 'lunar',
            enableTrueSolarTime: false,
            dayBoundaryMode: 'ZI_HOUR_23',
        },
        expected: {
            pillars: ['戊寅', '甲子', '甲午', '庚午'],
            trueSolarDateTime: null,
        },
    },
];

describe('OpenFate production parity corpus', () => {
    for (const fixture of FIXTURES) {
        test(fixture.name, () => {
            const chart = calculateBaziChart(fixture.input);
            const pillars = [
                chart.pillars.year.ganZhi,
                chart.pillars.month.ganZhi,
                chart.pillars.day.ganZhi,
                chart.pillars.hour?.ganZhi ?? '',
            ];

            assert.deepEqual(pillars, fixture.expected.pillars);
            assert.equal(chart.solarTimeInfo?.trueSolarDateTime ?? null, fixture.expected.trueSolarDateTime);
        });
    }
});
