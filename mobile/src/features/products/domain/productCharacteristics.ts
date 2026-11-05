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
} from '../../../../../shared-utils/productCharacteristicDependencies';
import {
  evaluateCharacteristicDependency,
  evaluateCharacteristicDependencies,
  getCharacteristicDependencies,
} from '../../../../../shared-utils/characteristicDependencyRules';
import {
  deduplicateProductTechnicalValueAliasFields,
  getProductTechnicalValueCandidateKeys,
  removeProductTechnicalValueAliases,
} from '../../../../../shared-utils/productTechnicalValueAliases';
import {
  getTechnicalFieldDisplayName,
  isCanonicalSofaRequiredCharacteristic,
  isSofaCategoryName,
  isSofaRecliningCharacteristic,
  isSofaRequiredCharacteristic,
  isSofaRetractableCharacteristic,
  SOFA_REQUIRED_CHARACTERISTIC_NAMES,
} from '../../../../../shared-utils/productTechnicalFieldScope';
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
import { isCatalogCoreRequiredCharacteristicName } from '../../../../../shared-utils/catalogPublication/characteristicValues';
import { isCatalogNeverRequiredCharacteristicName } from '../../../../../shared-utils/catalogPublication/requiredCharacteristicPolicy';
import {
  GLOBAL_REQUIRED_ATTRIBUTE_NAMES,
  MATTRESS_CATEGORY_ID,
  type ProductTechnicalField,
} from './productCharacteristicDefinitions';
import {
  getMissingRequiredCharacteristics,
  getMissingRequiredDimensions,
  getTechnicalValue,
} from './productCharacteristicValidation';
import {
  normalizeName,
  getMobileVariationColorSummary,
  upsertProductCharacteristicAttribute,
  removeProductCharacteristicAttribute,
} from './productCharacteristicAttributes';
import {
  getEffectiveVariationTechnicalValues,
  isMobileVariableTechnicalField,
} from './productCharacteristicValues';

export * from './productCharacteristicDefinitions';
export * from './productCharacteristicValues';
export { isWeightCharacteristicName } from '../../../../../shared-utils/productTechnicalFieldRules';
export {
  getMissingRequiredCharacteristics,
  getMissingRequiredDimensions,
  getTechnicalValue,
};
export {
  normalizeName,
  getProductCharacteristicAttributes,
  getMobileVariationColorSummary,
  upsertProductCharacteristicAttribute,
  removeProductCharacteristicAttribute,
} from './productCharacteristicAttributes';
export { getDimensionSortRank, groupProductTechnicalFields } from './productCharacteristicGrouping';
export { getMobileProductTechnicalSearchMatches } from './productCharacteristicSearch';

// ============================================================================
// 1. DOMAIN PREDICATES & VALUE NORMALIZERS
// ============================================================================

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

