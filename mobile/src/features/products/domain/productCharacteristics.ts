/**
 * productCharacteristics.ts
 *
 * Módulo de domínio para gestão, validação, serialização e agrupamento
 * de características e especificações técnicas de produtos no aplicativo mobile.
 *
 * Princípios aplicados:
 * - Single Responsibility Principle (SRP): Isolamento entre predicados de domínio,
 *   parsing/serialização de atributos legados/atuais, ordenação e regras de aplicabilidade.
 * - DRY (Don't Repeat Yourself): Predicados canônicos centralizados para medidas, colchões e peso.
 * - Sincronização e consistência conceitual com o ERP (`technicalValuesService.ts`).
 */

// ============================================================================
// 1. TYPES & INTERFACES
// ============================================================================

export interface ProductCharacteristicAttribute {
  name: string;
  value: unknown;
  showName: boolean;
}

export interface ProductTechnicalField {
  name: string;
  active?: boolean | null;
  isRequired?: boolean;
  is_globally_required?: boolean;
  requiredForCategory?: boolean;
  requiredCategoryIds?: readonly string[];
  isCustom?: boolean;
  is_custom?: boolean;
  categoryIds?: readonly string[];
  decimal_places?: 1 | 2 | 3 | null;
  data_type?: string | null;
}

export interface ProductTechnicalFieldGroup<
  T extends ProductTechnicalField = ProductTechnicalField,
> {
  title: string;
  fields: T[];
}

// ============================================================================
// 2. CONSTANTS & TOPIC DEFINITIONS
// ============================================================================

export const REQUIRED_DIMENSION_NAMES = [
  'Altura total',
  'Largura total',
  'Profundidade total',
  'Altura',
  'Largura',
  'Profundidade',
] as const;

export const REQUIRED_CHARACTERISTIC_NAMES = ['Cor', 'Modelo', 'Marca'] as const;

export const GLOBAL_REQUIRED_ATTRIBUTE_NAMES = [
  ...REQUIRED_CHARACTERISTIC_NAMES,
  ...REQUIRED_DIMENSION_NAMES,
] as const;

export const MATTRESS_CATEGORY_ID = '3b616449-7d0c-40fc-9917-70a20836f3b8';

export const CHARACTERISTIC_TOPICS: ReadonlyArray<{ title: string; matches: RegExp }> = [
  {
    title: 'Medidas e peso',
    matches: /\b(altura|largura|profundidade|comprimento|peso|espessura|assento)\b/i,
  },
  { title: 'Tecido e revestimento', matches: /\b(tecido|revestimento|espuma|densidade|estofad)/i },
  {
    title: 'Estrutura',
    matches: /\b(estrutura|material da estrutura|tipo de portas|quantidade de portas)\b/i,
  },
  {
    title: 'Funcionalidades',
    matches: /\b(espelho|porta|gaveta|deslizamento|mecanismo|retr[aá]til|extens[íi]vel)\b/i,
  },
  { title: 'Acessórios', matches: /\b(p[eé]s?|puxador|rod[ií]zio|sapata)\b/i },
  {
    title: 'Materiais e acabamento',
    matches: /\b(material|acabamento|cor|madeira|metal|vidro)\b/i,
  },
];

/** Sequência canônica de exibição das medidas e pesos */
export const DIMENSIONS_SORT_ORDER: Readonly<Record<string, number>> = {
  'altura total': 1,
  altura: 1,
  espessura: 2,
  'espessura do colchão': 2,
  'largura total': 3,
  largura: 3,
  'profundidade total': 4,
  profundidade: 4,
  'comprimento total': 5,
  comprimento: 5,
  'profundidade fechado': 6,
  'profundidade aberto': 7,
  'altura do assento ao chão': 8,
  'altura do chão até o assento': 8,
  peso: 9,
  'peso suportado': 10,
};

// ============================================================================
// 3. DOMAIN PREDICATES & VALUE NORMALIZERS
// ============================================================================

