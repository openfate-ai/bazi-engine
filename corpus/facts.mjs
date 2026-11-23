import engine from '@openfate/bazi-engine';

export const policy = Object.freeze({
  calendarType: 'solar', timezone: 8, longitude: 120, dstOffset: 0,
  enableTrueSolarTime: true, dayBoundaryMode: 'ZI_HOUR_23', daYunTimingVersion: 'DAYUN_SECOND_V2',
});

export const pillarOrder = ['year', 'month', 'day', 'hour'];
export const genders = ['female', 'male'];

export const firstDay = year => Date.UTC(year, 0, 1);
export const afterLastDay = year => Math.min(Date.UTC(year + 1, 0, 1), Date.UTC(2026, 10, 23));

export function* inputs(year) {
  const date = new Date(firstDay(year));
  while (date.getTime() < afterLastDay(year)) {
    for (let hour = 0; hour < 24; hour += 2) {
      for (const gender of genders) {
        yield { year, month: date.getUTCMonth() + 1, day: date.getUTCDate(), hour, minute: 30, second: 0, gender };
      }
    }
    date.setUTCDate(date.getUTCDate() + 1);
  }
}

const two = value => String(value).padStart(2, '0');

export function rowId(input) {
  return [input.year, two(input.month), two(input.day)].join('-') + 'T' + two(input.hour) + ':30:00+08:00/' + input.gender;
}

export function calculate(input) {
  const chart = engine.calculateBaziChart({ ...input, ...policy });
  const { daYun, metadata, pillars, interactions, solarTimeInfo, calendar } = chart;
  const timed = daYun.timing.status === 'CALCULATED';
  const boundary = daYun.timing.status === 'UNAVAILABLE' && daYun.timing.reason === 'PILLAR_TERM_BOUNDARY_MISMATCH';
  if (!metadata.trueSolarTimeApplied || !(timed || boundary) ||
      daYun.timing.version !== policy.daYunTimingVersion || !pillars.hour) {
    throw new Error('Incomplete calculation for ' + rowId(input));
  }
  return {
    id: rowId(input), fourPillars: pillarOrder.map(key => pillars[key].ganZhi).join(' '),
    trueSolarDateTime: solarTimeInfo.trueSolarDateTime, lunar: calendar.lunar,
    dayMaster: chart.dayMaster.char, pillars, interactions,
    daYun: { isForward: timed ? daYun.isForward : null, startDate: timed ? daYun.startDate : null,
      timing: daYun.timing, cycles: timed ? daYun.cycles : [] },
  };
}