/** Esconde aliases legados isolados; os nomes canônicos de sofá entram pelo escopo da categoria. */
export const isExcludedProductTechnicalField = (name: string): boolean => {
  if (/^(?:linha|modelo)$/i.test(String(name || '').trim())) return true;
  if (!isSofaRequiredCharacteristic(name)) return false;
  return !isCanonicalSofaRequiredCharacteristic(name);
};

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
  if (isCatalogNeverRequiredCharacteristicName(name)) return false;
  if (isCatalogCoreRequiredCharacteristicName(name)) return false;
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
  categoryName = ''
): boolean => {
  if (isSofaCategoryName(categoryName) && isSofaRequiredCharacteristic(field.name)) return true;
  if (isCatalogNeverRequiredCharacteristicName(field.name)) return false;
  if (Array.isArray(field.categoryApplications)) {
    return resolveProductCharacteristicApplication(field, categoryIds) === 'required';
  }
  if (isCatalogCoreRequiredCharacteristicName(field.name)) return false;
  if (isWeightCapacityCharacteristic(field.name)) return false;
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
  !isCatalogNeverRequiredCharacteristicName(field.name) &&
  !isWeightCapacityCharacteristic(field.name) &&
  (isCatalogCoreRequiredCharacteristicName(field.name) ||
    field.requiredForCategory === true ||
    isProductTechnicalAttributeRequiredByCategories(field.requiredCategoryIds, categoryIds));

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

/**
 * Avalia dependências do Produto Pai como no ERP: referências variáveis usam
 * somente o valor de cada variação ativa; as demais referências usam o valor
 * próprio do Produto. Sem variações ativas, conserva o contexto do Produto.
 */
export const isConfiguredFamilyProductTechnicalDependencySatisfied = (
  field: ProductTechnicalField,
  allFields: readonly ProductTechnicalField[],
  productTechnicalValues: Record<string, unknown>,
  variations: readonly {
    active?: boolean | null;
    attributes?: unknown;
    technicalValues?: Record<string, unknown> | null;
  }[],
  variableFieldNames: readonly string[]
): boolean => {
  const hasVariableReference = getCharacteristicDependencies(field).some((dependency) => {
    const reference = allFields.find(
      (candidate) => candidate.id === dependency.referenceAttributeId
    );
    return Boolean(
      reference && isMobileVariableTechnicalField(reference.name, variableFieldNames)
    );
  });

  if (!hasVariableReference) {
    return isConfiguredProductTechnicalDependencySatisfied(
      field,
      allFields,
      productTechnicalValues
    );
  }

  const activeVariations = variations.filter((variation) => variation.active !== false);
  if (activeVariations.length === 0) {
    return isConfiguredProductTechnicalDependencySatisfied(
      field,
      allFields,
      productTechnicalValues
    );
  }

  return activeVariations.some((variation) => {
    const parentValuesWithoutVariableFields = variableFieldNames.reduce(
      (values, name) => removeProductTechnicalValueAliases(values, name),
      { ...productTechnicalValues }
    );
    const variationValues = getEffectiveVariationTechnicalValues({}, variation);
    const variableOverrides = Object.fromEntries(
      Object.entries(variationValues).filter(([name]) =>
        isMobileVariableTechnicalField(name, variableFieldNames)
      )
    );

    return isConfiguredProductTechnicalDependencySatisfied(
      field,
      allFields,
      { ...parentValuesWithoutVariableFields, ...variableOverrides }
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
// 2. APPLICABLE FIELDS & DEPTH/LENGTH RESOLUTION
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
    if (isSofaCategoryName(categoryName) && isSofaRequiredCharacteristic(field.name)) return false;
    const hasCatalogCategoryRequirement =
      !isCatalogNeverRequiredCharacteristicName(field.name) &&
      isProductTechnicalAttributeRequiredByCategories(field.requiredCategoryIds, categoryIds);
    if (hasCatalogCategoryRequirement) return true;
    if (isExcludedProductTechnicalField(field.name)) return false;
    if (isProductTechnicalFieldRequiredForCatalog(field, categoryIds, categoryName)) return true;
    if (!isProductTechnicalFieldApplicableByCategory(field, categoryIds, categoryName)) return false;
    if (
      Array.isArray(field.categoryApplications) &&
      resolveProductCharacteristicApplication(field, categoryIds) === 'unavailable' &&
      !isProductTechnicalFieldRequiredForCatalog(field, categoryIds, categoryName)
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
    if (field.active === false) {
      return hasExistingValue || manualNames.has(norm);
    }
    if (isProductTechnicalFieldRequired(field, categoryIds, categoryName)) return true;
    if (hasExistingValue) return true;
    if (manualNames.has(norm)) return true;
    if (isCharacteristicDependent(field.name)) return true;
    return Boolean(field.categoryIds?.some((id: string) => activeCategories.has(String(id))));
  });

  if (isSofaCategoryName(categoryName)) {
    const sofaRequiredFields = SOFA_REQUIRED_CHARACTERISTIC_NAMES.map((name) => {
      const matches = isSofaRetractableCharacteristic(name)
        ? isSofaRetractableCharacteristic
        : isSofaRecliningCharacteristic;
      const existing = safeFields.find((field) => matches(field.name));
      return {
        ...existing,
        id: existing?.id || `sofa-required:${normalizeName(name)}`,
        name,
        data_type: 'boolean',
        options: existing?.options || [],
        active: true,
        isRequired: true,
        isRequiredForProduct: true,
        categoryApplications: undefined,
        categoryIds: existing?.categoryIds || [...categoryIds],
      } as T;
    });
    applicable = [...applicable, ...sofaRequiredFields];
  }

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