export const normalizeName = (name: string): string =>
  String(name || '')
    .trim()
    .toLocaleLowerCase('pt-BR');

export const isDepthCharacteristic = (name: string): boolean => {
  const norm = normalizeName(name);
  return norm === 'profundidade' || norm === 'profundidade total';
};

export const isLengthCharacteristic = (name: string): boolean => {
  const norm = normalizeName(name);
  return norm === 'comprimento' || norm === 'comprimento total';
};

export const isHeightCharacteristic = (name: string): boolean => {
  const norm = normalizeName(name);
  return norm === 'altura' || norm === 'altura total';
};

export const isWidthCharacteristic = (name: string): boolean => {
  const norm = normalizeName(name);
  return norm === 'largura' || norm === 'largura total';
};

export const isThicknessCharacteristic = (name: string): boolean => {
  const norm = normalizeName(name);
  return norm === 'espessura' || norm === 'espessura do colchão';
};

export const isWeightCharacteristicName = (name: string): boolean =>
  normalizeName(name) === 'peso';

/** Mantém o campo operacional Reclinável oculto, conforme a regra canônica do ERP. */
export const isExcludedProductTechnicalField = (name: string): boolean =>
  /^reclin[aá]vel$/i.test(String(name || '').trim());

export const isMattressCategory = (
  categoryIds: readonly string[] = [],
  allFields?: readonly ProductTechnicalField[]
): boolean => {
  if (categoryIds.map(String).includes(MATTRESS_CATEGORY_ID)) return true;
  if (allFields) {
    const espessuraField = allFields.find(
      (f) => normalizeName(f.name) === 'espessura do colchão'
    );
    if (espessuraField?.categoryIds?.some((cid) => categoryIds.map(String).includes(String(cid)))) {
      return true;
    }
  }
  return false;
};

export const isRequiredCharacteristicName = (name: string): boolean => {
  const normalized = normalizeName(name);
  if (isLengthCharacteristic(name)) return true;
  return GLOBAL_REQUIRED_ATTRIBUTE_NAMES.some(
    (requiredName) => normalizeName(requiredName) === normalized
  );
};

export const isProductTechnicalFieldRequired = (
  field: ProductTechnicalField,
  categoryIds: readonly string[] = []
): boolean => {
  if (isWeightCharacteristicName(field.name)) return false;
  const isMattress = isMattressCategory(categoryIds);

  if (isMattress && isHeightCharacteristic(field.name)) return false;
  if (isMattress && normalizeName(field.name) === 'espessura do colchão') return true;

  return (
    field.isRequired === true ||
    isRequiredCharacteristicName(field.name) ||
    Boolean(field.requiredCategoryIds?.some((id) => categoryIds.map(String).includes(String(id))))
  );
};

export const getDimensionSortRank = (name: string): number => {
  const norm = normalizeName(name);
  return DIMENSIONS_SORT_ORDER[norm] ?? 99;
};

// ============================================================================
// 4. ATTRIBUTE & VALUE SERIALIZATION / PARSING
// ============================================================================

const parseJson = (value: unknown): unknown => {
  if (typeof value !== 'string' || !value.trim()) return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
};

const readStructuredValue = (value: unknown) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return value;
  const structured = value as { value?: unknown; val?: unknown };
  return structured.value ?? structured.val;
};

const toTechnicalValuesMap = (source: unknown): Record<string, unknown> => {
  const parsed = parseJson(source);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};

  return Object.fromEntries(
    Object.entries(parsed).map(([name, value]) => [name, readStructuredValue(value)])
  );
};

const normalizeValues = (values: Record<string, unknown>) =>
  Object.fromEntries(
    Object.entries(values)
      .filter(([name, value]) => normalizeName(name) && value !== undefined && value !== null)
      .map(([name, value]) => [normalizeName(name), value])
  );

