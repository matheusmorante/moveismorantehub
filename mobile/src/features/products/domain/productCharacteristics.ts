/**
 * productCharacteristics.ts
 *
 * Módulo de domínio para gestão, validação, serialização e agrupamento
 * de características e especificações técnicas de produtos no aplicativo mobile.
 *
 * Princípios aplicados:
 * - Single Responsibility Principle (SRP): Isolamento entre predicados de domínio,
 *   parsing/serialização de características legadas/atuais, ordenação e regras de aplicabilidade.
 * - DRY (Don't Repeat Yourself): Predicados canônicos centralizados para medidas, colchões e peso.
 * - Sincronização e consistência conceitual com o ERP (`technicalValuesService.ts`).
 */

import {
  isConcretadaCharacteristic,
  isHasInoxBowlCharacteristic,
  isSinkCategory,
  isSinkMaterialCharacteristic,
  isStructureMaterialCharacteristic,
} from '../../../../../shared-utils/productSinkCategoryRules';
import {
  getCharacteristicDependencyState,
  isDependentCharacteristicVisible,
  isCharacteristicDependent,
  isCharacteristicDependentOnVariableField,
} from '../../../../../shared-utils/productCharacteristicDependencies';
import {
  evaluateCharacteristicDependency,
  evaluateCharacteristicDependencies,
  getCharacteristicDependencies,
} from '../../../../../shared-utils/characteristicDependencyRules';
import {
  findProductTechnicalValueEntry,
  deduplicateProductTechnicalValueAliasFields,
  getProductTechnicalValueCandidateKeys,
} from '../../../../../shared-utils/productTechnicalValueAliases';
import { getTechnicalFieldDisplayName } from '../../../../../shared-utils/productTechnicalFieldScope';
import {
  removeProductVariationTechnicalAttribute,
  syncProductVariationTechnicalAttribute,
} from '../../../../../shared-utils/productVariationTechnicalAttributes';
import {
  isProductTechnicalAttributeRequiredByCategories,
} from '../../../../../shared-utils/productCategoryRequiredAttributes';
import {
  isChairWeightCapacityCharacteristic,
  isShelfWeightCapacityCharacteristic,
  isWeightCharacteristicName,
  isWeightCapacityCharacteristic,
} from '../../../../../shared-utils/productTechnicalFieldRules';
import { resolveProductCharacteristicApplication } from '../../../../../shared-utils/productCharacteristicApplications';
import { sortProductCharacteristicGroups } from '../../../../../shared-utils/productCharacteristicGroupOrder';
export { isWeightCharacteristicName } from '../../../../../shared-utils/productTechnicalFieldRules';

// ============================================================================
// 1. TYPES & INTERFACES
// ============================================================================

export interface ProductCharacteristicAttribute {
  name: string;
  value: unknown;
  showName: boolean;
}

export interface ProductTechnicalCharacteristicDependency {
  referenceAttributeId: string;
  operator:
    | 'contains'
    | 'not_contains'
    | 'equals'
    | 'not_equals'
    | 'greater_than'
    | 'greater_or_equal'
    | 'less_than'
    | 'less_or_equal';
  value: string;
}

export interface ProductTechnicalField {
  id?: string;
  name: string;
  active?: boolean | null;
  isRequired?: boolean;
  isRequiredForProduct?: boolean;
  isRequiredForCatalog?: boolean;
  is_globally_required?: boolean;
  requiredForCategory?: boolean;
  requiredCategoryIds?: readonly string[];
  isCustom?: boolean;
  is_custom?: boolean;
  categoryIds?: readonly string[];
  groupId?: string;
  groupName?: string;
  categoryApplications?: readonly {
    categoryId: string;
    application: 'unavailable' | 'optional' | 'required';
  }[];
  decimal_places?: 1 | 2 | 3 | null;
  data_type?: string | null;
  dependency?: ProductTechnicalCharacteristicDependency | null;
  dependencyAlternatives?: readonly ProductTechnicalCharacteristicDependency[];
  dependencyLogic?: 'all' | 'any';
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
  'Peso',
] as const;

