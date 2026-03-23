# @openfate/bazi-engine

![NPM Version](https://img.shields.io/npm/v/@openfate/bazi-engine)
![License](https://img.shields.io/npm/l/@openfate/bazi-engine)

> **The accurate, production-ready Four Pillars (八字) engine for JavaScript & TypeScript.**
> Powered by [OpenFate.ai](https://openfate.ai) — the AI-native metaphysical analysis platform.

Getting the Four Pillars right is hard. Solar Term boundaries (节气), True Solar Time correction (真太阳时), day-change boundaries, Lunar calendar conversion — one wrong edge case and every chart is off. **We've solved all of it.**

---

## Why use this?

| Problem | Without this package | With `@openfate/bazi-engine` |
|---|---|---|
| True Solar Time | Complex astronomy, most ignore it | Built-in via `@openfate/true-solar-time` |
| Solar Term boundaries | Easy to get LiChun wrong | Handles all 24 节气 precisely |
| Zi Hour boundary (23:00) | Confusing, often skipped | Configurable `dayBoundaryMode` |
| Lunar Calendar conversion | Requires separate library | Built-in, one function call |
| Interaction detection | Implement 7 types yourself | All 7 types detected, zero effort |

---

## Use Cases

### 1. 🔮 Bazi Consulting Software / CRM
Professional Fengshui consultants manage hundreds of clients. Build a dashboard that generates accurate charts on-demand:
```typescript
const chart = calculateBaziChart({ year: 1985, month: 3, day: 12, hour: 9,
  gender: 'male', longitude: 121.47, timezone: 8 });
// Render chart.pillars in your UI, show chart.daYun timeline
```
No more relying on unreliable online tools or expensive licensed software — own your calculation stack.

### 2. 💌 Matchmaking & Dating Apps
Check compatibility by comparing two users' charts:
```typescript
const userA = calculateBaziChart({ ... });
const userB = calculateBaziChart({ ... });

// Do their Day Masters combine? (六合)
const combined = detectInteractions(
  { year: userA.pillars.year.branch, month: userA.pillars.month.branch,
    day: userA.pillars.day.branch,   hour: userA.pillars.hour?.branch ?? '' },
  userB.pillars.day.branch  // Check against UserB's Day Branch
);
const compatible = combined.some(i => i.type === 'COMBINATION_2');
```

### 3. 📅 Daily Horoscope / Almanac Push Notifications
Calculate today's pillar and send personalized notifications:
```typescript
const today = new Date();
const todayChart = calculateBaziChart({
  year: today.getFullYear(), month: today.getMonth()+1, day: today.getDate(),
  hour: 12, gender: 'male'
});

// If today's Day Branch clashes with user's Day Branch → alert!
const todayBranch = todayChart.pillars.day.branch;
```

### 4. 🤖 AI Metaphysics Agents / Discord Bots
Feed the structured JSON into your own AI agent:
```typescript
const chart = calculateBaziChart({ ... });

// Pass to OpenAI / Claude with your own prompts
const prompt = `Analyze this Bazi chart: ${JSON.stringify(chart.pillars)}
  Major cycles: ${chart.daYun.cycles.map(c => c.ganZhi).join(', ')}
  Key interactions: ${chart.interactions.map(i => i.description).join(', ')}`;
```
You get the data layer right with this package, then apply your own interpretation model on top.

### 5. 🏫 Education & Research
Teach traditional metaphysics with accurate, verifiable data. All outputs are explainable — `solarTimeInfo` shows exactly how True Solar Time was calculated.

---

## Installation

```bash
npm install @openfate/bazi-engine
```

## Quick Start

```typescript
import { calculateBaziChart } from '@openfate/bazi-engine';

const chart = calculateBaziChart({
  year: 1998, month: 12, day: 13,
  hour: 12, minute: 0,
  gender: 'female',
  
  // Location — enables True Solar Time correction
  longitude: 116.39,  // Beijing
  timezone: 8,        // UTC+8
});

// Four Pillars
console.log(chart.pillars.year.stem + chart.pillars.year.branch);   // 戊寅
console.log(chart.pillars.month.stem + chart.pillars.month.branch);  // 甲子
console.log(chart.pillars.day.stem + chart.pillars.day.branch);      // 甲午
console.log(chart.pillars.hour!.stem + chart.pillars.hour!.branch);  // 庚午

// Day Master
console.log(chart.dayMaster.pinyin);   // 'jia'
console.log(chart.dayMaster.element);  // 'wood'

// Major Luck Cycles (大运)
chart.daYun.cycles.forEach(cycle => {
  console.log(`Age ${cycle.startAge}: ${cycle.ganZhi}`);
});

// Branch Interactions
chart.interactions.forEach(i => {
  console.log(`${i.type}: ${i.description}`);
});

// True Solar Time details
console.log(chart.solarTimeInfo?.trueSolarTime); // '12:09'
```

## Lunar Calendar Input

```typescript
const chart = calculateBaziChart({
  year: 1998, month: 10, day: 25,  // Lunar date
  calendarType: 'lunar',
  hour: 12, gender: 'male', longitude: 116.39, timezone: 8,
});
// Automatically converts to Solar 1998-12-13 before calculating
```

## Configuration

```typescript
calculateBaziChart({
  // ...
  enableTrueSolarTime: true,        // default: true (requires longitude)
  dayBoundaryMode: 'MIDNIGHT_00',   // 'MIDNIGHT_00' (default) or 'ZI_HOUR_23' (traditional)
  calendarType: 'solar',            // 'solar' (default) or 'lunar'
  dstOffset: 1,                     // For historical/DST dates (e.g. China pre-1992)
});
```

## API Reference

### `calculateBaziChart(input: BaziInput): BaziChart`
Main entry point. Returns a `BaziChart` with:
- `pillars` — Four Pillars (year, month, day, hour)
- `dayMaster` — Day Master stem with element, polarity, pinyin
- `daYun` — 9 Major Luck Cycles with start year/age
- `interactions` — All detected branch interactions (7 types)
- `solarTimeInfo` — True Solar Time details (or null if disabled)

### `detectInteractions(natal, annualBranch?): BranchInteraction[]`
Detect interactions in a natal chart, optionally against an annual branch (太岁).

### `generatePillarsFromSolar(...): PillarResult`
Low-level pillar generator — use when you've already handled time correction yourself.

---

## 🛡️ Testing & Reliability

Bazi calculations are notoriously prone to edge-case bugs. We maintain a **comprehensive regression suite** of 100+ global edge cases, verified against astronomical standards:

- **24 Solar Terms**: Minute-level precision for *Li Chun*, *Jing Zhe*, etc.
- **Early/Late Zi Hour**: Handles the 23:00 day-rollover across month/year boundaries.
- **Global Distortion**: Extreme longitudes (e.g., Xinjiang, Iceland) and fractional timezones (e.g., India UTC+5.5).
- **Historical DST**: Automatic handling of Chinese DST (1986-1991), UK Double DST, and more.
- **Century Boundaries**: Verified accuracy for dates across 1800, 1900, 2000, and 2100.

Run the tests yourself:
```bash
npm test
```

---

## How It Works

```
Birth input (civil time)
        ↓
[@openfate/true-solar-time]   ← Longitude correction + Meeus Equation of Time
        ↓
  True Solar Time
        ↓
[lunar-javascript]             ← Solar Term boundary detection + Ganzhi calculation
        ↓
  Four Pillars  →  Da Yun  →  Interactions
```

---

## 🔗 Try the Full Engine

`@openfate/bazi-engine` gives you the data. **[OpenFate.ai](https://openfate.ai/bazi)** gives you the complete AI-powered interpretation — relationship analysis, career forecasting, and interactive AI chat with your chart.

## License

MIT — Free to use, modify, and distribute commercially.
