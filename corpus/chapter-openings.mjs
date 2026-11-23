// The first family names the resource or action at issue. The second supplies its condition.
// Only compare positions in the natal chart. A hidden or absent family says nothing about ability.
import { roles, kinds } from './language.mjs';

export const themes = {
  work: {
    pair: ['output', 'duty'],
    both: '帶一個改法去談，也帶上原來的驗收標準。｜提案時拿同一件交付來比兩種做法，請負責人指出哪個條件一定得守住。',
    first: '接下改善流程的工作前，先問哪一步你有權改。｜拿最近一件返工的案子問主管：如果由你重做，可以自己選方法，還是每次都要送審？答案會改變這份工作值不值得接。',
    second: '先拿到標準，再爭取一次試做。｜問主管能否把最常退件的一項交給你試兩種做法。談定誰驗收，再投入改流程的工時。',
    inside: '拿一張真的退件單來談工作。｜請團隊從退件講到重交，聽清楚是誰發現問題、誰准許修改，才知道這份職務能負責到哪裡。',
    noFirst: '選職位時，先問哪一件事能由你獨立接手。｜請主管講一次新人從旁觀到獨立負責的經過。這張盤不足以把「擅長改善流程」當作選職業的理由。',
    noSecond: '做得出樣品之後，找誰決定採不採用？｜面談時請對方說一件同事提過的改動，從誰先試用問到誰最後點頭。這個答案比職缺上的「自由發揮」具體。',
    neither: '把兩份職缺各換成一個真實任務。｜請兩位主管各說明新人第一個月要獨立交出什麼，再按自己的經驗判斷哪份工作做得來。',
  },
  money: {
    pair: ['output','wealth'],
    both:'把成品和收款條件放在同一張報價單。｜約好哪一版算交付，對方驗收後多久付款。兩項分開談，往往完工後才發現還要再改。',
    first:'有人稱讚作品，可以先問他願意買哪一部分。｜用一個小訂單確認用途和價格，再決定值不值得替整套服務備料。',
    second:'有人開了價，先試一次交付要花多久。｜把修改、交接和回覆訊息都算進去，再決定願不願用這個價錢接第二單。',
    inside:'跟著一筆小單從開工算到入帳。｜成本和回款都親手走過一次，下回報價才知道哪一段不能免費送。',
    noFirst:'先弄清楚這筆收入究竟付你做什麼。｜要你出時間、設備或介紹客戶，是三種不同的交易，答應之前請對方挑明。',
    noSecond:'談到分潤，先問第一筆錢從哪裡來。｜用對方已成交的一筆款項算一次。還沒人付過的價格，只適合拿來試單。',
    neither:'拿最近一筆交易估報酬。｜從實收金額扣掉墊款，再算進來回溝通的時間，用這個數字衡量下一單。'},
  family: {
    pair:['support','duty'],
    both:'把家人的幫忙和你答應的事一起講清楚。｜例如有人願意接送，就確認哪幾天能固定幫忙、臨時有事誰來接手。',
    first:'受了家人的照顧，可以先問對方希望你怎麼回應。｜對方也許只希望早點知道你的安排，未必希望替你決定。',
    second:'家人把事交給你時，當場約一個能輪替的人。｜排得出下一班，你才知道這次是代一天，還是往後都要你來。',
    inside:'找一次家裡臨時改行程的經過來談分工。｜從誰先收到消息、誰最後留下收尾談起，比問誰對家裡付出最多容易說清楚。',
    noFirst:'遇到家庭請託，先看自己能答應到哪一天。｜請對方找好之後的接手人，再一起確認什麼時候交班。',
    noSecond:'把收到的好意問清楚。｜若長輩願意幫忙帶孩子或接送，可以問他哪一天最方便，別讓偶爾一次變成默認的義務。',
    neither:'從上週最累的那件家務重新排。｜讓實際做的人講一次花了多少時間，再商量下一次誰接。'},
  friends: {
    pair:['peer','wealth'],
    both:'合夥前，把出力和出錢分成兩筆談。｜有人跑客戶，有人先付訂金，散夥時怎麼結算，最好趁兩人還談得來時講。',
    first:'和熟人開工前，先問這次誰出成本。｜各自接了哪些工作通常容易看見，預算超支時誰補，卻常到付款那天才知道。',
    second:'朋友帶來一個有預算的案子，先留一段給你自己決定。｜談好交付邊界，再決定要不要用友情換一次額外修改。',
    inside:'先一起做完一件當天能結清的小事。｜看雙方怎麼記帳、臨時多出來的工作誰接，再談長期合作。',
    noFirst:'有人出資時，也要找到真正執行的人。｜先確認他肯投入幾個晚上，再向出錢的人承諾交期。',
    noSecond:'關係再熟，墊款也要有上限。｜先談好誰留下收據、何時結清，才不會每次聚會都得找機會催帳。',
    neither:'選合夥人，先回想上次出了岔子時他做了什麼。｜一次真的補位，比口頭上說會互相照應更值得參考。'},
  learning: {
    pair:['support','output'],
    both:'用剛學的方法解一題沒看過的題目。｜把你的解法和老師的判準並排，找出自己在哪一步把條件看錯。',
    first:'合上教材，試著把第一步做出來。｜若離開範例便卡住，把那一處帶回去問老師，比重讀整章更省力。',
    second:'先保留自己的解法，再問一位熟手。｜請他指出方法在哪種情況會失效，免得碰巧做對一次便當成通則。',
    inside:'挑一題隔天重做。｜記下哪一步仍要翻筆記，下一次請教就從那裡開始。',
    noFirst:'從做過的成品倒查一個原理。｜請一位熟手改變題目的一項條件，看你的方法還能否成立。',
    noSecond:'選課前，請老師示範怎麼改一份作業。｜看到錯誤如何訂正，比讀課程大綱更能判斷你會學到什麼。',
    neither:'拿你目前卡住的題目去試課。｜看一堂課後能不能自己往下做一步，再決定是否續學。'},
  voice: {
    pair:['output','duty'],
    both:'想推翻舊做法，先保留對方最在意的驗收條件。｜用同一個案例展示新舊差別，讓聽的人有具體理由答應試一次。',
    first:'提改法前，找出誰能答應試一次。｜帶著小樣去談，順手問清楚試做要找誰簽字。',
    second:'先問哪條規則有例外，再開口提意見。｜把意見放進那個例外，對方會比較容易說出究竟能改到哪裡。',
    inside:'先私下改一小段，找實際使用的人試讀。｜他在哪一句會錯意，就先改那一句，毋須重寫整份提案。',
    noFirst:'先指出哪一處規定讓事情卡住。｜拿實際發生過的例子請負責的人解釋，慢一點給答案也無妨。',
    noSecond:'讓第一個聽你提案的人把它說回來。｜若他聽成另一件事，先改動例子，再決定要向誰正式提出。',
    neither:'帶一個聽眾熟悉的例子開口。｜讓他指出哪裡還不明白，再補足那一段背景。'},
  home: {
    pair:['wealth','support'],
    both:'看房時，把月租和每天需要的照應一起算。｜便宜一點卻得多一趟接送，省下的錢是不是划算，要按普通的工作日來看。',
    first:'租金談妥後，走一次最不方便的日常路線。｜下班晚了誰能接人、臨時買東西要去哪，這些條件也會影響住多久。',
    second:'熟悉的地點值得多少租金，先自己訂個上限。｜把多付的金額和每週省下的時間寫在一起，再去談續約。',
    inside:'挑一個平常的晚上去看房。｜從下班走到家門口，順路看看採買和轉車，回家再核對總支出。',
    noFirst:'想繼續住在有人照應的地方，先把費用問全。｜管理費、交通和搬遷一次付出的成本，都寫進比較表。',
    noSecond:'算完房租，再替生活裡最難調動的時段找備案。｜例如晚班結束後還有沒有車，會直接影響這個住處能不能久住。',
    neither:'請每位同住的人各說一項不能犧牲的條件。｜帶著這些條件實地走過一遍，再決定要不要簽約。'},
  change: {
    pair:['wealth','duty'],
    both:'接新機會前，請對方把多給你的資源和責任寫在一起。｜若預算被收回，交期能不能重談，也應該在出發前講好。',
    first:'對方開的條件很好，還要問誰有權兌現。｜請負責人親自確認調動日期和人手，才值得為此搬家或離職。',
    second:'肩上的責任已經談定，就把可用的人手也談定。｜如果只能自己做，請對方在工作範圍或日期裡選一項調整。',
    inside:'先試一段普通的上班日，再談是否搬過去。｜短住期間按真正的工時和交通方式過，估算一個月會多出多少開銷。',
    noFirst:'工作內容談清楚後，追問轉換期由誰負擔。｜把搬遷、空窗和試用期延長的成本算進去再答覆。',
    noSecond:'資源到位之前，給這次轉換留一個可以退出的日期。｜問出到時誰能確認續約，再做難以回頭的安排。',
    neither:'把最難回頭的一步留到最後。｜先短住、試做或跟未來同事走完一天，拿到自己的觀察再決定。'},
  rest: {
    pair:['duty','support'],
    both:'要有完整的休息，先把值班交給一個知道怎麼接的人。｜跟他約好什麼情況才叫你回來，其餘訊息等上班再看。',
    first:'排休之前，先排接電話的人。｜如果工作一出狀況仍只有你能處理，就先把其中一個決定教會接手的人。',
    second:'有人願意接手時，把交接的時間用完。｜選一個平常捨不得離開的時段真的離線，回來再一起看有什麼需要補交代。',
    inside:'挑一次休假被打斷的經過來看。｜問清楚當時少了哪一份資料或哪一個權限，下次休假前先補它。',
    noFirst:'先試著空出一晚，看看什麼事真的會來找你。｜把實際打斷休息的事情留下，下一次只替那幾件事做安排。',
    noSecond:'下班前約好下一個接手時間。｜若還找不到人，先跟主管談哪一件可以延到明天，別默默把整晚都留下來。',
    neither:'保留一個沒有約人的晚上。｜隔天看看自己最需要的是補眠、獨處還是見個熟人，再排下一次休息。'},
  care: {
    pair:['support','peer'],
    both:'把方法示範一次，下一次讓對方自己決定。｜先講清楚遇到什麼情況才需要叫你，其他小錯留給他自己發現。',
    first:'教完以後，把最後一步交還給學的人。｜請他用自己的順序做完一遍，才看得出剛才聽懂的部分能不能獨立使用。',
    second:'對方想自己試，就一起挑一個能補救的任務。｜把求助入口留好，約定完成後再看，免得你全程在旁邊接手。',
    inside:'挑一件能從頭做到尾的小事來交棒。｜讓對方說出他在哪一步最拿不準，再只示範那一步。',
    noFirst:'先問對方想自己解到哪一步。｜讓他說明需要的是工具還是一個判斷標準，再決定給多少幫忙。',
    noSecond:'照顧人時，留一項由對方決定的小事。｜他若有不同做法，先看結果，別因為順序不同就接過來。',
    neither:'下一次帶新人，先觀察他獨自做一遍。｜看清楚他已有的本事，才知道哪一段適合你教。'},
  direction: {
    pair:['peer','output'],
    both:'選一條你能親手做出第一個版本的路。｜約一位真的會用它的人，下週把成品交給他，聽過回應再決定要不要多押一個月。',
    first:'把心裡最想走的那條路換成半天的試做。｜先決定試完要拿什麼回來，免得忙了一圈仍只能比較感覺。',
    second:'你願意做出來的東西，也值得由你選擇怎麼做。｜找出哪一個決定現在還得等別人同意，先去談那個條件。',
    inside:'各替兩個選項做一次最小的嘗試。｜留下那次實際花的時間和你還想追問的事，隔天再選。',
    noFirst:'拿做過的一件事，換一次跟當事人詳談的機會。｜聽他說清楚平常的一天，再看這個方向適不適合自己。',
    noSecond:'想自己走的方向，可以先找一個看得見的里程碑。｜約好兩週後手上要有什麼，到了那天再決定是否延長。',
    neither:'把兩個選項各寫成一個平常的星期三。｜挑一個你也願意真的過那種日子的方向，先安排一次實地體驗。'},
};

