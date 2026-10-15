import type { Variation } from '../types/product.type';

// ============================================================================
// 1. TYPES & INTERFACES
// ============================================================================

export interface TechnicalFieldDefinition {
  id: string;
  name: string; // Ex: "Cor", "Quantidade de portas"
  dataType:
    | 'list'
    | 'integer'
    | 'decimal'
    | 'text'
    | 'text_short'
    | 'text_long'
    | 'radio'
    | 'multi_select'
    | 'boolean'
    | 'measure'
    | 'number'
    | 'weight'
    | 'percentage';
  unit?: string; // Ex.: "g", "cm", "mm" ou "m"
  decimalPlaces?: 1 | 2 | 3;
  active?: boolean;
  isRequired?: boolean;
  isCustom?: boolean;
  displayOrder?: number;
  includeInName?: boolean;
  nameOrder?: number;
  options: Array<{ id: string; value: string }>;
  categoryIds?: string[];
  requiredCategoryIds?: string[];
}

export interface TechnicalFieldGroup {
  title: string;
  fields: TechnicalFieldDefinition[];
}

export interface CharacteristicGroup<T extends { name: string }> {
  title: string;
  fields: T[];
}

export type TechnicalValuesMap = Record<string, any>;

// ============================================================================
// 2. CONSTANTS & TOPIC DEFINITIONS
// ============================================================================

export const REQUIRED_CHARACTERISTICS_TOPIC = 'Características principais';

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
  { title: 'Materiais e acabamento', matches: /\b(material|acabamento|madeira|metal|vidro)\b/i },
];

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

export const PRIMARY_CHARACTERISTIC_NAMES = [
  ...GLOBAL_REQUIRED_ATTRIBUTE_NAMES,
  'Comprimento total',
  'Comprimento',
] as const;

export const MATTRESS_CATEGORY_ID = '3b616449-7d0c-40fc-9917-70a20836f3b8';

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

export const normalizeCharacteristicName = (name: string): string =>
  name.trim().toLocaleLowerCase('pt-BR');

export const isDepthCharacteristic = (name: string): boolean => {
  const norm = normalizeCharacteristicName(name);
  return norm === 'profundidade' || norm === 'profundidade total';
};

export const isLengthCharacteristic = (name: string): boolean => {
  const norm = normalizeCharacteristicName(name);
  return norm === 'comprimento' || norm === 'comprimento total';
};

export const isHeightCharacteristic = (name: string): boolean => {
  const norm = normalizeCharacteristicName(name);
  return norm === 'altura' || norm === 'altura total';
};

export const isWidthCharacteristic = (name: string): boolean => {
  const norm = normalizeCharacteristicName(name);
  return norm === 'largura' || norm === 'largura total';
};

export const isThicknessCharacteristic = (name: string): boolean => {
  const norm = normalizeCharacteristicName(name);
  return norm === 'espessura' || norm === 'espessura do colchão';
};

export const isWeightCharacteristicName = (name: string): boolean =>
  normalizeCharacteristicName(name) === 'peso';

export const isExcludedCharacteristic = (name: string): boolean =>
  /^reclin[aá]vel$/i.test(name.trim());

export const isMattressCategory = (
  categoryIds: readonly string[] = [],
  allFields?: readonly TechnicalFieldDefinition[]
): boolean => {
  if (categoryIds.includes(MATTRESS_CATEGORY_ID)) return true;
  if (allFields) {
    const espessuraField = allFields.find(
      (f) => normalizeCharacteristicName(f.name) === 'espessura do colchão'
    );
    if (espessuraField?.categoryIds?.some((cid) => categoryIds.includes(cid))) {
      return true;
    }
  }
  return false;
};

export const isRequiredCharacteristicName = (name: string): boolean => {
  const normalized = normalizeCharacteristicName(name);
  if (isLengthCharacteristic(name)) return true;
  return GLOBAL_REQUIRED_ATTRIBUTE_NAMES.some(
    (requiredName) => normalizeCharacteristicName(requiredName) === normalized
  );
};

export const isPrimaryCharacteristicName = (name: string): boolean =>
  PRIMARY_CHARACTERISTIC_NAMES.some(
    (primaryName) => normalizeCharacteristicName(primaryName) === normalizeCharacteristicName(name)
  );

/**
 * Retorna se um valor é semanticamente definido (não é undefined ou null).
 * Preserva 0, false e strings vazias intencionais.
 */
export const isDefined = (val: any): boolean => {
  return val !== undefined && val !== null;
};

