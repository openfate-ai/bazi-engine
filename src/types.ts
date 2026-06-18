// ============================================================================
// @openfate/bazi-engine — Public Type Definitions
// ============================================================================

export type FiveElement = 'wood' | 'fire' | 'earth' | 'metal' | 'water';
export type Polarity = 'yang' | 'yin';
export type DayBoundaryMode = 'MIDNIGHT_00' | 'ZI_HOUR_23';

// ── Ganzhi Primitives ───────────────────────────────────────────────────────

/** A single Heavenly Stem (天干) */
export interface StemInfo {
    char: string;           // e.g. '甲'
    pinyin: string;         // e.g. 'jia'
    element: FiveElement;   // e.g. 'wood'
    polarity: Polarity;     // e.g. 'yang'
}

/** A single Earthly Branch (地支) */
export interface BranchInfo {
    char: string;           // e.g. '子'
    element: FiveElement;   // e.g. 'water'
    hiddenStems: string[];  // Main qi + secondary stems e.g. ['癸']
    mainQi: string;         // Primary hidden stem e.g. '癸'
}

// ── Pillar ───────────────────────────────────────────────────────────────────

/** One of the Four Pillars (一柱) */
export interface Pillar {
    stem: string;           // e.g. '甲'
    branch: string;         // e.g. '子'
    element: FiveElement;   // Element of the stem
    ganZhi: string;
    stemPolarity: Polarity;
    stemTenGod: string;
    branchElement: FiveElement;
    hiddenStems: HiddenStemInfo[];
    naYin: string;
    xun: string;
    voidBranches: string[];
    growthStage: string;
}

export interface HiddenStemInfo {
    stem: string;
    element: FiveElement;
    polarity: Polarity;
    tenGod: string;
    isMain: boolean;
}

/** The Four Pillars (四柱) */
export interface FourPillars {
    year: Pillar;
    month: Pillar;
    day: Pillar;
    hour: Pillar | null;    // null when birth time is unknown
}

// ── Da Yun (Major Cycles) ───────────────────────────────────────────────────

/** A single 10-year Major Luck Cycle (大运) */
export interface DaYunCycle {
    index: number;          // 1-based index
    stem: string;           // e.g. '甲'
    branch: string;         // e.g. '午'
    ganZhi: string;         // Combined e.g. '甲午'
    startYear: number;      // Calendar year when cycle begins
    startAge: number;       // Age when cycle begins
    endYear: number;
    endAge: number;
    stemTenGod: string;
    branchTenGod: string;
}

/** Da Yun metadata */
export interface DaYunInfo {
    cycles: DaYunCycle[];
    isForward: boolean;     // Yang male / Yin female = forward
    startYear: number;      // Year first cycle begins
    startAge: number;       // Age first cycle begins
    startDate: string;
    startOffset: {
        years: number;
        months: number;
        days: number;
        hours: number;
    };
}

// ── Branch Interactions ─────────────────────────────────────────────────────

export type InteractionType =
    | 'CLASH'           // 六冲
    | 'COMBINATION_2'   // 六合
    | 'TRINE'           // 三合
    | 'DIRECTIONAL'     // 三会
    | 'PUNISHMENT'      // 刑
    | 'DESTRUCTION'     // 破
    | 'HARM';           // 害

/** A detected branch interaction */
export interface BranchInteraction {
    type: InteractionType;
    branches: string[];         // e.g. ['子', '午']
    pillars: string[];          // e.g. ['day', 'hour']
    resultElement?: FiveElement; // For combinations that transform
    description: string;        // Human readable: e.g. '子午相冲'
}

// ── True Solar Time (from @openfate/true-solar-time) ────────────────────────

export interface SolarTimeInfo {
    trueSolarTime: string;              // e.g. '12:09'
    trueSolarDateTime: string;          // e.g. '1998-12-13 12:09:35'
    solarDate: string;                  // e.g. '1998-12-13'
    standardMeridian: number;
    longitudeCorrectionMinutes: number;
    equationOfTimeMinutes: number;
    algorithm: string;                  // e.g. 'meeus'
}

export interface CalendarDateTime {
    year: number;
    month: number;
    day: number;
    hour: number | null;
    minute: number | null;
    second: number | null;
}

export interface LunarDateTime extends CalendarDateTime {
    isLeapMonth: boolean;
}

export interface CalendarInfo {
    inputType: 'solar' | 'lunar';
    civilSolar: CalendarDateTime;
    calculationSolar: CalendarDateTime;
    lunar: LunarDateTime;
    zodiac: string;
}

export interface CalculationMetadata {
    trueSolarTimeApplied: boolean;
    dayBoundaryMode: DayBoundaryMode;
    longitude: number | null;
    timezoneBasis: number | string | null;
    dstOffset: number;
}

// ── Main Chart Result ────────────────────────────────────────────────────────

/** Full output of calculateBaziChart() */
export interface BaziChart {
    pillars: FourPillars;
    dayMaster: StemInfo;
    daYun: DaYunInfo;
    interactions: BranchInteraction[];
    solarTimeInfo: SolarTimeInfo | null; // null when TST disabled
    calendar: CalendarInfo;
    metadata: CalculationMetadata;
}

// ── Input ────────────────────────────────────────────────────────────────────

export interface BaziInput {
    // Date & Time
    year: number;
    month: number;
    day: number;
    hour?: number;        // 0-23, omit if birth time unknown
    minute?: number;      // 0-59, defaults to 0

    // Location (required for True Solar Time)
    longitude?: number;   // Decimal degrees, e.g. 116.39 for Beijing
    timezone?: number;    // UTC offset in hours, e.g. 8 for CST
    timezoneId?: string;  // IANA timezone ID, e.g. 'Asia/Shanghai'
    dstOffset?: number;   // DST offset in hours, default 0

    // Identity
    gender: 'male' | 'female';

    // Calendar
    calendarType?: 'solar' | 'lunar'; // default: 'solar'
    isLeapMonth?: boolean;            // default: false (used for lunar calendar)

    // Options
    enableTrueSolarTime?: boolean;    // default: true (requires longitude)
    dayBoundaryMode?: DayBoundaryMode; // default: 'MIDNIGHT_00'
}
