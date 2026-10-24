export interface RequiredProductCategoryAttribute {
  readonly attributeId: string;
  readonly name: string;
  readonly requiredCategoryIds: readonly string[];
}

export interface ProductVariationTechnicalAttributes {
  readonly attributes?: unknown;
  readonly technicalValues?: unknown;
}

interface ProductVariationAttribute {
  readonly name: string;
  readonly value: unknown;
  readonly showName?: boolean;
  readonly [key: string]: unknown;
}

const normalizeName = (value: unknown) =>
  String(value ?? '')
    .trim()
    .toLocaleLowerCase('pt-BR');

const getAttributeRecord = (value: unknown) => {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    try {
      return getAttributeRecord(JSON.parse(value));
    } catch {
      throw new Error('As características técnicas da variação possuem JSON inválido.');
    }
  }
  if (value && typeof value === 'object') {
    return Object.entries(value).map(([name, attributeValue]) => ({
      name,
      value: attributeValue,
      showName: true,
    }));
  }
  return [];
};

const toAttributeValue = (value: unknown): string | undefined => {
  if (value === null || value === undefined) return undefined;
  if (Array.isArray(value)) {
    const values = value
      .map(toAttributeValue)
      .filter((item): item is string => Boolean(item));
    return values.length ? values.join(', ') : undefined;
  }
  if (typeof value === 'string') return value.trim() || undefined;
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : undefined;
  if (typeof value === 'boolean') return String(value);
  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    if ('value' in record) return toAttributeValue(record.value);
    if ('name' in record) return toAttributeValue(record.name);
  }
  return undefined;
};

const MODEL_LINE_KEYS = [
  'modelo/linha',
  'modelo / linha',
  'linha/modelo',
  'linha / modelo',
  'modelo e linha',
  'modelo ou linha',
  'modelo',
  'linha',
];

const readNamedValue = (
  values: unknown,
  name: string
): { found: boolean; value: unknown } => {
  if (!values || typeof values !== 'object' || Array.isArray(values)) {
    return { found: false, value: undefined };
  }
  const entries = Object.entries(values as Record<string, unknown>);
  const normalizedName = normalizeName(name);
  const exact = entries.find(([key]) => normalizeName(key) === normalizedName);
  if (exact) return { found: true, value: exact[1] };

  if (MODEL_LINE_KEYS.includes(normalizedName)) {
    const alias = entries.find(([key]) => MODEL_LINE_KEYS.includes(normalizeName(key)));
    if (alias) return { found: true, value: alias[1] };
  }
  return { found: false, value: undefined };
};

/**
 * Loads only category-required attributes for the selected categories. The query
 * is shared by ERP and mobile so both writers use the same category contract.
 */
export const fetchRequiredProductCategoryAttributes = async (
  client: any,
  categoryIds: readonly string[]
): Promise<RequiredProductCategoryAttribute[]> => {
  const selectedCategoryIds = [
    ...new Set(categoryIds.map((id) => String(id).trim()).filter(Boolean)),
  ];
  if (selectedCategoryIds.length === 0) return [];

  const { data, error } = await client
    .from('category_attributes')
    .select('attribute_id, category_id, is_required, attributes (id, name)')
    .in('category_id', selectedCategoryIds)
    .eq('is_required', true);
  if (error) throw error;

  const byAttributeId = new Map<
    string,
    { attributeId: string; name: string; requiredCategoryIds: Set<string> }
  >();
  for (const row of Array.isArray(data) ? data : []) {
    if (row?.is_required !== true) continue;
    const categoryId = String(row.category_id ?? '').trim();
    if (!selectedCategoryIds.includes(categoryId)) continue;
    const attribute = Array.isArray(row.attributes) ? row.attributes[0] : row.attributes;
    const attributeId = String(row.attribute_id || attribute?.id || '').trim();
    const name = String(attribute?.name || '').trim();
    if (!attributeId || !name) {
      throw new Error('Não foi possível identificar uma característica obrigatória da categoria.');
    }
    // Peso is deliberately not a category-required technical field in either form.
    if (normalizeName(name) === 'peso') continue;

    const current = byAttributeId.get(attributeId) || {
      attributeId,
      name,
      requiredCategoryIds: new Set<string>(),
    };
    current.requiredCategoryIds.add(categoryId);
    byAttributeId.set(attributeId, current);
  }

  return [...byAttributeId.values()].map((attribute) => ({
    attributeId: attribute.attributeId,
    name: attribute.name,
    requiredCategoryIds: [...attribute.requiredCategoryIds],
  }));
};

/**
 * Projects only filled, category-required technical values into variation
 * attributes. Existing attributes are merged and never removed by a category
 * requirement change. Newly projected values stay out of generated names.
 */
export const projectRequiredCategoryAttributesToVariations = <
  T extends ProductVariationTechnicalAttributes,
>(
  variations: readonly T[],
  options: {
    categoryIds: readonly string[];
    requiredAttributes: readonly RequiredProductCategoryAttribute[];
    parentTechnicalValues?: unknown;
  }
): T[] => {
  const categoryIds = new Set(
    options.categoryIds.map((id) => String(id).trim()).filter(Boolean)
  );
  const requiredAttributes = new Map<string, string>();
  for (const attribute of options.requiredAttributes) {
    if (
      !attribute.name.trim() ||
      !attribute.requiredCategoryIds.some((id) => categoryIds.has(String(id)))
    ) {
      continue;
    }
    const normalizedName = normalizeName(attribute.name);
    if (!requiredAttributes.has(normalizedName)) requiredAttributes.set(normalizedName, attribute.name.trim());
  }

  return variations.map((variation) => {
    const attributes = getAttributeRecord(variation.attributes).map((value: any) => {
      if (!value || typeof value !== 'object' || Array.isArray(value)) {
        throw new Error('Uma característica da variação está em formato inválido.');
      }
      return {
        ...value,
        name: String(value.name || value.attribute_name || value.key || '').trim(),
        value: value.value ?? value.option ?? '',
        showName: value.showName ?? true,
      } as ProductVariationAttribute;
    });

    for (const [normalizedName, fieldName] of requiredAttributes) {
      const existingIndex = attributes.findIndex(
        (attribute) => normalizeName(attribute.name) === normalizedName
      );
      const variationValue = readNamedValue(variation.technicalValues, fieldName);
      let filledValue: string | undefined;

      if (variationValue.found && variationValue.value !== undefined && variationValue.value !== null) {
        // An explicit empty variation override must not be replaced by the parent value.
        filledValue = toAttributeValue(variationValue.value);
        if (!filledValue) continue;
      } else if (existingIndex >= 0) {
        filledValue = toAttributeValue(attributes[existingIndex].value);
      }

      if (!filledValue) {
        const parentValue = readNamedValue(options.parentTechnicalValues, fieldName);
        filledValue = parentValue.found ? toAttributeValue(parentValue.value) : undefined;
      }
      if (!filledValue) continue;

      if (existingIndex >= 0) {
        attributes[existingIndex] = { ...attributes[existingIndex], value: filledValue };
      } else {
        attributes.push({ name: fieldName, value: filledValue, showName: false });
      }
    }

    return { ...variation, attributes } as T;
  });
};