// ============================================================================
// 4. DIMENSION SORTING & TOPIC GROUPING
// ============================================================================

export const getDimensionSortRank = (name: string): number => {
  const norm = normalizeCharacteristicName(name);
  return DIMENSIONS_SORT_ORDER[norm] ?? 99;
};

/** Organiza características por tópicos de apresentação, sem alterar valores ou identificadores persistidos. */
export const groupCharacteristicsByTopic = <
  T extends { name: string; isCustom?: boolean; isRequired?: boolean },
>(
  fields: readonly T[]
): CharacteristicGroup<T>[] => {
  const groups = new Map<string, T[]>();
  const requiredCharacteristicFields: T[] = [];
  const otherFields: T[] = [];

  fields.forEach((field) => {
    if (
      !isWeightCharacteristicName(field.name) &&
      (field.isRequired === true || isPrimaryCharacteristicName(field.name))
    ) {
      requiredCharacteristicFields.push(field);
      return;
    }

    if (field.isCustom === true) {
      otherFields.push(field);
      return;
    }
    const topic = CHARACTERISTIC_TOPICS.find((candidate) => candidate.matches.test(field.name));
    if (topic) {
      const groupedFields = groups.get(topic.title) || [];
      groupedFields.push(field);
      groups.set(topic.title, groupedFields);
    } else {
      otherFields.push(field);
    }
  });

  return [
    ...(requiredCharacteristicFields.length > 0
      ? [{ title: REQUIRED_CHARACTERISTICS_TOPIC, fields: requiredCharacteristicFields }]
      : []),
    ...CHARACTERISTIC_TOPICS.flatMap((topic) => {
      const groupedFields = groups.get(topic.title);
      if (!groupedFields?.length) return [];

      if (topic.title === 'Medidas e peso' || topic.title === 'Dimensões e peso') {
        groupedFields.sort((a, b) => getDimensionSortRank(a.name) - getDimensionSortRank(b.name));
      }

      return [{ title: topic.title, fields: groupedFields }];
    }),
    ...(otherFields.length > 0 ? [{ title: 'Outras características', fields: otherFields }] : []),
  ];
};

/** Agrupa as características para manter a mesma organização no pai e nas variações. */
export const groupTechnicalFields = <T extends { name: string; isCustom?: boolean }>(
  fields: readonly T[]
): CharacteristicGroup<T>[] => groupCharacteristicsByTopic(fields);

// ============================================================================
// 5. VALIDATION & MISSING FIELDS HELPERS
// ============================================================================

export const getMissingRequiredCharacteristics = (values: TechnicalValuesMap = {}): string[] => {
  const valuesByName = new Map<string, unknown>();
  Object.entries(values).forEach(([name, value]) => {
    valuesByName.set(normalizeCharacteristicName(name), value);
  });

  return REQUIRED_CHARACTERISTIC_NAMES.filter((name) => {
    const value = String(valuesByName.get(normalizeCharacteristicName(name)) ?? '')
      .trim()
      .toLocaleLowerCase('pt-BR');
    return !value || ['não se aplica', 'nao se aplica', 'n/a'].includes(value);
  });
};

export const getMissingRequiredDimensions = (
  values: TechnicalValuesMap = {},
  directDimensions?: { width?: number; height?: number; depth?: number },
  options?: { isMattress?: boolean }
): string[] => {
  const valuesByName = new Map<string, unknown>();
  Object.entries(values).forEach(([name, value]) => {
    valuesByName.set(normalizeCharacteristicName(name), value);
  });

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
      !isPositive(valuesByName.get('altura total')) &&
      !isPositive(valuesByName.get('altura'))
    ) {
      missing.push('Altura total');
    }
  } else {
    // Para colchões, a altura não é solicitada; exige-se a espessura do colchão
    if (
      !isPositive(directDimensions?.height) &&
      !isPositive(valuesByName.get('espessura do colchão')) &&
      !isPositive(valuesByName.get('espessura'))
    ) {
      missing.push('Espessura do colchão');
    }
  }
  if (
    !isPositive(directDimensions?.width) &&
    !isPositive(valuesByName.get('largura total')) &&
    !isPositive(valuesByName.get('largura'))
  ) {
    missing.push('Largura total');
  }
  if (
    !isPositive(directDimensions?.depth) &&
    !isPositive(valuesByName.get('profundidade total')) &&
    !isPositive(valuesByName.get('profundidade')) &&
    !isPositive(valuesByName.get('comprimento total')) &&
    !isPositive(valuesByName.get('comprimento'))
  ) {
    missing.push('Profundidade total');
  }
  return missing;
};

