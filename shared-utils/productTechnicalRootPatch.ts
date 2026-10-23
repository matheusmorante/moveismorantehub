export interface ProductTechnicalRootPatch {
  brand?: string;
}

export const getProductTechnicalRootPatch = (
  fieldName: string,
  value: unknown
): ProductTechnicalRootPatch => {
  if (!/^marca$/i.test(fieldName.trim())) return {};

  return {
    brand: typeof value === 'string' ? value : String(value ?? ''),
  };
};