export const MATTRESS_CATEGORY_ID = '3b616449-7d0c-40fc-9917-70a20836f3b8';

export const CHARACTERISTIC_TOPICS: ReadonlyArray<{ title: string; matches: RegExp }> = [
  {
    title: 'Medidas e peso',
    matches:
      /\b(altura|largura|profundidade|comprimento|espessura|assento)\b|\bpeso\b(?!.*\b(?:prateleira|gaveta|suportad[oa])\b)/i,
  },
  {
    title: 'Estrutura',
    matches: /\b(estrutura|material da estrutura)\b|\bpeso\b(?!.*\b(?:prateleira|gaveta)\b).*\bsuportad[oa]\b/i,
  },
  { title: 'Portas', matches: /\b(portas?)\b/i },
  { title: 'Gavetas', matches: /\b(gavetas?|corredi[çc]as?)\b/i },
  { title: 'Prateleiras', matches: /\b(prateleiras?)\b/i },
  { title: 'Pés', matches: /\b(p[eé]s?|rod[ií]zios?)\b/i },
  { title: 'Tecido e revestimento', matches: /\b(tecido|revestimento|espuma|densidade|estofad)/i },
  {
    title: 'Funcionalidades',
    matches:
      /\b(espelhos?|deslizamento|mecanismo|retr[aá]til|extens[íi]vel|cabideiros?|calceiros?|maleiros?|usb|led)\b/i,
  },
  { title: 'Acessórios', matches: /\b(puxador(es)?)\b/i },
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
  'espessura do tampo': 2,
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
};

/** Sequência canônica de exibição das portas */
export const DOORS_SORT_ORDER: Readonly<Record<string, number>> = {
  'possui portas': 1,
  'possui porta': 1,
  'possui portas?': 1,
  'possui porta?': 1,
  'quantidade de portas': 2,
  'quantidade de porta': 2,
  'tipo de portas': 3,
  'tipo de porta': 3,
  'material das portas': 4,
  'material da porta': 4,
};

/** Sequência canônica de exibição das gavetas */
export const DRAWERS_SORT_ORDER: Readonly<Record<string, number>> = {
  'possui gavetas': 1,
  'possui gaveta': 1,
  'possui gavetas?': 1,
  'possui gaveta?': 1,
  'quantidade de gavetas': 2,
  'quantidade de gaveta': 2,
  'materiais das corrediças': 3,
  'material das corrediças': 3,
  'material da corrediça': 3,
  'tipo/material da corrediça': 3,
  'tipo/material das corrediças': 3,
  'tipo de corrediça': 3,
  'tipo de corrediças': 3,
  corrediça: 3,
  corrediças: 3,
  'material das gavetas': 4,
  'material da gaveta': 4,
  'gavetas com chave': 5,
};

/** Sequência canônica de exibição das prateleiras */
export const SHELVES_SORT_ORDER: Readonly<Record<string, number>> = {
  'quantidade de prateleiras': 1,
  'material das prateleiras': 2,
  'peso suportado por prateleira': 3,
  'peso suportado': 3,
};

/** Sequência canônica de exibição dos pés */
export const FEET_SORT_ORDER: Readonly<Record<string, number>> = {
  'possui pés': 1,
  'possui pés?': 1,
  'quantidade de pés': 2,
  'material dos pés': 3,
  'pés reguláveis': 4,
  'os pés são reguláveis?': 4,
  rodízios: 5,
  'possui rodízios?': 5,
};

/** Sequência canônica de exibição dos acessórios */
export const ACCESSORIES_SORT_ORDER: Readonly<Record<string, number>> = {
  'tipo de puxador': 1,
  'material dos puxadores': 2,
  'material do puxador': 2,
  'quantidade de puxadores': 3,
};

// ============================================================================
// 3. DOMAIN PREDICATES & VALUE NORMALIZERS
// ============================================================================

export const normalizeName = (name: string): string =>
  String(name || '')
    .trim()
    .toLocaleLowerCase('pt-BR');

