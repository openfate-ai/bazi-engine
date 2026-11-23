import { calculateBaziChart, readBaziRelationship } from '../../src/index';
import type { BaziInput, DayBoundaryMode } from '../../src/types';

declare const __RULE_LINES__: Record<string, number>;
declare const __REVISION__: string;

if (window.parent !== window && new URLSearchParams(location.search).has('embed')) {
    document.documentElement.classList.add('embedded');
}

const fields = ['year', 'month', 'day', 'hour'] as const;
const names = { year: '年柱', month: '月柱', day: '日柱', hour: '時柱' };
const status = document.querySelector<HTMLElement>('#status')!;
const results = document.querySelector<HTMLElement>('#results')!;
const form = document.querySelector<HTMLFormElement>('#controls')!;

function element<K extends keyof HTMLElementTagNameMap>(tag: K, text?: string) {
    const node = document.createElement(tag);
    if (text !== undefined) node.textContent = text;
    return node;
}

function inputFor(side: string): BaziInput {
    const [year, month, day] = document.querySelector<HTMLInputElement>('#date')!.value.split('-').map(Number);
    const [hour, minute] = document.querySelector<HTMLInputElement>('#time-' + side)!.value.split(':').map(Number);
    const dayBoundaryMode = document.querySelector<HTMLSelectElement>('#mode-' + side)!.value as DayBoundaryMode;
    return { year, month, day, hour, minute, gender: 'female', calendarType: 'solar', longitude: 120,
        timezone: 8, dstOffset: 0, enableTrueSolarTime: true, dayBoundaryMode, daYunTimingVersion: 'DAYUN_SECOND_V2' };
}

function calculate(input: BaziInput) {
    const chart = calculateBaziChart(input);
    return { input, chart, reading: readBaziRelationship(chart) };
}

function card(name: string, result: ReturnType<typeof calculate>, changed: readonly string[]) {
    const { chart, reading, input } = result;
    const article = element('article');
    const pillars = element('div');
    pillars.className = 'pillars';
    for (const role of fields) {
        const cell = element('div');
        cell.className = changed.includes(role) ? 'pillar changed' : 'pillar';
        cell.append(element('small', names[role]), element('strong', chart.pillars[role]?.ganZhi ?? '未知'));
        pillars.append(cell);
    }
    article.append(element('h2', name), pillars, element('small', '真太陽時　' + chart.solarTimeInfo?.trueSolarDateTime),
        element('h3', reading.title), element('p', reading.body), element('p', reading.practice), element('h3', '這段依據'));
    const list = element('ul');
    for (const proof of reading.evidence) list.append(element('li', proof.label));
    const ruleLink = element('a', reading.ruleId + ' · v' + reading.rulesVersion);
    const line = __RULE_LINES__[reading.ruleId];
    ruleLink.href = 'https://github.com/openfate-ai/bazi-engine/blob/' + __REVISION__ +
        '/src/readings/relationship.ts' + (line ? '#L' + line : '');
    article.append(list, ruleLink);
    if (reading.otherRelations.length) {
        const all = element('details');
        all.append(element('summary', '同時出現的其他關係'), element('p', reading.otherRelations.map(x => x.label).join('、')));
        article.append(all);
    }
    const details = element('details');
    const snippet = "const { calculateBaziChart, readBaziRelationship } = require('@openfate/bazi-engine');\n" +
        'const chart = calculateBaziChart(' + JSON.stringify(input, null, 2) + ');\nconsole.log(readBaziRelationship(chart));';
    const snippetBlock = element('pre', snippet);
    const copy = element('button', '複製程式碼');
    copy.type = 'button';
    const feedback = element('span');
    feedback.setAttribute('role', 'status');
    copy.addEventListener('click', async () => {
        try {
            await navigator.clipboard.writeText(snippet);
            feedback.textContent = ' 已複製';
        } catch {
            const range = document.createRange();
            range.selectNodeContents(snippetBlock);
            const selection = window.getSelection();
            selection?.removeAllRanges();
            selection?.addRange(range);
            feedback.textContent = ' 已選取，請使用系統複製功能。';
        }
    });
    details.append(element('summary', '用 SDK 重算這張盤'), snippetBlock, copy, feedback);
    article.append(details);
    return article;
}

function compare() {
    results.replaceChildren();
    if (!form.checkValidity()) { status.textContent = '請輸入兩個時刻和有效的日期。'; return; }
    try {
        const a = calculate(inputFor('a'));
        const b = calculate(inputFor('b'));
        const changed = fields.filter(k => a.chart.pillars[k]?.ganZhi !== b.chart.pillars[k]?.ganZhi);
        const diff = changed.length ? changed.map(k => names[k]).join('、') + '不同' : '四柱相同';
        status.textContent = diff + (a.reading.ruleId === b.reading.ruleId ? '，兩盤選中同一條規則。' : '，兩盤選中不同的解讀規則。');
        results.append(card('甲盤', a, changed), card('乙盤', b, changed));
    } catch (error) {
        status.textContent = '無法排盤。' + (error instanceof Error ? error.message : String(error));
    }
}

form.addEventListener('submit', e => { e.preventDefault(); compare(); });
form.addEventListener('input', () => { results.replaceChildren(); status.textContent = '設定已變更，按「比較兩張盤」更新。'; });
compare();
