import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import {
    BaziInputError,
    calculateBaziChart,
    detectInteractions,
} from '../src/index';

/* Types */
import type { InteractionPillar, NatalBranches } from '../src/index';

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

    test('derives Si hidden-stem Ten Gods from each hidden stem', () => {
        const cases = [
            {
                input: { year: 1893, month: 11, day: 4, hour: 3, minute: 30 },
                expected: [
                    { stem: '丙', tenGod: '伤官' },
                    { stem: '戊', tenGod: '正财' },
                    { stem: '庚', tenGod: '正官' },
                ],
            },
            {
                input: { year: 1985, month: 5, day: 20, hour: 10, minute: 0 },
                expected: [
                    { stem: '丙', tenGod: '正印' },
                    { stem: '戊', tenGod: '劫财' },
                    { stem: '庚', tenGod: '伤官' },
                ],
            },
            {
                input: { year: 1977, month: 5, day: 10, hour: 10, minute: 0 },
                expected: [
                    { stem: '丙', tenGod: '劫财' },
                    { stem: '戊', tenGod: '伤官' },
                    { stem: '庚', tenGod: '正财' },
                ],
            },
        ];

        for (const fixture of cases) {
            const chart = calculateBaziChart({
                ...fixture.input,
                gender: 'male',
                enableTrueSolarTime: false,
            });
            const siPillar = Object.values(chart.pillars).find(pillar => pillar?.branch === '巳');

            assert.ok(
                siPillar,
                `Expected a Si pillar for ${fixture.input.year}-${fixture.input.month}-${fixture.input.day}`,
            );
            assert.deepEqual(
                siPillar.hiddenStems.map(({ stem, tenGod }) => ({ stem, tenGod })),
                fixture.expected,
            );
        }
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
        { type: 'COMBINATION_HALF', branches: { year: '申', month: '子', day: '午', hour: '酉' } },
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

    test('preserves every repeated clash occurrence around the month pillar', () => {
        const fixtures = [
            { natal: { year: '子', month: '寅', day: '申', hour: '子' }, pairs: [['month', 'day']] },
            { natal: { year: '申', month: '寅', day: '申', hour: '子' }, pairs: [['year', 'month'], ['month', 'day']] },
            { natal: { year: '申', month: '寅', day: '申', hour: '申' }, pairs: [['year', 'month'], ['month', 'day'], ['month', 'hour']] },
        ];
        for (const { natal, pairs } of fixtures) {
            const clashes = detectInteractions(natal).filter(({ type }) => type === 'CLASH');
            assert.deepEqual(clashes.map(({ pillars }) => pillars), pairs);
        }
    });

    test('does not collapse repeated combinations or cancel coexisting clashes', () => {
        const interactions = detectInteractions({ year: '子', month: '丑', day: '子', hour: '午' });
        assert.deepEqual(
            interactions.filter(({ type }) => type === 'COMBINATION_2').map(({ id }) => id),
            ['COMBINATION_2:year:子|month:丑', 'COMBINATION_2:month:丑|day:子'],
        );
        assert.deepEqual(
            interactions.filter(({ type }) => type === 'CLASH').map(({ pillars }) => pillars),
            [['year', 'hour'], ['day', 'hour']],
        );
    });

    test('enumerates all self-punishment pairs, including repeated dynamic branches', () => {
        for (const branch of ['辰', '午', '酉', '亥']) {
            const three = { year: branch, month: branch, day: branch };
            const four = { ...three, hour: branch };
            const count = (natal: NatalBranches, withContext = false): number => detectInteractions(
                natal,
                withContext ? { dayunBranch: branch, annualBranch: branch } : undefined,
            ).filter(({ type }) => type === 'PUNISHMENT').length;
            assert.equal(count(three), 3);
            assert.equal(count(four), 6);
            assert.equal(count(four, true), 15);
        }
    });

    test('enumerates every distinct full-group embedding', () => {
        const fixtures = [
            { type: 'TRINE', natal: { year: '申', month: '子', day: '辰', hour: '申' } },
            { type: 'DIRECTIONAL', natal: { year: '寅', month: '卯', day: '辰', hour: '寅' } },
            { type: 'PUNISHMENT', natal: { year: '寅', month: '巳', day: '申', hour: '寅' } },
            { type: 'PUNISHMENT', natal: { year: '丑', month: '戌', day: '未', hour: '丑' } },
        ];
        for (const { type, natal } of fixtures) {
            assert.deepEqual(
                detectInteractions(natal).filter(item => item.type === type).map(({ pillars }) => pillars),
                [['year', 'month', 'day'], ['month', 'day', 'hour']],
            );
        }
        const dynamic = detectInteractions(
            { year: '申', month: '子', day: '辰' },
            { dayunBranch: '辰', annualBranch: '子' },
        ).filter(({ type }) => type === 'TRINE');
        assert.deepEqual(dynamic.map(({ pillars }) => pillars), [
            ['year', 'month', 'day'], ['year', 'month', 'dayun'],
            ['year', 'day', 'annual'], ['year', 'dayun', 'annual'],
        ]);
    });

    test('keeps the existing full punishment-family policy', () => {
        for (const [year, month] of [['寅', '巳'], ['巳', '申'], ['寅', '申'], ['丑', '戌'], ['戌', '未'], ['丑', '未']]) {
            assert.equal(
                detectInteractions({ year, month, day: '' }).some(({ type }) => type === 'PUNISHMENT'),
                false,
            );
        }
    });

    test('detects exactly the eight king-node half-trine pairs, never endpoint-only pairs', () => {
        const halves = [
            ['申', '子', 'water'], ['子', '辰', 'water'],
            ['寅', '午', 'fire'], ['午', '戌', 'fire'],
            ['亥', '卯', 'wood'], ['卯', '未', 'wood'],
            ['巳', '酉', 'metal'], ['酉', '丑', 'metal'],
        ];
        for (const [year, month, target] of halves) {
            for (const natal of [{ year, month, day: '' }, { year: month, month: year, day: '' }]) {
                const half = detectInteractions(natal).filter(({ type }) => type === 'COMBINATION_HALF');
                assert.equal(half.length, 1);
                assert.equal(half[0].targetElement, target);
                assert.equal(half[0].transformationStatus, 'NOT_EVALUATED');
                assert.equal('resultElement' in half[0], false);
            }
        }
        for (const [year, month] of [['申', '辰'], ['寅', '戌'], ['亥', '未'], ['巳', '丑']]) {
            assert.equal(
                detectInteractions({ year, month, day: '' }).some(({ type }) => type === 'COMBINATION_HALF'),
                false,
            );
        }
    });

    test('retains both constituent halves alongside a full trine without claiming transformation', () => {
        const interactions = detectInteractions({ year: '申', month: '子', day: '辰' });
        const halves = interactions.filter(({ type }) => type === 'COMBINATION_HALF');
        assert.deepEqual(halves.map(({ pillars }) => pillars), [['year', 'month'], ['month', 'day']]);
        const full = interactions.filter(({ type }) => type === 'TRINE');
        assert.equal(full.length, 1);
        assert.equal(full[0].targetElement, 'water');
        assert.equal(full[0].resultElement, 'water');
        assert.equal(full[0].transformationStatus, 'NOT_EVALUATED');
    });

    test('keeps 六合 structural-only even when the same pair also has destruction', () => {
        const interactions = detectInteractions({ year: '巳', month: '申', day: '' });
        assert.deepEqual(interactions.map(({ type }) => type), ['COMBINATION_2', 'DESTRUCTION']);
        const combination = interactions[0];
        assert.equal(combination.transformationStatus, 'NOT_EVALUATED');
        assert.equal('resultElement' in combination, false);
        assert.equal('targetElement' in combination, false);
        assert.equal(interactions[1].transformationStatus, 'NOT_APPLICABLE');
    });

    test('accepts legacy annual strings and distinct dayun/annual occurrences without inventing an hour', () => {
        const natal = { year: '申', month: '寅', day: '申' };
        assert.deepEqual(detectInteractions(natal, '申'), detectInteractions(natal, { annualBranch: '申' }));
        assert.deepEqual(detectInteractions(natal), detectInteractions({ ...natal, hour: '' }));
        assert.deepEqual(detectInteractions(natal), detectInteractions(natal, { dayunBranch: '', annualBranch: '' }));
        const interactions = detectInteractions(natal, { dayunBranch: '申', annualBranch: '申' });
        assert.deepEqual(
            interactions.filter(({ type }) => type === 'CLASH').map(({ pillars }) => pillars),
            [['year', 'month'], ['month', 'day'], ['month', 'dayun'], ['month', 'annual']],
        );
        assert.equal(interactions.some(({ pillars }) => pillars.includes('hour')), false);
    });

    test('keeps stable IDs, positional branch/pillar alignment, ordering and a score-free contract', () => {
        const natal = { year: '申', month: '子', day: '辰', hour: '申' };
        const context = { dayunBranch: '寅', annualBranch: '子' };
        const expectedBranches: Record<InteractionPillar, string> = {
            ...natal, dayun: context.dayunBranch, annual: context.annualBranch,
        };
        const interactions = detectInteractions(natal, context);
        assert.deepEqual(
            interactions,
            detectInteractions({ hour: '申', day: '辰', month: '子', year: '申' }, { annualBranch: '子', dayunBranch: '寅' }),
        );
        assert.equal(new Set(interactions.map(({ id }) => id)).size, interactions.length);
        for (const interaction of interactions) {
            assert.equal(new Set(interaction.pillars).size, interaction.pillars.length);
            assert.deepEqual(interaction.branches, interaction.pillars.map(pillar => expectedBranches[pillar]));
            assert.equal(
                interaction.id,
                `${interaction.type}:${interaction.pillars.map((pillar, index) => `${pillar}:${interaction.branches[index]}`).join('|')}`,
            );
            for (const field of ['weight', 'score', 'status', 'effectiveWeight', 'energyDelta']) {
                assert.equal(field in interaction, false);
            }
        }
    });

    test('rejects invalid non-empty branch values at every supported role', () => {
        const natal = { year: '申', month: '子', day: '辰', hour: '午' };
        for (const invalid of ['甲', '子午', ' ', 'toString']) {
            for (const role of ['year', 'month', 'day', 'hour']) {
                assert.throws(() => detectInteractions({ ...natal, [role]: invalid }), RangeError);
            }
            for (const role of ['dayunBranch', 'annualBranch']) {
                assert.throws(() => detectInteractions(natal, { [role]: invalid }), RangeError);
            }
            assert.throws(() => detectInteractions(natal, invalid), RangeError);
        }
    });

    test('calculateBaziChart uses the same occurrence-preserving detector', () => {
        const chart = calculateBaziChart(BEIJING_CHART_INPUT);
        assert.deepEqual(chart.interactions, detectInteractions({
            year: chart.pillars.year.branch,
            month: chart.pillars.month.branch,
            day: chart.pillars.day.branch,
            hour: chart.pillars.hour?.branch,
        }));
    });
});