export const getMissingRequiredTechnicalFields = (
  requiredFieldNames: readonly string[],
  values: TechnicalValuesMap = {}
): string[] => requiredFieldNames.filter((name) => !String(values[name] ?? '').trim());

// ============================================================================
// 6. VARIATION OVERRIDES & EFFECTIVE VALUE RESOLUTION
// ============================================================================

export const getEffectiveVariationTechnicalValues = (
  parentValues: TechnicalValuesMap = {},
  variation?: Pick<Variation, 'attributes' | 'technicalValues'> | null
): TechnicalValuesMap => {
  const legacyCharacteristicValues = (variation?.attributes || []).reduce<TechnicalValuesMap>(
    (values, characteristic) => {
      if (characteristic.name?.trim() && characteristic.value?.trim()) {
        values[characteristic.name] = characteristic.value;
      }
      return values;
    },
    {}
  );
  const variationCharacteristicValues = Object.fromEntries(
    Object.entries(variation?.technicalValues || {}).filter(
      ([, value]) => value !== undefined && value !== null
    )
  );

  return {
    ...parentValues,
    ...legacyCharacteristicValues,
    ...variationCharacteristicValues,
  };
};

/**
 * Resolve o valor efetivo de uma Especificação Técnica para uma variação.
 * Regra: valor efetivo = override da variação ?? valor do produto pai.
 * Respeita estritamente valores falsy intencionais como 0, false e "".
 */
export const getEffectiveTechnicalValue = (
  parentValues: TechnicalValuesMap = {},
  variationOverrides: TechnicalValuesMap = {},
  fieldKeyOrName: string
): any => {
  if (!fieldKeyOrName) return undefined;

  // 1. Tentar override direto na variação
  if (Object.prototype.hasOwnProperty.call(variationOverrides, fieldKeyOrName)) {
    const overrideVal = variationOverrides[fieldKeyOrName];
    if (isDefined(overrideVal)) {
      return overrideVal;
    }
  }

  // 2. Fallback para valor padrão do produto pai
  if (Object.prototype.hasOwnProperty.call(parentValues, fieldKeyOrName)) {
    const parentVal = parentValues[fieldKeyOrName];
    if (isDefined(parentVal)) {
      return parentVal;
    }
  }

  return undefined;
};

/**
 * Verifica se a variação tem um override ativo para o campo.
 */
export const hasVariationOverride = (
  variationOverrides: TechnicalValuesMap = {},
  fieldKeyOrName: string
): boolean => {
  return (
    Object.prototype.hasOwnProperty.call(variationOverrides, fieldKeyOrName) &&
    isDefined(variationOverrides[fieldKeyOrName])
  );
};

/**
 * Remove o override de uma variação, fazendo com que ela volte a herdar o valor do pai.
 */
export const removeVariationOverride = (
  variationOverrides: TechnicalValuesMap = {},
  fieldKeyOrName: string
): TechnicalValuesMap => {
  const updated = { ...variationOverrides };
  delete updated[fieldKeyOrName];
  return updated;
};

/**
 * Define um override específico na variação.
 */
export const setVariationOverride = (
  variationOverrides: TechnicalValuesMap = {},
  fieldKeyOrName: string,
  value: any
): TechnicalValuesMap => {
  return {
    ...variationOverrides,
    [fieldKeyOrName]: value,
  };
};

/**
 * Compara se duas combinações de Especificações Técnicas são efetivamente idênticas.
 */
export const areEffectiveValuesEqual = (
  fields: TechnicalFieldDefinition[],
  valuesA: TechnicalValuesMap,
  valuesB: TechnicalValuesMap
): boolean => {
  for (const field of fields) {
    const valA = valuesA[field.name];
    const valB = valuesB[field.name];

    if (
      String(valA ?? '')
        .trim()
        .toLowerCase() !==
      String(valB ?? '')
        .trim()
        .toLowerCase()
    ) {
      return false;
    }
  }
  return true;
};

/**
 * Valida se uma variação possui ao menos UMA informação técnica efetivamente diferente do pai.
 */
