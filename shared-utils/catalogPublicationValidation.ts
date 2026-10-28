import { isTestProduct } from './isTestProduct';
import {
  isQuantityCharacteristic,
} from './productCharacteristicDependencies';
import {
  evaluateCharacteristicDependencies,
  evaluateCharacteristicDependency,
  getCharacteristicDependencies,
} from './characteristicDependencyRules';

export const TEST_PRODUCT_CATALOG_PUBLICATION_ERROR =
  'Produtos identificados como teste não podem ser publicados no Catálogo Digital.';

export interface EcomLegibilityResult {
  isLegible: boolean;
  errors: string[];
  missingCategoryCharacteristics: string[];
  checks: {
    marketplaceTitle: boolean;
    description: boolean;
    unitPrice: boolean;
    categories: boolean;
    images: boolean;
    dimensions: boolean;
    categoryCharacteristics: boolean;
  };
}

export interface CatalogCharacteristicRequirement {
  readonly name: string;
  readonly id?: string;
  readonly groupId?: string;
  readonly dataType?: string;
  readonly data_type?: string;
  readonly active?: boolean | null;
  readonly dependency?: {
    readonly referenceAttributeId: string;
    readonly operator: string;
    readonly value: string;
  } | null;
  readonly dependencyLogic?: 'all' | 'any';
  readonly dependencyAlternatives?: readonly {
    readonly referenceAttributeId: string;
    readonly operator: string;
    readonly value: string;
  }[];
  readonly requiredForCategory?: boolean;
  readonly categoryApplications?: readonly {
    readonly categoryId: string | number;
    readonly application: 'unavailable' | 'optional' | 'required';
  }[];
  readonly categoryIds?: readonly (string | number)[];
  readonly unavailableCategoryIds?: readonly (string | number)[];
  readonly requiredCategoryIds?: readonly (string | number)[];
  readonly requiredProductCategoryIds?: readonly (string | number)[];
}

export interface CatalogCharacteristicGroup {
  readonly id: string;
}

export interface CatalogCharacteristicCheckOptions {
  readonly categoryRequirementsVerified?: boolean;
  readonly characteristicGroups?: readonly CatalogCharacteristicGroup[];
}

const normalizeCharacteristicName = (value: unknown) =>
  String(value ?? '')
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR');

const normalizeCharacteristicKey = (value: unknown) =>
  normalizeCharacteristicName(value).replace(/[\s/?¿]+/g, '');

const getCharacteristicNameAliases = (name: string) => {
  const normalized = normalizeCharacteristicKey(name);
  if (['retratil', 'eretratil', 'possuiretratil'].includes(normalized)) {
    return ['retratil', 'eretratil', 'possuiretratil'];
  }
  if (['reclinavel', 'ereclinavel', 'possuireclinavel'].includes(normalized)) {
    return ['reclinavel', 'ereclinavel', 'possuireclinavel'];
  }
  if (['modelo', 'linha', 'modelolinha', 'linhamodelo'].includes(normalized)) {
    return ['modelo', 'linha', 'modelolinha', 'linhamodelo'];
  }
  if (['altura', 'alturatotal'].includes(normalized)) {
    return ['altura', 'alturatotal'];
  }
  if (['largura', 'larguratotal'].includes(normalized)) {
    return ['largura', 'larguratotal'];
  }
  if (['profundidade', 'profundidadetotal'].includes(normalized)) {
    return ['profundidade', 'profundidadetotal'];
  }
  if (['comprimento', 'comprimentototal'].includes(normalized)) {
    return ['comprimento', 'comprimentototal'];
  }
  return [normalized];
};

const isBlankCharacteristicValue = (value: unknown): boolean => {
  if (value === undefined || value === null) return true;
  if (typeof value === 'string') return value.trim() === '';
  if (Array.isArray(value)) return value.length === 0 || value.every(isBlankCharacteristicValue);
  if (typeof value === 'object') {
    const structured = value as { value?: unknown; val?: unknown };
    if (structured.value !== undefined || structured.val !== undefined) {
      return isBlankCharacteristicValue(structured.value ?? structured.val);
    }
    return true;
  }
  return false;
};