const normalizeTechnicalSearchText = (value: unknown) =>
  String(value ?? '')
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
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
  return norm === 'espessura' || norm === 'espessura do colchão' || norm === 'espessura do tampo';
};

export const getProductTechnicalFieldDisplayName = (name: string): string =>
  isShelfWeightCapacityCharacteristic(name)
    ? 'Peso suportado por prateleira'
    : getTechnicalFieldDisplayName(name);

const isChairCategoryName = (name: string): boolean => {
  const normalized = String(name || '')
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR');
  return /(?:^|[^a-z0-9])cadeiras?(?=$|[^a-z0-9])/i.test(normalized);
};

export const isProductTechnicalFieldApplicableByCategory = (
  field: ProductTechnicalField,
  categoryIds: readonly string[] = [],
  categoryName = ''
): boolean => {
  if (!isChairWeightCapacityCharacteristic(field.name)) return true;
  if (isChairCategoryName(categoryName)) return true;
  const selectedCategoryIds = new Set(categoryIds.map(String));
  return Boolean(field.categoryIds?.some((id) => selectedCategoryIds.has(String(id))));
};

/** Mantém os campos operacionais/redundantes Reclinável, Linha e Modelo (isolado) ocultos, conforme a regra canônica do ERP. */
export const isExcludedProductTechnicalField = (name: string): boolean =>
  /^(reclin[aá]vel|linha|modelo)$/i.test(String(name || '').trim());

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
  if (
    normalized === 'modelo/linha' ||
    normalized === 'modelo / linha' ||
    normalized === 'linha/modelo' ||
    normalized === 'linha / modelo'
  ) {
    return true;
  }
  return GLOBAL_REQUIRED_ATTRIBUTE_NAMES.some(
    (requiredName) => normalizeName(requiredName) === normalized
  );
};

export const isProductTechnicalFieldRequired = (
  field: ProductTechnicalField,
  categoryIds: readonly string[] = [],
  _categoryName = ''
): boolean => {
  if (Array.isArray(field.categoryApplications)) {
    return resolveProductCharacteristicApplication(field, categoryIds) === 'required';
  }
  if (isWeightCapacityCharacteristic(field.name)) return false;
  if (isWeightCharacteristicName(field.name)) return true;

  return (
    (field.isRequiredForProduct ?? field.isRequired) === true ||
    isRequiredCharacteristicName(field.name)
  );
};

export const isProductTechnicalFieldRequiredForCatalog = (
  field: ProductTechnicalField,
  categoryIds: readonly string[] = [],
  _categoryName = ''
): boolean =>
  !isWeightCapacityCharacteristic(field.name) &&
  (field.requiredForCategory === true ||
    isProductTechnicalAttributeRequiredByCategories(field.requiredCategoryIds, categoryIds));

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
  if (Object.prototype.hasOwnProperty.call(structured, 'value')) return structured.value;
  return structured.val;
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
      .filter(([name, value]) => normalizeName(name) && value !== undefined)
      .map(([name, value]) => [normalizeName(name), value])
  );

/** Lê os formatos atuais e legados de características sem perder a preferência showName. */
export const getProductCharacteristicAttributes = (
  rawAttributes: unknown
): ProductCharacteristicAttribute[] => {
  const attributes = parseJson(rawAttributes);

  if (Array.isArray(attributes)) {
    return attributes
      .map((attribute: any) => ({
        name: String(attribute?.name || attribute?.attribute || attribute?.key || '').trim(),
        value: Object.prototype.hasOwnProperty.call(attribute ?? {}, 'value')
          ? attribute.value
          : attribute?.val,
        showName: attribute?.showName !== false,
      }))
      .filter(
        (attribute) => attribute.name && attribute.value !== undefined
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
        (attribute) => attribute.name && attribute.value !== undefined
      );
  }

  return [];
};

