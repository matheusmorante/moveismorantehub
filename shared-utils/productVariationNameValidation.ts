/** Produces a stable comparison key for finalized product variation names. */
export const normalizeCompleteVariationName = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

/** Preserves attribute order while excluding values explicitly hidden from automatic variation names. */
export const getVariationNameAttributeValues = (
  attributes: readonly { value?: unknown; showName?: boolean | null }[]
): string[] =>
  attributes
    .filter((attribute) => attribute?.showName !== false && String(attribute?.value || '').trim())
    .map((attribute) => String(attribute?.value || '').trim());

/** Preserves the ERP display rule that removes a dash after a repeated parent name. */
export const normalizeProductVariationName = (
  parentName: string,
  variationName: string
): string => {
  const parent = parentName.trim();
  const name = variationName.trim();
  if (!parent || name.slice(0, parent.length).toLowerCase() !== parent.toLowerCase()) return name;

  const suffix = name.slice(parent.length);
  if (!/^\s*[-–—]\s*/u.test(suffix)) return name;
  return `${name.slice(0, parent.length)} ${suffix.replace(/^\s*[-–—]\s*/u, '')}`.trim();
};

/** Resolves the visible full name using the same fallback rules as ERP finalization. */
export const getCompleteVariationName = (
  variation: Record<string, any>,
  parentName: string
): string => {
  const name = String(variation.name || '').trim();
  const suffix = name.toLocaleLowerCase('pt-BR').startsWith(parentName.toLocaleLowerCase('pt-BR'))
    ? name.slice(parentName.length).replace(/^[\s\-_:]+/u, '').trim()
    : name;
  const isPlaceholder = !name || !suffix || ['produto', 'variação', 'nova variação'].includes(suffix.toLocaleLowerCase('pt-BR'));
  if (!isPlaceholder) {
    return parentName && !name.toLocaleLowerCase('pt-BR').startsWith(parentName.toLocaleLowerCase('pt-BR'))
      ? `${parentName} ${name}`
      : name;
  }

  const values = Array.isArray(variation.attributes)
    ? getVariationNameAttributeValues(variation.attributes)
    : [];
  return [parentName, ...values].filter(Boolean).join(' ');
};
