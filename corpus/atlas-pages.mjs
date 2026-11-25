import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { evaluate, rules, sources } from '../docs/library/atlas/rules.mjs';
import { describeSlot } from '../docs/library/search/patterns.mjs';
import { monthReading, readerHash, statusNames } from '../docs/library/atlas/view.mjs';
const root = new URL('../docs/library/atlas/', import.meta.url);
const manifest = JSON.parse(readFileSync(new URL('data/index.json', root)));
const fmt = n => n.toLocaleString('en-US');
const html = s => String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const docs = 'https://github.com/openfate-ai/bazi-engine/blob/main/corpus/ATLAS.md';
const origin = 'https://openfate-ai.github.io/bazi-engine/library/atlas/';
function page(title, intro, body, sub) {
  const prefix = sub ? '../' : '';
  return '<!doctype html>\n<html lang="zh-Hant"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'+
    '<title>'+html(title)+'｜OpenFate 八字命盤庫</title><meta name="description" content="'+html(intro)+'"><link rel="canonical" href="'+origin+(sub ? sub+'/' : '')+'">'+
    '<link rel="stylesheet" href="'+prefix+'../library.css"><link rel="stylesheet" href="'+prefix+'atlas.css"></head><body><a class="skip" href="#main">跳到內容</a>'+
    '<header><nav><a class="brand" href="'+prefix+'../../">OpenFate <span>八字引擎</span></a><a href="'+prefix+'../">命盤庫</a><a href="'+prefix+'../search/">合沖與起運</a></nav></header>'+
    '<main id="main">'+body+'</main><footer>OpenFate 八字格局圖鑑 · <a href="'+docs+'">規則、版本與下載</a> · <a href="https://creativecommons.org/licenses/by/4.0/">資料 CC BY 4.0</a></footer></body></html>\n';
}
function evidence(rule, ex, status) {
  if (!ex) return '<p>本期語料沒有這類樣本。</p>';
  const a = evaluate(ex.pillars), entry = a.entries.find(e=>e.id===rule.id);
  if (entry.status !== status) throw Error('Example status mismatch for '+rule.id);
  const slot = describeSlot(ex.slot, 0);
  const checks = entry.checks.map(c => '<li>'+ (c.ok ? '符合' : '未符合')+' · '+html(c.label)+'</li>').join('');
  function link(id, title) {
    return '<a href="../../'+html(readerHash(id))+'">'+title+'</a>';
  }
  return '<p class="date">'+slot.date+' '+slot.hour+'（UTC+8）</p><h3>'+ex.pillars+'</h3><p>'+html(monthReading(a))+'</p><p>'+html(a.branchEvidence.join('。'))+'。</p><ul>'+checks+
    '</ul><p>'+link(slot.femaleId,'讀女盤')+' · '+link(slot.maleId,'讀男盤')+'</p>';
}
const catalog = [];
for (const [i, rule] of rules.entries()) {
  const stat = manifest.rules[i];
  if (stat.id !== rule.id) throw Error('Rule catalog out of order');
  const search = '../?'+new URLSearchParams({rule:rule.id});
  const [source, url] = sources[rule.family];
  const interpret = rule.family === '月令' ?
    '此處先定月令，再看三個明干的配合。對照盤取到同一月令，但缺少所列的配合，或另有干擾。':
    '下方對照盤符合第一項，另外有一項條件不合。各家對根氣、制化的取捨可另作判讀。';
  const body = '<p><a href="../">格局圖鑑</a> ／ '+rule.family+'</p><h1>'+rule.name+'</h1><p class="intro">'+html(rule.description)+'</p><p>'+interpret+'</p>'+
    '<p>符合條件的有 <strong>'+fmt(stat.match.slots*2)+' 筆出生樣本</strong>，合計 '+fmt(stat.match.slots)+' 個時刻、'+fmt(stat.match.distinct)+' 種不同四柱。</p>'+
    '<p><a class="next" href="'+search+'">查這一格，搭配合沖或起運條件</a></p><div class="case-grid">'+
    ['match','review'].map(status=>'<section><h2>'+statusNames[status]+'</h2>'+evidence(rule,stat.examples[status],status)+'</section>').join('')+'</div>'+
    '<h2>對讀與重算</h2><p>古籍提供讀盤脈絡。這一頁的篩選條件與數量依 OpenFate 公開規則計算。</p><p><a href="'+html(url)+'">'+source+'</a> · <a href="'+docs+'">查算法與數量口徑</a> · <a href="../?rule='+rule.id+'&amp;status=review">查 '+fmt(stat.review.slots)+' 個對照時刻</a></p>';
  const folder = new URL(rule.id+'/', root);
  mkdirSync(folder,{recursive:true});
  writeFileSync(new URL('index.html',folder), page(rule.name, rule.description, body, rule.id));
  catalog.push('<li><a href="'+rule.id+'/">'+rule.name+'</a><span>'+fmt(stat.match.distinct)+' 種四柱</span></li>');
}
const groups = [...new Set(rules.map(r=>r.family))].map(group => '<section><h3>'+group+'</h3><ul class="catalog">'+
  rules.flatMap((r,i) => r.family===group ? [catalog[i]] : []).join('')+'</ul></section>').join('');
const intro = '從月令找一張正官格，再加上三合或起運差異，看哪些盤仍符合。每格都附一張條件齊備的盤和一張對照盤。';
const content = '<h1>八字格局圖鑑</h1><p class="intro">'+intro+'</p>'+
  '<form id="filters"><label>格局<select name="rule">'+rules.map(r=>'<option value="'+r.id+'">'+r.name+'</option>').join('')+'</select></label>'+
  '<label>判讀<select name="status"><option value="match">符合本版條件</option><option value="review">對照盤</option></select></label>'+
  '<label>一起查<select name="extra"></select></label><label>出生年份<select name="year"><option value="all">全部年份</option></select></label>'+
  '<button disabled>查命盤</button></form><p id="summary" role="status" aria-live="polite">正在讀取查詢索引…</p><button id="retry" class="quiet" hidden>重新載入</button>'+
  '<div id="hits"></div><div class="pager" id="pager" hidden><button id="prev" class="quiet">上一頁</button><span id="page"></span><button id="next" class="quiet">下一頁</button></div>'+
  '<h2>查格局與命例</h2><p>每個出生時刻有女、男兩筆排運輸入。下表合併了相同四柱；同一張盤可符合多個條件。</p>'+groups+
  '<noscript><p>格局頁與命例可直接閱讀。組合查詢需要 JavaScript。</p></noscript><script type="module" src="search.mjs"></script>';
writeFileSync(new URL('index.html',root), page('八字格局圖鑑', intro, content));
