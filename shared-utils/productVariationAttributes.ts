export interface ProductVariationAttribute {
  name: string;
  value: string;
  showName: boolean;
}

export interface ParseProductVariationAttributesOptions {
  /** Preserves the app's existing preference when an object-form attribute carries it. */
  preserveStructuredShowName?: boolean;
}

const parseJson = (value: unknown): unknown => {
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

/** Parses current and legacy variation attribute payloads for both ERP and mobile. */
export const parseProductVariationAttributes = (
  rawAttributes: unknown,
  options: ParseProductVariationAttributesOptions = {}
): ProductVariationAttribute[] => {
  const attributes = parseJson(rawAttributes);

  if (Array.isArray(attributes)) {
    return attributes
      .map((rawAttribute: any) => ({
        name: String(
          rawAttribute?.name ||
            rawAttribute?.attribute_name ||
            rawAttribute?.attribute ||
            rawAttribute?.key ||
            ''
        ).trim(),
        value: String(rawAttribute?.value || rawAttribute?.option || rawAttribute?.val || ''),
        showName: rawAttribute?.showName ?? true,
      }))
      .filter((attribute) => attribute.name && attribute.value);
  }

  if (!attributes || typeof attributes !== 'object') return [];

  return Object.entries(attributes)
    .map(([name, rawValue]) => {
      const isStructuredObject = Boolean(rawValue) && typeof rawValue === 'object';
      const structured = isStructuredObject ? (rawValue as Record<string, unknown>) : null;
      const value = structured
        ? String(
            structured.value ||
              structured.val ||
              structured.name ||
              JSON.stringify(rawValue)
          )
        : String(rawValue);

      return {
        name: name.trim(),
        value,
        showName:
          options.preserveStructuredShowName && structured
            ? structured.showName !== false
            : true,
      };
    })
    .filter((attribute) => attribute.name && attribute.value);
};
