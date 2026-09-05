// ============================================================================
// @openfate/bazi-engine — Raw Branch Interaction Detector
// Enumerates occurrence relationships; settlement, scoring and energy stay private.
// ============================================================================

/* Types */
import type {
    BranchInteraction,
    FiveElement,
    InteractionContext,
    InteractionPillar,
    InteractionType,
    NatalBranches,
} from '../types';

/* Constants */
import { BRANCHES } from '../constants';

type PillarBranch = { branch: string; pillar: InteractionPillar };
type BranchPair = readonly [string, string];
type BranchTriple = readonly [string, string, string];

interface InteractionRule {
    type: InteractionType;
    branches: BranchPair | BranchTriple;
    description: string;
    targetElement?: FiveElement;
}

const CLASHES: readonly BranchPair[] = [
    ['子', '午'], ['丑', '未'], ['寅', '申'],
    ['卯', '酉'], ['辰', '戌'], ['巳', '亥'],
];

const COMBINATIONS_2: readonly BranchPair[] = [
    ['子', '丑'], ['寅', '亥'], ['卯', '戌'],
    ['辰', '酉'], ['巳', '申'], ['午', '未'],
];

const TRINES: readonly { group: BranchTriple; target: FiveElement }[] = [
    { group: ['申', '子', '辰'], target: 'water' },
    { group: ['亥', '卯', '未'], target: 'wood' },
    { group: ['寅', '午', '戌'], target: 'fire' },
    { group: ['巳', '酉', '丑'], target: 'metal' },
];

const DIRECTIONAL: readonly { group: BranchTriple; target: FiveElement }[] = [
    { group: ['寅', '卯', '辰'], target: 'wood' },
    { group: ['巳', '午', '未'], target: 'fire' },
    { group: ['申', '酉', '戌'], target: 'metal' },
    { group: ['亥', '子', '丑'], target: 'water' },
];

const PUNISHMENTS: readonly { branches: BranchPair | BranchTriple; description: string }[] = [
    { branches: ['寅', '巳', '申'], description: 'Ungrateful Punishment (无恩之刑)' },
    { branches: ['丑', '戌', '未'], description: 'Bullying Punishment (持势之刑)' },
    { branches: ['子', '卯'], description: 'Uncivilized Punishment (无礼之刑)' },
    { branches: ['辰', '辰'], description: 'Self-Punishment (自刑)' },
    { branches: ['午', '午'], description: 'Self-Punishment (自刑)' },
    { branches: ['酉', '酉'], description: 'Self-Punishment (自刑)' },
    { branches: ['亥', '亥'], description: 'Self-Punishment (自刑)' },
];

const DESTRUCTIONS: readonly BranchPair[] = [
    ['子', '酉'], ['丑', '辰'], ['寅', '亥'],
    ['卯', '午'], ['巳', '申'], ['未', '戌'],
];

const HARMS: readonly BranchPair[] = [
    ['子', '未'], ['丑', '午'], ['寅', '巳'],
    ['卯', '辰'], ['申', '亥'], ['酉', '戌'],
];

const INTERACTION_ORDER: readonly InteractionType[] = [
    'CLASH', 'COMBINATION_2', 'COMBINATION_HALF', 'TRINE',
    'DIRECTIONAL', 'PUNISHMENT', 'DESTRUCTION', 'HARM',
];
const VALID_BRANCHES = new Set(BRANCHES.map(({ char }) => char));

/** Multiset key preserves repeated branches such as 午午. */
function branchKey(branches: readonly string[]): string {
    return [...branches].sort().join('');
}

/** Index rules once; detection itself visits all distinct occurrence pairs/triples. */
function createRuleIndex(): ReadonlyMap<string, readonly InteractionRule[]> {
    const rules: InteractionRule[] = [
        ...CLASHES.map(branches => ({
            type: 'CLASH' as const, branches, description: `Clash (${branches.join('')}相冲)`,
        })),
        ...COMBINATIONS_2.map(branches => ({
            type: 'COMBINATION_2' as const, branches, description: `Combination (${branches.join('')}六合)`,
        })),
        ...TRINES.map(({ group, target }) => ({
            type: 'TRINE' as const, branches: group, targetElement: target,
            description: `Trine (${group.join('')}三合 — ${target})`,
        })),
        ...DIRECTIONAL.map(({ group, target }) => ({
            type: 'DIRECTIONAL' as const, branches: group, targetElement: target,
            description: `Directional (${group.join('')}三会 — ${target})`,
        })),
        ...PUNISHMENTS.map(({ branches, description }) => ({
            type: 'PUNISHMENT' as const, branches, description: `${description} — ${branches.join('')}`,
        })),
        ...DESTRUCTIONS.map(branches => ({
            type: 'DESTRUCTION' as const, branches, description: `Destruction (${branches.join('')}相破)`,
        })),
        ...HARMS.map(branches => ({
            type: 'HARM' as const, branches, description: `Harm (${branches.join('')}相害)`,
        })),
    ];

    // The middle member is the cardinal/king branch. Endpoint-only pairs are not half trines.
    for (const { group: [first, king, last], target } of TRINES) {
        for (const branches of [[first, king], [king, last]] as const) {
            rules.push({
                type: 'COMBINATION_HALF', branches, targetElement: target,
                description: `Half Trine (${branches.join('')}半合 — ${target})`,
            });
        }
    }

    const index = new Map<string, InteractionRule[]>();
    for (const rule of rules) {
        const key = branchKey(rule.branches);
        const existing = index.get(key);
        if (existing) existing.push(rule);
        else index.set(key, [rule]);
    }
    return index;
}

