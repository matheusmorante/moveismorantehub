export interface ProductVariationNameInput {
  attributes?: Record<string, unknown> | null;
  name?: string | null;
  productName?: string | null;
}

/**
 * A coluna product_variations.name é obrigatória no banco. A variação pode
 * herdar o nome do produto-pai, mas nunca deve chegar sem um nome persistível.
 */
export const resolveProductVariationName = ({
  attributes,
  name,
  productName,
}: ProductVariationNameInput): string => {
  const explicitName = name?.trim();
  if (explicitName) return explicitName;

  const attributeLabel = Object.entries(attributes || {})
    .filter(([, value]) => value !== null && value !== undefined && String(value).trim())
    .map(([key, value]) => `${key}: ${String(value).trim()}`)
    .join(' · ');

  const parentName = productName?.trim() || 'Variação';
  return attributeLabel ? `${parentName} — ${attributeLabel}` : parentName;
};