/** Mirrors ERP's parent color summary derived from variation attributes. */
export const getMobileVariationColorSummary = (variations: readonly unknown[] = []): string => {
  const colors = new Set<string>();
  variations.forEach((variation: any) => {
    getProductCharacteristicAttributes(variation?.attributes).forEach((attribute) => {
      if (attribute.name.toUpperCase() === 'COR' && attribute.value) {
        colors.add(String(attribute.value).toUpperCase());
      }
    });
  });
  return Array.from(colors).join(' / ');
};

/** Atualiza valor sem apagar a opção de ocultar a característica do nome da variação. */
export const upsertProductCharacteristicAttribute = (
  rawAttributes: unknown,
  name: string,
  value: unknown,
  defaultShowName = true
): ProductCharacteristicAttribute[] => {
  const next = getProductCharacteristicAttributes(rawAttributes);
  return syncProductVariationTechnicalAttribute(next, name, value, defaultShowName);
};

export const removeProductCharacteristicAttribute = (
  rawAttributes: unknown,
  name: string
): ProductCharacteristicAttribute[] =>
  removeProductVariationTechnicalAttribute(getProductCharacteristicAttributes(rawAttributes), name);

/** Valores do produto pai: características legadas e, depois, technicalValues como fonte prioritária. */
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

const normalizeVariableFieldName = (value: unknown) =>
  String(value || '')
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR');

const variableFieldAliases = (value: unknown) => {
  return getProductTechnicalValueCandidateKeys(String(value || '')).map((candidate) =>
    normalizeVariableFieldName(candidate).replace(/\s/g, '')
  );
};

export const isMobileVariableTechnicalField = (
  fieldName: string,
  variableFieldNames: readonly string[] = []
) => {
  const candidates = new Set(variableFieldAliases(fieldName));
  return variableFieldNames.some((name) =>
    variableFieldAliases(name).some((candidate) => candidates.has(candidate))
  );
};

/** Dependentes variam junto da mestre, como no formulário ERP de variação. */
export const isMobileProductFormTechnicalFieldVariable = (
  fieldName: string,
  variableFieldNames: readonly string[] = []
): boolean =>
  isCharacteristicDependent(fieldName)
    ? isCharacteristicDependentOnVariableField(fieldName, variableFieldNames)
    : isMobileVariableTechnicalField(fieldName, variableFieldNames);

/** Uses the persisted scope list, or infers legacy variability from child overrides. */
export const resolveMobileVariableTechnicalFieldNames = (product: any = {}): string[] => {
  const configured =
    product.variableTechnicalFields ?? product.technical_specs?.variableTechnicalFields;
  if (Array.isArray(configured)) return configured.filter((name): name is string => typeof name === 'string');

  const names = new Map<string, string>();
  const addName = (rawName: unknown) => {
    const name = String(rawName || '').trim();
    const key = normalizeVariableFieldName(name);
    if (key && !names.has(key)) names.set(key, name);
  };
  for (const variation of product.variations || product.allVariations || []) {
    getProductCharacteristicAttributes(variation?.attributes).forEach(({ name }) => addName(name));
    Object.keys(toTechnicalValuesMap(variation?.technicalValues)).forEach(addName);
  }
  return [...names.values()];
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

  // Consolidar Modelo e Linha legados em Modelo/Linha
  const legacyModelOrLine =
    result['Modelo/Linha'] ??
    result['Linha/Modelo'] ??
    result['Modelo'] ??
    result['modelo'] ??
    result['Linha'] ??
    result['linha'] ??
    product?.line;

  if (
    legacyModelOrLine !== undefined &&
    legacyModelOrLine !== null &&
    String(legacyModelOrLine).trim() !== ''
  ) {
    if (!result['Modelo/Linha'] || String(result['Modelo/Linha']).trim() === '') {
      result['Modelo/Linha'] = legacyModelOrLine;
    }
  }
  delete result['Modelo'];
  delete result['modelo'];
  delete result['Linha'];
  delete result['linha'];

  return result;
};

/**
 * Mescla pai, características de versões antigas e sobrescritas da variação.
 * A variação vence, inclusive quando a sobrescrita foi definida como vazia.
 */