/** Lê os formatos atuais e legados de atributos sem perder a preferência showName. */
export const getProductCharacteristicAttributes = (
  rawAttributes: unknown
): ProductCharacteristicAttribute[] => {
  const attributes = parseJson(rawAttributes);

  if (Array.isArray(attributes)) {
    return attributes
      .map((attribute: any) => ({
        name: String(attribute?.name || attribute?.attribute || attribute?.key || '').trim(),
        value: attribute?.value ?? attribute?.val,
        showName: attribute?.showName !== false,
      }))
      .filter(
        (attribute) => attribute.name && attribute.value !== undefined && attribute.value !== null
      );
  }

  if (attributes && typeof attributes === 'object') {
    return Object.entries(attributes)
      .map(([name, rawValue]) => {
        const value = readStructuredValue(rawValue);
        return {
          name: name.trim(),
          value,
          showName:
            !rawValue || typeof rawValue !== 'object' || Array.isArray(rawValue)
              ? true
              : (rawValue as { showName?: boolean }).showName !== false,
        };
      })
      .filter(
        (attribute) => attribute.name && attribute.value !== undefined && attribute.value !== null
      );
  }

  return [];
};

/** Atualiza valor sem apagar a opção de ocultar a característica do nome da variação. */
export const upsertProductCharacteristicAttribute = (
  rawAttributes: unknown,
  name: string,
  value: unknown
): ProductCharacteristicAttribute[] => {
  const next = getProductCharacteristicAttributes(rawAttributes);
  const normalizedName = normalizeName(name);
  const index = next.findIndex((attribute) => normalizeName(attribute.name) === normalizedName);

  if (!String(value ?? '').trim()) {
    if (index >= 0) next.splice(index, 1);
    return next;
  }

  const existing = index >= 0 ? next[index] : undefined;
  const updated = {
    ...existing,
    name,
    value: String(value),
    showName: existing?.showName ?? true,
  };
  if (index >= 0) next[index] = updated;
  else next.push(updated);
  return next;
};

/** Valores do produto pai: atributos legados e, depois, technicalValues como fonte prioritária. */
export const getEffectiveProductTechnicalValues = (product: any = {}) => {
  const legacyValues = Object.fromEntries(
    getProductCharacteristicAttributes(product?.attributes).map(({ name, value }) => [name, value])
  );
  const technicalValues = {
    ...toTechnicalValuesMap(product?.technical_specs?.technicalValues),
    ...toTechnicalValuesMap(product?.technicalValues),
  };

  return normalizeValues({ ...legacyValues, ...technicalValues });
};

/** Mescla fontes técnicas na ordem de prioridade sem alterar os rótulos salvos pelo ERP. */
export const getPersistableProductTechnicalValues = (
  product: any = {}
): Record<string, unknown> => {
  const legacyValues = Object.fromEntries(
    getProductCharacteristicAttributes(product?.attributes).map(({ name, value }) => [name, value])
  );
  const sources = [
    legacyValues,
    toTechnicalValuesMap(product?.technical_specs?.technicalValues),
    toTechnicalValuesMap(product?.technicalValues),
  ];
  const result: Record<string, unknown> = {};

  for (const source of sources) {
    for (const [name, value] of Object.entries(source)) {
      const previousName = Object.keys(result).find(
        (existingName) => normalizeName(existingName) === normalizeName(name)
      );
      if (previousName && previousName !== name) delete result[previousName];
      result[name] = value;
    }
  }

  return result;
};

/**
 * Mescla pai, atributos de versões antigas e sobrescritas da variação.
 * A variação vence, inclusive quando a sobrescrita foi definida como vazia.
 */
export const getEffectiveVariationTechnicalValues = (
  parentValues: Record<string, unknown> = {},
  variation: any = {}
): Record<string, unknown> => {
  const variationAttributes = Object.fromEntries(
    getProductCharacteristicAttributes(variation?.attributes).map(({ name, value }) => [
      name,
      value,
    ])
  );
  const variationTechnicalValues = toTechnicalValuesMap(variation?.technicalValues);

  return normalizeValues({
    ...parentValues,
    ...variationAttributes,
    ...variationTechnicalValues,
  });
};

