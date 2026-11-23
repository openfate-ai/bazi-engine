import assert from 'node:assert/strict';
import { test } from 'node:test';
import { calculateBaziChart } from '../src/index';

function natal(hour: number, gender: 'male' | 'female' = 'female') {
    const chart = calculateBaziChart({
        year: 1991, month: 10, day: 18, hour, minute: 30, gender,
        timezone: 8, longitude: 120, dstOffset: 0, enableTrueSolarTime: true,
        dayBoundaryMode: 'ZI_HOUR_23',
    });
    return { pillars: chart.pillars, interactions: chart.interactions, dayMaster: chart.dayMaster.char };
}

test('the same morning changes the career advice, the relationship advice and their receipts', async () => {
    const { lifeBook, chapterPractice } = await import('../corpus/book.mjs');
    const early = lifeBook(natal(6));
    const late = lifeBook(natal(8));
    assert.match(early.work.parts[0].name, /獨立接手/);
    assert.match(early.work.parts[0].text, /未見食傷/);
    assert.match(late.work.parts[0].name, /哪一步你有權改/);
    assert.match(late.work.parts[0].text, /時干壬為傷官/);
    assert.ok(late.work.parts[0].ref.includes('/pillars/hour/stemTenGod'));
    assert.match(early.love.parts[0].text, /日支酉與時支卯相沖/);
    assert.match(late.love.parts[0].text, /日支酉與時支辰六合/);
    assert.match(late.love.parts[0].text, /月支戌與時支辰相沖/);
    const sample = late.work.parts.find((part: { caseSignal?: string }) => part.caseSignal);
    const exercise = chapterPractice('work').cases[sample.name];
    assert.ok(exercise.situation && exercise.follow);
    assert.ok(!sample.text.includes(exercise.situation) && !sample.text.includes(exercise.follow));
    assert.equal(Object.keys(late).length, 13);
});

test('identical natal evidence yields identical life chapters across luck-direction inputs', async () => {
    const { lifeBook } = await import('../corpus/book.mjs');
    assert.deepEqual(lifeBook(natal(8, 'male')), lifeBook(natal(8, 'female')));
});
