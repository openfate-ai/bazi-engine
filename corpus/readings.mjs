import engine from '@openfate/bazi-engine';
import { pillarOrder } from './facts.mjs';
import { roles, elements, godName, kinds, monthNotes, families, concepts, relationNotes } from './language.mjs';

function section(title, text, evidence) {
  return { title, text, evidence: [...new Set(evidence)] };
}

function stemOccurrences(pillars) {
  const positions = [];
  for (const key of pillarOrder) {
    const p = pillars[key];
    if (key !== 'day') positions.push({
      source: 'visible', key, stem: p.stem, god: godName(p.stemTenGod),
      label: roles[key] + '干' + p.stem, ref: '/pillars/' + key + '/stemTenGod',
    });
    p.hiddenStems.forEach((h, i) => positions.push({
      source: h.isMain ? 'main' : 'hidden', key, stem: h.stem, god: godName(h.tenGod),
      label: roles[key] + '支' + p.branch + (h.isMain ? '的本氣' : '所藏的') + h.stem,
      ref: '/pillars/' + key + '/hiddenStems/' + i,
    }));
  }
  return positions;
}

function relName(rel) {
  return rel.pillars.map((key,i) => (key === 'dayun' ? '運支' : roles[key] + '支') + rel.branches[i]).join('與') + kinds[rel.type];
}

function crossReading(topic, positions) {
  const lookups = {
    work: ['expression', '工作除了權責，還要看意見怎麼提出。', '若要改一項規則，可以先用小範圍的成果爭取調整空間。'],
    wealth: ['expression', '再看成果如何換成回報。', '若有一件拿手的事，可以先確認誰需要成果、對方願意按什麼方式交換。'],
    learning: ['expression', '吸收和表達可以放在一起看。', '可以挑剛學會的一步做給別人看，對方問住你的地方，就是下一個要補的環節。'],
    expression: ['learning', '表達還有另一個來源。', '拿既有方法當底稿，改寫最不合用的一段，比從頭解釋全部更容易看出你的貢獻。'],
    peers: ['wealth', '分工也牽涉資源如何分配。', '若共同承接工作，把交付和分配一起談，免得做完才發現雙方預期不同。'],
  };
  const [other, opening, advice] = lookups[topic];
  const allies = positions.filter(s => families[other].gods.includes(s.god));
  const peer = allies.find(s => s.source === 'visible') ?? allies.find(s => s.source === 'main');
  if (!peer) return null;
  return { text: opening + peer.label + '帶' + peer.god + '。' + advice, ref:peer.ref };
}

function describeFamily(record, positions, family, topic) {
  const relevant = positions.filter(p => family.gods.includes(p.god));
  const visible = relevant.filter(p => p.source === 'visible');
  const primary = visible[0] ?? relevant.find(p => p.source === 'main') ?? relevant[0];
  const refs = relevant.map(p => p.ref);
  if (!primary) {
    return section(family.label + '未見於原局干支',
      '以' + record.dayMaster + '為日主，四柱天干與各支藏干裡都沒有' + family.gods.join('或') + '。' + family.missing,
      pillarOrder.map(key => '/pillars/' + key));
  }
  const other = relevant.find(p => p.god !== primary.god);
  const echo = relevant.find(p => p.stem === primary.stem && p.key !== primary.key && p.source !== primary.source);
  let comparison;
  if (other) {
    comparison = other.label + '又見' + other.god + '，帶出「' + concepts[other.god][0] + '」的一面。';
  } else if (echo) {
    comparison = '同一個' + primary.stem + '也見於' + echo.label + '，這條線索可以在兩個柱位對讀。';
  } else if (visible.length) {
    comparison = '這個字出現在天干，讀這個主題時可以先從它著手。';
  } else {
    comparison = '這條線索來自藏干，要看具體情境有沒有讓它發揮的空間。';
  }
  const cross = crossReading(topic, positions);
  return section(primary.label + '見' + primary.god,
    primary.label + '對日主' + record.dayMaster + '是' + primary.god + '。談' + family.noun +
    '，傳統取象偏向「' + concepts[primary.god][0] + '」。' + comparison +
    (cross ? '\n\n' + cross.text : concepts[primary.god][1]), refs.concat('/dayMaster', cross ? [cross.ref] : []));
}

function junction(relations) {
  const links = relations.filter(r => ['COMBINATION_2','COMBINATION_HALF','TRINE','DIRECTIONAL'].includes(r.type));
  for (const clash of relations.filter(r => r.type === 'CLASH')) {
    for (const link of links) {
      const role = clash.pillars.find(k => link.pillars.includes(k));
      if (role) return { role, clash, link };
    }
  }
  return null;
}

