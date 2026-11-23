import { chapterOpening } from './chapter-openings.mjs';
import { caseSignals } from './case-signals.mjs';
import { finalCases } from './cases-choices.mjs';
import { workCases } from './cases-work.mjs';
import { peopleCases } from './cases-people.mjs';
import { lifeCases } from './cases-life.mjs';
import { decisions } from './decisions.mjs';
import { chartLogic } from './chart-logic.mjs';
import { chapters } from './chapters.mjs';
import { roles, godName, kinds } from './language.mjs';

export const familyNames = ['比劫','食傷','財星','官殺','印星'];
const cases = {...workCases,...peopleCases,...lifeCases};
const gods = ['比肩','劫財','食神','傷官','偏財','正財','七殺','正官','偏印','正印'];
export const familyOf = god => Math.floor(gods.indexOf(god) / 2);
const voices = {
  比肩:'自己也要有份決定', 劫財:'別人的投入和自己的資源怎麼分',
  食神:'能不能慢慢做好，留下別人用得到的成果', 傷官:'現行的做法哪裡不合用，有沒有空間換一種',
  正財:'付出去的時間能換回什麼，對方會不會履約', 偏財:'眼前出現的新機會是否值得挪出資源',
  正官:'雙方的約定能否信守', 七殺:'壓力來了，哪件事必須先保住',
  正印:'能不能找到可信的經驗來參照', 偏印:'現成答案解釋不了的細節，要怎麼自己想通',
};
// Each pairing compares two different roles in the same chart. The row supplies the premise.
const dialogue = [
  ['兩處都把作主權放在眼前。先分清哪些能各自決定、哪些需要一起拍板，很多看似個性不合的爭執就能縮小。','一端在意自己動手，另一端要看做出來的東西。適合先各自試出一個版本，放在桌上比較，比空談誰更有經驗容易有答案。','能力和資源在這裡碰到一起。你能做，不代表投入時間一定划算；對方願意付錢，也不代表這件事要全部由你來做。','自己想掌握做法，對結果又有明確要求。值得爭取的是能負責到底的一段工作，權限只給一半時就要提早協調。','自己的判斷身旁還有一條求證的線。若已有主意，帶著它去請教比從頭問別人該怎麼辦，更能留住自己的選擇。'],
  ['想法要靠人把它做完。若你很快就看出改善方向，可以先問誰願意一起試，並把對方能決定的部分留給他。','兩處都指向表達或成品。當選擇太多，請真的要使用的人試一次，動手後的反應比屋裡的人互相稱讚更有分量。','前一端能做成東西，後一端在問誰願意交換。試著把成果做小到能交給一個人使用，再看對方會不會回來，而非一開始就押上整份心力。','提出改法的人也會碰到既有標準。如果對方拒絕你的點子，先問他要保住哪個承諾，留下那個條件再改一版，對話便有新的入口。','一端想說自己的話，另一端還在確認所學有沒有根據。你可以把作品和參考過的範例並排，標出哪一處是你有意做得不同。'],
  ['資源牽涉分配，也牽涉人的自主。若你提供資源，先說對方能自行決定的範圍；若你接受幫忙，也要說清楚哪些事仍由自己負責。','外面的需要和手上的本事要能接上。有人願意出價時，拿一份做過的東西請他指出真正想買哪部分，別在還沒問清前把整套都答應下來。','兩端都在盤算值得付出什麼。先保住一個普通月份需要的東西，再看額外的機會，才不會讓漂亮的一次回報左右長期安排。','資源和責任落在兩個位置。答應加碼以前，把多出的工作由誰承擔談清楚，否則一端看見好處，另一端可能一直在消化成本。','取得一個機會，也需要判斷它的資料是否夠用。挑一項足以改變決定的條件查到底，能免去反覆做無關緊要的功課。'],
  ['責任需要有人實際接起來。如果規矩一直由一方訂、另一方做，先確認做事的人遇到例外時能否自己作主。','規則和表達放在同一件事裡，最有空間的是用小成果去換信任。讓對方先看到新做法如何守住他在意的結果，往往比先辯規則好壞更有用。','一邊要求負責，一邊需要資源。若工具、人手或時間都不在你手上，先決定能交到哪裡，再承諾自己願意做的部分。','兩處都看重責任的歸屬。事情出了岔子時，先查最早是哪一個決定沒有人能作主，比找到最後一個經手的人更能解決問題。','要求和支援可以接在一起。收到一個高標準時，最值得追問的是有沒有可參照的例子，以及誰願意讓你試做一回再給回饋。'],
  ['經驗能幫你判斷，也得留一次自己動手的機會。若每回都有人替你收尾，把下一次的最後一步留在自己手裡，才看得出是哪個地方還沒學熟。','一端收進既有的方法，另一端要做出自己的版本。挑一個熟悉做法，說清楚它適用的條件，再改動其中一個條件，看成果會不會跟著變。','讀懂規則後，還得衡量投入。若準備已經花掉大半時間，先找一個真有需要的人探問這份功夫值不值得繼續做深。','熟悉的方法可以幫你接住要求。若標準變了，別急著照舊趕完；先請對方指出哪個舊例已經不適用，再決定該保留多少。','兩處都偏向理解來龍去脈。查資料能替你省下返工，卻也容易讓決定一直往後放。先說好得到哪一個答案就動手，會比較知道何時收起筆記。'],
];

