import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { calculateBaziChart, BaziInput } from '../src/index';

/**
 * @openfate/bazi-engine — 100 Global Edge Cases Regression Suite
 * 
 * Covers: Basic Solar/Lunar, Leap Months, Solar Term boundaries, Early/Late Zi Hour,
 * Global extremes, fractional timezones, Historical DST, and Southern Hemisphere rules.
 */

interface BaziTestCase {
    name: string;
    input: BaziInput;
    expected: {
        yearPillar?: string;
        monthPillar?: string;
        dayPillar?: string;
        hourBranch?: string;
        dayMaster?: string;
        isLeapMonth?: boolean;
    };
}

const baziTestCases: BaziTestCase[] = [
    // === 1-10: Basic Solar Calendar (基础公历排盘) ===
    { name: "[1] Basic Bazi - 1998-12-13 Beijing", input: { year: 1998, month: 12, day: 13, hour: 12, minute: 0, gender: 'female', longitude: 116.39, timezone: 8 }, expected: { yearPillar: '戊寅', monthPillar: '甲子', dayPillar: '甲午', hourBranch: '午', dayMaster: 'jia' } },
    { name: "[2] Basic Bazi - 1984-02-02 Before Li Chun", input: { year: 1984, month: 2, day: 2, hour: 10, minute: 0, gender: 'male', longitude: 116.39, timezone: 8 }, expected: { yearPillar: '癸亥', monthPillar: '乙丑', dayPillar: '丙寅' } },
    { name: "[3] Basic Bazi - 2000-02-29 Leap Day", input: { year: 2000, month: 2, day: 29, hour: 10, minute: 0, gender: 'male', longitude: 116.39, timezone: 8 }, expected: { dayPillar: '丁巳' } },
    { name: "[4] Basic Bazi - 2026-06-15 Bing Wu Year (丙午)", input: { year: 2026, month: 6, day: 15, hour: 12, minute: 0, gender: 'female', longitude: 116.39, timezone: 8 }, expected: { yearPillar: '丙午', dayPillar: '庚申' } },
    { name: "[5] Basic Bazi - 2002-08-08 Wu Shen Month (戊申)", input: { year: 2002, month: 8, day: 8, hour: 12, minute: 0, gender: 'female', longitude: 114.29, timezone: 8 }, expected: { yearPillar: '壬午', monthPillar: '戊申', dayPillar: '戊申' } },
    { name: "[6] Solar Boundary - 2023-01-01 (Still Ren Yin Year)", input: { year: 2023, month: 1, day: 1, hour: 0, minute: 30, gender: 'female', longitude: 116.39, timezone: 8 }, expected: { yearPillar: '壬寅', dayPillar: '己未' } },
    { name: "[7] Basic Bazi - 1949-10-01 PRC Founding", input: { year: 1949, month: 10, day: 1, hour: 15, minute: 0, gender: 'male', longitude: 116.39, timezone: 8 }, expected: { yearPillar: '己丑', monthPillar: '癸酉', dayPillar: '甲子' } },
    { name: "[8] Basic Bazi - 1911-10-10 Xinhai Revolution", input: { year: 1911, month: 10, day: 10, hour: 12, minute: 0, gender: 'male', longitude: 114.30, timezone: 8 }, expected: { yearPillar: '辛亥', monthPillar: '戊戌', dayPillar: '癸丑' } },
    { name: "[9] Basic Bazi - 2030-01-01 Future Test", input: { year: 2030, month: 1, day: 1, hour: 12, minute: 0, gender: 'female', longitude: 116.39, timezone: 8 }, expected: { yearPillar: '己酉', monthPillar: '丙子' } },
    { name: "[10] Basic Bazi - 1970-01-01 Unix Epoch", input: { year: 1970, month: 1, day: 1, hour: 12, minute: 0, gender: 'male', longitude: 116.39, timezone: 8 }, expected: { yearPillar: '己酉', monthPillar: '丙子' } },

    // === 11-20: Lunar Calendar Conversions (农历转换与等价校验) ===
    { name: "[11] Lunar Mapping - Lunar 1998-10-25 (Equal to Solar 1998-12-13)", input: { year: 1998, month: 10, day: 25, hour: 12, minute: 0, gender: 'male', longitude: 116.39, timezone: 8, calendarType: 'lunar' }, expected: { yearPillar: '戊寅', monthPillar: '甲子', dayPillar: '甲午' } },
    { name: "[12] Lunar New Year - Lunar 2024-01-01 (After Li Chun)", input: { year: 2024, month: 1, day: 1, hour: 8, minute: 30, gender: 'male', longitude: 116.39, timezone: 8, calendarType: 'lunar' }, expected: { yearPillar: '甲辰', monthPillar: '丙寅', dayPillar: '甲辰' } },
    { name: "[13] Lunar New Year - Lunar 2023-01-01 (Before Li Chun, Still Ren Yin)", input: { year: 2023, month: 1, day: 1, hour: 8, minute: 30, gender: 'female', longitude: 116.39, timezone: 8, calendarType: 'lunar' }, expected: { yearPillar: '壬寅' } },
    { name: "[14] Lunar Year End - Lunar 2023-12-30 (After Li Chun, Enter Jia Chen)", input: { year: 2023, month: 12, day: 30, hour: 12, minute: 0, gender: 'male', longitude: 116.39, timezone: 8, calendarType: 'lunar' }, expected: { yearPillar: '甲辰' } },
    { name: "[15] Standard Lunar Month - Lunar 2012-02-03", input: { year: 2012, month: 2, day: 3, hour: 10, minute: 0, gender: 'male', longitude: 116.39, timezone: 8, calendarType: 'lunar' }, expected: { yearPillar: '壬辰', monthPillar: '壬寅' } },
    { name: "[16] Lunar Mapping - 1985 Lunar 1st Month 1st Day", input: { year: 1985, month: 1, day: 1, hour: 12, minute: 0, gender: 'male', calendarType: 'lunar' }, expected: { yearPillar: '乙丑' } },
    { name: "[17] Lunar Mapping - 1990 Lunar 5th Month 5th Day (Dragon Boat)", input: { year: 1990, month: 5, day: 5, hour: 12, minute: 0, gender: 'female', calendarType: 'lunar' }, expected: { monthPillar: '辛巳' } },
    { name: "[18] Lunar Mapping - 1999 Lunar 9th Month 9th Day", input: { year: 1999, month: 9, day: 9, hour: 12, minute: 0, gender: 'male', calendarType: 'lunar' }, expected: { yearPillar: '己卯' } },
    { name: "[19] Lunar Mapping - 2008 Lunar 8th Month 15th Day (Mid-Autumn)", input: { year: 2008, month: 8, day: 15, hour: 12, minute: 0, gender: 'female', calendarType: 'lunar' }, expected: { yearPillar: '戊子' } },
    { name: "[20] Lunar Mapping - 2033 Lunar 1st Month 15th Day (Lantern)", input: { year: 2033, month: 1, day: 15, hour: 12, minute: 0, gender: 'male', calendarType: 'lunar' }, expected: { yearPillar: '癸丑' } },

    // === 21-30: Lunar Leap Month Edge Cases (农历闰月处理) ===
    { name: "[21] Lunar Leap Month - 2020 Leap 4th Month 1st Day", input: { year: 2020, month: 4, day: 1, hour: 12, minute: 0, gender: 'male', calendarType: 'lunar', isLeapMonth: true }, expected: { monthPillar: '辛巳' } }, 
    { name: "[22] Standard Lunar Month - 2020 4th Month 1st Day", input: { year: 2020, month: 4, day: 1, hour: 12, minute: 0, gender: 'male', calendarType: 'lunar', isLeapMonth: false }, expected: { monthPillar: '庚辰' } }, 
    { name: "[23] Lunar Leap Month - 2006 Leap 7th Month 15th Day", input: { year: 2006, month: 7, day: 15, hour: 12, minute: 0, gender: 'female', calendarType: 'lunar', isLeapMonth: true }, expected: { monthPillar: '丙申' } }, 
    { name: "[24] Standard Lunar Month - 2006 7th Month 15th Day", input: { year: 2006, month: 7, day: 15, hour: 12, minute: 0, gender: 'female', calendarType: 'lunar', isLeapMonth: false }, expected: { monthPillar: '丙申' } }, 
    { name: "[25] Lunar Leap Month - 2033 Leap 11th Month (Dong Yue)", input: { year: 2033, month: 11, day: 1, hour: 12, minute: 0, gender: 'male', calendarType: 'lunar', isLeapMonth: true }, expected: { yearPillar: '癸丑' } }, 
    { name: "[26] Lunar Leap Month - 1984 Leap 10th Month", input: { year: 1984, month: 10, day: 10, hour: 12, minute: 0, gender: 'male', calendarType: 'lunar', isLeapMonth: true }, expected: { yearPillar: '甲子' } },
    { name: "[27] Lunar Leap Month - 1995 Leap 8th Month", input: { year: 1995, month: 8, day: 15, hour: 12, minute: 0, gender: 'female', calendarType: 'lunar', isLeapMonth: true }, expected: { yearPillar: '乙亥' } },
    { name: "[28] Lunar Leap Month - 2014 Leap 9th Month", input: { year: 2014, month: 9, day: 1, hour: 12, minute: 0, gender: 'male', calendarType: 'lunar', isLeapMonth: true }, expected: { yearPillar: '甲午' } },
    { name: "[29] Lunar Leap Month - 2023 Leap 2nd Month", input: { year: 2023, month: 2, day: 1, hour: 12, minute: 0, gender: 'female', calendarType: 'lunar', isLeapMonth: true }, expected: { yearPillar: '癸卯' } },
    { name: "[30] Lunar Leap Month - 1976 Leap 8th Month", input: { year: 1976, month: 8, day: 1, hour: 12, minute: 0, gender: 'male', calendarType: 'lunar', isLeapMonth: true }, expected: { yearPillar: '丙辰' } },

    // === 31-40: Year Pillar Solar Term Boundary (立春分钟级卡点) ===
    { name: "[31] Before Li Chun Boundary (癸卯年)", input: { year: 2024, month: 2, day: 4, hour: 16, minute: 26, gender: 'male', longitude: 120, timezone: 8, enableTrueSolarTime: false }, expected: { yearPillar: '癸卯', monthPillar: '乙丑' } },
    { name: "[32] After Li Chun Boundary (甲辰年)", input: { year: 2024, month: 2, day: 4, hour: 16, minute: 28, gender: 'male', longitude: 120, timezone: 8, enableTrueSolarTime: false }, expected: { yearPillar: '甲辰' } },
    { name: "[33] 1998 Before Li Chun (丁丑年)", input: { year: 1998, month: 2, day: 4, hour: 8, minute: 52, gender: 'female', longitude: 120, timezone: 8, enableTrueSolarTime: false }, expected: { yearPillar: '丁丑' } },
    { name: "[34] 1998 After Li Chun (戊寅年)", input: { year: 1998, month: 2, day: 4, hour: 9, minute: 0, gender: 'female', longitude: 120, timezone: 8, enableTrueSolarTime: false }, expected: { yearPillar: '戊寅' } },
    { name: "[35] 2025 Before Li Chun (甲辰年)", input: { year: 2025, month: 2, day: 3, hour: 22, minute: 9, gender: 'male', longitude: 120, timezone: 8, enableTrueSolarTime: false }, expected: { yearPillar: '甲辰' } },
    { name: "[36] 2025 After Li Chun (乙巳年)", input: { year: 2025, month: 2, day: 3, hour: 22, minute: 12, gender: 'male', longitude: 120, timezone: 8, enableTrueSolarTime: false }, expected: { yearPillar: '乙巳' } },
    { name: "[37] 1984 Before Li Chun (癸亥年)", input: { year: 1984, month: 2, day: 4, hour: 23, minute: 17, gender: 'male', longitude: 120, timezone: 8, enableTrueSolarTime: false }, expected: { yearPillar: '癸亥' } },
    { name: "[38] 1984 After Li Chun (甲子年)", input: { year: 1984, month: 2, day: 4, hour: 23, minute: 20, gender: 'male', longitude: 120, timezone: 8, enableTrueSolarTime: false }, expected: { yearPillar: '甲子' } },
    { name: "[39] 1912 After Li Chun (壬子年 - History Limit)", input: { year: 1912, month: 2, day: 5, hour: 12, minute: 0, gender: 'male', longitude: 120, timezone: 8, enableTrueSolarTime: false }, expected: { yearPillar: '壬子' } },
    { name: "[40] 2038 After Li Chun (戊午年 - Future Limit)", input: { year: 2038, month: 2, day: 4, hour: 12, minute: 0, gender: 'female', longitude: 120, timezone: 8 }, expected: { yearPillar: '戊午' } },

    // === 41-50: Month Pillar Solar Term Boundary (月令节气分钟级卡点) ===
    { name: "[41] 2024 Before Jing Zhe (丙寅月)", input: { year: 2024, month: 3, day: 5, hour: 10, minute: 21, gender: 'male', longitude: 120, timezone: 8, enableTrueSolarTime: false }, expected: { monthPillar: '丙寅' } },
    { name: "[42] 2024 After Jing Zhe (丁卯月)", input: { year: 2024, month: 3, day: 5, hour: 10, minute: 24, gender: 'male', longitude: 120, timezone: 8, enableTrueSolarTime: false }, expected: { monthPillar: '丁卯' } },
    { name: "[43] 2024 Before Qing Ming (丁卯月)", input: { year: 2024, month: 4, day: 4, hour: 15, minute: 0, gender: 'female', longitude: 120, timezone: 8, enableTrueSolarTime: false }, expected: { monthPillar: '丁卯' } },
    { name: "[44] 2024 After Qing Ming (戊辰月)", input: { year: 2024, month: 4, day: 4, hour: 15, minute: 5, gender: 'female', longitude: 120, timezone: 8, enableTrueSolarTime: false }, expected: { monthPillar: '戊辰' } },
    { name: "[45] 2024 Before Mang Zhong (己巳月)", input: { year: 2024, month: 6, day: 5, hour: 12, minute: 8, gender: 'male', longitude: 120, timezone: 8, enableTrueSolarTime: false }, expected: { monthPillar: '己巳' } },
    { name: "[46] 2024 After Mang Zhong (庚午月)", input: { year: 2024, month: 6, day: 5, hour: 12, minute: 12, gender: 'male', longitude: 120, timezone: 8 }, expected: { monthPillar: '庚午' } },
    { name: "[47] 2024 Before Bai Lu (壬申月)", input: { year: 2024, month: 9, day: 7, hour: 11, minute: 10, gender: 'female', longitude: 120, timezone: 8, enableTrueSolarTime: false }, expected: { monthPillar: '壬申' } },
    { name: "[48] 2024 After Bai Lu (癸酉月)", input: { year: 2024, month: 9, day: 7, hour: 11, minute: 13, gender: 'female', longitude: 120, timezone: 8, enableTrueSolarTime: false }, expected: { monthPillar: '癸酉' } },
    { name: "[49] 2024 Before Da Xue (乙亥月)", input: { year: 2024, month: 12, day: 6, hour: 23, minute: 15, gender: 'male', longitude: 120, timezone: 8, enableTrueSolarTime: false }, expected: { monthPillar: '乙亥' } },
    { name: "[50] 2024 After Da Xue (丙子月)", input: { year: 2024, month: 12, day: 6, hour: 23, minute: 18, gender: 'male', longitude: 120, timezone: 8, enableTrueSolarTime: false }, expected: { monthPillar: '丙子' } },

    // === 51-60: Early/Late Zi Hour & Day Rollover (早晚子时与跨日逻辑) ===
    { name: "[51] Before Midnight 23:30 (Late Zi Hour, Day Pillar Unchanged)", input: { year: 2000, month: 6, day: 15, hour: 23, minute: 30, gender: 'female', longitude: 116.39, timezone: 8 }, expected: { dayPillar: '甲辰', hourBranch: '子' } },
    { name: "[52] After Midnight 00:15 (Early Zi Hour, Day Pillar Advances)", input: { year: 2000, month: 6, day: 16, hour: 0, minute: 15, gender: 'female', longitude: 116.39, timezone: 8, enableTrueSolarTime: false }, expected: { dayPillar: '乙巳' } },
    { name: "[53] Guangdong Midnight 03:14 (Chou Hour)", input: { year: 2001, month: 7, day: 2, hour: 3, minute: 14, gender: 'male', longitude: 112.53, timezone: 8 }, expected: { hourBranch: '丑' } },
    { name: "[54] Late Zi Hour 23:59 (Limit No-Rollover)", input: { year: 2024, month: 5, day: 20, hour: 23, minute: 59, gender: 'male', longitude: 120, timezone: 8, enableTrueSolarTime: false }, expected: { dayPillar: '甲申' } },
    { name: "[55] Early Zi Hour 00:00 (Limit Rollover)", input: { year: 2024, month: 5, day: 21, hour: 0, minute: 0, gender: 'male', longitude: 120, timezone: 8 }, expected: { dayPillar: '乙酉', hourBranch: '子' } },
    { name: "[56] Chou Hour Boundary 01:00", input: { year: 2024, month: 5, day: 21, hour: 1, minute: 0, gender: 'female', longitude: 120, timezone: 8 }, expected: { hourBranch: '丑' } },
    { name: "[57] Yin Hour Boundary 03:00", input: { year: 2024, month: 5, day: 21, hour: 3, minute: 0, gender: 'female', longitude: 120, timezone: 8 }, expected: { hourBranch: '寅' } },
    { name: "[58] Hai Hour Boundary 21:00", input: { year: 2024, month: 5, day: 21, hour: 21, minute: 0, gender: 'male', longitude: 120, timezone: 8 }, expected: { hourBranch: '亥' } },
    { name: "[59] Late Zi Hour - Month End No-Day-Rollover", input: { year: 2024, month: 4, day: 30, hour: 23, minute: 30, gender: 'male', longitude: 120, timezone: 8 }, expected: { dayPillar: '甲子' } },
    { name: "[60] Early Zi Hour - Month End Day-Rollover", input: { year: 2024, month: 5, day: 1, hour: 0, minute: 30, gender: 'male', longitude: 120, timezone: 8 }, expected: { dayPillar: '乙丑' } },

    // === 61-70: True Solar Time & Geographical Extremes (真太阳时与地理极端畸变) ===
    { name: "[61] Xinjiang Kashgar 76°E - 13:00 Latched to Si Hour", input: { year: 2024, month: 2, day: 11, hour: 13, minute: 0, gender: 'male', longitude: 76, timezone: 8 }, expected: { hourBranch: '巳' } }, 
    { name: "[62] Xinjiang Kashgar 76°E - 01:05 Latched to Previous Day Hai Hour", input: { year: 2024, month: 2, day: 11, hour: 1, minute: 5, gender: 'female', longitude: 76, timezone: 8 }, expected: { hourBranch: '亥' } }, 
    { name: "[63] Heilongjiang Fuyuan 134°E - 10:50 Pushed to Wu Hour", input: { year: 2024, month: 11, day: 3, hour: 10, minute: 50, gender: 'male', longitude: 134, timezone: 8 }, expected: { hourBranch: '午' } }, 
    { name: "[64] Heilongjiang Fuyuan 134°E - 22:50 Pushed to Next Day Early Zi Hour", input: { year: 2024, month: 11, day: 3, hour: 22, minute: 50, gender: 'female', longitude: 134, timezone: 8 }, expected: { hourBranch: '子' } },
    { name: "[65] Max Equation of Time (Feb) - 13:02 Reverts to Wu Hour", input: { year: 2024, month: 2, day: 11, hour: 13, minute: 2, gender: 'male', longitude: 120, timezone: 8 }, expected: { hourBranch: '午' } }, 
    { name: "[66] Max Equation of Time (Nov) - 12:45 Pushed to Wei Hour", input: { year: 2024, month: 11, day: 3, hour: 12, minute: 45, gender: 'female', longitude: 120, timezone: 8 }, expected: { hourBranch: '未' } }, 
    { name: "[67] Iceland Reykjavik -21.9°W - Shen Reverts to Wei Hour", input: { year: 2024, month: 2, day: 11, hour: 15, minute: 0, gender: 'male', longitude: -21.9, timezone: 0 }, expected: { hourBranch: '未' } },
    { name: "[68] Poland Bialowieza 23.8°E - Wei Pushed to Shen Hour", input: { year: 2024, month: 11, day: 3, hour: 14, minute: 50, gender: 'female', longitude: 23.8, timezone: 1 }, expected: { hourBranch: '申' } },
    { name: "[69] Zero Equation of Time (Apr 15) - No Offset", input: { year: 2024, month: 4, day: 15, hour: 12, minute: 0, gender: 'male', longitude: 120, timezone: 8 }, expected: { hourBranch: '午' } },
    { name: "[70] Zero Equation of Time (Dec 25) - No Offset", input: { year: 2024, month: 12, day: 25, hour: 12, minute: 0, gender: 'female', longitude: 120, timezone: 8 }, expected: { hourBranch: '午' } },

    // === 71-80: Global Timezones & Date Line (全球碎片化时区与日期变更线) ===
    { name: "[71] New Delhi, India (UTC+5.5) - 12:00 Chen Hour Edge", input: { year: 2024, month: 1, day: 1, hour: 12, minute: 0, gender: 'male', longitude: 77.2, timezone: 5.5 }, expected: { hourBranch: '午' } }, 
    { name: "[72] Kathmandu, Nepal (UTC+5.75)", input: { year: 2024, month: 1, day: 1, hour: 12, minute: 0, gender: 'female', longitude: 85.3, timezone: 5.75 }, expected: { hourBranch: '午' } },
    { name: "[73] Eucla, Australia (UTC+8.75)", input: { year: 2024, month: 11, day: 3, hour: 12, minute: 0, gender: 'male', longitude: 128.8, timezone: 8.75 }, expected: { hourBranch: '午' } },
    { name: "[74] Chatham Islands, NZ (UTC+12.75)", input: { year: 2024, month: 2, day: 11, hour: 12, minute: 0, gender: 'female', longitude: -176.5, timezone: 12.75 }, expected: { hourBranch: '午' } },
    { name: "[75] International Date Line - Fiji 178°E (Year Rollover Back)", input: { year: 2024, month: 1, day: 1, hour: 0, minute: 5, gender: 'male', longitude: 178, timezone: 12 }, expected: { yearPillar: '癸卯', hourBranch: '子' } }, 
    { name: "[76] International Date Line - Baker Island -176°W (Day Rollover Forward)", input: { year: 2024, month: 1, day: 1, hour: 23, minute: 55, gender: 'female', longitude: -176, timezone: -12 }, expected: { hourBranch: '子' } }, 
    { name: "[77] Tehran, Iran (UTC+3.5)", input: { year: 2024, month: 11, day: 3, hour: 12, minute: 0, gender: 'male', longitude: 51.4, timezone: 3.5 }, expected: { hourBranch: '午' } },
    { name: "[78] Kabul, Afghanistan (UTC+4.5)", input: { year: 2024, month: 2, day: 11, hour: 12, minute: 0, gender: 'female', longitude: 69.2, timezone: 4.5 }, expected: { hourBranch: '午' } },
    { name: "[79] Yangon, Myanmar (UTC+6.5)", input: { year: 2024, month: 11, day: 3, hour: 12, minute: 0, gender: 'male', longitude: 96.1, timezone: 6.5 }, expected: { hourBranch: '午' } },
    { name: "[80] Lord Howe Island, Australia (UTC+10.5)", input: { year: 2024, month: 2, day: 11, hour: 12, minute: 0, gender: 'female', longitude: 159.1, timezone: 10.5 }, expected: { hourBranch: '午' } },

    // === 81-90: Historical DST Extraction (历史夏令时劫持剥离) ===
    { name: "[81] China 1986 DST Start (Subtract 1h)", input: { year: 1986, month: 5, day: 4, hour: 12, minute: 0, gender: 'male', longitude: 116.4, timezone: 8, dstOffset: 1 }, expected: { hourBranch: '巳' } }, 
    { name: "[82] China 1988 DST Peak (Subtract 1h)", input: { year: 1988, month: 7, day: 1, hour: 12, minute: 0, gender: 'female', longitude: 116.4, timezone: 8, dstOffset: 1 }, expected: { hourBranch: '巳' } },
    { name: "[83] New York Fall DST Overlap (Subtract 1h)", input: { year: 2023, month: 11, day: 5, hour: 1, minute: 30, gender: 'male', longitude: -74, timezone: -5, dstOffset: 1 }, expected: { hourBranch: '子' } }, 
    { name: "[84] New York Fall STD Overlap (No Subtraction)", input: { year: 2023, month: 11, day: 5, hour: 1, minute: 30, gender: 'male', longitude: -74, timezone: -5, dstOffset: 0 }, expected: { hourBranch: '丑' } }, 
    { name: "[85] UK 1944 Double DST (Subtract 2h)", input: { year: 1944, month: 7, day: 1, hour: 12, minute: 0, gender: 'female', longitude: 0, timezone: 0, dstOffset: 2 }, expected: { hourBranch: '巳' } }, 
    { name: "[86] Singapore Historical Timezone (1970 UTC+7.5)", input: { year: 1970, month: 1, day: 1, hour: 12, minute: 0, gender: 'male', longitude: 103.8, timezone: 7.5, dstOffset: 0 }, expected: { hourBranch: '午' } }, 
    { name: "[87] Russia Permanent DST (2012)", input: { year: 2012, month: 7, day: 1, hour: 12, minute: 0, gender: 'female', longitude: 37.6, timezone: 4, dstOffset: 0 }, expected: { hourBranch: '巳' } }, 
    { name: "[88] Southern Hemisphere Sydney DST (Oct 2008)", input: { year: 2008, month: 10, day: 5, hour: 12, minute: 0, gender: 'male', longitude: 151.2, timezone: 10, dstOffset: 1 }, expected: { hourBranch: '午' } }, 
    { name: "[89] Chile DST (Sep 2019)", input: { year: 2019, month: 9, day: 8, hour: 12, minute: 0, gender: 'female', longitude: -70.6, timezone: -4, dstOffset: 1 }, expected: { hourBranch: '巳' } }, 
    { name: "[90] Brazil Abolished DST (2020 No-DST)", input: { year: 2020, month: 1, day: 1, hour: 12, minute: 0, gender: 'male', longitude: -46.6, timezone: -3, dstOffset: 0 }, expected: { hourBranch: '午' } },

    // === 91-100: Sixtieth Cycle & Mathematical Limits (六十甲子与大运极限) ===
    { name: "[91] Year Pillar Verification - Yang Male (1984 Jia Zi Year)", input: { year: 1984, month: 2, day: 5, hour: 12, minute: 0, gender: 'male', longitude: 120, timezone: 8 }, expected: { yearPillar: '甲子' } }, 
    { name: "[92] Year Pillar Verification - Yin Male (1985 Yi Chou Year)", input: { year: 1985, month: 2, day: 5, hour: 12, minute: 0, gender: 'male', longitude: 120, timezone: 8 }, expected: { yearPillar: '乙丑' } }, 
    { name: "[93] Year Pillar Verification - Yang Female (1984 Jia Zi Year)", input: { year: 1984, month: 2, day: 5, hour: 12, minute: 0, gender: 'female', longitude: 120, timezone: 8 }, expected: { yearPillar: '甲子' } }, 
    { name: "[94] Year Pillar Verification - Yin Female (1985 Yi Chou Year)", input: { year: 1985, month: 2, day: 5, hour: 12, minute: 0, gender: 'female', longitude: 120, timezone: 8 }, expected: { yearPillar: '乙丑' } }, 
    { name: "[95] Ancient Era Limit - 1800-01-01", input: { year: 1800, month: 1, day: 1, hour: 12, minute: 0, gender: 'male', longitude: 120, timezone: 8 }, expected: { yearPillar: '己未' } }, 
    { name: "[96] Century Boundary Limit - 1899-12-31", input: { year: 1899, month: 12, day: 31, hour: 12, minute: 0, gender: 'female', longitude: 120, timezone: 8 }, expected: { yearPillar: '己亥' } },
    { name: "[97] Century Boundary Limit - 1900-01-01", input: { year: 1900, month: 1, day: 1, hour: 12, minute: 0, gender: 'male', longitude: 120, timezone: 8 }, expected: { yearPillar: '己亥' } }, 
    { name: "[98] Century Boundary Limit - 2099-12-31", input: { year: 2099, month: 12, day: 31, hour: 12, minute: 0, gender: 'female', longitude: 120, timezone: 8 }, expected: { yearPillar: '己未' } },
    { name: "[99] Century Boundary Limit - 2100-01-01", input: { year: 2100, month: 1, day: 1, hour: 12, minute: 0, gender: 'male', longitude: 120, timezone: 8 }, expected: { yearPillar: '己未' } },
    { name: "[100] Extreme Midnight - 23:59 (Zi Hour End Intercept)", input: { year: 2024, month: 6, day: 1, hour: 23, minute: 59, gender: 'female', longitude: 120, timezone: 8 }, expected: { hourBranch: '子' } }
];

