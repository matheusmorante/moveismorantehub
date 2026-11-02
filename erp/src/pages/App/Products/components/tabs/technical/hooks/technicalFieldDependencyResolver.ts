import type Product from '@/pages/types/product.type';
import type { TechnicalFieldDefinition } from '@/pages/utils/technicalValuesService';
import {
  getCharacteristicDependencyState,
  isTechnicalFieldVariable,
} from '@/pages/utils/technicalValuesService';
import { areTechnicalCharacteristicNamesEquivalent } from '../../../../../../../../../shared-utils/productTechnicalFieldScope';
import {
  evaluateCharacteristicDependencies,
  evaluateCharacteristicDependency,
  getCharacteristicDependencies,
} from '../../../../../../../../../shared-utils/characteristicDependencyRules';

type CreateTechnicalFieldDependencyResolverParams = {
  readonly allTechnicalFields: readonly TechnicalFieldDefinition[];
  readonly formData: Partial<Product>;
  readonly technicalValues: Record<string, any>;
  readonly isMultiVariationProduct: boolean;
  readonly variableTechnicalFieldNames: string[];
  readonly isDependencyReferenceGroupActive: (field: TechnicalFieldDefinition) => boolean;
};

export const createTechnicalFieldDependencyResolver = ({
  allTechnicalFields,
  formData,
  technicalValues,
  isMultiVariationProduct,
  variableTechnicalFieldNames,
  isDependencyReferenceGroupActive,
}: CreateTechnicalFieldDependencyResolverParams) => {
  const getFieldValue = (
    field: TechnicalFieldDefinition,
    variation?: NonNullable<Product['variations']>[number]
  ): unknown => {
    if (variation) {
      const variationEntry = Object.entries(variation.technicalValues || {}).find(([name]) =>
        areTechnicalCharacteristicNamesEquivalent(name, field.name)
      );
      if (variationEntry) return variationEntry[1];
      const attribute = variation.attributes?.find((item) =>
        areTechnicalCharacteristicNamesEquivalent(item.name, field.name)
      );
      return attribute?.value;
    }

    const productEntry = Object.entries(technicalValues).find(([name]) =>
      areTechnicalCharacteristicNamesEquivalent(name, field.name)
    );
    return productEntry?.[1];
  };

  const isConfiguredDependencySatisfied = (
    field: TechnicalFieldDefinition,
    variation: NonNullable<Product['variations']>[number] | undefined,
    visited = new Set<string>()
  ): boolean => {
    if (visited.has(field.id)) return false;
    const nextVisited = new Set(visited).add(field.id);
    if (!field.dependency) {
      const legacyDependency = getCharacteristicDependencyState(
        field.name,
        variation ? { ...technicalValues, ...(variation.technicalValues || {}) } : technicalValues
      );
      return !legacyDependency.isDependent || !legacyDependency.isDisabled;
    }

      return evaluateCharacteristicDependencies(
        getCharacteristicDependencies(field),
        field.dependencyLogic,
        (dependency) => {
          const reference = allTechnicalFields.find((candidate) => candidate.id === dependency.referenceAttributeId);
          if (!reference || !isDependencyReferenceGroupActive(reference) ||
              !isConfiguredDependencySatisfied(reference, variation, nextVisited)) return false;
          const referenceIsVariable = isMultiVariationProduct &&
            isTechnicalFieldVariable(reference.name, variableTechnicalFieldNames);
          return evaluateCharacteristicDependency(dependency, reference.dataType,
            getFieldValue(reference, referenceIsVariable ? variation : undefined));
        }
      );
  };

  const isFieldDependencySatisfied = (
    field: TechnicalFieldDefinition
  ): { satisfied: boolean; referenceIsVariable: boolean } => {
    if (!field.dependency) {
      const legacyDependency = getCharacteristicDependencyState(field.name, technicalValues);
      return { satisfied: !legacyDependency.isDependent || !legacyDependency.isDisabled, referenceIsVariable: false };
    }

    const referenceIsVariable = isMultiVariationProduct && getCharacteristicDependencies(field).some((dependency) => {
      const reference = allTechnicalFields.find((candidate) => candidate.id === dependency.referenceAttributeId);
      return reference && isTechnicalFieldVariable(reference.name, variableTechnicalFieldNames);
    });
    const variations = (formData.variations || []).filter((variation) => variation.active !== false);
    const contexts = referenceIsVariable && variations.length > 0 ? variations : [undefined];
    return {
      satisfied: contexts.some((variation) =>
        isConfiguredDependencySatisfied(field, variation)
      ),
      referenceIsVariable,
    };
  };

  return isFieldDependencySatisfied;
};