function opening(copy, evidence, refs) {
  const [name, advice] = copy.split('｜');
  return {name, text: advice + '\n\n' + evidence, ref: [...new Set(refs)]};
}

function condition(first, second) {
  if (first.state === 'absent') return second.state === 'absent' ? 'neither' : 'noFirst';
  if (second.state === 'absent') return 'noSecond';
  if (first.yes) return second.yes ? 'both' : 'first';
  return second.yes ? 'second' : 'inside';
}

export const temperament = [
  '換個環境時，先用一件小事試自己的判斷。｜挑一個可回頭的決定，記下當時知道什麼，事後再看哪項資訊真的改變了做法。',
  '換到陌生的地方，先挑一件做熟的事。｜從你認得的步驟做起，跟以前不同的那一步再去請教，較容易辨認哪些經驗還用得上。',
  '熟悉的規矩先留著，遇到例外時給自己一次試做。｜挑一次照舊做卻沒有效的經過，問問原來的條件是哪一個改了。',
  '遇到相反意見，帶一個做過的例子去問。｜請對方指出哪個條件會讓你的舊方法失效。說得出具體差別，再決定這次要改哪一步。',
];
export const dayReadings = {
  clash:'相處有摩擦，先把兩人各自能改的安排說出來。｜若卡在見面或分工，先讓每人指出一項能調的事，再談兩邊都動不了的限制。',
  linkedClash:'兩人已經談妥，還得替牽動行程的人留個位置。｜若約好的時間一再改，先問是哪邊另外答應了別人，再決定要重談的是你們的約定，還是外面的安排。',
  joined:'把兩個人的默契落到一件能互相確認的小事。｜例如誰臨時晚到就先留訊息，試一週後看兩人是不是都覺得自在。',
  other:'從最近一次沒說清楚的小事談起。｜各自說出當時以為對方答應了什麼，找出真的理解不同的那一句，再約下次怎麼說。',
  none:'問對方上次最希望你怎麼回應。｜從他真的說過的需要談起，少猜一次對方的心思，往往就能少繞一圈。',
};
const joining = new Set(['COMBINATION_2','TRINE','COMBINATION_HALF','DIRECTIONAL']);
const linkText = r => r.pillars.map((role,i)=>roles[role]+'支'+r.branches[i]).join('與')+kinds[r.type];