export const hasEffectiveDifferenceFromParent = (
  fields: TechnicalFieldDefinition[],
  parentValues: TechnicalValuesMap = {},
  variationEffectiveValues: TechnicalValuesMap = {}
): boolean => {
  for (const field of fields) {
    const parentVal = parentValues[field.name];
    const varVal = variationEffectiveValues[field.name];

    const normParent = String(parentVal ?? '')
      .trim()
      .toLowerCase();
    const normVar = String(varVal ?? '')
      .trim()
      .toLowerCase();

    if (normParent !== normVar) {
      return true;
    }
  }
  return false;
};

// ============================================================================
// 7. VARIATION NAME COMPOSITION & VALUE FORMATTING
// ============================================================================

/**
 * Formata um valor de campo técnico para exibição no nome do produto/variação.
 * Trata booleanos (ex: "Com Espelho"), números com unidade (ex: "6 Portas", "2.10m").
 */
export const formatValueForName = (field: TechnicalFieldDefinition, value: any): string => {
  if (!isDefined(value)) return '';

  if (field.dataType === 'boolean') {
    if (value === true || String(value) === 'true') {
      return `Com ${field.name}`;
    }
    return '';
  }

  const isWeight = isWeightCharacteristicName(field.name) || field.dataType === 'weight';
  const rawValue = String(value).trim();
  const strVal =
    (field.dataType === 'decimal' || isWeight) && Number.isFinite(Number(value))
      ? Number(value)
          .toFixed(isWeight ? 1 : (field.decimalPlaces ?? 2))
          .replace('.', ',')
      : rawValue;
  if (!strVal) return '';

  if (field.unit) {
    return `${strVal} ${field.unit}`;
  }

  return strVal;
};

/**
 * Gera automaticamente o nome da variação combinando o nome do produto pai com as
 * Especificações Técnicas configuradas para compor o nome.
 */
export const computeEffectiveVariationName = (
  parentName: string,
  fields: TechnicalFieldDefinition[],
  effectiveValues: TechnicalValuesMap
): string => {
  const cleanParent = parentName ? parentName.trim() : '';

  // Filtrar campos marcados para inclusão no nome e ordenar
  const nameFields = fields
    .filter((f) => f.includeInName !== false)
    .sort((a, b) => (a.nameOrder ?? 10) - (b.nameOrder ?? 10));

  const parts: string[] = [];
  if (cleanParent) {
    parts.push(cleanParent);
  }

  for (const field of nameFields) {
    const val = effectiveValues[field.name];
    const formatted = formatValueForName(field, val);
    if (formatted) {
      parts.push(formatted);
    }
  }

  return parts.join(' ').replace(/\s+/g, ' ').trim();
};

// ============================================================================
// 8. APPLICABLE FIELDS & FORM SELECTION
// ============================================================================

/**
 * Resolve a exclusividade mútua entre Profundidade (total) e Comprimento (total).
 * Determina qual das duas características deve permanecer ativa no formulário.
 */
export const resolveActiveDepthOrLengthField = (
  depthField: TechnicalFieldDefinition,
  lengthField: TechnicalFieldDefinition,
  technicalValues: TechnicalValuesMap,
  manualSet: ReadonlySet<string>
): string => {
  const valDepth = String(technicalValues[depthField.name] ?? '').trim();
  const valLength = String(technicalValues[lengthField.name] ?? '').trim();

  if (manualSet.has(lengthField.name) && !manualSet.has(depthField.name)) {
    return lengthField.name;
  }
  if (manualSet.has(depthField.name) && !manualSet.has(lengthField.name)) {
    return depthField.name;
  }
  if (valLength && !valDepth) {
    return lengthField.name;
  }
  if (valDepth && !valLength) {
    return depthField.name;
  }
  if (
    Object.prototype.hasOwnProperty.call(technicalValues, lengthField.name) &&
    !Object.prototype.hasOwnProperty.call(technicalValues, depthField.name)
  ) {
    return lengthField.name;
  }

  return depthField.name;
};

/**
 * Determina a lista de campos técnicos que devem ser exibidos no formulário do produto.
 *
 * Regras:
 * 1. Requisitos obrigatórios do sistema e campos vinculados às categorias atuais são incluídos automaticamente.
 * 2. Qualquer campo que já tenha valor cadastrado/ativo no produto (mesmo vazio intencional ou manual)
 *    é preservado e incluído, garantindo que dados nunca se percam ao mudar categorias.
 * 3. Campos adicionados manualmente pelo usuário no produto atual são incluídos.
 * 4. Por padrão, NENHUM campo que não pertença às categorias do produto entra automaticamente.
 */