export const getEffectiveVariationTechnicalValues = (
  parentValues: Record<string, unknown> = {},
  variation: any = {},
  variableFieldNames?: readonly string[]
): Record<string, unknown> => {
  const isAllowed = (name: string) =>
    variableFieldNames === undefined ||
    isMobileVariableTechnicalField(name, variableFieldNames) ||
    isCharacteristicDependentOnVariableField(name, variableFieldNames);
  const variationAttributes = Object.fromEntries(
    getProductCharacteristicAttributes(variation?.attributes)
      .filter(({ name }) => isAllowed(name))
      .map(({ name, value }) => [name, value])
  );
  const variationTechnicalValues = Object.fromEntries(
    Object.entries(toTechnicalValuesMap(variation?.technicalValues)).filter(([name]) => isAllowed(name))
  );

  const variationValues = normalizeValues({
    ...variationAttributes,
    ...variationTechnicalValues,
  });
  const effectiveValues = normalizeValues({
    ...parentValues,
    ...variationAttributes,
    ...variationTechnicalValues,
  });
  const variationModelLine = findProductTechnicalValueEntry(variationValues, 'Modelo/Linha');
  if (variationModelLine && variationModelLine.value !== undefined && variationModelLine.value !== null) {
    effectiveValues[normalizeName('Modelo/Linha')] = variationModelLine.value;
  }
  return effectiveValues;
};

export const getTechnicalValue = (values: Record<string, unknown> = {}, name: string) => {
  return findProductTechnicalValueEntry(values, name)?.value;
};

/** Avalia as condições configuradas no cadastro de Características do ERP. */
export const isConfiguredProductTechnicalDependencySatisfied = (
  field: ProductTechnicalField,
  allFields: readonly ProductTechnicalField[],
  technicalValues: Record<string, unknown>,
  visited = new Set<string>()
): boolean => {
  const fieldKey = field.id || normalizeName(field.name);
  if (visited.has(fieldKey)) return false;
  const nextVisited = new Set(visited).add(fieldKey);
  const dependencies = getCharacteristicDependencies(field);
  if (!dependencies.length) return true;

  return evaluateCharacteristicDependencies(dependencies, field.dependencyLogic, (dependency) => {
    const reference = allFields.find(
      (candidate) => candidate.id === dependency.referenceAttributeId
    );
    const referenceKey = reference?.id || (reference ? normalizeName(reference.name) : '');
    if (!reference || !referenceKey || nextVisited.has(referenceKey)) return false;
    if (
      !isConfiguredProductTechnicalDependencySatisfied(
        reference,
        allFields,
        technicalValues,
        nextVisited
      )
    ) return false;

    return evaluateCharacteristicDependency(
      dependency,
      reference.data_type as Parameters<typeof evaluateCharacteristicDependency>[1],
      getTechnicalValue(technicalValues, reference.name)
    );
  });
};

/** Retorna o campo e a cadeia de referências que o formulário deve ativar junto dele. */
export const getProductTechnicalDependencyChain = <T extends ProductTechnicalField>(
  field: T,
  allFields: readonly T[]
): T[] => {
  const chain = new Map<string, T>();
  const visit = (candidate: T) => {
    const key = candidate.id || normalizeName(candidate.name);
    if (chain.has(key)) return;
    chain.set(key, candidate);
    getCharacteristicDependencies(candidate).forEach((dependency) => {
      const reference = allFields.find(
        (item) => item.id === dependency.referenceAttributeId
      );
      if (reference) visit(reference);
    });
  };
  visit(field);
  return [...chain.values()];
};

export const hasTechnicalValue = (values: Record<string, unknown> = {}, name: string) => {
  const candidates = new Set(
    getProductTechnicalValueCandidateKeys(name).map((candidate) => normalizeName(candidate))
  );
  return Object.keys(values).some((key) => candidates.has(normalizeName(key)));
};

