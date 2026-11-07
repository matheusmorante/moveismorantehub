import {
  getProductTechnicalDependencyChain,
  getTechnicalValue,
  hasTechnicalValue,
  isConfiguredProductTechnicalDependencySatisfied,
  isProductTechnicalFieldRequiredForCatalog,
} from '../../domain/productCharacteristics';
import type { MobileProductTechnicalField } from '../../services/mobileProductTechnicalService';
import { normalizeName, normalizeSearchTerm } from './productTechnicalTabFieldVisibility';

interface ResolveConfiguredProductTechnicalDependencyReferenceIdsArgs {
  isSimpleProduct: boolean;
  visibleTechnicalFields: MobileProductTechnicalField[];
  ownTechnicalValues: Record<string, unknown>;
  manualFieldNames: string[];
  isFieldRequired: (field: MobileProductTechnicalField) => boolean;
  categoryIds: string[];
  selectedCategoryName: string;
  dependencyValues: Record<string, unknown>;
}

/** Resolve IDs of configured references that keep their optional dependencies visible. */
export const resolveConfiguredProductTechnicalDependencyReferenceIds = ({
  isSimpleProduct,
  visibleTechnicalFields,
  ownTechnicalValues,
  manualFieldNames,
  isFieldRequired,
  categoryIds,
  selectedCategoryName,
  dependencyValues,
}: ResolveConfiguredProductTechnicalDependencyReferenceIdsArgs): Set<string> => {
  const referenceIds = new Set<string>();
  if (!isSimpleProduct) return referenceIds;

  const selectedRoots = visibleTechnicalFields.filter((field) => {
    if (!field.dependency) return false;
    const value = getTechnicalValue(ownTechnicalValues, field.name);
    const hasStoredValue = hasTechnicalValue(ownTechnicalValues, field.name) &&
      !['nao se aplica', 'nao informar', 'n/a'].includes(
        normalizeSearchTerm(String(value ?? ''))
      );
    const isSelectedManually = manualFieldNames.some(
      (name) => normalizeName(name) === normalizeName(field.name)
    );
    return isFieldRequired(field) ||
      isProductTechnicalFieldRequiredForCatalog(field, categoryIds, selectedCategoryName) ||
      isSelectedManually || hasStoredValue;
  });

  selectedRoots.forEach((field) => {
    getProductTechnicalDependencyChain(field, visibleTechnicalFields)
      .slice(1)
      .forEach((reference) => {
        if (
          reference.id &&
          isConfiguredProductTechnicalDependencySatisfied(
            reference,
            visibleTechnicalFields,
            dependencyValues
          )
        ) referenceIds.add(reference.id);
      });
  });
  return referenceIds;
};
