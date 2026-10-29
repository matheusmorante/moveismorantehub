import {
  getCanonicalProductTechnicalValueFieldName,
  getProductTechnicalValueFieldAliasRank,
  getProductTechnicalValueFieldIdentity,
  findProductTechnicalValueEntry,
  getProductTechnicalValueCandidateKeys,
  isCombinedProductModelLineAlias,
} from './productTechnicalValueAliases';
import { removeProductVariationTechnicalAttribute } from './productVariationTechnicalAttributes';
import { isCatalogNeverRequiredCharacteristicName } from './catalogPublication/requiredCharacteristicPolicy';

export interface RequiredProductCategoryAttribute {
  readonly attributeId: string;
  readonly name: string;
  readonly requiredCategoryIds: readonly string[];
}

/** Returns whether a technical field is required by any selected product category. */
export const isProductTechnicalAttributeRequiredByCategories = (
  requiredCategoryIds: readonly string[] | undefined,
  selectedCategoryIds: readonly string[]
): boolean => {
  if (!requiredCategoryIds?.length || !selectedCategoryIds.length) return false;
  const selected = new Set(selectedCategoryIds.map(String));
  return requiredCategoryIds.some((categoryId) => selected.has(String(categoryId)));
};

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

const toAttributeValue = (value: unknown): string | boolean | undefined => {
  if (value === null || value === undefined) return undefined;
  if (Array.isArray(value)) {
    const values = value
      .map(toAttributeValue)
      .filter((item): item is string | boolean => item !== undefined && item !== '');
    return values.length ? values.map(String).join(', ') : undefined;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    const normalized = trimmed
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLocaleLowerCase('pt-BR');
    return !trimmed || ['nao se aplica', 'n/a', 'nao informar'].includes(normalized)
      ? undefined
      : trimmed;
  }
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : undefined;
  if (typeof value === 'boolean') return value;
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

const findExistingAttributeIndex = (
  attributes: readonly ProductVariationAttribute[],
  name: string
): number => {
  const normalizedName = normalizeName(name);
  const candidates = getProductTechnicalValueCandidateKeys(name).map(normalizeName);
  if (MODEL_LINE_KEYS.includes(normalizedName)) {
    candidates.push(...MODEL_LINE_KEYS);
  }

  for (const candidate of new Set(candidates)) {
    const index = attributes.findIndex((attribute) => normalizeName(attribute.name) === candidate);
    if (index >= 0) return index;
  }
  return -1;
};

const getExistingAttributeIndexes = (
  attributes: readonly ProductVariationAttribute[],
  name: string
): number[] => {
  const candidates = new Set(getProductTechnicalValueCandidateKeys(name).map(normalizeName));
  if (MODEL_LINE_KEYS.includes(normalizeName(name))) {
    MODEL_LINE_KEYS.forEach((candidate) => candidates.add(candidate));
  }
  return attributes.flatMap((attribute, index) =>
    candidates.has(normalizeName(attribute.name)) ? [index] : []
  );
};

const readNamedValue = (
  values: unknown,
  name: string
): { found: boolean; value: unknown } => {
  if (!values || typeof values !== 'object' || Array.isArray(values)) {
    return { found: false, value: undefined };
  }
  const entry = findProductTechnicalValueEntry(values as Record<string, unknown>, name);
  return entry ? { found: true, value: entry.value } : { found: false, value: undefined };
};

const readVariationValue = (
  attributes: readonly ProductVariationAttribute[],
  technicalValues: unknown,
  name: string
): { found: boolean; value: unknown } => {
  const attributeValues = Object.fromEntries(
    attributes.flatMap((attribute) => {
      const attributeName = attribute.name.trim();
      if (!attributeName) return [];
      return [
        [attributeName, attribute.value],
        [attributeName.toLocaleLowerCase('pt-BR'), attribute.value],
      ];
    })
  );
  const variationTechnicalValues =
    technicalValues && typeof technicalValues === 'object' && !Array.isArray(technicalValues)
      ? (technicalValues as Record<string, unknown>)
      : {};

  // Match the editor's effective-value lookup: exact technical keys replace the
  // same attribute key, while canonical/legacy aliases retain candidate order.
  return readNamedValue({ ...attributeValues, ...variationTechnicalValues }, name);
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

  const byFieldIdentity = new Map<
    string,
    { attributeId: string; name: string; sourceName: string; requiredCategoryIds: Set<string> }
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
    if (isCatalogNeverRequiredCharacteristicName(name)) continue;

    const isCombinedModelLine = isCombinedProductModelLineAlias(name);
    const identity = isCombinedModelLine
      ? getProductTechnicalValueFieldIdentity(name)
      : `attribute:${attributeId}`;
    const canonicalName = getCanonicalProductTechnicalValueFieldName(name);
    const current = byFieldIdentity.get(identity) || {
      attributeId,
      name: canonicalName,
      sourceName: name,
      requiredCategoryIds: new Set<string>(),
    };
    const currentAliasRank = getProductTechnicalValueFieldAliasRank(current.sourceName);
    const nextAliasRank = getProductTechnicalValueFieldAliasRank(name);
    const nextAliasHasPriority = isCombinedModelLine && nextAliasRank < currentAliasRank;
    const sameAliasRankAndEarlierId =
      isCombinedModelLine &&
      nextAliasRank === currentAliasRank &&
      attributeId.localeCompare(current.attributeId, 'en') < 0;
    if (nextAliasHasPriority || sameAliasRankAndEarlierId) {
      current.attributeId = attributeId;
      current.name = canonicalName;
      current.sourceName = name;
    }
    current.requiredCategoryIds.add(categoryId);
    byFieldIdentity.set(identity, current);
  }

  return [...byFieldIdentity.values()].map((attribute) => ({
    attributeId: attribute.attributeId,
    name: attribute.name,
    requiredCategoryIds: [...attribute.requiredCategoryIds].sort((left, right) => left.localeCompare(right, 'en')),
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
    const identity = getProductTechnicalValueFieldIdentity(attribute.name);
    const fieldName = getCanonicalProductTechnicalValueFieldName(attribute.name);
    const currentName = requiredAttributes.get(identity);
    if (
      !currentName ||
      (identity === 'modelo/linha' && fieldName === 'Modelo/Linha' && currentName !== fieldName)
    ) {
      requiredAttributes.set(identity, fieldName);
    }
  }

  return variations.map((variation) => {
    let attributes = getAttributeRecord(variation.attributes).map((value: any) => {
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

    for (const fieldName of requiredAttributes.values()) {
      const existingIndex = findExistingAttributeIndex(attributes, fieldName);
      const variationValue = readVariationValue(attributes, variation.technicalValues, fieldName);
      let filledValue: string | boolean | undefined;

      if (variationValue.found && variationValue.value !== undefined) {
        // An explicit empty variation override must not be replaced by the parent value.
        filledValue = toAttributeValue(variationValue.value);
        if (filledValue === undefined) {
          if (variationValue.value === null) {
            if (existingIndex >= 0) {
              attributes[existingIndex] = { ...attributes[existingIndex], value: null };
            } else {
              attributes.push({ name: fieldName, value: null, showName: false });
            }
          } else {
            attributes = removeProductVariationTechnicalAttribute(attributes, fieldName);
          }
          continue;
        }
      } else if (existingIndex >= 0) {
        filledValue = toAttributeValue(attributes[existingIndex].value);
      }

      if (filledValue === undefined) {
        const parentValue = readNamedValue(options.parentTechnicalValues, fieldName);
        filledValue = parentValue.found ? toAttributeValue(parentValue.value) : undefined;
      }
      if (filledValue === undefined) continue;

      if (existingIndex >= 0) {
        const matchingIndexes =
          getProductTechnicalValueFieldIdentity(fieldName) === 'modelo/linha'
            ? getExistingAttributeIndexes(attributes, fieldName)
            : [existingIndex];
        const firstMatchingIndex = matchingIndexes[0] ?? existingIndex;
        const matchingIndexSet = new Set(matchingIndexes);
        const preferredAttribute = { ...attributes[existingIndex], value: filledValue };
        attributes = attributes.filter((_, index) => !matchingIndexSet.has(index));
        attributes.splice(Math.min(firstMatchingIndex, attributes.length), 0, preferredAttribute);
      } else {
        attributes.push({ name: fieldName, value: filledValue, showName: false });
      }
    }

    return { ...variation, attributes } as T;
  });
};
