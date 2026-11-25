import { mkdir, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { readCorpusSample } from '../docs/library/corpus.mjs';

const base = 'https://openfate-ai.github.io/bazi-engine/library/search/';
const cases = [
  {
    slug: 'career-hour', title: '同一天出生，面試時該問的問題怎麼變了？', short: '換個時辰，面試該問什麼？',
    intro: '1991 年 10 月 18 日的兩張女盤，時支由卯換到辰。兩張盤各有一合一沖，但時支牽動的柱位剛好對調。職涯章也選中了不同的開頭。',
    filter: 'q=mixed&year=1991&pillar=hour', lesson: 'career-readings',
    ids: ['1991-10-18T06:30:00+08:00/female', '1991-10-18T08:30:00+08:00/female'],
    columns: ['民用時刻', '時柱', '時支所合的柱', '時支所沖的柱'],
  },
  {
    slug: 'luck-gap', title: '四柱相同，第一步大運為什麼差了近四年？', short: '同一張盤，兩個起運日',
    intro: '同在 1991 年 10 月 18 日 08:30 出生，只改排運性別。月柱都是戊戌，女盤順推到己亥，男盤逆推到丁酉。順逆的差別，也決定了要取出生前還是出生後的節。',
    filter: 'q=gap&year=1991', lesson: 'luck-direction',
    ids: ['1991-10-18T08:30:00+08:00/female', '1991-10-18T08:30:00+08:00/male'],
    columns: ['排運輸入', '取節', '第一運', '起運日期'],
  },
  {
    slug: 'solar-boundary', title: '立春已過四十秒，為什麼起運日留白？', short: '立春前後，哪一筆待定？',
    intro: '本版取 1932 年 2 月 5 日 08:29:20（UTC+8）為立春。08:30 出生的那筆，民用時間已過立春，取柱所用的真太陽鐘面卻仍在交節之前。往前、往後各看一個時辰，就能看清這筆為何特殊。',
    filter: 'q=boundary&year=1932', lesson: 'solar-term',
    ids: ['1932-02-05T06:30:00+08:00/female', '1932-02-05T08:30:00+08:00/female', '1932-02-05T10:30:00+08:00/female'],
    columns: ['民用時刻', '真太陽時', '年、月柱', '起運日期'],
  },
];
const roleName = { year: '年支', month: '月支', day: '日支' };
const escape = v => String(v).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const label = chart => chart.id.slice(11, 16) + ' ' + (chart.id.endsWith('female') ? '女盤' : '男盤');

function hourPartner(chart, type) {
  const event = chart.interactions.find(v => v.type === type && v.pillars.includes('hour'));
  const other = event.pillars.find(role => role !== 'hour');
  return roleName[other] + chart.pillars[other].branch;
}

function material(item, samples) {
  const charts = samples.map(s => s.chart);
  if (item.slug === 'career-hour') {
    const rows = charts.map(c => [c.id.slice(11, 16), c.pillars.hour.ganZhi, hourPartner(c, 'COMBINATION_2'), hourPartner(c, 'CLASH')]);
    return { rows, paragraphs: samples.map(s => label(s.chart) + '的職涯章寫道：「' + s.chapters.work.parts[0].name + '」' + s.chapters.work.parts[0].text.split('\n\n').at(-1)),
      art: rows.map(([time, pillar, combined, clashed]) => [time + '　' + pillar, '合' + combined + '　沖' + clashed]) };
  }
  if (item.slug === 'luck-gap') {
    const rows = charts.map(c => [label(c).slice(-2), c.daYun.timing.jieName, c.daYun.cycles[0].ganZhi, c.daYun.startDate.slice(0,10)]);
    const days = Math.abs(Date.parse(rows[0][3]) - Date.parse(rows[1][3])) / 86400000;
    return { rows, paragraphs: ['兩筆的四柱同為' + charts[0].fourPillars + '。起運日期相差 ' + days.toLocaleString('en-US') + ' 天。表內按民用日期計天數；展開下方搜尋結果可查到兩筆起運的完整時刻。'],
      art: rows.map(([sex, term, cycle, date]) => [sex + '　' + term, cycle + '運　' + date]) };
  }
  const rows = charts.map(c => [c.id.slice(11, 16), c.trueSolarDateTime.slice(-8), c.fourPillars.split(' ').slice(0,2).join(' '), c.daYun.startDate?.slice(0,10) ?? '待定']);
  return { rows, paragraphs: ['08:30 這筆的起運狀態是 ' + charts[1].daYun.timing.reason + '。四柱與生活章節仍可讀。相鄰兩筆雖然都在 2 月 15 日起運，第一步大運卻分別是' + charts[0].daYun.cycles[0].ganZhi + '和' + charts[2].daYun.cycles[0].ganZhi + '。'],
    art: rows.map(([time, solar, , onset]) => [time + ' → ' + solar, onset]) };
}

function drawCover(path, item, art, font) {
  const args = ['-size', '1200x630', 'xc:#163c30', '-font', font, '-fill', '#f9f5df', '-gravity', 'NorthWest'];
  function line(x, y, size, value) { args.push('-pointsize', String(size), '-annotate', '+' + x + '+' + y, value); }
  line(66, 40, 32, 'OpenFate　／　八字命例');
  line(62, 108, 64, item.short);
  line(68, 207, 30, item.ids[0].slice(0,10) + '　　UTC+8');
  const headings = { 'career-hour': ['民用時間 ／ 時柱', '時支的六合與相沖'],
    'luck-gap': ['排運輸入 ／ 取節', '第一步大運 ／ 起運日'], 'solar-boundary': ['民用時間 → 真太陽時', '起運日期'] };
  const [left, right] = headings[item.slug];
  line(68, 264, 24, left); line(595, 264, 24, right);
  args.push('-stroke', '#95ad97', '-strokewidth', '2', '-draw', 'line 65,306 1133,306', '-stroke', 'none');
  art.forEach(([left, right], i) => { line(68, 326 + 84 * i, 40, left); line(595, 326 + 84 * i, 40, right); });
  const result = spawnSync('magick', [...args, '-strip', 'PNG24:' + path], { stdio: 'inherit' });
  if (result.status !== 0) throw Error('ImageMagick could not render ' + path);
}

for (const item of cases) {
  const samples = item.ids.map(readCorpusSample);
  const { rows, paragraphs, art } = material(item, samples);
  const path = 'docs/library/search/cases/' + item.slug;
  await mkdir(path, { recursive: true });
  const url = base + 'cases/' + item.slug + '/';
  const alt = item.short + '。' + art.map(r => r.join('，')).join('；');
  const rowLinks = samples.map(({ chart }) => '<a href="../../../#' + escape(new URLSearchParams({ id: chart.id, chapter: 'work' })) + '">' + label(chart) + '完整樣本</a>');
  if (item.slug === 'career-hour') {
    const pair = new URLSearchParams({ id: item.ids[0], chapter: 'work', other: '08' });
    rowLinks.push('<a href="../../../#' + escape(pair) + '">並排讀兩篇職涯章</a>');
  }
  const product = 'https://openfate.ai/zh-hant/bazi-chart?utm_source=github&amp;utm_medium=referral&amp;utm_campaign=corpus_cases&amp;utm_content=' + item.slug;
  const html = `<!doctype html>
<html lang="zh-Hant"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="referrer" content="no-referrer">
<title>${item.title}｜OpenFate 八字命例</title><meta name="description" content="${escape(item.intro)}"><link rel="canonical" href="${url}">
<meta property="og:type" content="article"><meta property="og:locale" content="zh_TW"><meta property="og:title" content="${item.title}"><meta property="og:description" content="${escape(item.intro)}"><meta property="og:url" content="${url}"><meta property="og:image" content="${url}cover.png"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta property="og:image:alt" content="${escape(alt)}"><meta name="twitter:card" content="summary_large_image">
<link rel="stylesheet" href="../../../library.css"><link rel="stylesheet" href="../../search.css"></head><body>
<header><nav><a class="brand" href="../../../../">OpenFate <span>八字引擎</span></a><a href="../../">按問題找盤</a></nav></header>
<main class="case-body"><h1>${item.title}</h1><p class="intro">${item.intro}</p>
<table><thead><tr>${item.columns.map(v=>'<th scope="col">'+v+'</th>').join('')}</tr></thead><tbody>${rows.map(row=>'<tr>'+row.map(v=>'<td>'+escape(v)+'</td>').join('')+'</tr>').join('')}</tbody></table>
${paragraphs.map(t=>'<p>'+escape(t)+'</p>').join('')}
<p>${rowLinks.join(' · ')}</p><a class="next" href="../../?${escape(item.filter)}">找同年符合條件的盤</a><p><a href="https://github.com/openfate-ai/bazi-engine/blob/main/learn/${item.lesson}.md">讀完整講義與依據</a> · <a href="${product}">用自己的出生地排盤 ↗</a></p></main>
<footer>OpenFate 八字命盤庫 v2.1.0 · <a href="https://github.com/openfate-ai/bazi-engine/releases/tag/corpus-v2.1.0">資料來源</a> · <a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a></footer></body></html>\n`;
  await writeFile(path + '/index.html', html);
  if (process.argv[2] === '--covers' && process.argv[3]) drawCover(path + '/cover.png', item, art, process.argv[3]);
}
