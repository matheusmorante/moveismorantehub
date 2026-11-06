import { prepareMobileProductSaveState } from './productSaveState';

interface MobileProductSavePayloadInput {
  validated: any;
  product: any;
  productCode: string;
  operation: { operationId: string | null; saveUpdatedAt: string };
  savedProductId: string | null;
  savedProductVersion: string | null;
  clientProductId: string | null;
  saveAsDraft: boolean;
}

export const buildMobileProductSavePayload = ({
  validated,
  product,
  productCode,
  operation,
  savedProductId,
  savedProductVersion,
  clientProductId,
  saveAsDraft,
}: MobileProductSavePayloadInput) => {
  const isSalvado = validated.productKind === 'salvado' || validated.condition === 'salvado';
  const isUsado = validated.productKind === 'usado' || validated.condition === 'usado';
  const saveState = prepareMobileProductSaveState(product, validated, saveAsDraft);
  const productDataForSave = { ...validated };
  delete productDataForSave.categoryNames;

  return {
    ...productDataForSave,
    ...(savedProductId
      ? {
          id: savedProductId,
          updated_at: savedProductVersion,
          updatedAt: savedProductVersion,
        }
      : {}),
    code: productCode,
    ...operation,
    clientProductId: savedProductId || product?.id || clientProductId,
    productKind: isSalvado ? 'salvado' : isUsado ? 'usado' : 'normal',
    condition: isSalvado ? 'salvado' : isUsado ? 'usado' : 'novo',
    isDraft: saveState.isDraft,
    active: saveState.active,
    status: saveState.status,
    hasVariations:
      validated.itemType !== 'service' &&
      (Boolean(validated.hasVariations) ||
        (Array.isArray(validated.variations) && validated.variations.length > 1)),
    variations: saveState.variations,
  };
};
