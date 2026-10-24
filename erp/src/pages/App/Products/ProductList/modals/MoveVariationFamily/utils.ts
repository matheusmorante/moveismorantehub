export type { FamilyAttribute as Attribute } from '../../../../../../../../shared-utils/variationFamilyFormSchemas';
export {
  canAddVariationFamilyAttribute,
  normalizeFamilyValue as normalize,
  toFamilyAttributes as toAttributes,
  sameFamilyAttributes as hasSameAttributes,
} from '../../../../../../../../shared-utils/variationFamilyFormSchemas';

export interface Family {
  readonly id: string;
  readonly name?: string;
  readonly description?: string;
  readonly code?: string;
}
export const familyName = (family?: Family | null): string => family?.name || family?.description || 'Produto pai selecionado';
export const familySku = (family?: Family | null): string => family?.code || '';