describe('🚀 Four Pillars (Bazi) — 100 Global Edge Cases Regression Suite', () => {
    let passedCount = 0;

    baziTestCases.forEach((tc) => {
        test(tc.name, () => {
            let chart;
            try {
                chart = calculateBaziChart(tc.input);
            } catch (err: unknown) {
                const msg = err instanceof Error ? err.message : String(err);
                assert.fail(`Engine threw error during calculation: ${msg}`);
            }

            const p = chart.pillars;
            
            if (tc.expected.yearPillar) {
                const gotYear = p.year.stem + p.year.branch;
                assert.equal(gotYear, tc.expected.yearPillar, `Year Pillar mismatch. Got ${gotYear}, expected ${tc.expected.yearPillar}`);
            }
            if (tc.expected.monthPillar) {
                const gotMonth = p.month.stem + p.month.branch;
                assert.equal(gotMonth, tc.expected.monthPillar, `Month Pillar mismatch. Got ${gotMonth}, expected ${tc.expected.monthPillar}`);
            }
            if (tc.expected.dayPillar) {
                const gotDay = p.day.stem + p.day.branch;
                assert.equal(gotDay, tc.expected.dayPillar, `Day Pillar mismatch. Got ${gotDay}, expected ${tc.expected.dayPillar}`);
            }
            if (tc.expected.hourBranch && p.hour) {
                const gotHourBranch = p.hour.branch;
                assert.equal(gotHourBranch, tc.expected.hourBranch, `Hour Branch mismatch. Got ${gotHourBranch}, expected ${tc.expected.hourBranch}`);
            }
            if (tc.expected.dayMaster) {
                assert.equal(chart.dayMaster.pinyin, tc.expected.dayMaster, `Day Master mismatch. Got ${chart.dayMaster.pinyin}, expected ${tc.expected.dayMaster}`);
            }

            passedCount++;
        });
    });

    test('Suite Summary Verification', () => {
        assert.equal(passedCount, baziTestCases.length, `Expected all ${baziTestCases.length} cases to pass.`);
    });
});
