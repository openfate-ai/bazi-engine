// ============================================================================
// @openfate/bazi-engine — Da Yun (Major 10-Year Luck Cycles) Calculator
// ============================================================================

import { DaYunCycle, DaYunInfo } from '../types';
import { LunarEightChar, LunarDaYun } from './pillars';

/**
 * calculateDaYun
 *
 * Calculates the nine 10-year Major Luck Cycles (Da Yun) from the natal EightChar.
 * Direction (forward/backward) is determined by gender and the Yin/Yang of the year stem:
 *   - Yang Year + Male   → Forward (Shun)
 *   - Yang Year + Female → Backward (Ni)
 *   - Yin Year  + Male   → Backward (Ni)
 *   - Yin Year  + Female → Forward (Shun)
 *
 * @param eightChar - The EightChar object from lunar-javascript (returned by generatePillarsFromSolar)
 * @param gender    - 'male' or 'female'
 * @param birthYear - Solar birth year (used to compute startAge)
 */
export function calculateDaYun(
    eightChar: LunarEightChar,
    gender: 'male' | 'female',
    birthYear: number,
): DaYunInfo {
    const genderInt = gender === 'male' ? 1 : 0;
    const yun = eightChar.getYun(genderInt);

    const rawCycles: LunarDaYun[] = yun.getDaYun();
    const cycles: DaYunCycle[] = [];

    // Index 0 is the natal chart segment — cycles start at index 1
    const MAX_CYCLES = 9;
    for (let i = 1; i <= MAX_CYCLES && i < rawCycles.length; i++) {
        const dy = rawCycles[i];
        const ganZhi: string = dy.getGanZhi();
        const stem = ganZhi.substring(0, 1);
        const branch = ganZhi.substring(1, 2);
        const startYear: number = dy.getStartYear();

        cycles.push({
            index: i,
            stem,
            branch,
            ganZhi,
            startYear,
            startAge: startYear - birthYear,
        });
    }

    return {
        cycles,
        isForward: yun.isForward(),
        startYear: yun.getStartYear(),
        startAge: yun.getStartYear() - birthYear,
    };
}
