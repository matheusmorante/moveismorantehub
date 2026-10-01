/** Mesma regra do ERP: cada variação precisa ter ao menos um atributo completo. */
export const hasVariationAttribute = (variation: any): boolean => {
  if (!variation) return false;

  const technicalValues = variation.technicalValues;
  if (
    technicalValues &&
    typeof technicalValues === 'object' &&
    Object.values(technicalValues).some(
      (value) => value !== undefined && value !== null && String(value).trim() !== ''
    )
  ) {
    return true;
  }

  let attributes = variation.attributes;
  if (typeof attributes === 'string' && attributes.trim()) {
    try {
      attributes = JSON.parse(attributes);
    } catch {
      return false;
    }
  }

  if (Array.isArray(attributes)) {
    return (
      attributes.length > 0 &&
      attributes.every((attribute) => {
        const name = String(attribute?.name || attribute?.attribute || attribute?.key || '').trim();
        const value = String(attribute?.value || attribute?.val || '').trim();
        return Boolean(name && value);
      })
    );
  }

  if (attributes && typeof attributes === 'object') {
    const entries = Object.entries(attributes);
    return (
      entries.length > 0 &&
      entries.every(([name, value]) => Boolean(name.trim() && String(value || '').trim()))
    );
  }

  return false;
};

export const hasMissingVariationAttributes = (variations: any[] = []): boolean =>
  variations.length === 0 || variations.some((variation) => !hasVariationAttribute(variation));
