import type {
  CatalogCharacteristicRequirement,
  CatalogCharacteristicGroup,
} from './types';
import {
  normalizeCharacteristicName,
  normalizeCharacteristicKey,
  getCharacteristicNameAliases,
  readCharacteristicValue,
  hasRequiredCatalogValue,
  getProductCategoryIds,
  isCatalogCoreRequiredCharacteristicName,
} from './characteristicValues';
import { isCatalogNeverRequiredCharacteristicName } from './requiredCharacteristicPolicy';
import {
  evaluateCharacteristicDependencies,
  evaluateCharacteristicDependency,
  getCharacteristicDependencies,
} from '../characteristicDependencyRules';

/** Returns category-required characteristics that have no usable value on the product or its variants. */
export const getMissingCategoryRequiredCharacteristics = (
  data: Readonly<Record<string, any>>,
  requirements: readonly CatalogCharacteristicRequirement[],
  _characteristicGroups: readonly CatalogCharacteristicGroup[] = []
): string[] => {
  const activeCategories = new Set(getProductCategoryIds(data));
  const getCharacteristicApplication = (requirement: CatalogCharacteristicRequirement) => {
    const configured = requirement.categoryApplications?.filter((application) =>
      activeCategories.has(String(application.categoryId))
    ) ?? [];
    if (configured.length > 0) {
      if (configured.some((application) => application.application === 'required')) {
        return isCatalogNeverRequiredCharacteristicName(requirement.name) ? 'optional' : 'required';
      }
      if (configured.some((application) => application.application === 'optional')) return 'optional';
      return 'unavailable';
    }
    if (requirement.requiredProductCategoryIds?.some((id) => activeCategories.has(String(id)))) {
      return isCatalogNeverRequiredCharacteristicName(requirement.name) ? 'optional' : 'required';
    }
    if (requirement.categoryIds?.some((id) => activeCategories.has(String(id)))) return 'optional';
    if (requirement.requiredForCategory || requirement.requiredCategoryIds?.some((id) =>
      activeCategories.has(String(id))
    )) return 'optional';
    return undefined;
  };
  // Catalog requirements are independent of the editor's application setting.
  // A category-required characteristic must remain visible and validated even
  // when the form metadata says "unavailable".
  const hasCatalogRequiredCategory = (requirement: CatalogCharacteristicRequirement) =>
    !isCatalogNeverRequiredCharacteristicName(requirement.name) &&
    Boolean(requirement.requiredCategoryIds?.some((id) =>
      activeCategories.has(String(id))
    ));
  const isRequiredForCategory = (requirement: CatalogCharacteristicRequirement) => {
    if (isCatalogNeverRequiredCharacteristicName(requirement.name)) return false;
    if (hasCatalogRequiredCategory(requirement)) return true;
    return requirement.requiredForCategory === true;
  };
  const isService = data.itemType === 'service' || data.item_type === 'service';
  const globalRequiredNames = isService ? [] : [
    'Marca',
    'Modelo/Linha',
    ...['Profundidade total'].filter((name) => {
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
    }),
  ];
  const categoryRequiredNames = requirements
    .filter(
      (requirement) => {
        if (isCatalogNeverRequiredCharacteristicName(requirement.name)) return false;
        if (
          getCharacteristicApplication(requirement) === 'unavailable' &&
          !hasCatalogRequiredCategory(requirement)
        ) return false;
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
  const isCharacteristicRequired = (field: CatalogCharacteristicRequirement) => {
    if (isCatalogNeverRequiredCharacteristicName(field.name)) return false;
    if (
      (!isService && isCatalogCoreRequiredCharacteristicName(field.name)) ||
      hasCatalogRequiredCategory(field)
    ) return true;
    return getCharacteristicApplication(field) !== 'unavailable' &&
      isRequiredForCategory(field);
  };
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
    const isCatalogRequired = isCharacteristicRequired(field);
    if (getCharacteristicApplication(field) === 'unavailable' && !isCatalogRequired) return false;
    if (!isDependencySatisfied(field, data, visited)) return false;
    if (isCatalogRequired) return true;
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
    if (
      !field.id ||
      (field.active === false &&
        !hasStoredGroupFieldValue(field) &&
        !isCharacteristicRequired(field))
    ) {
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