export function interpret(record) {
  const p = record.pillars;
  const positions = stemOccurrences(p);
  const master = record.dayMaster + elements[p.day.element];
  const month = positions.find(s => s.key === 'month' && s.source === 'main');
  const visibleMonth = positions.find(s => s.key === 'month' && s.source === 'visible');
  const monthRefs = ['/pillars/month', '/pillars/day/stem'];
  const repeated = positions.filter(s => s.source !== 'visible' && s.stem === record.dayMaster);
  const rels = record.interactions;
  const at = r => '/interactions/' + rels.indexOf(r);
  const linked = junction(rels);
  const relBase = '/interactions';
  const labels = [
    '日主:' + master, '月令:' + p.month.branch, '月令本氣:' + month.god,
    ...positions.filter(s => s.source === 'visible').map(s => roles[s.key] + '干十神:' + s.god),
    ...rels.map(r => '地支:' + kinds[r.type]),
    ...rels.map(r => '柱位關係:' + relName(r)),
    '日干同字藏支:' + repeated.length,
  ];
  const readings = {};
  const matchesMonth = visibleMonth.stem === month.stem;
  readings.overview = section(master + '日主，' + p.month.ganZhi + '月',
    '日柱是' + p.day.ganZhi + '，全盤以' + master + '來定十神。月干' + p.month.stem + '為' + visibleMonth.god +
    '，月支' + p.month.branch + '的本氣' + month.stem + '為' + month.god + '。' +
    (matchesMonth ? '月支的本氣直接透在月干，這一柱從裡到外都指向' + month.god + '；分量還要連同其他干支一起看。' :
      '月干呈現「' + concepts[visibleMonth.god][0] + '」，支中本氣則帶出「' + concepts[month.god][0] + '」。這兩個位置都會影響月柱的讀法。'),monthRefs);
  readings.season = section(p.month.branch + '月的季節背景',
    monthNotes[p.month.branch] + '。本盤月支依序藏' + p.month.hiddenStems.map(h => h.stem).join('、') + '，先取' +
    month.stem + '為本氣。用這一層觀察' + master + '的季節背景，還要再查同類有沒有透干、其他柱有沒有承接，才足以下身強弱的判斷。', monthRefs);
  readings.roots = section(repeated.length ? '日干' + record.dayMaster + '也藏在' + repeated.map(s => roles[s.key]+'支').join('、') : '四支未藏與日干相同的字',
    repeated.length ? '逐支查看，' + repeated.map(s => s.label).join('、') + '與日干同字。' +
      '這讓' + master + '在這些位置有可追的根據。藏在本氣或其他藏干，判讀分量有別，不能直接把出現次數當作旺衰分數。' :
      '日干是' + record.dayMaster + '，四支' + pillarOrder.map(k => p[k].branch).join('、') +
      '的藏干裡沒有同一個字。這裡只查同字；若要論通根與扶助，仍要納入同五行異陰陽的干，以及印星。', ['/dayMaster', ...pillarOrder.map(k=>'/pillars/'+k+'/hiddenStems')]);
  for (const [key,family] of Object.entries(families)) {
    readings[key] = describeFamily(record, positions, family, key);
    const visible = positions.some(s => s.source === 'visible' && family.gods.includes(s.god));
    const hidden = positions.some(s => s.source !== 'visible' && family.gods.includes(s.god));
    labels.push(family.label + ':' + (visible && hidden ? '藏透俱見' : visible ? '僅透干' : hidden ? '僅藏支' : '未見'));
  }
  const dayEdges = rels.filter(r => r.pillars.includes('day'));
  const spouseQi = positions.find(s => s.key === 'day' && s.source === 'main');
  readings.relationship = section('從日支' + p.day.branch + '看相處',
    '日支' + p.day.branch + '是傳統看親密關係的起點，本氣' + spouseQi.stem + '對日主為' + spouseQi.god +
    '，可先從「' + concepts[spouseQi.god][0] + '」理解相處中在意的事。' +
    (dayEdges.length ? '再看' + dayEdges.map(relName).join('；另見') + '。' + relationNotes[dayEdges[0].type] :
      '本盤列出的地支關係沒有牽到日支。若想理解一段關係，還得問兩人眼前實際要協調什麼。'),
    [spouseQi.ref, '/dayMaster', ...(dayEdges.length ? dayEdges.map(at) : [relBase])]);
  if (linked) {
    const { role, clash, link } = linked;
    labels.push('共用柱位:' + roles[role] + '支合沖並見');
    readings.interactions = section(roles[role] + '支' + p[role].branch + '同時參與合與沖',
      relName(link) + '，同時' + relName(clash) + '。兩條關係共用' + roles[role] + '支' + p[role].branch +
      '，若只採其中一條，另一組受牽動的位置就會漏掉。盤上的合與沖可以並列；哪邊佔上風，還需要旺衰和時運條件。', [at(link),at(clash)]);
  } else if (rels.length) {
    const focus = [...rels].sort((a,b)=>b.pillars.length-a.pillars.length)[0];
    readings.interactions = section(relName(focus), relName(focus) + '。' + relationNotes[focus.type] +
      (rels.length > 1 ? '原局共標出' + rels.length + '組柱位關係；同一地支若在別柱再出現，須按柱位分開讀。' : '這是本盤按所列規則辨認到的唯一一組原局地支關係。'), [at(focus),relBase]);
  } else {
    readings.interactions = section('原局四支未見所列合沖刑害等關係',
      '原局四支為' + pillarOrder.map(k=>p[k].branch).join('、') + '。逐柱核對，在本資料集採用的八類地支關係中沒有命中。大運加入新的地支後，需要另行比對。', [relBase,...pillarOrder.map(k=>'/pillars/'+k+'/branch')]);
  }
  const yun = record.daYun;
  const natalBranches = Object.fromEntries(pillarOrder.map(k => [k, p[k].branch]));
  const cycleRelations = yun.cycles.slice(0, 2).map(cycle =>
    engine.detectInteractions(natalBranches, { dayunBranch: cycle.branch }).filter(rel => rel.pillars.includes('dayun')));
  if (!yun.cycles.length) {
    labels.push('起運:交節待定');
    readings.onset = section('交節附近，起運時間待定','採用真太陽時的年、月柱與民用時刻的交節判定落在不同側。此筆保留四柱與出生條件，精確起運日留空。',['/daYun/timing']);
    readings.firstCycle = section('首運未列','本筆未取得精確起運紀錄，無法依這套口徑指定第一步大運的起點。',['/daYun/timing']);
    readings.nextCycle = section('換運未列','前兩步大運的日期沒有列入，因此跳過換運判讀。',['/daYun/timing']);
  } else {
    const [first, second] = yun.cycles;
    const direction = yun.isForward ? '順行' : '逆行';
    labels.push('大運:' + direction, '首運:' + first.ganZhi);
    const jieName = { 惊蛰: '驚蟄', 芒种: '芒種' }[yun.timing.jieName] ?? yun.timing.jieName;
    readings.onset = section(direction + '，以' + jieName + '起算',
      '這筆樣本按' + direction + '取' + (yun.isForward ? '下一個' : '前一個或恰逢的') + '節「' + jieName +
      '」，引擎以出生和交節兩個實際時刻之差換算起運。依固定東八區民用時刻，算得首運起點為' + yun.startDate + '。這個日期屬於此一代表時刻。', ['/daYun/isForward','/daYun/startDate','/daYun/timing']);
    const g1=godName(first.stemTenGod), g2=godName(second.stemTenGod);
    const firstContact = cycleRelations[0][0], secondContact = cycleRelations[1][0];
    readings.firstCycle = section('首運' + first.ganZhi + '，運干為' + g1,
      '第一步大運為' + first.ganZhi + '，運干' + first.stem + '對' + master + '是' + g1 +
      '，運支本氣則對應' + godName(first.branchTenGod) + '。這一層可從「' + concepts[g1][0] +
      '」入手。' + (firstContact ? '把運支放回原局後，可見' + relName(firstContact) + '。' : '運支加入後，依本資料採用的規則，沒有新增涉及運支的地支關係。') +
      '首運可能始於童年，具體情境要按當時的年齡與生活環境來看。', ['/dayMaster','/daYun/cycles/0','/cycleRelations/0']);
    readings.nextCycle = section(first.ganZhi + '到' + second.ganZhi + '的讀法',
      '由' + first.ganZhi + '轉到' + second.ganZhi + '，運干從' + g1 + '換成' + g2 +
      '。前一步先看「' + concepts[g1][0] + '」，下一步把重點移到「' + concepts[g2][0] +
      '」。' + (secondContact ? '第二步加入' + second.branch + '，可追到' + relName(secondContact) + '。' : '第二步運支沒有引出本表所列的地支關係。') +
      '若要定位到某一年，還需另外排入該流年的干支。', ['/dayMaster','/daYun/cycles/0','/daYun/cycles/1','/cycleRelations/1']);
  }
  return { cycleRelations, labels: [...new Set(labels)], readings };
}
