import type { BaziChart, BranchInteraction, InteractionType } from '../types';

/** Version of the selection order, evidence contract and Traditional Chinese copy. */
export const RELATIONSHIP_RULES_VERSION = '1.0.0';

const passages = {
    'day-hour-clash': {
        title: '把最早那個約定問清楚',
        body: '如果兩個人常為見面吵架，先回想答應赴約的那一刻。一個人想把整晚留給彼此，另一個人以為吃完還能去辦事。兩邊都守約，也可能等不到自己期待的那個晚上。',
        practice: '下次先各說一件最想一起做的事，以及幾點需要離開，再決定怎麼約。',
    },
    'day-hour-combination-month-clash': {
        title: '原本都想去，後來是哪個安排撞了期？',
        body: '若晚餐早已說好，臨時改約時，可以先找出後來加進來的那件事。追問對方還想不想見面，可能會把原本談妥的事重新吵一遍。',
        practice: '把兩個約定按先後排出來，一起定下次遇到撞期時，答應前先跟誰確認。',
    },
    'day-hour-combination': {
        title: '留下已經談妥的部分',
        body: '假設兩人為租屋談不攏，先把已經點頭的條件圈起來。若雙方都想住得離車站近，就留著這項，只談兩人各自願意負擔的租金。',
        practice: '下次談之前，各寫下一項已經同意、一項還想商量的事，看看兩張紙上重疊的是什麼。',
    },
    'day-hour-destruction': {
        title: '約好了還是落空，交接在哪一步斷掉？',
        body: '假設兩個人說好輪流買菜，週末打開冰箱卻還是空的。翻回上次換班的訊息，可能一個人以為已經通知，另一個人還等著確認。先找得到漏掉的那一步，才知道下回要改什麼。',
        practice: '挑一件已談妥卻沒做成的小事，各說出自己最後收到的安排，再把接手的人和時間寫清楚。',
    },
    'day-hour-harm': {
        title: '你幫上的忙，有沒有動到對方想自己決定的事？',
        body: '假設你買齊了晚餐的菜，也順便答應朋友到家裡吃飯。對方也許很感謝第一件事，卻想親自決定第二件。再多買一次菜，未必能解開那天的尷尬。',
        practice: '問對方：「那次我幫你決定的事情裡，有哪一件你想自己選？」聽完再商量下一次怎麼辦。',
    },
    'day-hour-half-combination': {
        title: '願意一起試試，到哪一步才算答應？',
        body: '一起去看房，可能代表願意開始找，也可能只是想認識那個街區。若一方已經在算搬家費，可以先把看第二間房和付訂金分成兩次決定。',
        practice: '各自說說今天願意走到哪一步。要花錢或代簽以前，再問對方一次。',
    },
    'day-hour-group': {
        title: '兩個人的約定還牽到誰？',
        body: '若你們已談好搬家日期，交屋的人卻只能週末出現，兩個人一再調整休假也未必有用。找出第三個需要配合的環節，就知道下一通電話該打給誰。',
        practice: '拿一件最近要合力完成的事，分別列出你能決定、對方能決定，以及要等別人確認的部分。',
    },
    'day-hour-punishment': {
        title: '上次卡住的那句話，這次又出現了嗎？',
        body: '如果每次談到分工都在同一個地方停下，可以各自重述對方剛剛說的要求。有人在問今天誰有空，另一個人聽到的卻是平時誰做得太少。',
        practice: '挑最近一次對話，只重談當天那一項安排。請對方確認你聽見的是不是他原先要說的。',
    },
    'day-hour-no-link': {
        title: '先從對方真的說過的需要談起',
        body: '這張盤的日支和時支之間沒有列出直接地支關係。若想知道對方在意的是什麼，可以回到最近一次見面，問他當時最希望你怎麼回應。',
        practice: '請對方舉一個具體時刻。記下他希望你做的那件小事，下一次碰到相似情況再試。',
    },
    'hour-unknown': {
        title: '保留時柱，等出生時刻確認再讀',
        body: '目前只有年、月、日三柱。這一章用日支和時支的關係選擇生活情境，時柱留白時，這段判讀也先留白。',
        practice: '若有出生時間紀錄，可補上原始鐘點與時區後重新排盤。',
    },
} as const;

