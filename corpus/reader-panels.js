let current, compiled, annual;
function proof(row, paths) {
  const details=document.createElement('details');details.append(node('summary','查看盤面依據'));
  for(const ptr of new Set(paths)){
    const fact=ptr.slice(1).split('/').reduce((v,k)=>v[k],row);
    const block=node('p','');block.append(node('code',ptr),document.createElement('br'),node('code',JSON.stringify(fact)));
    details.append(block);
  }
  return details;
}
function lineSection(title,body,refs){
  const s=document.createElement('section');s.append(node('h3',title),node('p',body),proof(current,refs));return s;
}
function renderPanel(){
  const mode=get('mode').value,index=Number(get('chapter').value), fragment=document.createDocumentFragment();
  if(mode==='book'){
    const chapter=Object.values(compiled)[index];
    const head=node('h2',chapter.title);fragment.append(head);
    for(const part of chapter.parts){
      if(part.caseSignal){
        const d=document.createElement('details');d.className='case';
        d.append(node('summary',part.name),node('p',part.text),proof(current,part.ref));fragment.append(d);
      }else{fragment.append(lineSection(part.name,part.text,part.ref));}
    }
  }else if(mode==='yearbook'){
    if(!annual.length){
      fragment.append(node('h2','交節附近，起運待定'),node('p','這筆出生條件的精確起運未定，保留原局解讀。'),proof(current,['/daYun/timing']));
    }else{
      const v=annual[index],cycle=current.daYun.cycles[v.cycleIndex];
      fragment.append(node('h2',v.year+' 年 · '+v.ganzhi),node('p','7 月 1 日中午的週歲為 '+v.age+' 歲，大運為'+cycle.ganZhi+'。'),node('p',v.text),proof(current,v.evidence));
    }
  }else{
    const [key,label]=Object.entries(topics)[index],v=current.readings[key];
    fragment.append(node('h2',label),lineSection(v.title,v.text,v.evidence));
  }
  get('reading').replaceChildren(fragment);
}
function chooseMode(){
  const mode=get('mode').value;
  const options=mode==='book'?Object.values(compiled).map(c=>c.title):mode==='yearbook'?annual.map(v=>v.year+' · '+v.ganzhi):Object.values(topics);
  get('chapter').replaceChildren(...options.map((s,i)=>new Option(s,i)));
  get('chapter').disabled=!options.length;renderPanel();
}
function show(row){
  current=row;compiled=corpusRules.book.lifeBook(row);annual=Array.from(corpusRules.yearbook.annualReadings(row));
  get('chartTitle').textContent=row.fourPillars;
  get('birthInfo').textContent=row.id.replace('/female',' 女').replace('/male',' 男')+'　真太陽時 '+row.trueSolarDateTime;
  get('labels').textContent=row.labels.join(' · ');get('mode').value='book';chooseMode();
}
get('mode').addEventListener('change',chooseMode);get('chapter').addEventListener('change',renderPanel);
