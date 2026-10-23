/** Produces a stable comparison key for finalized product variation names. */
export const normalizeCompleteVariationName = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

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
    ? variation.attributes
        .filter((attribute: any) => attribute?.showName !== false && String(attribute?.value || '').trim())
        .map((attribute: any) => String(attribute.value).trim())
    : [];
  return [parentName, ...values].filter(Boolean).join(' ');
};