/** Visibilidade de uma característica dependente opcional, equivalente ao ERP. */
export const isDependentProductTechnicalFieldActive = (
  fieldName: string,
  allFields: readonly Pick<ProductTechnicalField, 'name'>[],
  technicalValues: Record<string, unknown>,
  variableFieldNames: readonly string[] = []
): boolean => {
  const dependency = getCharacteristicDependencyState(fieldName, technicalValues);
  if (!dependency.isDependent || !dependency.masterFieldLabel) return false;

  const normalizedMasterName = normalizeName(dependency.masterFieldLabel);
  const masterField = allFields.find(
    (field) => normalizeName(field.name) === normalizedMasterName
  );
  const masterValue = masterField
    ? getTechnicalValue(technicalValues, masterField.name)
    : undefined;

  return isDependentCharacteristicVisible(dependency, {
    masterFieldExists: Boolean(masterField),
    masterIsVariable: masterField
      ? isMobileVariableTechnicalField(masterField.name, variableFieldNames)
      : false,
    masterIsSelected: masterValue !== undefined && masterValue !== null,
  });
};

export const getDisplayedOptionalProductTechnicalFields = (
  optionalFields: readonly ProductTechnicalField[],
  allFields: readonly Pick<ProductTechnicalField, 'name'>[],
  technicalValues: Record<string, unknown>,
  dependencyValues: Record<string, unknown> = technicalValues,
  variableFieldNames: readonly string[] = [],
  manualFieldNames: readonly string[] = []
): ProductTechnicalField[] =>
  optionalFields.filter((field) => {
    if (manualFieldNames.some((name) => normalizeName(name) === normalizeName(field.name))) {
      return true;
    }
    if (isCharacteristicDependent(field.name)) {
      return isDependentProductTechnicalFieldActive(
        field.name,
        allFields,
        dependencyValues,
        variableFieldNames
      );
    }

    if (!hasTechnicalValue(technicalValues, field.name)) return false;
    const value = String(getTechnicalValue(technicalValues, field.name) ?? '')
      .trim()
      .toLocaleLowerCase('pt-BR');
    return !['não se aplica', 'nao se aplica', 'n/a'].includes(value);
  });

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
  manuallyAddedFieldNames: readonly string[] = [],
  categoryName = ''
): T[] => {
  const safeFields = Array.isArray(allFields) ? allFields : [];
  const activeCategories = new Set(categoryIds.map(String));
  const manualNames = new Set(manuallyAddedFieldNames.map(normalizeName));
  const isSink = isSinkCategory(categoryIds, safeFields);

  let applicable = safeFields.filter((field) => {
    if (isExcludedProductTechnicalField(field.name)) return false;
    if (!isProductTechnicalFieldApplicableByCategory(field, categoryIds, categoryName)) return false;
    if (
      Array.isArray(field.categoryApplications) &&
      resolveProductCharacteristicApplication(field, categoryIds) === 'unavailable'
    ) return false;
    if (isSink && isStructureMaterialCharacteristic(field.name)) return false;
    if (
      !isSink &&
      (isSinkMaterialCharacteristic(field.name) ||
        isConcretadaCharacteristic(field.name) ||
        isHasInoxBowlCharacteristic(field.name))
    ) {
      return manualNames.has(normalizeName(field.name));
    }

    const hasExistingValue = hasTechnicalValue(values, field.name);
    const norm = normalizeName(field.name);

    // Peso e capacidade por prateleira são campos disponíveis independentemente do vínculo da categoria.
    if (
      isWeightCharacteristicName(field.name) ||
      isShelfWeightCapacityCharacteristic(field.name)
    ) return true;
    if (isProductTechnicalFieldRequiredForCatalog(field, categoryIds, categoryName)) return true;
    if (field.active === false) {
      return hasExistingValue || manualNames.has(norm);
    }
    if (isProductTechnicalFieldRequired(field, categoryIds, categoryName)) return true;
    if (hasExistingValue) return true;
    if (manualNames.has(norm)) return true;
    if (isCharacteristicDependent(field.name)) return true;
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

  return deduplicateProductTechnicalValueAliasFields(applicable.map((field) => ({
    ...field,
    isRequired: isProductTechnicalFieldRequired(field, categoryIds, categoryName),
    isRequiredForProduct: isProductTechnicalFieldRequired(field, categoryIds, categoryName),
    isRequiredForCatalog: isProductTechnicalFieldRequiredForCatalog(field, categoryIds, categoryName),
    decimal_places:
      isWeightCharacteristicName(field.name) ||
      isWeightCapacityCharacteristic(field.name) ||
      field.data_type === 'weight'
        ? 1
        : field.decimal_places,
  })));
};

// ============================================================================
// 6. TOPIC GROUPING & CANONICAL ORDERING
// ============================================================================

/** Agrupa os campos como no ERP e mantém a ordem canônica das dimensões. */
export const groupProductTechnicalFields = <T extends ProductTechnicalField>(
  fields: readonly T[]
): ProductTechnicalFieldGroup<T>[] => {
  const groups = new Map<string, T[]>();
  const persistedGroups = new Map<string, { title: string; fields: T[] }>();
  const otherFields: T[] = [];
  const isStructuralWeightCapacity = (name: string) =>
    isChairWeightCapacityCharacteristic(name);

  fields.forEach((field) => {
    const persistedGroupName = String(field.groupName ?? '').trim();
    if (persistedGroupName) {
      const key = field.groupId || normalizeName(persistedGroupName);
      const existingGroup = persistedGroups.get(key);
      if (existingGroup) existingGroup.fields.push(field);
      else persistedGroups.set(key, { title: persistedGroupName, fields: [field] });
      return;
    }
    if (
      (field.isCustom === true || field.is_custom === true) &&
      !isStructuralWeightCapacity(field.name) &&
      !isShelfWeightCapacityCharacteristic(field.name)
    ) {
      otherFields.push(field);
      return;
    }
    const topic = isShelfWeightCapacityCharacteristic(field.name)
      ? CHARACTERISTIC_TOPICS.find((candidate) => candidate.title === 'Prateleiras')
      : CHARACTERISTIC_TOPICS.find((candidate) => candidate.matches.test(field.name));
    if (!topic) {
      otherFields.push(field);
      return;
    }
    groups.set(topic.title, [...(groups.get(topic.title) || []), field]);
  });

  const legacyGroups = [
    ...CHARACTERISTIC_TOPICS.flatMap(({ title }) => {
      const groupedFields = groups.get(title);
      if (!groupedFields?.length) return [];
      if (title === 'Medidas e peso' || title === 'Dimensões e peso') {
        groupedFields.sort((left, right) => getDimensionSortRank(left.name) - getDimensionSortRank(right.name));
      } else if (title === 'Portas') {
        groupedFields.sort((a, b) => {
          const rankA = DOORS_SORT_ORDER[a.name.trim().toLowerCase()] ?? 99;
          const rankB = DOORS_SORT_ORDER[b.name.trim().toLowerCase()] ?? 99;
          if (rankA !== rankB) return rankA - rankB;
          return a.name.localeCompare(b.name, 'pt-BR');
        });
      } else if (title === 'Gavetas') {
        groupedFields.sort((a, b) => {
          const rankA = DRAWERS_SORT_ORDER[a.name.trim().toLowerCase()] ?? 99;
          const rankB = DRAWERS_SORT_ORDER[b.name.trim().toLowerCase()] ?? 99;
          if (rankA !== rankB) return rankA - rankB;
          return a.name.localeCompare(b.name, 'pt-BR');
        });
      } else if (title === 'Prateleiras') {
        groupedFields.sort((a, b) => {
          const rankA = SHELVES_SORT_ORDER[a.name.trim().toLowerCase()] ?? 99;
          const rankB = SHELVES_SORT_ORDER[b.name.trim().toLowerCase()] ?? 99;
          if (rankA !== rankB) return rankA - rankB;
          return a.name.localeCompare(b.name, 'pt-BR');
        });
      } else if (title === 'Pés') {
        groupedFields.sort((a, b) => {
          const rankA = FEET_SORT_ORDER[a.name.trim().toLowerCase()] ?? 99;
          const rankB = FEET_SORT_ORDER[b.name.trim().toLowerCase()] ?? 99;
          if (rankA !== rankB) return rankA - rankB;
          return a.name.localeCompare(b.name, 'pt-BR');
        });
      } else if (title === 'Acessórios') {
        groupedFields.sort((a, b) => {
          const rankA = ACCESSORIES_SORT_ORDER[a.name.trim().toLowerCase()] ?? 99;
          const rankB = ACCESSORIES_SORT_ORDER[b.name.trim().toLowerCase()] ?? 99;
          if (rankA !== rankB) return rankA - rankB;
          return a.name.localeCompare(b.name, 'pt-BR');
        });
      }
      return [{ title, fields: groupedFields }];
    }),
    ...(otherFields.length ? [{ title: 'Outras características', fields: otherFields }] : []),
  ];
  const orderedPersistedGroups = sortProductCharacteristicGroups(
    [...persistedGroups.entries()].map(([id, group]) => ({ id, name: group.title, ...group })),
  ).map(({ title, fields: groupedFields }) => ({ title, fields: groupedFields }));

  return [...legacyGroups, ...orderedPersistedGroups];
};

/**
 * Keeps the legacy three-result limit for ungrouped fields, while matching a
 * persisted group name returns every addable field from that group, as in ERP.
 */
export function getMobileProductTechnicalSearchMatches<T extends ProductTechnicalField>(
  fields: readonly T[],
  searchTerm: string,
  legacyResultLimit = 3,
): T[] {
  const normalizedTerm = normalizeTechnicalSearchText(searchTerm);
  if (!normalizedTerm) return [];

  const matchingGroupKeys = new Set(
    fields
      .filter((field) => normalizeTechnicalSearchText(field.groupName).includes(normalizedTerm))
      .map((field) => field.groupId || normalizeTechnicalSearchText(field.groupName))
      .filter(Boolean),
  );

  const matchingPersistedFields = fields.filter((field) => {
    if (!field.groupName?.trim()) return false;
    const groupKey = field.groupId || normalizeTechnicalSearchText(field.groupName);
    return matchingGroupKeys.has(groupKey) ||
      normalizeTechnicalSearchText(field.name).includes(normalizedTerm);
  });
  const matchingLegacyFields = fields
    .filter((field) => !field.groupName?.trim())
    .filter((field) => normalizeTechnicalSearchText(field.name).includes(normalizedTerm))
    .slice(0, legacyResultLimit);

  return [...matchingPersistedFields, ...matchingLegacyFields];
}

// ============================================================================
// 7. VALIDATION & MISSING FIELDS HELPERS
// ============================================================================

export const getMissingRequiredCharacteristics = (values: Record<string, unknown> = {}) => {
  return REQUIRED_CHARACTERISTIC_NAMES.filter((name) => {
    let raw = getTechnicalValue(values, name);
    if (name === 'Modelo' && (raw === undefined || raw === null || String(raw).trim() === '')) {
      raw =
        getTechnicalValue(values, 'modelo/linha') ??
        getTechnicalValue(values, 'modelo / linha') ??
        getTechnicalValue(values, 'linha/modelo') ??
        getTechnicalValue(values, 'linha / modelo') ??
        getTechnicalValue(values, 'linha');
    }
    const value = String(raw ?? '')
      .trim()
      .toLocaleLowerCase('pt-BR');
    return !value || ['não se aplica', 'nao se aplica', 'n/a'].includes(value);
  });
};

export const getMissingRequiredDimensions = (
  values: Record<string, unknown> = {},
  directDimensions?: { width?: number; height?: number; depth?: number; weight?: number },
  options?: { isMattress?: boolean; isHeightRequired?: boolean }
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
  if (options?.isHeightRequired !== false) {
    if (
      !isPositive(directDimensions?.height) &&
      !isPositive(getTechnicalValue(values, 'altura total')) &&
      !isPositive(getTechnicalValue(values, 'altura'))
    ) {
      missing.push('Altura total');
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
  if (!isPositive(directDimensions?.weight) && !isPositive(getTechnicalValue(values, 'peso'))) {
    missing.push('Peso');
  }
  return missing;
};