const readCharacteristicValue = (record: Record<string, any>, name: string): unknown => {
  const aliases = new Set(getCharacteristicNameAliases(name));
  const valueMaps = [
    record.technicalValues,
    record.technical_values,
    record.technicalSpecs?.technicalValues,
    record.technical_specs?.technicalValues,
  ];

  for (const values of valueMaps) {
    if (!values || typeof values !== 'object' || Array.isArray(values)) continue;
    const entry = Object.entries(values).find(([key, value]) =>
      aliases.has(normalizeCharacteristicKey(key)) && !isBlankCharacteristicValue(value)
    );
    if (entry) return entry[1];
  }

  if (Array.isArray(record.attributes)) {
    const attribute = record.attributes.find(
      (item: any) =>
        item?.name &&
        aliases.has(normalizeCharacteristicKey(item.name)) &&
        !isBlankCharacteristicValue(item.value)
    );
    if (attribute) return attribute.value;
  } else if (record.attributes && typeof record.attributes === 'object') {
    const entry = Object.entries(record.attributes).find(([key, value]) =>
      aliases.has(normalizeCharacteristicKey(key)) && !isBlankCharacteristicValue(value)
    );
    if (entry) return entry[1];
  }

  const normalized = normalizeCharacteristicName(name);
  const directFieldByName: Record<string, string[]> = {
    marca: ['brand'],
    altura: ['height'],
    'altura total': ['height'],
    largura: ['width'],
    'largura total': ['width'],
    profundidade: ['depth'],
    'profundidade total': ['depth'],
    peso: ['weight'],
    modelo: ['model'],
    linha: ['line'],
  };
  const normalizedKey = normalizeCharacteristicKey(name);
  const legacyDepthIsLength = record.depthUseLength === true || record.depth_use_length === true;
  const isDepthName = normalized === 'profundidade' || normalized === 'profundidade total';
  const isLengthName = normalized === 'comprimento' || normalized === 'comprimento total';
  let directFields: string[];
  if (normalizedKey === 'modelolinha' || normalizedKey === 'linhamodelo') {
    directFields = ['model', 'line'];
  } else if (
    (isDepthName && legacyDepthIsLength) ||
    (isLengthName && !legacyDepthIsLength)
  ) {
    directFields = [];
  } else if (isLengthName && legacyDepthIsLength) {
    directFields = ['depth'];
  } else {
    directFields = directFieldByName[normalized] || [];
  }
  for (const key of directFields) {
    const candidate = record[key];
    if (
      candidate !== undefined &&
      candidate !== null &&
      !isBlankCharacteristicValue(candidate) &&
      !(typeof candidate === 'number' && candidate <= 0)
    ) {
      return candidate;
    }
  }

  return undefined;
};

const hasCatalogValue = (value: unknown): boolean => {
  if (value === undefined || value === null) return false;
  if (Array.isArray(value)) return value.some(hasCatalogValue);
  if (typeof value === 'object') {
    const structured = value as { value?: unknown; val?: unknown };
    if (structured.value !== undefined || structured.val !== undefined) {
      return hasCatalogValue(structured.value ?? structured.val);
    }
    return false;
  }
  if (typeof value === 'string') {
    const normalized = normalizeCharacteristicName(value);
    return Boolean(normalized && normalized !== 'nao se aplica' && normalized !== 'n/a' && normalized !== 'nao informar');
  }
  return true;
};

const hasCatalogQuantityValue = (value: unknown): boolean => {
  if (value === undefined || value === null) return false;
  if (typeof value === 'object') {
    const structured = value as { value?: unknown; val?: unknown };
    if (structured.value !== undefined || structured.val !== undefined) {
      return hasCatalogQuantityValue(structured.value ?? structured.val);
    }
    return false;
  }
  if (typeof value === 'number') return Number.isSafeInteger(value) && value >= 0;
  const match = String(value).trim().match(/^(\d+)(?:[.,]0+)?(?:\s+.*)?$/);
  return Boolean(match && Number.isSafeInteger(Number(match[1])));
};

const hasPositiveCatalogValue = (value: unknown): boolean => {
  if (Array.isArray(value)) return value.some(hasPositiveCatalogValue);
  if (value === undefined || value === null) return false;
  if (typeof value === 'object') {
    const structured = value as { value?: unknown; val?: unknown };
    if (structured.value !== undefined || structured.val !== undefined) {
      return hasPositiveCatalogValue(structured.value ?? structured.val);
    }
    return false;
  }

  const normalized = typeof value === 'string' ? value.trim().replace(',', '.') : value;
  const number = Number(normalized);
  return Number.isFinite(number) && number > 0;
};

const POSITIVE_REQUIRED_CATALOG_CHARACTERISTICS = new Set([
  'peso',
  'profundidadetotal',
  'comprimentototal',
]);

