export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

export function generateAutoSku(
  parentSlug: string,
  varAttributes: Record<string, string>
): string {
  const baseSlug = parentSlug || 'prod';
  const attrsSlug = Object.entries(varAttributes)
    .map(([_, v]) =>
      v
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]/g, '')
    )
    .filter(Boolean)
    .sort()
    .join('-');
  return attrsSlug ? `${baseSlug}-${attrsSlug}` : baseSlug;
}

export function getDefaultVariationName(
  parentName: string,
  attributes: Record<string, string> = {}
): string {
  const attributeValues = Object.values(attributes).filter((value): value is string =>
    Boolean(value?.trim())
  );
  return [parentName?.trim(), ...attributeValues].filter(Boolean).join(' ') || 'Padrão';
}