export const getTechnicalValue = (values: Record<string, unknown> = {}, name: string) => {
  const normalizedName = normalizeName(name);
  const matchingEntry = Object.entries(values).find(
    ([key]) => normalizeName(key) === normalizedName
  );
  return matchingEntry?.[1];
};

export const hasTechnicalValue = (values: Record<string, unknown> = {}, name: string) =>
  Object.keys(values).some((key) => normalizeName(key) === normalizeName(name));

// ============================================================================
// 5. APPLICABLE FIELDS & DEPTH/LENGTH RESOLUTION
// ============================================================================

/**
 * Resolve a exclusividade mútua entre Profundidade e Comprimento.
 */
export const resolveActiveDepthOrLengthField = (
  depthField: ProductTechnicalField,
  lengthField: ProductTechnicalField,
  values: Record<string, unknown>,
  manualNames: ReadonlySet<string>
): string => {
  const depthValue = String(getTechnicalValue(values, depthField.name) ?? '').trim();
  const lengthValue = String(getTechnicalValue(values, lengthField.name) ?? '').trim();

  if (
    manualNames.has(normalizeName(lengthField.name)) &&
    !manualNames.has(normalizeName(depthField.name))
  ) {
    return normalizeName(lengthField.name);
  }
  if (
    manualNames.has(normalizeName(depthField.name)) &&
    !manualNames.has(normalizeName(lengthField.name))
  ) {
    return normalizeName(depthField.name);
  }
  if (lengthValue && !depthValue) {
    return normalizeName(lengthField.name);
  }
  if (depthValue && !lengthValue) {
    return normalizeName(depthField.name);
  }
  if (
    hasTechnicalValue(values, lengthField.name) &&
    !hasTechnicalValue(values, depthField.name)
  ) {
    return normalizeName(lengthField.name);
  }

  return normalizeName(depthField.name);
};

/** Mantém a mesma seleção de campos do ERP e a exclusividade Profundidade/Comprimento. */
export const getApplicableProductTechnicalFields = <T extends ProductTechnicalField>(
  allFields: readonly T[] = [],
  categoryIds: readonly string[] = [],
  values: Record<string, unknown> = {},
  manuallyAddedFieldNames: readonly string[] = []
): T[] => {
  const safeFields = Array.isArray(allFields) ? allFields : [];
  const activeCategories = new Set(categoryIds.map(String));
  const manualNames = new Set(manuallyAddedFieldNames.map(normalizeName));
  const isMattress = isMattressCategory(categoryIds, safeFields);

  let applicable = safeFields.filter((field) => {
    if (isExcludedProductTechnicalField(field.name)) return false;

    const hasExistingValue = hasTechnicalValue(values, field.name);
    const norm = normalizeName(field.name);

    if (isMattress && isHeightCharacteristic(field.name)) {
      return hasExistingValue || manualNames.has(norm);
    }
    if (field.active === false) {
      return hasExistingValue || manualNames.has(norm);
    }
    if (isProductTechnicalFieldRequired(field, categoryIds)) return true;
    if (hasExistingValue) return true;
    if (manualNames.has(norm)) return true;
    return Boolean(field.categoryIds?.some((id: string) => activeCategories.has(String(id))));
  });

  const depthField = applicable.find((field) => isDepthCharacteristic(field.name));
  const lengthField = applicable.find((field) => isLengthCharacteristic(field.name));

  if (depthField && lengthField) {
    const activeName = resolveActiveDepthOrLengthField(
      depthField,
      lengthField,
      values,
      manualNames
    );

    applicable = applicable.filter((field) => {
      if (isDepthCharacteristic(field.name) || isLengthCharacteristic(field.name)) {
        return normalizeName(field.name) === activeName;
      }
      return true;
    });
  }

  return applicable.map((field) => ({
    ...field,
    isRequired: isProductTechnicalFieldRequired(field, categoryIds),
    decimal_places:
      isWeightCharacteristicName(field.name) || field.data_type === 'weight'
        ? 1
        : field.decimal_places,
  }));
};