const hasRequiredCatalogValue = (name: string, value: unknown, dataType?: string): boolean => {
  if (['boolean', 'booleano'].includes(String(dataType ?? '').trim().toLocaleLowerCase('pt-BR'))) {
    let answer = value;
    if (answer && typeof answer === 'object' && !Array.isArray(answer)) {
      const structured = answer as { value?: unknown; val?: unknown };
      if (Object.prototype.hasOwnProperty.call(structured, 'value')) answer = structured.value;
      else if (Object.prototype.hasOwnProperty.call(structured, 'val')) answer = structured.val;
    }
    return typeof answer === 'boolean';
  }
  if (isQuantityCharacteristic(name)) return hasCatalogQuantityValue(value);
  if (POSITIVE_REQUIRED_CATALOG_CHARACTERISTICS.has(normalizeCharacteristicKey(name))) {
    return hasPositiveCatalogValue(value);
  }
  return hasCatalogValue(value);
};

const getProductCategoryIds = (data: Readonly<Record<string, any>>): string[] => {
  const ids = Array.isArray(data.categoryIds)
    ? data.categoryIds
    : data.categoryId || data.category_id
      ? [data.categoryId || data.category_id]
      : [];
  return ids.map((id: unknown) => String(id));
};

/** Returns category-required characteristics that have no usable value on the product or its variants. */
export const getMissingCategoryRequiredCharacteristics = (
  data: Readonly<Record<string, any>>,
  requirements: readonly CatalogCharacteristicRequirement[],
  _characteristicGroups: readonly CatalogCharacteristicGroup[] = []
): string[] => {
  const activeCategories = new Set(getProductCategoryIds(data));
  const isAvailableInCategory = (requirement: CatalogCharacteristicRequirement, categoryId: string) =>
    !requirement.unavailableCategoryIds?.some((id) => String(id) === categoryId);
  const getCharacteristicApplication = (requirement: CatalogCharacteristicRequirement) => {
    const configured = requirement.categoryApplications?.filter((application) =>
      activeCategories.has(String(application.categoryId))
    ) ?? [];
    if (configured.length > 0) {
      if (configured.some((application) => application.application === 'required')) return 'required';
      if (configured.some((application) => application.application === 'optional')) return 'optional';
      return 'unavailable';
    }
    if (requirement.requiredProductCategoryIds?.some((id) => activeCategories.has(String(id)))) {
      return 'required';
    }
    if (requirement.categoryIds?.some((id) => activeCategories.has(String(id)))) return 'optional';
    if (requirement.requiredForCategory || requirement.requiredCategoryIds?.some((id) =>
      activeCategories.has(String(id))
    )) return 'optional';
    return undefined;
  };
  const hasCatalogRequiredCategory = (requirement: CatalogCharacteristicRequirement) =>
    requirement.requiredCategoryIds?.some((id) =>
      activeCategories.has(String(id)) && isAvailableInCategory(requirement, String(id))
    ) ?? false;
  const isRequiredForCategory = (requirement: CatalogCharacteristicRequirement) => {
    const configuredApplications = requirement.categoryApplications?.filter((application) =>
      activeCategories.has(String(application.categoryId))
    ) ?? [];
    if (configuredApplications.length > 0) {
      return configuredApplications.some((application) => application.application === 'required');
    }
    if (requirement.requiredProductCategoryIds?.some((id) => activeCategories.has(String(id)))) {
      return true;
    }
    return requirement.requiredForCategory === true || hasCatalogRequiredCategory(requirement);
  };
  const isService = data.itemType === 'service' || data.item_type === 'service';
  const globalRequiredNames = isService ? [] : ['Profundidade total', 'Peso'].filter((name) => {
    const requirement = requirements.find((candidate) =>
      getCharacteristicNameAliases(candidate.name).some((alias) =>
        getCharacteristicNameAliases(name).includes(alias)
      )
    );
    const configuredApplications = requirement?.categoryApplications?.filter((application) =>
      activeCategories.has(String(application.categoryId))
    ) ?? [];
    if (configuredApplications.length > 0) {
      return configuredApplications.some((application) => application.application === 'required');
    }
    return !requirement || getCharacteristicApplication(requirement) !== 'unavailable';
  });
  const categoryRequiredNames = requirements
    .filter(
      (requirement) => {
        if (getCharacteristicApplication(requirement) === 'unavailable') return false;
        const requiredForCategory = isRequiredForCategory(requirement);
        if (requirement.groupId) return false;
        return requiredForCategory;
      }
    )
    .map((requirement) => requirement.name.trim());
  const findRequirement = (name: string) => requirements.find((requirement) =>
    getCharacteristicNameAliases(requirement.name).some((alias) =>
      getCharacteristicNameAliases(name).includes(alias)
    )
  );
  const hasStoredCharacteristicEntry = (record: Readonly<Record<string, any>>, name: string) => {
    const aliases = new Set(getCharacteristicNameAliases(name));
    const maps = [
      record.technicalValues,
      record.technical_values,
      record.technicalSpecs?.technicalValues,
      record.technical_specs?.technicalValues,
    ];
    if (maps.some((values) =>
      values && typeof values === 'object' && !Array.isArray(values) &&
      Object.keys(values).some((key) => aliases.has(normalizeCharacteristicKey(key)))
    )) return true;
    if (Array.isArray(record.attributes)) {
      return record.attributes.some((attribute: any) =>
        aliases.has(normalizeCharacteristicKey(attribute?.name || attribute?.attribute_name || attribute?.key))
      );
    }
    return Boolean(record.attributes && typeof record.attributes === 'object' &&
      Object.keys(record.attributes).some((key) => aliases.has(normalizeCharacteristicKey(key))));
  };
  const seenRequirements = new Set<string>();
  const requiredNames = [...globalRequiredNames, ...categoryRequiredNames].filter((name) => {
    if (!name) return false;
    const key = getCharacteristicNameAliases(name).sort().join('|');
    if (seenRequirements.has(key)) return false;
    seenRequirements.add(key);
    return true;
  });

  const variations = [data.variations, data.product_variations, data.allVariations]
    .find((items) => Array.isArray(items) && items.length > 0) || [];
  const activeVariations = variations.filter(
    (variation: any) => variation && variation.active !== false && variation.isDeleted !== true
  );
  const configuredVariableNames =
    data.variableTechnicalFields ??
    data.variable_technical_fields ??
    data.technicalSpecs?.variableTechnicalFields ??
    data.technical_specs?.variableTechnicalFields;
  const declaredVariableNames = Array.isArray(configuredVariableNames)
    ? configuredVariableNames.map((name: unknown) => normalizeCharacteristicKey(name))
    : null;

  const selectedFieldIds = new Set(
    data.selectedCharacteristicIds ??
      data.technicalSpecs?.selectedCharacteristicIds ??
      data.technical_specs?.selectedCharacteristicIds ?? []
  );
  const activeFieldIds = new Set(
    data.activeCharacteristicIds ??
      data.technicalSpecs?.activeCharacteristicIds ??
      data.technical_specs?.activeCharacteristicIds ?? selectedFieldIds
  );
  const hasExplicitCharacteristicSelection = Array.isArray(
    data.selectedCharacteristicIds ??
      data.technicalSpecs?.selectedCharacteristicIds ??
      data.technical_specs?.selectedCharacteristicIds
  );
  const hasExplicitCharacteristicActivation = Array.isArray(
    data.activeCharacteristicIds ??
      data.technicalSpecs?.activeCharacteristicIds ??
      data.technical_specs?.activeCharacteristicIds
  );
  const variableNames = data.variableTechnicalFields ??
    data.variable_technical_fields ??
    data.technicalSpecs?.variableTechnicalFields ??
    data.technical_specs?.variableTechnicalFields;
  const isVariableField = (field: CatalogCharacteristicRequirement): boolean => {
    if (Array.isArray(variableNames)) {
      return variableNames.some((name: unknown) =>
        getCharacteristicNameAliases(String(name)).some((alias) =>
          getCharacteristicNameAliases(field.name).includes(alias)
        )
      );
    }
    return activeVariations.some((variation: any) =>
      hasStoredCharacteristicEntry(variation, field.name) ||
      hasRequiredCatalogValue(field.name, readCharacteristicValue(variation, field.name), field.dataType ?? field.data_type)
    );
  };
  const isCharacteristicRequired = (field: CatalogCharacteristicRequirement) =>
    getCharacteristicApplication(field) !== 'unavailable' &&
    isRequiredForCategory(field);
  const isDependencySatisfied = (
    field: CatalogCharacteristicRequirement,
    record: Readonly<Record<string, any>> = data,
    visited: Set<string> = new Set()
  ): boolean => {
    const dependencies = getCharacteristicDependencies(field as any);
    if (dependencies.length === 0) return true;
    const visitKey = field.id || normalizeCharacteristicKey(field.name);
    if (visited.has(visitKey)) return false;
    const nextVisited = new Set(visited);
    nextVisited.add(visitKey);

    return evaluateCharacteristicDependencies(
      dependencies,
      field.dependencyLogic,
      (dependency) => {
        const referenceField = requirements.find(
          (candidate) =>
            candidate.id === dependency.referenceAttributeId ||
            normalizeCharacteristicKey(candidate.name) ===
              normalizeCharacteristicKey(dependency.referenceAttributeId)
        );
        if (!referenceField) return false;
        if (!isCharacteristicActive(referenceField, nextVisited)) return false;
        const evaluateForRecord = (target: Readonly<Record<string, any>>) => {
          const refValue =
            readCharacteristicValue(target, referenceField.name) ??
            (target !== data ? readCharacteristicValue(data, referenceField.name) : undefined);
          return evaluateCharacteristicDependency(
            dependency as any,
            (referenceField.dataType ?? referenceField.data_type) as any,
            refValue
          );
        };
        if (record !== data) {
          return evaluateForRecord(record);
        }
        if (evaluateForRecord(data)) return true;
        if (activeVariations.length > 0 && isVariableField(referenceField)) {
          return activeVariations.some((variation: any) => evaluateForRecord(variation));
        }
        return false;
      }
    );
  };
  const isCharacteristicActive = (
    field: CatalogCharacteristicRequirement,
    visited: Set<string> = new Set()
  ): boolean => {
    if (getCharacteristicApplication(field) === 'unavailable') return false;
    if (!isDependencySatisfied(field, data, visited)) return false;
    if (isCharacteristicRequired(field)) return true;
    if (field.id && selectedFieldIds.has(field.id) && activeFieldIds.has(field.id)) return true;
    if (hasExplicitCharacteristicSelection || hasExplicitCharacteristicActivation) return false;
    const isNotInformValue = (value: unknown) =>
      typeof value === 'string' &&
      ['não informar', 'nao informar', 'não se aplica', 'nao se aplica', 'n/a'].includes(
        normalizeCharacteristicName(value)
      );
    const hasStoredActiveValue = (record: Readonly<Record<string, any>>) => {
      const value = readCharacteristicValue(record, field.name);
      return value !== undefined && !isNotInformValue(value);
    };
    return hasStoredActiveValue(data) || activeVariations.some(hasStoredActiveValue);
  };
  const hasStoredGroupFieldValue = (field: CatalogCharacteristicRequirement) => {
    const aliases = new Set(getCharacteristicNameAliases(field.name));
    const hasMatchingTechnicalValue = (record: Readonly<Record<string, any>>) => {
      const maps = [
        record.technicalValues,
        record.technical_values,
        record.technicalSpecs?.technicalValues,
        record.technical_specs?.technicalValues,
      ];
      return maps.some((values) =>
        values && typeof values === 'object' &&
        Object.keys(values).some((name) => aliases.has(normalizeCharacteristicKey(name)))
      ) || (Array.isArray(record.attributes) && record.attributes.some((attribute: any) =>
        aliases.has(normalizeCharacteristicKey(attribute?.name))
      ));
    };
    return hasMatchingTechnicalValue(data) || activeVariations.some(hasMatchingTechnicalValue);
  };
  const missingRequired = [...new Set(requiredNames)].filter((name) => {
    const requirement = findRequirement(name);
    if (requirement && !isDependencySatisfied(requirement)) return false;
    const aliases = getCharacteristicNameAliases(name);
    const isDeclaredVariable = Boolean(declaredVariableNames?.some((fieldName) => aliases.includes(fieldName)));
    if (activeVariations.length === 0) {
      if (isDeclaredVariable) return true;
      return !hasRequiredCatalogValue(name, readCharacteristicValue(data, name), requirement?.dataType ?? requirement?.data_type);
    }

    const isLegacyVariable =
      declaredVariableNames === null &&
      activeVariations.some((variation: any) =>
        hasStoredCharacteristicEntry(variation, name) ||
        hasRequiredCatalogValue(name, readCharacteristicValue(variation, name), requirement?.dataType ?? requirement?.data_type)
      );
    const isPerVariation = isDeclaredVariable || isLegacyVariable;

    const dataType = requirement?.dataType ?? requirement?.data_type;
    if (!isPerVariation && hasRequiredCatalogValue(name, readCharacteristicValue(data, name), dataType)) {
      return false;
    }

    return activeVariations.some((variation: any) => {
      const variationValue = readCharacteristicValue(variation, name);
      return !hasRequiredCatalogValue(name, variationValue, dataType);
    });
  });
  const activeGroupFields = requirements.filter((field) => {
    if (!field.id || (field.active === false && !hasStoredGroupFieldValue(field))) {
      return false;
    }
    // Group membership is organizational; each characteristic has its own application and activation.
    return isCharacteristicActive(field);
  });
  const missingEnabledGroupFields = activeGroupFields.filter((field) => {
    const productValue = readCharacteristicValue(data, field.name);
    if (isVariableField(field)) {
      return activeVariations.some((variation: any) =>
        !hasRequiredCatalogValue(field.name, readCharacteristicValue(variation, field.name), field.dataType ?? field.data_type)
      );
    }
    return !hasRequiredCatalogValue(field.name, productValue, field.dataType ?? field.data_type);
  }).map((field) => field.name.trim());

  return Array.from(new Set([...missingRequired, ...missingEnabledGroupFields]));
};