function positions(row) {
  const all = [], map = {};
  for (const [key, pillar] of Object.entries(row.pillars)) {
    if (key !== 'day') {
      const item = {key, god:godName(pillar.stemTenGod), stem:pillar.stem, place:'透干', name:roles[key]+'干'+pillar.stem, ref:'/pillars/'+key+'/stemTenGod'};
      all.push(item); map[key+'Stem'] = item;
    }
    for (const [i,h] of pillar.hiddenStems.entries()) {
      const item = {key, god:godName(h.tenGod), stem:h.stem, place:h.isMain?'本氣':'藏干', name:roles[key]+'支'+pillar.branch+(h.isMain?'的本氣':'所藏的')+h.stem, ref:'/pillars/'+key+'/hiddenStems/'+i};
      all.push(item);
      if (h.isMain) map[key+'Main'] = item;
    }
  }
  const priorities = {透干:0,本氣:1,藏干:2};
  for (const [name, family, fallback] of [['moneyContext',2,'dayMain'],['peerContext',0,'monthMain'],['resourceContext',4,'monthMain']]) {
    map[name] = all.filter(v => familyOf(v.god) === family).sort((a,b)=>priorities[a.place]-priorities[b.place])[0] ?? map[fallback];
  }
  return {all,map};
}

const branchText = r => r.pillars.map((p,i)=>roles[p]+'支'+r.branches[i]).join('與')+kinds[r.type];
const priorities = {love:'day',family:'year',friends:'year',home:'day',change:'month',work:'month',money:'hour',learning:'month',care:'hour',rest:'day',voice:'hour',direction:'hour',temperament:'month'};
const pairPlaces = {
  year:'較早熟悉的規矩、家人或外界的眼光', month:'平日反覆遵循的安排、工作或學習環境',
  day:'自己的日常與最靠近的人', hour:'之後想完成的事、晚輩或自己帶的人',
};
const cue = (name,ref,text) => ({name,ref,text});
function resolvePair(map, a, b) {
  const x = map[a], y = map[b];
  if (x.ref !== y.ref) return [x,y];
  const alt = [map.dayMain,map.hourStem,map.monthStem,map.yearMain].find(x2=>x2.ref!==x.ref);
  return [x,alt];
}

function questions(topic) {
  return [...cases[topic], finalCases[topic]];
}

// These exercises are common to every chart and live outside the published chapter body.
export function chapterPractice(topic) {
  const spec = chapters[topic];
  return {scene: spec.scene, question: spec.question,
    cases: Object.fromEntries(questions(topic).map(([name,,situation,,,follow]) => [name,{situation,follow}]))};
}

export function lifeBook(row) {
  const {all,map} = positions(row), result = {};
  const logic=chartLogic(row,all), signals=caseSignals(row,all), used=new Set();
  for (const [topic, spec] of Object.entries(chapters)) {
    const [x,y] = resolvePair(map,...spec.pair), f=familyOf(x.god), g=familyOf(y.god);
    const lead = chapterOpening(topic,row,signals);
    const use = priorities[topic], base = row.pillars[use], ref='/pillars/'+use;
    const links = row.interactions.map((r,i)=>({r,ref:'/interactions/'+i})).filter(({r})=>r.pillars.includes(use));
    const near = links.find(l=>l.r.type==='CLASH') ?? links[0];
    const other = near && links.find(l=>l!==near && l.r.type!==near.r.type);
    const evidence = [...lead.ref,x.ref,y.ref,ref];
    const pairKey=f+','+g;
    const contrast=used.has(pairKey)?'':dialogue[f][g];
    used.add(pairKey);
    const parts = [
      lead,
      cue(spec.lens,[x.ref,y.ref],x.name+'為'+x.god+'，先看「'+voices[x.god]+'」。'+spec.other+'，'+y.name+'的'+y.god+'也要一起讀。'+contrast),
      logic[topic],
    ];
    if (near) {
      const refs=[near.ref], names = [branchText(near.r)];
      if(other) { refs.push(other.ref); names.push(branchText(other.r)); }
      parts.push(cue('回到'+roles[use]+'柱'+base.ganZhi,refs,names.join('，另見')+'。'+
        (other ? '同一柱有兩條線索，只讀其中一條，會漏掉另一邊的牽動。' : '')+
        '這一章取'+roles[use]+'柱來看'+pairPlaces[use]+'。'));
      evidence.push(...refs);
    } else {
      parts.push(cue(roles[use]+'柱的取法',[ref,'/interactions'],'這一章看'+roles[use]+'柱'+base.ganZhi+'，用它觀察'+pairPlaces[use]+'。原局所列的地支互動都沒有牽到'+roles[use]+'支'+base.branch+'，這裡就從該支藏干來讀。'+map[use+'Main'].name+'為'+map[use+'Main'].god+'。'));
      evidence.push('/interactions');
    }
    parts.push(cue('下一次可以怎麼談',[y.ref],decisions[topic][g]));
    evidence.push(...logic[topic].ref);
    for (const [name,key,,yes,no] of questions(topic)) {
      const signal=signals[key];
      parts.push({name,ref:signal.refs,caseSignal:key,side:signal.yes,
        text:(signal.yes?yes:no)+'\n\n'+signal.text});
      evidence.push(...signal.refs);
    }
    result[topic]={title:spec.title,parts,evidence:[...new Set(evidence)]};
  }
  return result;
}
