// Branch, stem and hidden-stem evidence is deliberately separate from the real-life analogy.
import { roles, godName, elements, kinds } from './language.mjs';

const families = [['比肩','劫財'],['食神','傷官'],['正財','偏財'],['正官','七殺'],['正印','偏印']];
const names = ['比劫','食傷','財星','官殺','印星'];
const topics = {
  work:[3,1,'工作上誰來訂標準，誰能改方法','若食傷在外而官殺只藏於支中，提出改法的能力比較容易被看見。談工作時，該額外問清楚的是驗收標準與授權。'],
  money:[1,2,'從交付成果到有人願意付錢','食傷和財星分屬相生的五行。原局有兩端，才有根據討論這條路徑；定價、客源和回款仍要一件件落實。'],
  family:[4,3,'照顧人的方式與家裡的要求','官殺和印星可沿五行相生來讀。家人若帶著要求給你支援，把可接受的部分和需要商量的部分分開，感激就不必等於全盤照辦。'],
  friends:[0,2,'人力投入與共同支出','比劫與財星有剋的關係，盤上並列時值得注意資源由誰分配。它本身不能判定朋友會不會佔便宜；可以查的是雙方有沒有共同承擔成本的約定。'],
  learning:[4,1,'吸收方法與做出自己的答案','印星、食傷分別提示吸收和產出。遇到熟題看得懂、新題做不出來時，可以觀察自己花在這兩件事上的力氣是不是差得太遠。'],
  voice:[1,3,'意見如何與現有規則相遇','若兩端都在原局有據，判讀時要分清正官與七殺、食神與傷官。單憑食傷與官殺同見，還不能把整張盤定為傷官見官。'],
  rest:[3,4,'責任何時需要有人接手','官殺、印星兩端的藏透能幫忙分辨，容易先被看見的是要求，還是可用的支援。生活中若長期只剩前者，值得把交接的人和時間重新談清楚。'],
  change:[2,3,'新機會要換來哪些新責任','財與官殺的五行相生，可以順著資源如何變成責任來看。談轉換時，多問一句「我接下這份資源之後，需要替誰交出什麼」，機會的全貌才會出來。'],
  home:[2,4,'日常成本與住得安穩的條件','財與印分屬不同的生活取象。安穩有時需要多花成本，節省有時又會削去熟悉的支持；同時讀這兩條線，才好解釋為什麼最便宜的選擇仍讓人猶豫。'],
  care:[4,0,'給出協助以後，誰能自己做主','印星的支援可以接到比劫的自主。交給別人的方法，最好能讓他下次少靠你一次；如果事情仍只有你能拍板，往後還是你得收尾。'],
  direction:[0,1,'由自己起步，最後要留下什麼','比劫、食傷之間可以從五行相生讀成自己投入精力、產出一件成果的路徑。若盤上兩端都出現，行動就有可對照的起點和落點。'],
};
const keyOf=(n,i) => '/pillars/'+n+'/hiddenStems/'+i;
const labelRel=r=>r.pillars.map((k,i)=>roles[k]+'支'+r.branches[i]).join('與')+kinds[r.type];
function positionText(items) {
  if(!items.length)return '四柱明干與各支藏干均未見';
  const surface=items.filter(i=>i.place==='透干'), inner=items.filter(i=>i.place!=='透干');
  if(surface.length && inner.length)return surface[0].name+'透'+surface[0].god+'，'+inner[0].name+'也見'+inner[0].god;
  const a=items[0],b=items[1];
  return a.name+'見'+a.god+(b?'，另有'+b.name+'為'+b.god:'')+(surface.length?'，列在明干':'，只在支中有據');
}
export function chartLogic(row, all) {
  const groups=families.map(group=>all.filter(i=>group.includes(i.god)));
  const p=row.pillars, master=row.dayMaster, support=[], sources=[];
  for(const [role,v] of Object.entries(p)){
    v.hiddenStems.forEach((h,i)=>{
      if(h.element===p.day.element){support.push(roles[role]+'支'+v.branch+(h.isMain?'本氣':'所藏的')+h.stem);sources.push(keyOf(role,i));}
    });
  }
  const result={};
  const monthQi=p.month.hiddenStems.find(h=>h.isMain);
  const native=godName(monthQi.tenGod), relative=godName(p.month.stemTenGod);
  const roots=support.length?'同五行的根可追到'+support.join('、')+'。':'逐支查過，四支藏干裡未見與日主同五行的字。';
  const exposed=all.filter(a=>a.place==='透干'&&a.stem===monthQi.stem);
  const literal = exposed.length?'月令本氣'+monthQi.stem+'又出現在'+exposed.map(o=>o.name).join('、')+'，這個字同時有季節位置和明干落點。':'月令本氣'+monthQi.stem+'沒有直接透出在年、月、時干。';
  result.temperament={name:'哪條線索在這張盤上站得最穩',ref:['/pillars/month','/pillars/day',...Object.keys(roles).map(k=>'/pillars/'+k+'/hiddenStems'),...exposed.map(x=>x.ref)],
    text:'以'+master+elements[p.day.element]+'為日主，'+p.month.branch+'月本氣'+monthQi.stem+'為'+native+'，月干'+p.month.stem+'則為'+relative+'。'+literal+roots+'這些位置能交代日主的依託。要進一步取用，還得衡量全局生剋與調候；這裡只把能逐字核對的線索列出。'};
  const dayRefs=row.interactions.map((r,i)=>({r,ref:'/interactions/'+i})).filter(v=>v.r.pillars.includes('day'));
  const aspect=dayRefs.find(v=>['COMBINATION_2','TRINE','DIRECTIONAL','COMBINATION_HALF'].includes(v.r.type)) ?? dayRefs[0];
  const touch=aspect && row.interactions.map((r,i)=>({r,ref:'/interactions/'+i})).find(v=>v.ref!==aspect.ref && v.r.pillars.some(k=>aspect.r.pillars.includes(k)) && v.r.type==='CLASH');
  const dayMain=all.find(a=>a.key==='day'&&a.place==='本氣');
  result.love={name:'兩個人的安排怎麼牽到別處',ref:[dayMain.ref,...(aspect?[aspect.ref]:['/interactions']),...(touch?[touch.ref]:[])],
    text:'日支是'+p.day.branch+'，'+dayMain.name+'為'+dayMain.god+'。'+(aspect?'盤上有'+labelRel(aspect.r)+'。'+
      (touch?'順著同一個柱位再往外查，還有'+labelRel(touch.r)+'。兩人之間談得攏，外部行程仍可能需要重排。碰到類似爭執，可以先問彼此究竟不同意，還是同意了卻排不出時間。':
      '這裡能看見日支和其他位置互相牽動。若某件看似只屬於兩人的小事一直談不妥，看看是否還有人、時間或家庭安排沒有被算進來。'):
      '原局列出的八類地支互動沒有牽到日支。這裡直接從日支本氣來讀，不能據此推斷伴侶的職業、外貌或婚期。')};
  for(const [topic,[a,b,title,meaning]] of Object.entries(topics)){
    const left=groups[a],right=groups[b];
    const refs=[];
    for(const set of [left,right]){
      if(set.length)refs.push(...set.map(i=>i.ref));
      else refs.push(...Object.keys(roles).map(k=>'/pillars/'+k));
    }
    const leftVisible=left.some(i=>i.place==='透干'),rightVisible=right.some(i=>i.place==='透干');
    let finding;
    if(!left.length||!right.length){
      const absent=[!left.length&&names[a],!right.length&&names[b]].filter(Boolean).join('與');
      finding='這張原局欠缺'+absent+'的直接落點，這條路徑不能完整成立。若生活經驗和這裡不同，請以實際工作或相處經過來補上，盤中缺一個字也不能推出生活裡缺一樣東西。';
    }else if(topic==='work'){
      finding=rightVisible&&!leftVisible?meaning:leftVisible&&!rightVisible?'官殺在明干、食傷在藏干，要求比自己的改法更容易先被聽到。若想爭取調整，可以約定哪一步允許試做，才不必每次從頭請示。':
        leftVisible&&rightVisible?'要求與說法都在明干。提案以前先問清楚什麼標準一定要保留，再把能改善的那一處單獨拿出來試。':'兩端都在藏干。命盤提供了對讀的字，日常是否有發揮空間，仍得看實際授權和工作條件。';
    }else{
      finding=meaning+(leftVisible===rightVisible?(leftVisible?'兩端都有明干落點。':'兩端都取自藏干。'):
        (leftVisible?names[a]:names[b])+'在明干可見，'+(leftVisible?names[b]:names[a])+'要從藏干才找得到。');
    }
    result[topic]={name:title,ref:[...new Set(refs)],text:names[a]+'這邊，'+positionText(left)+'。'+names[b]+'這邊，'+positionText(right)+'。'+finding};
  }
  return result;
}