export function isPositiveNumber(value: unknown): boolean {
  const num = Number(value);
  return Number.isFinite(num) && num > 0;
}

/**
 * Avalia se os dados do produto atendem aos requisitos obrigatórios para exibição no Catálogo Digital.
 */
export function checkEcomLegibility(
  data: Readonly<Record<string, any>>,
  categoryRequirements: readonly CatalogCharacteristicRequirement[] = [],
  options: CatalogCharacteristicCheckOptions = {}
): EcomLegibilityResult {
  const errors: string[] = [];
  const categoryRequirementsVerified = options.categoryRequirementsVerified !== false;
  const missingCategoryCharacteristics = getMissingCategoryRequiredCharacteristics(
    data,
    categoryRequirements,
    options.characteristicGroups
  );
  const variations = [data.variations, data.product_variations, data.allVariations]
    .find((items) => Array.isArray(items) && items.length > 0) || [];

  if (!categoryRequirementsVerified) {
    errors.push('Não foi possível verificar as características obrigatórias da categoria.');
  } else if (missingCategoryCharacteristics.length > 0) {
    errors.push(
      `Preencha as características obrigatórias da categoria para publicar: ${missingCategoryCharacteristics.join(', ')}.`
    );
  }
  const hasVars = Boolean(
    data.hasVariations ||
      data.has_variations ||
      variations.length > 0
  );
  const catalogTitle = String(
    data.name ||
      data.title ||
      data.marketplaceTitle ||
      (data.description ? String(data.description).split('\n')[0].trim() : '')
  ).trim();
  const catalogDescription =
    data.ecommerceDescription || data.ecommerce_description || data.description;

  const hasValidTitle = Boolean(catalogTitle && catalogTitle.length >= 2);
  if (!hasValidTitle) {
    errors.push('Nome do Produto deve ter pelo menos 2 caracteres.');
  }

  const hasValidDesc = Boolean(catalogDescription && String(catalogDescription).trim().length >= 2);
  if (!hasValidDesc) {
    errors.push('Descrição do catálogo deve ser preenchida antes da publicação.');
  }

  let hasValidPrice: boolean;
  if (!hasVars) {
    hasValidPrice = isPositiveNumber(data.unitPrice ?? data.unit_price ?? data.price);
    if (!hasValidPrice) {
      errors.push('Preço de Venda deve ser maior que zero.');
    }
  } else {
    hasValidPrice = variations.length > 0;
  }

  const categoryIds = Array.isArray(data.categoryIds)
    ? data.categoryIds
    : data.categoryId || data.category_id
      ? [data.categoryId || data.category_id]
      : [];
  const hasValidCategories = Boolean(categoryIds.length > 0);
  if (!hasValidCategories) {
    errors.push('Pelo menos uma categoria deve ser selecionada.');
  }

  const rawImages = data.images;
  const imageList = Array.isArray(rawImages)
    ? rawImages
    : typeof rawImages === 'string' && rawImages.trim()
      ? rawImages.split(',').filter(Boolean)
      : typeof data.image_url === 'string' && data.image_url.trim()
        ? data.image_url.split(',').filter(Boolean)
        : [];
  const hasValidImages = Boolean(imageList.length > 0);
  if (!hasValidImages) {
    errors.push('Pelo menos uma foto deve ser adicionada.');
  }

  const isService = data.itemType === 'service' || data.item_type === 'service';
  const getDimensionState = (
    prop: 'width' | 'height' | 'depth',
    names: string[],
    allowDirectValue = true
  ) => {
    const values = data.technicalValues || data.technical_values || {};
    const configuredNames = names.filter((name) =>
      Object.prototype.hasOwnProperty.call(values, name)
    );
    if (configuredNames.length > 0) {
      const enabledNames = configuredNames.filter((name) => {
        const raw = values[name];
        const valStr =
          typeof raw === 'object' && raw !== null ? (raw.value ?? raw.val ?? '') : raw;
        const value = String(valStr ?? '').trim().toLocaleLowerCase('pt-BR');
        return !['não se aplica', 'nao se aplica', 'n/a', 'não informar', 'nao informar'].includes(value);
      });
      return {
        enabled: enabledNames.length > 0,
        hasPositiveValue:
          enabledNames.length > 0 &&
          enabledNames.some((name) => {
            const raw = values[name];
            const valStr =
              typeof raw === 'object' && raw !== null ? (raw.value ?? raw.val ?? '') : raw;
            const value = String(valStr ?? '').replace(',', '.');
            const numericValue = Number(value);
            return Number.isFinite(numericValue) && numericValue > 0;
          }),
      };
    }
    const hasPositiveDirectValue = allowDirectValue && isPositiveNumber(data[prop]);
    return { enabled: hasPositiveDirectValue, hasPositiveValue: hasPositiveDirectValue };
  };
  const getCharacteristicDimensionState = (names: string[]) => {
    const values = data.technicalValues || data.technical_values || {};
    const configuredNames = names.filter((name) =>
      Object.prototype.hasOwnProperty.call(values, name)
    );
    const enabledNames = configuredNames.filter((name) => {
      const raw = values[name];
      const valStr =
        typeof raw === 'object' && raw !== null ? (raw.value ?? raw.val ?? '') : raw;
      const value = String(valStr ?? '').trim().toLocaleLowerCase('pt-BR');
      return !['', 'não se aplica', 'nao se aplica', 'n/a', 'não informar'].includes(value);
    });
    return {
      enabled: enabledNames.length > 0,
      hasPositiveValue:
        enabledNames.length > 0 &&
        enabledNames.every((name) => {
          const raw = values[name];
          const valStr =
            typeof raw === 'object' && raw !== null ? (raw.value ?? raw.val ?? '') : raw;
          const numericValue = Number(String(valStr ?? '').replace(',', '.'));
          return Number.isFinite(numericValue) && numericValue > 0;
        }),
    };
  };

  const depthUsesLegacyLength = data.depthUseLength === true || data.depth_use_length === true;
  const dimensionStates = [
    getDimensionState('width', ['Largura', 'Largura total']),
    getDimensionState('height', ['Altura', 'Altura total']),
    getDimensionState(
      'depth',
      ['Profundidade', 'Profundidade total'],
      !depthUsesLegacyLength
    ),
    getCharacteristicDimensionState(['Comprimento', 'Comprimento total']),
    ...(depthUsesLegacyLength && isPositiveNumber(data.depth)
      ? [{ enabled: true, hasPositiveValue: true }]
      : []),
  ];
  const selectedCategoryIds = new Set(categoryIds.map(String));
  const hasCategoryDimensionRules = categoryRequirements.some((field) =>
    /^(altura|largura|profundidade|comprimento|espessura)(?:\s|$)/.test(
      normalizeCharacteristicName(field.name)
    ) &&
    field.categoryApplications?.some((application) =>
      selectedCategoryIds.has(String(application.categoryId))
    )
  );
  const hasValidDimensions =
    isService ||
    ((hasCategoryDimensionRules || dimensionStates.some((dimension) => dimension.enabled)) &&
      dimensionStates.every(
        (dimension) => !dimension.enabled || dimension.hasPositiveValue
      ));

  if (!isService && !hasValidDimensions) {
    errors.push(
      'Ative pelo menos uma dimensão física (altura, largura, profundidade ou comprimento) e preencha com valor maior que zero todas as dimensões ativadas.'
    );
  }

  const promoPrice = data.promoPrice ?? data.promo_price;
  if (
    promoPrice !== undefined &&
    promoPrice !== null &&
    !isNaN(Number(promoPrice)) &&
    Number(promoPrice) > 0
  ) {
    const up = Number(data.unitPrice ?? data.unit_price ?? data.price) || 0;
    if (Number(promoPrice) >= up) {
      errors.push('O preço promocional deve ser menor que o preço de venda.');
    }
  }

  return {
    isLegible: errors.length === 0,
    errors,
    missingCategoryCharacteristics,
    checks: {
      marketplaceTitle: hasValidTitle,
      description: hasValidDesc,
      unitPrice: hasValidPrice,
      categories: hasValidCategories,
      images: hasValidImages,
      dimensions: hasValidDimensions,
      categoryCharacteristics:
        categoryRequirementsVerified && missingCategoryCharacteristics.length === 0,
    },
  };
}

