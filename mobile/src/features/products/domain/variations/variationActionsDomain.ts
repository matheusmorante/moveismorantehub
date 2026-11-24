import {
  sameFamilyAttributes,
  type FamilyAttribute,
} from '../../../../../../shared-utils/variationFamilyFormSchemas';

export type MobileVariationAttribute = FamilyAttribute;

export interface MobileVariationFamily {
  id: string;
  name?: string | null;
  description?: string | null;
  code?: string | null;
}

type RawAttributeRecord = {
  name?: unknown;
  attribute?: unknown;
  key?: unknown;
  value?: unknown;
  val?: unknown;
  showName?: boolean;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

export const toMobileVariationAttributes = (value: unknown): MobileVariationAttribute[] => {
  let attributes = value;
  if (typeof attributes === 'string') {
    try {
      attributes = JSON.parse(attributes);
    } catch (error) {
      console.warn('Não foi possível interpretar JSON de atributos da variação:', error);
      return [];
    }
  }

  if (Array.isArray(attributes)) {
    return attributes.filter(Boolean).map((raw) => {
      const item = (isRecord(raw) ? raw : {}) as RawAttributeRecord;
      return {
        name: String(item.name || item.attribute || item.key || ''),
        value: String(item.value || item.val || ''),
        showName: item.showName,
      };
    });
  }

  if (isRecord(attributes)) {
    return Object.entries(attributes).map(([name, rawValue]) => {
      const item = isRecord(rawValue) ? (rawValue as RawAttributeRecord) : null;
      return {
        name,
        value: String(item?.value ?? item?.val ?? rawValue ?? ''),
        showName: item?.showName,
      };
    });
  }

  return [];
};

export const getMobileVariationActionRequirements = (
  parentProduct:
    | { supplierId?: unknown; supplier_id?: unknown; main_supplier_id?: unknown }
    | null
    | undefined,
  variation: { attributes?: unknown } | null | undefined
): { hasSupplier: boolean; hasValidAttributes: boolean } => ({
  hasSupplier: Boolean(
    parentProduct?.supplierId || parentProduct?.supplier_id || parentProduct?.main_supplier_id
  ),
  hasValidAttributes: toMobileVariationAttributes(variation?.attributes).some(
    (attribute) => attribute.name.trim() && attribute.value.trim()
  ),
});

export const mobileVariationAttributesConflict = (
  first: readonly MobileVariationAttribute[],
  second: readonly MobileVariationAttribute[]
): boolean => sameFamilyAttributes(first, second);
