import { extras, queryAtlas, verify } from './index-format.mjs';
import { evaluate, relations, rules } from './rules.mjs';
import { monthReading, readerHash, statusNames } from './view.mjs';
const id = key => document.getElementById(key);
const form = id('filters'), fields = form.elements;
const pager = id('pager');
let manifest, data, active;
const fmt = n => n.toLocaleString('en-US');
function node(tag, value) {
  const el = document.createElement(tag);
  el.textContent = value;
  return el;
}
function link(label, url) {
  const a = node('a',label);
  a.href = url;
  return a;
}
for (const [key,name] of Object.entries(extras)) fields.extra.add(new Option(name,key));
function update(query) {
  const url = new URL(location.href);
  url.search = new URLSearchParams(query);
  if (url.href !== location.href) history.pushState(null,'',url);
  render();
}
function row(hit, rule, status, extra) {
  const el = document.createElement('details');
  el.append(node('summary',hit.date+'　'+hit.hour));
  const body = document.createElement('div');
  el.append(body);
  let loaded = false;
  el.addEventListener('toggle',async () => {
    if (!el.open || loaded) return;
    loaded = true;
    body.textContent = '讀取盤面…';
    try {
      const {readCorpusSample} = await import('../corpus.mjs');
      const {chart} = readCorpusSample(hit.femaleId);
      const a = evaluate(chart.fourPillars), entry = a.entries.find(e => e.id === rule.id);
      if (entry.status !== status) throw Error('Index disagrees with chart');
      const list = node('ul','');
      for (const c of entry.checks) list.append(node('li',(c.ok?'符合':'未符合')+' · '+c.label));
      body.replaceChildren(node('h3',chart.fourPillars),node('p',monthReading(a)),node('p',a.branchEvidence.join('。')+'。'),list);
      for (const event of chart.interactions.filter(e => e.type===extra || (extra==='mixed' &&
          ['CLASH','COMBINATION_2'].includes(e.type) && e.pillars.some(p=>hit.mixed.includes(p))))) {
        const names = {year:'年支', month:'月支', day:'日支', hour:'時支'};
        body.append(node('p',event.pillars.map((p,i)=>names[p]+event.branches[i]).join('、')+'　'+relations[event.type]));
      }
      if (['gap','boundary'].includes(extra)) {
        const male = readCorpusSample(hit.maleId).chart;
        for (const [label,c] of [['女盤',chart],['男盤',male]]) body.append(node('p',label+'起運　'+(c.daYun.startDate ?? '交節待定')));
      }
      body.append(link('女盤 13 章','../'+readerHash(hit.femaleId)), ' · ',
        link('男盤 13 章','../'+readerHash(hit.maleId)));
    } catch { loaded=false; body.textContent='讀取失敗，請收合後再展開。'; }
  });
  return el;
}
function render() {
  if (!data) return;
  const params = new URLSearchParams(location.search);
  const q = {rule:params.get('rule') ?? 'officer',status:params.get('status') ?? 'match',
    extra:params.get('extra') ?? 'all',year:params.get('year') ?? 'all',page:Number(params.get('page') ?? 1)};
  try {
    const result = queryAtlas(manifest,data,q);
    active=q;
    for (const key of ['rule','status','extra','year']) fields[key].value=q[key];
    const rule=rules.find(r=>r.id===q.rule);
    id('summary').replaceChildren(link(rule.name+'判讀與命例',rule.id+'/'),' · '+statusNames[q.status]+' · '+
      fmt(result.total)+' 個時刻（'+fmt(result.records)+' 筆出生樣本）');
    id('hits').replaceChildren(...result.results.map(hit=>row(hit,rule,q.status,q.extra)));
    pager.hidden=result.pages<2;
    id('page').textContent=fmt(q.page)+' / '+fmt(result.pages);
    id('prev').disabled=q.page===1;
    id('next').disabled=q.page>=result.pages;
  } catch {
    active=null; pager.hidden=true; id('hits').replaceChildren();
    id('summary').textContent='查詢條件或頁碼無效，請重新選擇。';
  }
}
async function load() {
  id('retry').hidden=true;
  try {
    const meta=await fetch('data/index.json');
    if (!meta.ok) throw Error();
    manifest=await meta.json();
    const res=await fetch('data/'+manifest.file);
    if (!res.ok) throw Error();
    const bytes=new Uint8Array(await res.arrayBuffer());
    await verify(manifest,bytes);
    for (const {year} of manifest.years) fields.year.add(new Option(String(year),String(year)));
    data=bytes; form.querySelector('button').disabled=false; render();
  } catch { id('summary').textContent='無法載入或核對索引。下方格局命例仍可閱讀。'; id('retry').hidden=false; }
}
form.addEventListener('submit', e=>{e.preventDefault();update(Object.fromEntries(new FormData(form)));});
id('prev').onclick=()=>active && update({...active,page:active.page-1});
id('next').onclick=()=>active && update({...active,page:active.page+1});
id('retry').onclick=load;
window.addEventListener('popstate',render);
load();