// ============================================================================
// 6. TOPIC GROUPING & CANONICAL ORDERING
// ============================================================================

/** Agrupa os campos como no ERP e mantém a ordem canônica das dimensões. */
export const groupProductTechnicalFields = <T extends ProductTechnicalField>(
  fields: readonly T[]
): ProductTechnicalFieldGroup<T>[] => {
  const groups = new Map<string, T[]>();
  const otherFields: T[] = [];

  fields.forEach((field) => {
    if (field.isCustom === true || field.is_custom === true) {
      otherFields.push(field);
      return;
    }
    const topic = CHARACTERISTIC_TOPICS.find((candidate) => candidate.matches.test(field.name));
    if (!topic) {
      otherFields.push(field);
      return;
    }
    groups.set(topic.title, [...(groups.get(topic.title) || []), field]);
  });

  return [
    ...CHARACTERISTIC_TOPICS.flatMap(({ title }) => {
      const groupedFields = groups.get(title);
      if (!groupedFields?.length) return [];
      if (title === 'Medidas e peso' || title === 'Dimensões e peso') {
        groupedFields.sort((left, right) => getDimensionSortRank(left.name) - getDimensionSortRank(right.name));
      }
      return [{ title, fields: groupedFields }];
    }),
    ...(otherFields.length ? [{ title: 'Outras características', fields: otherFields }] : []),
  ];
};

// ============================================================================
// 7. VALIDATION & MISSING FIELDS HELPERS
// ============================================================================

export const getMissingRequiredCharacteristics = (values: Record<string, unknown> = {}) => {
  return REQUIRED_CHARACTERISTIC_NAMES.filter((name) => {
    const value = String(getTechnicalValue(values, name) ?? '')
      .trim()
      .toLocaleLowerCase('pt-BR');
    return !value || ['não se aplica', 'nao se aplica', 'n/a'].includes(value);
  });
};

export const getMissingRequiredDimensions = (
  values: Record<string, unknown> = {},
  directDimensions?: { width?: number; height?: number; depth?: number },
  options?: { isMattress?: boolean }
) => {
  const isPositive = (val: unknown): boolean => {
    if (typeof val === 'number') return Number.isFinite(val) && val > 0;
    if (typeof val === 'string' && val.trim()) {
      const num = Number(val.replace(',', '.'));
      return Number.isFinite(num) && num > 0;
    }
    return false;
  };

  const missing: string[] = [];
  if (!options?.isMattress) {
    if (
      !isPositive(directDimensions?.height) &&
      !isPositive(getTechnicalValue(values, 'altura total')) &&
      !isPositive(getTechnicalValue(values, 'altura'))
    ) {
      missing.push('Altura total');
    }
  } else {
    // Para colchões, a altura não é exigida; exige-se a espessura do colchão
    if (
      !isPositive(directDimensions?.height) &&
      !isPositive(getTechnicalValue(values, 'espessura do colchão')) &&
      !isPositive(getTechnicalValue(values, 'espessura'))
    ) {
      missing.push('Espessura do colchão');
    }
  }
  if (
    !isPositive(directDimensions?.width) &&
    !isPositive(getTechnicalValue(values, 'largura total')) &&
    !isPositive(getTechnicalValue(values, 'largura'))
  ) {
    missing.push('Largura total');
  }
  if (
    !isPositive(directDimensions?.depth) &&
    !isPositive(getTechnicalValue(values, 'profundidade total')) &&
    !isPositive(getTechnicalValue(values, 'profundidade')) &&
    !isPositive(getTechnicalValue(values, 'comprimento total')) &&
    !isPositive(getTechnicalValue(values, 'comprimento'))
  ) {
    missing.push('Profundidade total');
  }
  return missing;
};
