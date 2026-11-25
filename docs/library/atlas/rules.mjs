// OpenFate corpus profile 1. The positional order is part of the index format.
import { references } from './references.mjs';

export const profile = 'openfate-ziping-atlas/1';
export const relations = {
  CLASH: '相沖', COMBINATION_2: '六合', COMBINATION_HALF: '半合', TRINE: '三合',
  DIRECTIONAL: '三會', PUNISHMENT: '相刑', DESTRUCTION: '相破', HARM: '相害',
};
const stems = '甲乙丙丁戊己庚辛壬癸';
const branches = '子丑寅卯辰巳午未申酉戌亥';
const lu = '寅卯巳午巳午申酉亥子';
const blade = { 甲: '卯', 丙: '午', 戊: '午', 庚: '酉', 壬: '子' };
const element = { wood:'木', fire:'火', earth:'土', metal:'金', water:'水' };
const elements = '木火土金水';
const traditional = { 伤官:'傷官', 七杀:'七殺', 偏财:'偏財', 正财:'正財', 劫财:'劫財' };
const group = { 比肩:'比劫', 劫財:'比劫', 正印:'印', 偏印:'印', 正官:'官殺', 七殺:'官殺',
  正財:'財', 偏財:'財', 食神:'食傷', 傷官:'食傷' };
const direct = [
  ['officer','正官格','財、印','傷官、七殺'], ['killings','七殺格','食神、印','正官'],
  ['wealth','正財格','食傷、官殺','比劫'], ['indirect-wealth','偏財格','食傷、官殺','比劫'],
  ['seal','正印格','官殺','財'], ['indirect-seal','偏印格','官殺','財、食神'],
  ['food','食神格','財、七殺','偏印'], ['hurting','傷官格','印、財','正官'],
  ['peer','比肩月令','官殺、食傷、財',''], ['rob','月劫格','官殺、食傷、財',''],
  ['lu','建祿格','官殺、食傷、財',''], ['blade','月刃格','官殺',''],
];
const monthIds = { 比肩:'peer', 劫財:'rob', 正官:'officer', 七殺:'killings', 正財:'wealth', 偏財:'indirect-wealth',
  正印:'seal', 偏印:'indirect-seal', 食神:'food', 傷官:'hurting' };
const monthRules = direct.map(([id, name, supports, conflicts]) => ({
  id, name, family:'月令', supports:supports.split('、'), conflicts:conflicts ? conflicts.split('、') : [],
  description:'取此月令後，看年、月、時干有沒有透出' + supports + '。' +
    (conflicts ? '若同時透出' + conflicts + '，保留為對照盤，另查制化救應。' : ''),
}));
const transformations = [
  ['wood','木','丁壬'], ['fire','火','戊癸'], ['earth','土','甲己'], ['metal','金','乙庚'], ['water','水','丙辛'],
].map(([key, target, pair]) => ({ id:'transform-'+key, name:'化'+target+'格', family:'化氣', target, pair,
  description:pair+'相合，日干須是其中一字。另一字只透一次且與日干相鄰；月支本氣屬'+target+
    '。日干在四支均無同五行根，年、月、時干也無剋化神之干（合伴除外）。' }));
const followers = [
  ['wealth','從財格','財'], ['power','從殺格','官殺'], ['output','從兒格','食傷'],
  ['mixed','從勢格','雜'], ['strength','從強格','印'], ['dominant','從旺格','比劫'],
].map(([key, name, target]) => ({ id:'follow-'+key, name, family:'從格', target,
  description: target === '雜' ? '年、月、時干與四支本氣均屬食傷、財或官殺，三類俱全，最多的一類至多佔三處。四支藏干均無印比。' :
    ['印','比劫'].includes(target) ? '月支本氣屬'+target+'，七處明干與支本氣全屬印比，其中至少四處屬'+target+'。四支藏干均無官殺。' :
    '月支本氣屬'+target+'，七處明干與支本氣至少四處屬'+target+'，明干與所有藏干均無印比。' +
    (target === '官殺' ? '明干與支本氣也須無食傷制殺。' : target === '食傷' ? '七處至少見一處財，食傷有去處。' : '') }));
const dominants = [
  ['wood','曲直格','木',['亥卯未','寅卯辰']], ['fire','炎上格','火',['寅午戌','巳午未']],
  ['earth','稼穡格','土',['辰戌丑未']], ['metal','從革格','金',['巳酉丑','申酉戌']],
  ['water','潤下格','水',['申子辰','亥子丑']],
].map(([key, name, target, sets]) => ({ id:'dominant-'+key, name, family:'專旺', target, sets,
  description:target+'日主，四支齊見'+sets.join('或')+'，月支本氣屬'+target+
    '。年、月、時干無剋日主的五行。本版取條件較窄的一組命例。' }));
