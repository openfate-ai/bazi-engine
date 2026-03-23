// ============================================================================
// @openfate/bazi-engine — Branch Interaction Detector
// Detects classical Clash, Combination, Punishment, Destruction, Harm.
// Returns presence/type only — scoring and energy deltas are NOT included.
// ============================================================================

import { BranchInteraction, FiveElement } from '../types';

// ── Classical Detection Tables ───────────────────────────────────────────────

/** Six Clashes (六冲) */
const CLASHES: [string, string][] = [
    ['子', '午'], ['丑', '未'], ['寅', '申'],
    ['卯', '酉'], ['辰', '戌'], ['巳', '亥'],
];

/** Six Combinations (六合 — 2-branch) */
const COMBINATIONS_2: { pair: [string, string]; result: FiveElement }[] = [
    { pair: ['子', '丑'], result: 'earth' },
    { pair: ['寅', '亥'], result: 'wood'  },
    { pair: ['卯', '戌'], result: 'fire'  },
    { pair: ['辰', '酉'], result: 'metal' },
    { pair: ['巳', '申'], result: 'water' },
    { pair: ['午', '未'], result: 'fire'  },
];

/** Trines (三合 — 3-branch) */
const TRINES: { group: [string, string, string]; result: FiveElement }[] = [
    { group: ['申', '子', '辰'], result: 'water' },
    { group: ['亥', '卯', '未'], result: 'wood'  },
    { group: ['寅', '午', '戌'], result: 'fire'  },
    { group: ['巳', '酉', '丑'], result: 'metal' },
];

/** Directional (三会 — Seasonal) */
const DIRECTIONAL: { group: [string, string, string]; result: FiveElement }[] = [
    { group: ['寅', '卯', '辰'], result: 'wood'  },
    { group: ['巳', '午', '未'], result: 'fire'  },
    { group: ['申', '酉', '戌'], result: 'metal' },
    { group: ['亥', '子', '丑'], result: 'water' },
];

/** Punishments (刑) */
const PUNISHMENTS: { branches: string[]; desc: string }[] = [
    { branches: ['寅', '巳', '申'], desc: 'Ungrateful Punishment (无恩之刑)' },
    { branches: ['丑', '戌', '未'], desc: 'Bullying Punishment (持势之刑)' },
    { branches: ['子', '卯'],       desc: 'Uncivilized Punishment (无礼之刑)' },
    { branches: ['辰', '辰'],       desc: 'Self-Punishment (自刑)' },
    { branches: ['午', '午'],       desc: 'Self-Punishment (自刑)' },
    { branches: ['酉', '酉'],       desc: 'Self-Punishment (自刑)' },
    { branches: ['亥', '亥'],       desc: 'Self-Punishment (自刑)' },
];

/** Destructions (破) */
const DESTRUCTIONS: [string, string][] = [
    ['子', '酉'], ['丑', '辰'], ['寅', '亥'],
    ['卯', '午'], ['巳', '申'], ['未', '戌'],
];

/** Harms (害) */
const HARMS: [string, string][] = [
    ['子', '未'], ['丑', '午'], ['寅', '巳'],
    ['卯', '辰'], ['申', '亥'], ['酉', '戌'],
];

// ── Helper ───────────────────────────────────────────────────────────────────

type PillarBranch = { branch: string; pillar: string };

function hasBranch(branches: PillarBranch[], target: string): PillarBranch | undefined {
    return branches.find(b => b.branch === target);
}

function groupHas(branches: PillarBranch[], group: string[]): PillarBranch[] | null {
    const found = group.map(b => hasBranch(branches, b)).filter(Boolean) as PillarBranch[];
    return found.length === group.length ? found : null;
}

// ── Main Detector ────────────────────────────────────────────────────────────

/**
 * detectInteractions
 *
 * Scans the natal chart branches for all classical Ganzhi interactions.
 * An optional `annualBranch` can be passed to detect dynamic year interactions.
 *
 * @param natal       - The four natal chart branches { year, month, day, hour }
 * @param annualBranch - Optional: the Taisui (太岁) branch for the year being analyzed
 */
export function detectInteractions(
    natal: { year: string; month: string; day: string; hour: string },
    annualBranch?: string
): BranchInteraction[] {
    const results: BranchInteraction[] = [];

    const allBranches: PillarBranch[] = [
        { branch: natal.year,  pillar: 'year'  },
        { branch: natal.month, pillar: 'month' },
        { branch: natal.day,   pillar: 'day'   },
        { branch: natal.hour,  pillar: 'hour'  },
    ].filter(b => b.branch !== '');

    if (annualBranch) {
        allBranches.push({ branch: annualBranch, pillar: 'annual' });
    }

    // 1. Clashes
    for (const [a, b] of CLASHES) {
        const na = hasBranch(allBranches, a);
        const nb = hasBranch(allBranches, b);
        if (na && nb) {
            results.push({
                type: 'CLASH',
                branches: [a, b],
                pillars: [na.pillar, nb.pillar],
                description: `Clash (${a}${b}相冲)`,
            });
        }
    }

    // 2. Six Combinations (六合)
    for (const combo of COMBINATIONS_2) {
        const [a, b] = combo.pair;
        const na = hasBranch(allBranches, a);
        const nb = hasBranch(allBranches, b);
        if (na && nb) {
            results.push({
                type: 'COMBINATION_2',
                branches: [a, b],
                pillars: [na.pillar, nb.pillar],
                resultElement: combo.result,
                description: `Combination (${a}${b}六合 — ${combo.result})`,
            });
        }
    }

    // 3. Trines (三合)
    for (const trine of TRINES) {
        const found = groupHas(allBranches, [...trine.group]);
        if (found) {
            results.push({
                type: 'TRINE',
                branches: [...trine.group],
                pillars: found.map(n => n.pillar),
                resultElement: trine.result,
                description: `Trine (${trine.group.join('')}三合 — ${trine.result})`,
            });
        }
    }

    // 4. Directional (三会)
    for (const dir of DIRECTIONAL) {
        const found = groupHas(allBranches, [...dir.group]);
        if (found) {
            results.push({
                type: 'DIRECTIONAL',
                branches: [...dir.group],
                pillars: found.map(n => n.pillar),
                resultElement: dir.result,
                description: `Directional (${dir.group.join('')}三会 — ${dir.result})`,
            });
        }
    }

    // 5. Punishments (刑)
    for (const pun of PUNISHMENTS) {
        const found = groupHas(allBranches, pun.branches);
        if (found) {
            results.push({
                type: 'PUNISHMENT',
                branches: [...pun.branches],
                pillars: found.map(n => n.pillar),
                description: `${pun.desc} — ${pun.branches.join('')}`,
            });
        }
    }

    // 6. Destructions (破)
    for (const [a, b] of DESTRUCTIONS) {
        const na = hasBranch(allBranches, a);
        const nb = hasBranch(allBranches, b);
        if (na && nb) {
            results.push({
                type: 'DESTRUCTION',
                branches: [a, b],
                pillars: [na.pillar, nb.pillar],
                description: `Destruction (${a}${b}相破)`,
            });
        }
    }

    // 7. Harms (害)
    for (const [a, b] of HARMS) {
        const na = hasBranch(allBranches, a);
        const nb = hasBranch(allBranches, b);
        if (na && nb) {
            results.push({
                type: 'HARM',
                branches: [a, b],
                pillars: [na.pillar, nb.pillar],
                description: `Harm (${a}${b}相害)`,
            });
        }
    }

    return results;
}
