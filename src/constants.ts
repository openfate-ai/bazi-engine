// ============================================================================
// @openfate/bazi-engine — Ganzhi Reference Constants
// (Public classical lookup tables — no engine weights or scoring)
// ============================================================================

import { FiveElement, Polarity, StemInfo, BranchInfo } from './types';

/** Heavenly Stem → Five Element */
export const STEM_TO_ELEMENT: Record<string, FiveElement> = {
    甲: 'wood', 乙: 'wood',
    丙: 'fire', 丁: 'fire',
    戊: 'earth', 己: 'earth',
    庚: 'metal', 辛: 'metal',
    壬: 'water', 癸: 'water',
};

/** Heavenly Stem → Polarity */
export const STEM_TO_POLARITY: Record<string, Polarity> = {
    甲: 'yang', 乙: 'yin',
    丙: 'yang', 丁: 'yin',
    戊: 'yang', 己: 'yin',
    庚: 'yang', 辛: 'yin',
    壬: 'yang', 癸: 'yin',
};

/** Heavenly Stem → Pinyin */
export const STEM_TO_PINYIN: Record<string, string> = {
    甲: 'jia', 乙: 'yi', 丙: 'bing', 丁: 'ding', 戊: 'wu',
    己: 'ji', 庚: 'geng', 辛: 'xin', 壬: 'ren', 癸: 'gui',
};

/** All Heavenly Stems in order */
export const STEMS: StemInfo[] = [
    { char: '甲', pinyin: 'jia',  element: 'wood',  polarity: 'yang' },
    { char: '乙', pinyin: 'yi',   element: 'wood',  polarity: 'yin'  },
    { char: '丙', pinyin: 'bing', element: 'fire',  polarity: 'yang' },
    { char: '丁', pinyin: 'ding', element: 'fire',  polarity: 'yin'  },
    { char: '戊', pinyin: 'wu',   element: 'earth', polarity: 'yang' },
    { char: '己', pinyin: 'ji',   element: 'earth', polarity: 'yin'  },
    { char: '庚', pinyin: 'geng', element: 'metal', polarity: 'yang' },
    { char: '辛', pinyin: 'xin',  element: 'metal', polarity: 'yin'  },
    { char: '壬', pinyin: 'ren',  element: 'water', polarity: 'yang' },
    { char: '癸', pinyin: 'gui',  element: 'water', polarity: 'yin'  },
];

/**
 * Classical Hidden Stems (藏干) — Traditional proportions.
 * Main qi (本气) listed first with isMain = true.
 */
export const BRANCH_HIDDEN_STEMS: Record<string, { stem: string; isMain?: boolean }[]> = {
    子: [{ stem: '癸', isMain: true }],
    丑: [{ stem: '己', isMain: true }, { stem: '癸' }, { stem: '辛' }],
    寅: [{ stem: '甲', isMain: true }, { stem: '丙' }, { stem: '戊' }],
    卯: [{ stem: '乙', isMain: true }],
    辰: [{ stem: '戊', isMain: true }, { stem: '乙' }, { stem: '癸' }],
    巳: [{ stem: '丙', isMain: true }, { stem: '戊' }, { stem: '庚' }],
    午: [{ stem: '丁', isMain: true }, { stem: '己' }],
    未: [{ stem: '己', isMain: true }, { stem: '丁' }, { stem: '乙' }],
    申: [{ stem: '庚', isMain: true }, { stem: '壬' }, { stem: '戊' }],
    酉: [{ stem: '辛', isMain: true }],
    戌: [{ stem: '戊', isMain: true }, { stem: '辛' }, { stem: '丁' }],
    亥: [{ stem: '壬', isMain: true }, { stem: '甲' }],
};

/** Earthly Branch → Primary Five Element (from Main Qi) */
export const BRANCH_TO_ELEMENT: Record<string, FiveElement> = {
    子: 'water', 丑: 'earth', 寅: 'wood',  卯: 'wood',
    辰: 'earth', 巳: 'fire',  午: 'fire',  未: 'earth',
    申: 'metal', 酉: 'metal', 戌: 'earth', 亥: 'water',
};

/** All Earthly Branches */
export const BRANCHES: BranchInfo[] = Object.entries(BRANCH_HIDDEN_STEMS).map(([char, hidden]) => ({
    char,
    element: BRANCH_TO_ELEMENT[char],
    hiddenStems: hidden.map(h => h.stem),
    mainQi: hidden.find(h => h.isMain)?.stem ?? hidden[0].stem,
}));
