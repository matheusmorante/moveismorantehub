import type { MobileVariationAttribute } from '../../services/variations/mobileProductVariationActionsService';

export interface MobileMoveVariationAttributeRow extends MobileVariationAttribute {
  rowId: string;
}

export function prepareMobileMoveVariationAttributes(
  attributes: readonly MobileMoveVariationAttributeRow[]
) {
  const validAttributes = attributes.filter(
    (attribute) => attribute.name.trim() && attribute.value.trim()
  );
  const formAttributes = validAttributes.map(({ name, value, showName }) => ({
    name,
    value,
    showName,
  }));

  return { validAttributes, formAttributes };
}