function loveOpening(row) {
  const indexed=row.interactions.map((r,i)=>({r,ref:'/interactions/'+i}));
  const day=indexed.filter(({r})=>r.pillars.includes('day'));
  const direct=day.find(({r})=>r.type==='CLASH');
  const join=day.find(({r})=>joining.has(r.type));
  const outside=join && indexed.find(({r})=>r.type==='CLASH' && r.pillars.some(p=>join.r.pillars.includes(p)));
  const mode=direct?'clash':outside?'linkedClash':join?'joined':day.length?'other':'none';
  const focus=direct?[direct,...(join?[join]:[])]:join?[join,...(outside?[outside]:[])]:day.slice(0,1);
  const evidence=focus.length?focus.map(x=>linkText(x.r)).join('，另見')+'。':'這份原局的地支關係沒有牽到日支'+row.pillars.day.branch+'。';
  return opening(dayReadings[mode],evidence,['/pillars/day/branch','/interactions',...focus.map(x=>x.ref)]);
}

export function chapterOpening(topic, row, signals) {
  if (topic==='love') return loveOpening(row);
  if (topic==='temperament') {
    const month=signals.monthRoot, roots=signals.roots;
    return opening(temperament[Number(month.yes)*2+Number(roots.yes)],month.text+roots.text,[...month.refs,...roots.refs]);
  }
  const theme=themes[topic];
  const [first,second]=theme.pair.map(key=>signals[key]);
  return opening(theme[condition(first,second)],first.text+second.text,[...first.refs,...second.refs]);
}
