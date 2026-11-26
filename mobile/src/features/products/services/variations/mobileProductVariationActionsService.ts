export { searchMobileCanonicalVariations } from './mobileCanonicalVariationSearchService';
export type { MobileCanonicalVariation } from './mobileCanonicalVariationSearchService';

export {
  getMobileVariationActionRequirements,
  mobileVariationAttributesConflict,
  toMobileVariationAttributes,
} from '../../domain/variationActionsDomain';
export type {
  MobileVariationAttribute,
  MobileVariationFamily,
} from '../../domain/variationActionsDomain';

export {
  checkMobileVariationAttributeConflict,
  countMobileParentVariations,
  searchMobileVariationFamilies,
  verifyMobileVariationParent,
} from './mobileVariationFamilyQueryService';

export {
  ensureMobileAttributeValue,
  ensureMobileAttributeValues,
} from './mobileVariationAttributeSyncService';

export {
  mergeMobileVariationIntoCanonical,
  moveMobileVariationToFamily,
} from './mobileVariationFamilyMutationService';