const RULE_INDEX = createRuleIndex();

/** Preserve role identity and reject non-branch inputs instead of silently hiding them. */
function collectBranches(natal: NatalBranches, context: InteractionContext): PillarBranch[] {
    const candidates: { branch: string | undefined; pillar: InteractionPillar }[] = [
        { branch: natal.year, pillar: 'year' },
        { branch: natal.month, pillar: 'month' },
        { branch: natal.day, pillar: 'day' },
        { branch: natal.hour, pillar: 'hour' },
        { branch: context.dayunBranch, pillar: 'dayun' },
        { branch: context.annualBranch, pillar: 'annual' },
    ];
    const nodes: PillarBranch[] = [];
    for (const { branch, pillar } of candidates) {
        if (branch === undefined || branch === '') continue;
        if (!VALID_BRANCHES.has(branch)) {
            throw new RangeError(`Invalid Earthly Branch for ${pillar}`);
        }
        nodes.push({ branch, pillar });
    }
    return nodes;
}

/** Build an unweighted relationship, never a transformation or conflict-resolution verdict. */
function createInteraction(rule: InteractionRule, nodes: readonly PillarBranch[]): BranchInteraction {
    const isCombination = rule.type === 'COMBINATION_2' || rule.type === 'COMBINATION_HALF'
        || rule.type === 'TRINE' || rule.type === 'DIRECTIONAL';
    const interaction: BranchInteraction = {
        id: `${rule.type}:${nodes.map(({ pillar, branch }) => `${pillar}:${branch}`).join('|')}`,
        type: rule.type,
        branches: nodes.map(({ branch }) => branch),
        pillars: nodes.map(({ pillar }) => pillar),
        transformationStatus: isCombination ? 'NOT_EVALUATED' : 'NOT_APPLICABLE',
        description: rule.description,
    };
    if (rule.targetElement !== undefined) {
        interaction.targetElement = rule.targetElement;
        // Retained for existing full-group consumers only; affinity is not proven transformation.
        if (rule.type === 'TRINE' || rule.type === 'DIRECTIONAL') {
            interaction.resultElement = rule.targetElement;
        }
    }
    return interaction;
}

/**
 * Enumerate every raw natal/dynamic relationship with pillar identity intact.
 * Missing/empty hour is omitted. A legacy annual string or a dayun/annual context is accepted.
 * Half trines coexist with full groups; competing relationships are not cancelled or scored.
 */
export function detectInteractions(
    natal: NatalBranches,
    annualBranchOrContext?: string | InteractionContext,
): BranchInteraction[] {
    const context = typeof annualBranchOrContext === 'string'
        ? { annualBranch: annualBranchOrContext }
        : annualBranchOrContext ?? {};
    const nodes = collectBranches(natal, context);
    const results: BranchInteraction[] = [];

    const appendMatching = (occurrences: readonly PillarBranch[]): void => {
        const rules = RULE_INDEX.get(branchKey(occurrences.map(({ branch }) => branch)));
        if (!rules) return;
        for (const rule of rules) results.push(createInteraction(rule, occurrences));
    };

    for (let first = 0; first < nodes.length; first++) {
        for (let second = first + 1; second < nodes.length; second++) {
            appendMatching([nodes[first], nodes[second]]);
            for (let third = second + 1; third < nodes.length; third++) {
                appendMatching([nodes[first], nodes[second], nodes[third]]);
            }
        }
    }

    // Filtering preserves the fixed role-order traversal within each category.
    const ordered: BranchInteraction[] = [];
    for (const type of INTERACTION_ORDER) {
        ordered.push(...results.filter(result => result.type === type));
    }
    return ordered;
}