export type RelationshipRuleId = keyof typeof passages;

export interface RelationshipEvidence {
    /** JSON Pointer into the exact chart passed to readBaziRelationship. */
    ref: string;
    /** Interaction occurrence ID, pillar branch, or null for an unknown hour. */
    value: string | null;
    label: string;
}

export interface RelationshipReading {
    topic: 'relationship';
    language: 'zh-Hant';
    status: 'available' | 'unknown-hour';
    rulesVersion: string;
    ruleId: RelationshipRuleId;
    title: string;
    body: string;
    practice: string;
    evidence: RelationshipEvidence[];
    /** Other occurrences connecting day and hour, preserved independently of the selected rule. */
    otherRelations: RelationshipEvidence[];
}

const position = { year: '年支', month: '月支', day: '日支', hour: '時支', dayun: '運支', annual: '歲支' };
const relation = {
    CLASH: '相沖', COMBINATION_2: '六合', COMBINATION_HALF: '半合', TRINE: '三合',
    DIRECTIONAL: '三會', PUNISHMENT: '相刑', DESTRUCTION: '相破', HARM: '相害',
};

type Match = { item: BranchInteraction; index: number };
type Chart = Pick<BaziChart, 'pillars' | 'interactions'>;

function receipt({ item, index }: Match): RelationshipEvidence {
    const ends = item.pillars.map((role, i) => position[role] + item.branches[i]);
    return { ref: '/interactions/' + index + '/id', value: item.id, label: ends.join('、') + relation[item.type] };
}

// Editorial priority for this chapter only. A selected occurrence never cancels a coexisting one.
const orderedRules: ReadonlyArray<readonly [InteractionType, RelationshipRuleId]> = [
    ['CLASH', 'day-hour-clash'],
    ['TRINE', 'day-hour-group'],
    ['DIRECTIONAL', 'day-hour-group'],
    ['COMBINATION_2', 'day-hour-combination'],
    ['DESTRUCTION', 'day-hour-destruction'],
    ['HARM', 'day-hour-harm'],
    ['COMBINATION_HALF', 'day-hour-half-combination'],
    ['PUNISHMENT', 'day-hour-punishment'],
];

export function readBaziRelationship(chart: Chart): RelationshipReading {
    const day = chart.pillars.day.branch;
    const hour = chart.pillars.hour?.branch ?? null;
    const evidence: RelationshipEvidence[] = [
        { ref: '/pillars/day/branch', value: day, label: '日支' + day },
        hour === null
            ? { ref: '/pillars/hour', value: null, label: '時柱未提供' }
            : { ref: '/pillars/hour/branch', value: hour, label: '時支' + hour },
    ];
    const natal = chart.interactions.map((item, index) => ({ item, index }))
        .filter(({ item }) => !item.pillars.includes('annual') && !item.pillars.includes('dayun'));
    const direct = hour === null ? [] : natal.filter(({ item }) =>
        item.pillars.includes('day') && item.pillars.includes('hour'));
    let ruleId: RelationshipRuleId = hour === null ? 'hour-unknown' : 'day-hour-no-link';
    let selected: Match | undefined;
    for (const [type, id] of orderedRules) {
        selected = direct.find(({ item }) => item.type === type);
        if (!selected) continue;
        ruleId = id;
        evidence.push(receipt(selected));
        if (type === 'COMBINATION_2') {
            const clash = natal.find(({ item }) => item.type === 'CLASH'
                && item.pillars.includes('month') && item.pillars.includes('hour'));
            if (clash) {
                ruleId = 'day-hour-combination-month-clash';
                evidence.push(receipt(clash));
            }
        }
        break;
    }
    return {
        topic: 'relationship', language: 'zh-Hant', status: hour === null ? 'unknown-hour' : 'available',
        rulesVersion: RELATIONSHIP_RULES_VERSION, ruleId, ...passages[ruleId], evidence,
        otherRelations: direct.filter(match => match !== selected).map(receipt),
    };
}