export const rules = [...monthRules, ...transformations, ...followers, ...dominants];
export const monthCount = monthRules.length;
export const sources = {
  月令: ['《子平真詮》〈論雜氣如何取用〉', 'https://upload.wikimedia.org/wikipedia/commons/f/fe/NLC416-11jh010455-35296_%E5%AD%90%E5%B9%B3%E7%9C%9F%E8%A9%AE.pdf#page=41'],
  從格: ['《滴天髓》〈從化論〉', 'https://zh.wikisource.org/zh-hant/滴天髓#從化論－真'],
  化氣: ['《滴天髓》〈從化論〉', 'https://zh.wikisource.org/zh-hant/滴天髓#從化論－真'],
  專旺: ['《三命通會》卷六', 'https://zh.wikisource.org/zh-hant/三命通會/卷六#曲直'],
};
function chartFacts(pillars) {
  const parts = pillars.split(' ');
  if (parts.length !== 4 || parts.some(p => p.length !== 2 || !stems.includes(p[0]) ||
      !branches.includes(p[1]) || stems.indexOf(p[0]) % 2 !== branches.indexOf(p[1]) % 2)) throw Error('Invalid four pillars');
  const day = parts[2][0], month = parts[1][1], letters = parts.map(p => p[1]);
  const visible = [parts[0][0], parts[1][0], parts[3][0]];
  const god = s => traditional[references.god[day+s]] ?? references.god[day+s];
  const elem = s => element[references.element[s]];
  const hidden = letters.map(b => references.hidden[b]);
  const monthStems = hidden[1], main = monthStems[0];
  const exposed = [...monthStems].filter(s => visible.includes(s));
  const selected = !exposed.includes(main) && exposed.length === 1 ? exposed[0] : main;
  const frame = lu[stems.indexOf(day)] === month ? 'lu' : blade[day] === month ? 'blade' : monthIds[god(selected)];
  const seven = [...visible, ...hidden.map(s => s[0])].map(s => group[god(s)]);
  const visibleGods = visible.map(god);
  return { day, month, letters, visible, visibleGods, elem, god, hidden, monthStems, exposed, selected, frame,
    monthGroup:group[god(main)], monthElement:elem(main), seven,
    hiddenGroups:[...hidden.join('')].map(s => group[god(s)]),
    allGodGroups:[...visible, ...hidden.join('')].map(s => group[god(s)]),
    dayRoot:hidden.some(h => [...h].some(s => elem(s) === elem(day))) };
}
const controls = target => elements[(elements.indexOf(target) + 3) % 5];
function checks(rule, f) {
  const { day, monthElement, seven, visible, visibleGods } = f;
  const test = (label, ok) => ({ label, ok });
  if (rule.family === '月令') {
    const hits = list => visibleGods.filter(g => list.includes(g) || list.includes(group[g]));
    const support = hits(rule.supports), interference = hits(rule.conflicts);
    return [
      test('取月令為' + rule.name, f.frame === rule.id),
      test('年、月、時干取' + rule.supports.join('或') + (support.length ? '，見' + support.join('、') : '，均未透'), !!support.length),
      ...(rule.conflicts.length ? [test('查' + rule.conflicts.join('、') + (interference.length ? '，透出' + interference.join('、') : '，均未透'), !interference.length)] : []),
    ];
  }
  if (rule.family === '化氣') {
    const partner = [...rule.pair].find(s => s !== day);
    const adjacent = [visible[1], visible[2]].includes(partner);
    const count = [day,...visible].filter(s => s === day).length === 1 && visible.filter(s => s === partner).length === 1;
    return [test('日干參與' + rule.pair + '合', rule.pair.includes(day)),
      test('合伴在月干或時干，兩字均無爭合', adjacent && count),
      test('月支本氣屬' + rule.target, monthElement === rule.target),
      test('日主在各支藏干無同五行根', !f.dayRoot),
      test('合伴以外無' + controls(rule.target) + '干剋化神', !visible.some(s => s !== partner && f.elem(s) === controls(rule.target)))];
  }
  if (rule.family === '專旺') {
    return [test('日主屬' + rule.target, f.elem(day) === rule.target),
      test('四支齊見' + rule.sets.join('或'), rule.sets.some(set => [...set].every(b => f.letters.includes(b)))),
      test('月支本氣屬' + rule.target, monthElement === rule.target),
      test('其餘三干無' + controls(rule.target) + '剋身', !visible.some(s => f.elem(s) === controls(rule.target)))];
  }
  const counts = g => seven.filter(s => s === g).length;
  const supportive = g => ['印','比劫'].includes(g);
  if (rule.target === '雜') {
    const distribution = ['食傷','財','官殺'].map(counts);
    return [test('七處均屬食傷、財或官殺', !seven.some(supportive)),
      test('食傷、財與官殺俱見，最多一類至多三處', Math.min(...distribution) >= 1 && Math.max(...distribution) <= 3),
      test('其餘藏干無印比', !f.allGodGroups.some(supportive))];
  }
  const results = [test('月支本氣屬' + rule.target, f.monthGroup === rule.target),
    test('七處至少四處屬' + rule.target + '，實見' + counts(rule.target) + '處', counts(rule.target) >= 4)];
  if (supportive(rule.target)) {
    results.push(test('七處均屬印比', seven.every(supportive)), test('所有藏干無官殺', !f.hiddenGroups.includes('官殺')));
  } else {
    results.push(test('年、月、時干及所有藏干均無印比', !f.allGodGroups.some(supportive)));
    if (rule.target === '官殺') results.push(test('七處無食傷制殺', !seven.includes('食傷')));
    if (rule.target === '食傷') results.push(test('七處見財承接食傷', seven.includes('財')));
  }
  return results;
}
function outcome(rule, items) {
  if (!items[0].ok) return 'outside';
  const missing = items.filter(c => !c.ok).length;
  if (!missing) return 'match';
  return rule.family === '月令' || missing === 1 ? 'review' : 'outside';
}
export function evaluate(pillars) {
  const facts = chartFacts(pillars);
  const entries = rules.map(rule => {
    const items = checks(rule, facts);
    return { id:rule.id, status:outcome(rule, items), checks:items };
  });
  const branchEvidence = facts.letters.map((branch,i) => ['年','月','日','時'][i]+'支'+branch+'藏'+
    [...facts.hidden[i]].map(s=>s+'（'+facts.god(s)+'）').join('、'));
  return { branchEvidence, frame:facts.frame, month:facts.month, hidden:facts.monthStems, exposed:facts.exposed.join(''),
    selected:facts.selected, visible:facts.visible, visibleGods:facts.visibleGods, entries };
}
