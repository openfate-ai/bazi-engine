import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createHash } from 'node:crypto';
import { calculateBaziChart, readBaziRelationship, RELATIONSHIP_RULES_VERSION } from '../src';
import type { BaziInput, RelationshipRuleId } from '../src';

const base: BaziInput = { year: 1997, month: 1, day: 1, hour: 8, minute: 30,
    gender: 'female', longitude: 120, timezone: 8, dstOffset: 0,
    dayBoundaryMode: 'ZI_HOUR_23', daYunTimingVersion: 'DAYUN_SECOND_V2' };

// Fixed inputs also appear in the public, independently replayable 1997 facts file.
const fixtures: [number, number, number, RelationshipRuleId][] = [
    [8, 15, 8, 'day-hour-destruction'], [8, 15, 12, 'day-hour-harm'],
    [1, 1, 8, 'day-hour-harm'], [1, 1, 12, 'day-hour-destruction'],
    [1, 1, 0, 'day-hour-punishment'], [1, 1, 2, 'day-hour-no-link'],
    [1, 1, 14, 'day-hour-half-combination'], [1, 1, 18, 'day-hour-clash'],
    [1, 1, 20, 'day-hour-combination'], [1, 5, 12, 'day-hour-combination-month-clash'],
    [1, 7, 10, 'day-hour-group'], [1, 9, 0, 'day-hour-group'],
];

function resolvePointer(value: unknown, path: string): unknown {
    return path.slice(1).split('/').reduce<unknown>((obj, key) => (obj as Record<string, unknown>)[key], value);
}

for (const [month, day, hour, rule] of fixtures) {
    test(`1997-${month}-${day} hour ${hour}: ${rule}`, () => {
        const chart = calculateBaziChart({ ...base, month, day, hour });
        const reading = readBaziRelationship(chart);
        assert.equal(reading.ruleId, rule);
        assert.equal(reading.rulesVersion, RELATIONSHIP_RULES_VERSION);
        assert.equal(reading.status, 'available');
        for (const proof of [...reading.evidence, ...reading.otherRelations]) {
            assert.equal(resolvePointer(chart, proof.ref), proof.value);
        }
    });
}

test('coexisting combination and destruction are both visible with distinct references', () => {
    const chart = calculateBaziChart({ ...base, day: 3, hour: 16 });
    const reading = readBaziRelationship(chart);
    assert.equal(reading.ruleId, 'day-hour-combination');
    assert.ok(reading.otherRelations.some(x => x.label.includes('相破')));
    assert.ok(reading.evidence.some(x => x.label.includes('六合')));
});

test('unchanged chart facts select the same wording when the clock moves one minute', () => {
    const a = calculateBaziChart({ ...base, month: 8, day: 15, minute: 30 });
    const b = calculateBaziChart({ ...base, month: 8, day: 15, minute: 31 });
    assert.notDeepEqual(a.calendar.civilSolar,b.calendar.civilSolar);
    assert.deepEqual(readBaziRelationship(a),readBaziRelationship(b));
});

test('an unknown hour remains explicitly unknown', () => {
    const { hour, minute, ...unknown } = base;
    const chart = calculateBaziChart(unknown);
    const result = readBaziRelationship(chart);
    assert.equal(result.status,'unknown-hour');
    assert.equal(result.ruleId,'hour-unknown');
    assert.deepEqual(result.otherRelations,[]);
    assert.equal(resolvePointer(chart, result.evidence[1].ref),null);
});

test('a three-pillar group keeps both distinct natal positions if branches repeat', () => {
    const chart = calculateBaziChart({ ...base, day: 2, hour: 16 });
    const reading = readBaziRelationship(chart);
    const groups = [...reading.evidence, ...reading.otherRelations].filter(x => x.value?.startsWith('TRINE'));
    assert.equal(groups.length,2);
    assert.equal(new Set(groups.map(x => x.value)).size,2);
});

test('published chapter text is versioned across all ten editorial outcomes', () => {
    const outputs = new Map<string, string[]>();
    const charts = fixtures.map(([month, day, hour]) => calculateBaziChart({ ...base, month, day, hour }));
    charts.push(calculateBaziChart({ year: 1997, month: 1, day: 1, gender: 'female' }));
    for (const chart of charts) {
        const { ruleId, title, body, practice } = readBaziRelationship(chart);
        outputs.set(ruleId, [ruleId, title, body, practice]);
    }
    const texts = Array.from(outputs.keys()).sort().map(key => outputs.get(key));
    const hash = createHash('sha256').update(JSON.stringify(texts)).digest('hex');
    const published: Record<string, string> = { '1.0.0': 'adcd8f618bf429d31a96614b5b80f0a5dd2a65a1a73ceac3406722daf2b1cf18' };
    assert.equal(texts.length, 10);
    assert.equal(hash, published[RELATIONSHIP_RULES_VERSION], 'publish a new rule version for revised chapter text');
});