export const getApplicableTechnicalFields = (
  allFields: readonly TechnicalFieldDefinition[] = [],
  productCategoryIds: readonly string[] = [],
  productTechnicalValues: TechnicalValuesMap = {},
  manuallyAddedFieldNames: readonly string[] = []
): TechnicalFieldDefinition[] => {
  const safeFields = Array.isArray(allFields) ? allFields : [];
  const activeCategorySet = new Set(productCategoryIds);
  const manualSet = new Set(manuallyAddedFieldNames);
  const isMattress = isMattressCategory(productCategoryIds, safeFields);

  const isRequiredForProduct = (field: TechnicalFieldDefinition): boolean => {
    if (isWeightCharacteristicName(field.name)) return false;
    const normalizedName = normalizeCharacteristicName(field.name);

    // Para colchões, a altura não é obrigatória nem solicitada; usa-se espessura do colchão
    if (isMattress && isHeightCharacteristic(field.name)) {
      return false;
    }
    if (isMattress && normalizedName === 'espessura do colchão') {
      return true;
    }
    return Boolean(
      field.isRequired ||
        field.requiredCategoryIds?.some((categoryId) => activeCategorySet.has(categoryId))
    );
  };

  let applicable = safeFields.filter((field) => {
    if (isExcludedCharacteristic(field.name)) return false;

    const hasExistingValue = Object.prototype.hasOwnProperty.call(
      productTechnicalValues,
      field.name
    );

    // Se for colchão, "Altura / Altura total" não deve ser oferecida automaticamente (apenas Espessura do colchão)
    if (isMattress && isHeightCharacteristic(field.name)) {
      return hasExistingValue || manualSet.has(field.name);
    }

    // Campos inativos deixam de ser oferecidos em novos produtos, mas continuam visíveis
    // quando já possuem um valor no cadastro em edição para preservar o dado existente.
    if (field.active === false) {
      return hasExistingValue || manualSet.has(field.name);
    }

    // Requisitos obrigatórios do sistema continuam visíveis, independentemente da categoria.
    if (isRequiredForProduct(field)) return true;

    // Se já está ativo ou preenchido no produto atual, SEMPRE inclui para preservar dados
    if (hasExistingValue) {
      return true;
    }

    // Se foi adicionado manualmente nesta sessão do formulário, inclui
    if (manualSet.has(field.name)) {
      return true;
    }

    // Se o campo tem categorias vinculadas, inclui se coincide com qualquer categoria do produto
    if (field.categoryIds && field.categoryIds.length > 0) {
      return field.categoryIds.some((catId: string) => activeCategorySet.has(catId));
    }

    // Por padrão, se não possui categoria vinculada, NÃO entra automaticamente na lista
    return false;
  });

  // Exclusividade Profundidade vs Comprimento
  const depthField = applicable.find((f) => isDepthCharacteristic(f.name));
  const lengthField = applicable.find((f) => isLengthCharacteristic(f.name));

  if (depthField && lengthField) {
    const activeName = resolveActiveDepthOrLengthField(
      depthField,
      lengthField,
      productTechnicalValues,
      manualSet
    );

    applicable = applicable.filter((f) => {
      if (isDepthCharacteristic(f.name) || isLengthCharacteristic(f.name)) {
        return f.name === activeName;
      }
      return true;
    });
  }

  return applicable.map((field) => {
    const isWeight = isWeightCharacteristicName(field.name) || field.dataType === 'weight';
    return {
      ...field,
      isRequired: isRequiredForProduct(field),
      decimalPlaces: isWeight ? 1 : field.decimalPlaces,
    };
  });
};

/**
 * Retorna as Especificações Técnicas que ainda NÃO foram adicionadas ao produto atual,
 * permitindo que sejam listadas no botão '+ Adicionar Especificação Técnica'.
 */
export const getAvailableAdditionalFields = (
  allFields: readonly TechnicalFieldDefinition[] = [],
  currentlyVisibleFields: readonly TechnicalFieldDefinition[] = []
): TechnicalFieldDefinition[] => {
  const safeAll = Array.isArray(allFields) ? allFields : [];
  const safeVisible = Array.isArray(currentlyVisibleFields) ? currentlyVisibleFields : [];
  const visibleNames = new Set(safeVisible.map((f) => f.name.toLowerCase().trim()));
  return safeAll.filter(
    (f) =>
      f.active !== false &&
      !visibleNames.has(f.name.toLowerCase().trim()) &&
      !isExcludedCharacteristic(f.name)
  );
};
