import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import {
    BRANCH_HIDDEN_STEMS,
    calculateBaziChart,
    calculateTenGod,
} from '../src/index';

describe('hidden-stem Ten God alignment (regression: 巳 ordering)', () => {
    test('巳 hidden stems follow the classical 本·中·余 order 丙·庚·戊', () => {
        assert.deepEqual(
            BRANCH_HIDDEN_STEMS['巳'].map(item => item.stem),
            ['丙', '庚', '戊'],
        );
    });

    test('each hidden-stem tenGod matches calculateTenGod() across every pillar', () => {
        // 2025-02-03 22:12 → year pillar 乙巳, so the branch 巳 is exercised.
        const chart = calculateBaziChart({
            year: 2025,
            month: 2,
            day: 3,
            hour: 22,
            minute: 12,
            gender: 'male',
            longitude: 120,
            timezone: 8,
            enableTrueSolarTime: false,
        });

        const dayMaster = chart.pillars.day.stem;
        const pillars = [
            chart.pillars.year,
            chart.pillars.month,
            chart.pillars.day,
            chart.pillars.hour,
        ];

        for (const pillar of pillars) {
            if (!pillar) continue;
            for (const hidden of pillar.hiddenStems) {
                const expected = calculateTenGod(dayMaster, hidden.stem);
                assert.equal(
                    hidden.tenGod,
                    expected,
                    `${pillar.branch} hidden ${hidden.stem}: got ${hidden.tenGod}, expected ${expected}`,
                );
            }
        }

        // Guard: this fixture must actually contain 巳, otherwise the test is vacuous.
        assert.ok(pillars.some(pillar => pillar?.branch === '巳'));
    });
});
