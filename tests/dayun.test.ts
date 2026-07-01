import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { calculateBaziChart, BaziInput } from '../src/index';

/**
 * Da Yun (大运 Major Luck Cycles) — direction, sequence, 起运, and DST propagation.
 *
 * Da Yun delegates 起运 + direction to lunar-javascript's eightChar.getYun(); index.test.ts
 * and contract.test.ts assert only on the four pillars, so this whole layer was untested.
 * A lunar-javascript bump or a refactor of cycles.ts could silently break direction
 * (阳男阴女顺行 / 阴男阳女逆行), the cycle sequence, or 起运 — with no test to catch it.
 *
 * Critically it also locks the DST fix's reach into 起运: a midnight-DST birth must not only
 * get the right day pillar but the same luck onset as the equivalent standard-time chart,
 * proving DST is normalized before getYun counts to the 节 (not just before pillar generation).
 *
 * Reference values captured from calculateBaziChart (1990-06-15 12:00, lon 116.4, tz 8, TST off).
 */

const STEMS = '甲乙丙丁戊己庚辛壬癸';
const BRANCHES = '子丑寅卯辰巳午未申酉戌亥';

function jiaziIndex(ganZhi: string): number {
    const s = STEMS.indexOf(ganZhi[0]);
    const b = BRANCHES.indexOf(ganZhi[1]);
    for (let i = 0; i < 60; i++) {
        if (i % 10 === s && i % 12 === b) return i;
    }
    throw new Error(`bad ganZhi ${ganZhi}`);
}

function base(overrides: Partial<BaziInput>): BaziInput {
    return {
        year: 1990, month: 6, day: 15, hour: 12, minute: 0,
        gender: 'male', longitude: 116.4, timezone: 8, enableTrueSolarTime: false,
        ...overrides,
    } as BaziInput;
}

describe('Da Yun — direction, sequence, 起运, DST propagation', () => {
    test('direction rule: 阳男阴女顺行, 阴男阳女逆行 (year-stem yin/yang × gender)', () => {
        // 1990 庚午 = Yang year; 1991 辛未 = Yin year.
        assert.equal(calculateBaziChart(base({ gender: 'male' })).daYun.isForward, true, 'Yang year + male → forward');
        assert.equal(calculateBaziChart(base({ gender: 'female' })).daYun.isForward, false, 'Yang year + female → backward');
        assert.equal(calculateBaziChart(base({ year: 1991, gender: 'male' })).daYun.isForward, false, 'Yin year + male → backward');
        assert.equal(calculateBaziChart(base({ year: 1991, gender: 'female' })).daYun.isForward, true, 'Yin year + female → forward');
    });

    test('first cycle steps exactly one 干支 from the MONTH pillar in the flow direction', () => {
        for (const { o, label } of [
            { o: base({ gender: 'male' }), label: 'Yang male' },
            { o: base({ gender: 'female' }), label: 'Yang female' },
            { o: base({ year: 1991, gender: 'male' }), label: 'Yin male' },
            { o: base({ year: 1991, gender: 'female' }), label: 'Yin female' },
        ]) {
            const c = calculateBaziChart(o);
            const step = c.daYun.isForward ? 1 : -1;
            const expected = (jiaziIndex(c.pillars.month.ganZhi) + step + 60) % 60;
            assert.equal(
                jiaziIndex(c.daYun.cycles[0].ganZhi), expected,
                `${label}: first cycle must be month pillar ${c.pillars.month.ganZhi} stepped by ${step}, got ${c.daYun.cycles[0].ganZhi}`,
            );
        }
    });

    test('nine cycles, each stepping one 干支 in the flow direction (concrete anchors)', () => {
        const yangMale = calculateBaziChart(base({ gender: 'male' }));
        assert.equal(yangMale.daYun.cycles.length, 9);
        assert.deepEqual(
            yangMale.daYun.cycles.map(c => c.ganZhi),
            ['癸未', '甲申', '乙酉', '丙戌', '丁亥', '戊子', '己丑', '庚寅', '辛卯'],
            'forward sequence drift',
        );
        const yangFemale = calculateBaziChart(base({ gender: 'female' }));
        assert.deepEqual(
            yangFemale.daYun.cycles.map(c => c.ganZhi),
            ['辛巳', '庚辰', '己卯', '戊寅', '丁丑', '丙子', '乙亥', '甲戌', '癸酉'],
            'backward sequence drift',
        );
        for (let i = 1; i < yangMale.daYun.cycles.length; i++) {
            const prev = jiaziIndex(yangMale.daYun.cycles[i - 1].ganZhi);
            assert.equal(jiaziIndex(yangMale.daYun.cycles[i].ganZhi), (prev + 1) % 60);
        }
    });

    test('起运 sanity: startAge in [0,10) stepping +10, offset within a decade, responds to birth time', () => {
        const c = calculateBaziChart(base({ gender: 'male' }));
        assert.ok(c.daYun.cycles[0].startAge >= 0 && c.daYun.cycles[0].startAge < 10, '起运 age must be within a decade');
        for (let i = 1; i < c.daYun.cycles.length; i++) {
            assert.equal(c.daYun.cycles[i].startAge - c.daYun.cycles[i - 1].startAge, 10);
        }
        assert.ok(c.daYun.startOffset.years >= 0 && c.daYun.startOffset.years < 10);
        assert.ok(c.daYun.startOffset.months >= 0 && c.daYun.startOffset.months < 12);
        assert.ok(c.daYun.startOffset.days >= 0 && c.daYun.startOffset.days < 31);
        // 起运 counts to the 节, so it must depend on the actual birth time.
        assert.notEqual(
            calculateBaziChart(base({ hour: 2 })).daYun.cycles[0].startAge,
            calculateBaziChart(base({ hour: 22 })).daYun.cycles[0].startAge,
            '起运 must vary with birth time',
        );
    });

    test('DST correction propagates into 起运 (midnight rollover matches standard-time equivalent)', () => {
        // 1988-07-16 00:20 DST=1 === 1988-07-15 23:20 standard, TST off.
        const dst = calculateBaziChart(base({ year: 1988, month: 7, day: 16, hour: 0, minute: 20, dstOffset: 1 }));
        const std = calculateBaziChart(base({ year: 1988, month: 7, day: 15, hour: 23, minute: 20, dstOffset: 0 }));
        assert.equal(dst.pillars.day.ganZhi, std.pillars.day.ganZhi, 'day pillar must roll to the standard-time day');
        assert.deepEqual(dst.daYun.cycles.map(c => c.ganZhi), std.daYun.cycles.map(c => c.ganZhi), 'Da Yun sequence must match');
        assert.deepEqual(dst.daYun.startOffset, std.daYun.startOffset, '起运 offset must match');
        assert.equal(dst.daYun.isForward, std.daYun.isForward, 'direction must match');
        assert.equal(dst.daYun.cycles[0].startAge, std.daYun.cycles[0].startAge, '起运 age must match');
    });
});
