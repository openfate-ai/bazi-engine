import { parseSampleId, readCorpusSample, topicTitles } from './corpus.mjs';

import { evaluate, rules } from './atlas/rules.mjs';
import { monthReading, statusNames } from './atlas/view.mjs';

const el = id => document.getElementById(id);
const make = (tag, text) => {
  const node = document.createElement(tag);
  node.textContent = text;
  return node;
};
const hours = Array.from({ length: 12 }, (_, i) => String(i * 2).padStart(2, '0'));
const defaultId = '1991-10-18T08:30:00+08:00/female';
let current;
let activeBook;
let secondBook;
let explored = false;

for (const h of hours) el('hour').add(new Option(h + ':30', h));
for (const [key, label] of Object.entries(topicTitles)) el('topic').add(new Option(label, key));

function readState() {
  const params = new URLSearchParams(location.hash.slice(1));
  const id = params.get('id') ?? defaultId;
  const parsed = parseSampleId(id);
  const topic = params.get('chapter') ?? 'work';
  const other = params.get('other') ?? '';
  if (!Object.hasOwn(topicTitles, topic) || (other && (!hours.includes(other) || Number(other) === parsed.hour))) {
    throw new Error('Invalid selection');
  }
  return { id, topic, other };
}

function navigate(state) {
  const hash = new URLSearchParams({ id: state.id, chapter: state.topic });
  if (state.other) hash.set('other', state.other);
  if (hash.toString() !== location.hash.slice(1)) location.hash = hash.toString();
  else render();
}
function evidence(part, chart) {
  const details = document.createElement('details');
  details.append(make('summary', '這段用了哪些盤面欄位？'));
  const list = document.createElement('ul');
  for (const path of part.ref) {
    const item = document.createElement('li');
    const value = path.slice(1).split('/').reduce((v, key) => v[key], chart);
    item.append(make('code', path), make('pre', JSON.stringify(value, null, 2)));
    list.append(item);
  }
  details.append(list);
  return details;
}
function passage(part, chart, caption) {
  const block = document.createElement('div');
  if (caption) block.append(make('strong', caption));
  block.append(make('h3', part.name), make('p', part.text), evidence(part, chart));
  return block;
}
function render() {
  try {
    const state = readState();
    if (activeBook?.chart.id !== state.id) activeBook = readCorpusSample(state.id);
    current = state;
    const { chart, chapters } = activeBook;
    const hour = state.id.slice(11, 13);
    el('date').value = state.id.slice(0, 10);
    el('hour').value = hour;
    el('gender').value = state.id.split('/')[1];
    el('topic').value = state.topic;
    el('other').replaceChildren(new Option('只讀這張盤', ''));
    for (const h of hours.filter(value => value !== hour)) el('other').add(new Option(h + ':30', h));
    el('other').value = state.other;
    el('sample').textContent = el('date').value + '　' + hour + ':30　' + (el('gender').value === 'female' ? '女盤' : '男盤');
    el('pillars').replaceChildren(...chart.fourPillars.split(' ').map((pillar, index) => {
      const cell = make('span', ['年柱', '月柱', '日柱', '時柱'][index]);
      cell.append(make('strong', pillar));
      return cell;
    }));
    if (el('atlas-frame').dataset.sample !== state.id) {
      const assessment = evaluate(chart.fourPillars);
      el('atlas-evidence').textContent = monthReading(assessment)+' '+assessment.branchEvidence.join('。')+'。';
      el('atlas-links').replaceChildren();
      for (const [i, entry] of assessment.entries.entries()) {
        if (entry.status === 'outside') continue;
        const li = make('li', '');
        const link = make('a', rules[i].name);
        link.href = 'atlas/' + entry.id + '/';
        li.append(link, ' · ' + statusNames[entry.status] + '。' +
          entry.checks.filter(c => entry.status === 'match' || !c.ok).map(c => c.label).join('；') + '。');
        el('atlas-links').append(li);
      }
      el('atlas-frame').dataset.sample = state.id;
    }
    const luck = chart.daYun;
    el('onset').textContent = luck.startDate ? '第一步大運　' + luck.cycles[0].ganZhi + '\n起運　' + luck.startDate.slice(0, 10) : '交節邊界，起運日期待定。';
    const chapter = chapters[state.topic];
    el('chapter').textContent = chapter.title;
    const parts = el('parts');
    parts.classList.toggle('paired', Boolean(state.other));
    parts.replaceChildren();
    const otherId = state.id.slice(0, 11) + state.other + state.id.slice(13);
    if (state.other && secondBook?.chart.id !== otherId) secondBook = readCorpusSample(otherId);
    let changes = 0;
    for (const [index, part] of chapter.parts.entries()) {
      const row = document.createElement('section');
      row.className = 'part';
      if (!state.other) row.append(passage(part, chart));
      else {
        const other = secondBook.chapters[state.topic].parts[index];
        const changed = other.name !== part.name || other.text !== part.text;
        if (changed) changes++;
        const pair = document.createElement('div');
        pair.className = 'pair';
        pair.append(passage(part, chart, hour + ':30'), passage(other, secondBook.chart, state.other + ':30'));
        if (changed) row.append(pair);
        else {
          const details = document.createElement('details');
          details.append(make('summary', '兩篇文字相同 · ' + part.name), pair);
          row.append(details);
        }
      }
      parts.append(row);
    }
    el('status').textContent = state.other ? state.other + ':30 的四柱為 ' + secondBook.chart.fourPillars +
      '。本章共 ' + chapter.parts.length + ' 段，其中 ' + changes + ' 段文字不同。' : '';
    const landing = new URL(el('personal').href);
    landing.searchParams.set('utm_content', explored ? 'explored' : 'reader');
    el('personal').href = landing.href;
    el('error').textContent = '';
    el('reading').hidden = false;
  } catch {
    current = undefined;
    el('reading').hidden = true;
    el('error').textContent = '無法讀取這個選項。請重新選日期、代表時刻與排運性別，再按「讀這張盤」。';
  }
}

el('lookup').addEventListener('submit', event => {
  event.preventDefault();
  navigate({ id: el('date').value + 'T' + el('hour').value + ':30:00+08:00/' + el('gender').value,
    topic: current?.topic ?? 'work', other: '' });
});
for (const id of ['topic', 'other']) {
  el(id).addEventListener('change', () => {
    if (el('other').value || (current && el('topic').value !== current.topic)) explored = true;
    navigate({ ...current, topic: el('topic').value, other: el('other').value });
  });
}
el('share').addEventListener('click', async () => {
  try { await navigator.clipboard.writeText(location.href); el('status').textContent = '已複製，可分享目前這一章。'; }
  catch { el('status').textContent = '請複製瀏覽器網址列中的連結，即可分享目前這一章。'; }
});
window.addEventListener('hashchange', render);
render();
