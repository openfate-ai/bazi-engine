# @openfate/bazi-engine

![NPM Version](https://img.shields.io/npm/v/@openfate/bazi-engine)
![License](https://img.shields.io/npm/l/@openfate/bazi-engine)

> **A deterministic, production-oriented Four Pillars (八字) engine for JavaScript and TypeScript.**
> Powered by [OpenFate.ai](https://openfate.ai) — the AI-native metaphysical analysis platform.

Getting the Four Pillars right is hard. Solar Term boundaries (节气), True Solar Time correction (真太阳时), day-change boundaries, and lunar conversion all require explicit, testable policy. This package exposes those calculations and the metadata needed to audit them.

---

## Why use this?

| Problem | Without this package | With `@openfate/bazi-engine` |
|---|---|---|
| True Solar Time | Complex astronomy, most ignore it | Built-in via `@openfate/true-solar-time` |
| Solar Term boundaries | Easy to get LiChun wrong | Handles all 24 节气 precisely |
| Zi Hour boundary (23:00) | Confusing, often skipped | Configurable `dayBoundaryMode` |
| Lunar Calendar conversion | Requires separate library | Built-in, one function call |
| Interaction detection | Track rules and repeated pillar positions yourself | Eight raw relationship types with occurrence identity |

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
- `interactions` — Raw branch relationships (8 types), preserving every pillar occurrence
- `solarTimeInfo` — True Solar Time details (or null if disabled)
- `calendar` — Civil solar input, calculation solar time, converted lunar date, and zodiac
- `metadata` — Applied True Solar Time, timezone, DST, and day-boundary policy

Each pillar preserves the simple `stem`, `branch`, and `element` fields and also includes Ten Gods, hidden stems, Na Yin, Xun, void branches, and growth stage.

### `detectInteractions(natal, annualBranchOrContext?): BranchInteraction[]`

Detect raw relationships in natal branches, optionally adding an annual branch (太岁), a Da Yun branch, or both. The original annual-string argument remains supported. Omit `hour` or pass an empty string when the time is unknown; no hour is invented. Empty branch slots are omitted; invalid non-empty values throw `RangeError`.

```typescript
const relationships = detectInteractions(
  { year: '申', month: '寅', day: '申' },
  { dayunBranch: '申', annualBranch: '子' },
);
// Three distinct 寅申 clashes: year/month, month/day, month/dayun.
```

- Every distinct pair and full-group embedding is retained. Three 午 occurrences produce three self-punishment pairs; four produce six. They are separate structural occurrences, **not** independent penalties to sum.
- Types: `CLASH`, `COMBINATION_2`, `COMBINATION_HALF`, `TRINE`, `DIRECTIONAL`, `PUNISHMENT`, `DESTRUCTION`, `HARM`.
- `COMBINATION_HALF` uses the eight king-node pairs: 申子、子辰、寅午、午戌、亥卯、卯未、巳酉、酉丑. Endpoint-only pairs such as 申辰 are not half trines in this profile. Half relationships remain present when the full trine also exists; consumers must not count both as independent energy effects.
- The existing punishment policy is preserved: 寅巳申 and 丑戌未 require all three branches; 子卯 and the 辰、午、酉、亥 self-punishments use distinct pairs. This release does not add partial three-punishment school variants.
- `branches[i]` always belongs to `pillars[i]`, ordered `year`, `month`, `day`, `hour`, `dayun`, `annual`. `id` is the type followed by those occurrence identities, for example `CLASH:year:申|month:寅`. Output order is deterministic: the type order listed above, then occurrence role order. Object property insertion order has no effect.
- Combinations carry `transformationStatus: 'NOT_EVALUATED'`; other types carry `'NOT_APPLICABLE'`. Branch presence alone cannot establish transformation or resolve a competing clash. No weight, score, energy delta, strength, or pattern verdict is returned.
- `targetElement` is only the affinity of half/full trines and directional groups, **not** proven transformation. Half trines and 六合 have no `resultElement`. Full trines/directional groups retain `resultElement` as a legacy affinity alias; it is not confirmation of transformation.

Migration: review consumers that assumed one result per branch-name pair, fixed array order, exhaustive switches on seven types, or automatic 六合 transformation. Store by stable `id`, not just branch names. Keep raw relationships separate from any settled/scored chart model; adding more raw occurrences must not automatically multiply its weights. This package's branch detector does not decide whether a chart forms a classical pattern or predict life outcomes.

**Pending major release:** this source changes the public contract: `id` and `transformationStatus` are required, `pillars` uses a role union, `InteractionType` has a new member, and 六合 no longer exposes `resultElement`. It is not a drop-in patch release. Do not use the current `npm run release` command, which automatically increments the patch version, for this migration. Coordinate a major engine release and compatible app/MCP consumers before publishing; the unchanged package version does not mean these source changes are already available on npm.

### `generatePillarsFromSolar(...): PillarResult`
Low-level pillar generator — use when you've already handled time correction yourself.

---

## 🛡️ Testing & Reliability

Bazi calculations are notoriously prone to edge-case bugs. We maintain a regression suite of 100+ calendrical cases plus focused public-contract tests:

- **24 Solar Terms**: Minute-level precision for *Li Chun*, *Jing Zhe*, etc.
- **Early/Late Zi Hour**: Handles the 23:00 day-rollover across month/year boundaries.
- **Global Distortion**: Extreme longitudes (e.g., Xinjiang, Iceland) and fractional timezones (e.g., India UTC+5.5).
- **Historical DST**: Explicit `dstOffset` input or IANA timezone rules; the engine does not guess historical policy.
- **Century Boundaries**: Regression coverage for dates across 1800, 1900, 2000, and 2100.
- **Da Yun**: Exact start date, elapsed-age convention, direction, and cycle boundaries.
- **Factual Enrichment**: Ten Gods, hidden stems, Na Yin, Xun, void branches, and growth stages.
- **Interaction topology**: Repeated positions, full-group embeddings, eight half trines, missing hours, dynamic role identity, invalid branches, and the no-transformation/no-scoring contract.

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

## GitHub Pages Site

This repository now includes a static GitHub Pages microsite in [`docs/index.html`](docs/index.html).

To publish it:

1. Push the repository to GitHub on the `main` branch.
2. In the repository settings, open `Pages`.
3. Under `Build and deployment`, select `GitHub Actions`.
4. Push a new commit or manually run the `Deploy GitHub Pages` workflow.

If the workflow fails with `Get Pages site failed`:

- The repository does not have GitHub Pages enabled yet.
- The fastest fix is to open `Settings` -> `Pages` and set `Source` to `GitHub Actions`, then rerun the workflow.
- Optional: create a repository secret named `PAGES_TOKEN` with a token that can administer Pages. The workflow will then try to enable Pages automatically on the first run.

Once enabled, the site will publish at:

- `https://openfate-ai.github.io/bazi-engine/` for the current repository name
- or `https://<owner>.github.io/<repo>/` for forks and renamed repositories

## License

MIT — Free to use, modify, and distribute commercially.