/**
 * Valida se um produto ou variação pode ser publicado no Catálogo Digital,
 * retornando lista detalhada de pendências e aviso de rascunho se aplicável.
 */
export const validateCatalogPublication = (
  parentProduct?: any,
  variation?: any,
  isVariation?: boolean,
  categoryRequirements: readonly CatalogCharacteristicRequirement[] = [],
  options: CatalogCharacteristicCheckOptions = {}
): { isValid: boolean; errorMessage?: string } => {
  const catalogProduct = {
    ...parentProduct,
    variations: isVariation && variation ? [variation] : parentProduct?.variations,
  };
  if (isTestProduct(catalogProduct)) {
    return { isValid: false, errorMessage: TEST_PRODUCT_CATALOG_PUBLICATION_ERROR };
  }

  const isDraft =
    Boolean(parentProduct?.isDraft) ||
    Boolean(parentProduct?.is_draft) ||
    parentProduct?.status === 'draft';

  const varImages =
    variation?.images && variation.images.length > 0
      ? variation.images
      : variation?.image_url
        ? String(variation.image_url).split(',').filter(Boolean)
        : parentProduct?.images || [];

  const effectiveProduct: Record<string, any> = {
    ...parentProduct,
    ...(
      isVariation && variation
        ? { variations: [variation] }
        : parentProduct?.variations?.length
          ? {}
          : parentProduct?.product_variations?.length
            ? { variations: parentProduct.product_variations }
            : parentProduct?.allVariations?.length
              ? { variations: parentProduct.allVariations }
              : {}
    ),
    name:
      parentProduct?.name ||
      parentProduct?.title ||
      (parentProduct?.description
        ? String(parentProduct.description).split('\n')[0].trim()
        : undefined),
    description:
      parentProduct?.ecommerceDescription ||
      parentProduct?.ecommerce_description ||
      parentProduct?.description,
    ...(isVariation && variation
      ? {
          name:
            variation.name ||
            parentProduct?.name ||
            parentProduct?.title ||
            (parentProduct?.description
              ? String(parentProduct.description).split('\n')[0].trim()
              : undefined),
          description:
            variation.description ||
            parentProduct?.ecommerceDescription ||
            parentProduct?.ecommerce_description ||
            parentProduct?.description,
          ecommerceDescription:
            variation.description ||
            parentProduct?.ecommerceDescription ||
            parentProduct?.ecommerce_description ||
            parentProduct?.description,
          unitPrice:
            variation.syncUnitPrice !== false
              ? (parentProduct?.unitPrice ?? parentProduct?.unit_price ?? parentProduct?.price)
              : (variation.unitPrice ??
                variation.price ??
                parentProduct?.unitPrice ??
                parentProduct?.unit_price ??
                parentProduct?.price),
          images: varImages,
          width:
            variation.syncWidth !== false
              ? parentProduct?.width
              : (variation.width ?? parentProduct?.width),
          height:
            variation.syncHeight !== false
              ? parentProduct?.height
              : (variation.height ?? parentProduct?.height),
          depth:
            variation.syncDepth !== false
              ? parentProduct?.depth
              : (variation.depth ?? parentProduct?.depth),
        }
      : {}),
  };

  const ecomResult = checkEcomLegibility(effectiveProduct, categoryRequirements, options);
  if (!ecomResult.isLegible) {
    const errorList = ecomResult.errors;
    let message = '';
    if (errorList.length === 1) {
      message = `Não foi possível publicar no Catálogo Digital.\nCampo obrigatório pendente:\n• ${errorList[0]}`;
    } else {
      message = `Não foi possível publicar no Catálogo Digital.\nCampos obrigatórios pendentes:\n• ${errorList.join('\n• ')}`;
    }
    if (isDraft) {
      message +=
        '\n\nO produto é um rascunho. Conclua o cadastro do produto para salvá-lo como finalizado.';
    }
    return {
      isValid: false,
      errorMessage: message,
    };
  }

  if (isDraft) {
    return {
      isValid: false,
      errorMessage:
        'Não foi possível publicar no Catálogo Digital: o produto é um rascunho. Conclua o cadastro salvando-o como finalizado para poder publicá-lo.',
    };
  }

  return { isValid: true };
};
