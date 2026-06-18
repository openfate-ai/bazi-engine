import { STEM_TO_ELEMENT, STEM_TO_POLARITY } from '../constants';
import { FiveElement } from '../types';

type TenGodRelation = 'self' | 'output' | 'wealth' | 'power' | 'resource';

const ELEMENTS: FiveElement[] = ['wood', 'fire', 'earth', 'metal', 'water'];

const TEN_GOD_NAMES: Record<TenGodRelation, { same: string; different: string }> = {
    self: { same: '比肩', different: '劫财' },
    output: { same: '食神', different: '伤官' },
    wealth: { same: '偏财', different: '正财' },
    power: { same: '七杀', different: '正官' },
    resource: { same: '偏印', different: '正印' },
};

function getRelationship(dayMaster: FiveElement, target: FiveElement): TenGodRelation {
    const dayMasterIndex = ELEMENTS.indexOf(dayMaster);
    const targetIndex = ELEMENTS.indexOf(target);
    const difference = (targetIndex - dayMasterIndex + ELEMENTS.length) % ELEMENTS.length;

    if (difference === 0) return 'self';
    if (difference === 1) return 'output';
    if (difference === 2) return 'wealth';
    if (difference === 3) return 'power';
    return 'resource';
}

/**
 * calculateTenGod - Returns the classical Ten God relationship between two stems.
 */
export function calculateTenGod(dayMaster: string, targetStem: string): string {
    const dayMasterElement = STEM_TO_ELEMENT[dayMaster];
    const targetElement = STEM_TO_ELEMENT[targetStem];
    const dayMasterPolarity = STEM_TO_POLARITY[dayMaster];
    const targetPolarity = STEM_TO_POLARITY[targetStem];

    if (!dayMasterElement || !dayMasterPolarity) throw new Error(`Unsupported Day Master: ${dayMaster}`);
    if (!targetElement || !targetPolarity) throw new Error(`Unsupported target stem: ${targetStem}`);

    const relationship = getRelationship(dayMasterElement, targetElement);
    const names = TEN_GOD_NAMES[relationship];
    return dayMasterPolarity === targetPolarity ? names.same : names.different;
}
