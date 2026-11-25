import { questions, roles, searchIndex, verifyIndex } from './patterns.mjs';

const el = id => document.getElementById(id);
const definitions = {
  mixed: '同一柱的地支同時牽涉六合與相沖。兩種關係都保留；統計以出生時刻計，同時刻的女男樣本合計一次。',
  gap: '對照同一時刻、四柱相同的女男兩筆排運輸入。兩個起運民用日期相差至少 1,096 天，兩筆都已算出起運日期。',
  boundary: '至少一筆樣本的民用出生瞬間與取柱所用的真太陽時，在交節處對不上。引擎保留四柱，並將該筆起運日期留白。',
};
let manifest, bytes, current, pages;
const number = new Intl.NumberFormat('zh-Hant');
function element(tag, text, css) {
  const item = document.createElement(tag);
  item.textContent = text;
  if (css) item.className = css;
  return item;
}
function readerLink(id, label) {
  const a = element('a', label);
  a.href = '../#' + new URLSearchParams({ id, chapter: 'work' });
  return a;
}

async function showEvidence(container, row, question, pillar) {
  const { readCorpusSample } = await import('../corpus.mjs');
  const { chart } = readCorpusSample(row.femaleId);
  container.replaceChildren(element('p', '四柱　' + chart.fourPillars));
  if (question === 'mixed') {
    const matched = pillar === 'any' ? row.mixed : [pillar];
    const events = chart.interactions.filter(item => ['CLASH', 'COMBINATION_2'].includes(item.type) &&
      item.pillars.some(role => matched.includes(role)));
    for (const item of events) {
      const ends = item.pillars.map((place, i) => roles[place].replace('柱', '支') + item.branches[i]);
      container.append(element('p', ends.join(' 與 ') + (item.type === 'CLASH' ? ' 相沖' : ' 六合')),
        element('code', item.id));
    }
  } else {
    const { chart: male } = readCorpusSample(row.maleId);
    for (const [label, sample] of [['女盤', chart], ['男盤', male]]) {
      const luck = sample.daYun;
      container.append(element('p', label + '　' + (luck.startDate ?
        luck.cycles[0].ganZhi + '運，起運於 ' + luck.startDate + '（UTC+8）' : '起運日期待定')));
      if (!luck.startDate) container.append(element('code', luck.timing.reason));
    }
    if (question === 'gap') {
      const ms = sample => Date.parse(sample.daYun.startDate.slice(0, 10) + 'T00:00:00Z');
      container.append(element('p', '兩個民用日期相差 ' + number.format(Math.abs(ms(chart) - ms(male)) / 86400000) + ' 天。'));
    }
  }
  const links = document.createElement('div');
  links.append(readerLink(row.femaleId, '讀女盤 13 章'), readerLink(row.maleId, '讀男盤 13 章'));
  container.append(links);
}

function resultRow(row, query) {
  const details = document.createElement('details');
  details.className = 'hit';
  const summary = document.createElement('summary');
  const labels = query.question === 'mixed' ? row.mixed.map(r => roles[r]).join('、') :
    query.question === 'gap' ? '女男起運對照' : row.withheld.map(s => s === 'female' ? '女盤待定' : '男盤待定').join('、');
  summary.append(element('span', row.date + '　' + row.hour, 'slot'), element('span', labels, 'fact-label'));
  const body = element('div', '讀取盤面…', 'details');
  let loaded = false;
  details.addEventListener('toggle', async () => {
    if (!details.open || loaded) return;
    loaded = true;
    try { await showEvidence(body, row, query.question, query.pillar); }
    catch { loaded = false; body.textContent = '無法讀取盤面，請收合後再展開。'; }
  });
  details.append(summary, body);
  return details;
}

function updateUrl(query) {
  const url = new URL(location.href);
  url.search = '';
  if (query.question !== 'mixed') url.searchParams.set('q', query.question);
  if (query.year !== 'all') url.searchParams.set('year', query.year);
  if (query.pillar !== 'any') url.searchParams.set('pillar', query.pillar);
  if (query.page !== 1) url.searchParams.set('page', String(query.page));
  if (url.href !== location.href) history.pushState(null, '', url);
  render();
}
function togglePillar() {
  const hidden = el('question').value !== 'mixed';
  el('pillar-label').hidden = hidden;
  el('pillar').disabled = hidden;
  if (hidden) el('pillar').value = 'any';
}
function render() {
  if (!bytes) return;
  const params = new URLSearchParams(location.search);
  const query = { question: params.get('q') ?? 'mixed', year: params.get('year') ?? 'all',
    pillar: params.get('pillar') ?? 'any', page: Number(params.get('page') ?? '1') };
  try {
    const result = searchIndex(manifest, bytes, query);
    current = query; pages = result.pages;
    el('question').value = query.question; el('year').value = query.year; el('pillar').value = query.pillar;
    togglePillar();
    el('definition').textContent = definitions[query.question];
    el('status').textContent = (query.year === 'all' ? '全部年份' : query.year + ' 年') + ' · ' + number.format(result.total) +
      (query.question === 'gap' ? ' 組女男對照' : ' 個出生時刻');
    el('results').replaceChildren(...result.results.map(row => resultRow(row, query)));
    el('pager').hidden = pages < 2;
    el('page').textContent = '第 ' + number.format(query.page) + ' / ' + number.format(pages) + ' 頁';
    el('prev').disabled = query.page === 1; el('next').disabled = query.page >= pages;
  } catch {
    current = null;
    el('results').replaceChildren(); el('pager').hidden = true; el('definition').textContent = '';
    el('status').textContent = '此查詢條件或頁碼無效。請重新選擇問題，再按「查命盤」。';
  }
}
async function load() {
  el('retry').hidden = true; el('submit').disabled = true;
  try {
    const meta = await fetch('data/index.json');
    if (!meta.ok) throw Error('Manifest unavailable');
    manifest = await meta.json();
    const response = await fetch('data/' + manifest.file);
    if (!response.ok) throw Error('Data unavailable');
    const data = new Uint8Array(await response.arrayBuffer());
    await verifyIndex(manifest, data);
    bytes = data;
    for (const { year } of manifest.years) el('year').add(new Option(String(year), String(year)));
    el('submit').disabled = false; render();
  } catch { el('status').textContent = '資料索引無法載入或校驗失敗，請重新載入。'; el('retry').hidden = false; }
}
el('question').addEventListener('change', togglePillar);
el('filters').addEventListener('submit', event => {
  event.preventDefault();
  updateUrl({ question: el('question').value, year: el('year').value, pillar: el('pillar').value, page: 1 });
});
el('prev').addEventListener('click', () => { if (current?.page > 1) updateUrl({ ...current, page: current.page - 1 }); });
el('next').addEventListener('click', () => { if (current?.page < pages) updateUrl({ ...current, page: current.page + 1 }); });
el('retry').addEventListener('click', load);
window.addEventListener('popstate', render);
load();
