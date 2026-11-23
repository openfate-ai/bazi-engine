import { roles, kinds } from './language.mjs';

const entire=Object.keys(roles).map(k=>'/pillars/'+k);
const families=[['比肩','劫財'],['食神','傷官'],['偏財','正財'],['正官','七殺'],['偏印','正印']];
const titles=['比劫','食傷','財星','官殺','印星'];
const relName=r=>r.pillars.map((k,i)=>roles[k]+'支'+r.branches[i]).join('與')+kinds[r.type];
export function caseSignals(row, all) {
  const out={};
  for(const [i,key] of ['peer','output','wealth','duty','support'].entries()) {
    const hits=all.filter(v=>families[i].includes(v.god));
    const open=hits.filter(v=>v.place==='透干'), hidden=hits.filter(v=>v.place!=='透干');
    const lead=open[0]??hidden[0];
    out[key]={state:open.length?'open':hidden.length?'hidden':'absent',yes:!!open.length,refs:open.length?open.map(v=>v.ref):entire,
      text:open.length?open.map(v=>v.name+'為'+v.god).join('、')+'，'+titles[i]+'有明干可以直接指認。':
      hidden.length?hidden[0].name+'為'+hidden[0].god+'，'+titles[i]+'只在支中有據，年、月、時干沒有透出。':'四柱的明干與藏干均未見'+titles[i]+'。'};
    if(lead && !open.length)out[key].refs=[...entire,lead.ref];
  }
  for(const [key,role] of Object.entries({dayLink:'day',monthLink:'month',hourLink:'hour',yearLink:'year'})) {
    const matches=row.interactions.map((r,i)=>({r,i})).filter(({r})=>r.pillars.includes(role));
    const focus=matches.find(({r})=>r.type==='CLASH')??matches[0];
    out[key]={yes:!!focus,refs:focus?['/interactions/'+focus.i]:['/interactions','/pillars/'+role+'/branch'],
      text:focus?'原局有'+relName(focus.r)+'，'+roles[role]+'支和別的位置有明確牽連。':'原局所列的八類關係沒有牽到'+roles[role]+'支'+row.pillars[role].branch+'。'};
  }
  const clash=row.interactions.findIndex(r=>r.type==='CLASH');
  out.clash={yes:clash>=0,refs:clash>=0?['/interactions/'+clash]:['/interactions'],text:clash>=0?'這張盤有'+relName(row.interactions[clash])+'。':'四個原局地支間沒有正沖。'};
  const monthMain=all.find(a=>a.key==='month'&&a.place==='本氣'), same=all.filter(a=>a.place==='透干'&&a.stem===monthMain.stem);
  out.monthRoot={yes:!!same.length,refs:[monthMain.ref,...Object.keys(roles).filter(k=>k!=='day').map(k=>'/pillars/'+k+'/stem')],
    text:same.length?monthMain.name+'又見於'+same.map(a=>a.name).join('、')+'，月令本氣在明干有落點。':monthMain.name+'在年、月、時干均未透出。'};
  const roots=all.filter(a=>a.place!=='透干'&&a.stem===row.dayMaster);
  out.roots={yes:!!roots.length,refs:['/dayMaster',...Object.keys(roles).map(k=>'/pillars/'+k+'/hiddenStems')],
    text:roots.length?'日干'+row.dayMaster+'也落在'+roots.map(a=>a.name).join('、')+'，可以指認同字根。':'四支藏干均沒有日干'+row.dayMaster+'同一個字；此處專看同字根。'};
  return out;
}
