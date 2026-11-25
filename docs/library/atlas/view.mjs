export const statusNames = {match:'符合本版條件', review:'對照盤'};
export function monthReading(a) {
  const visible = ['年','月','時'].map((role,i) => role+'干'+a.visible[i]+'（'+a.visibleGods[i]+'）').join('、');
  const exposure = a.exposed ? '其中'+a.exposed+'透出' : '三干均未透出月支藏干';
  const pick = a.frame === 'lu' || a.frame === 'blade' ? '先依日干與月支認祿刃' :
    a.exposed.length > 1 && !a.exposed.includes(a.hidden[0]) ? '兩個餘氣同透，本版先保留本氣'+a.selected+'，兼用留待對讀' :
      '本版取'+a.selected+'為月令用來分類的藏干';
  return a.month+'月藏'+[...a.hidden].join('、')+'。'+visible+'。'+exposure+'，'+pick+'。';
}

export function readerHash(id) {
  return '#' + new URLSearchParams({ id });
}
