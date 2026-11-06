import {
  getCharacteristicDependencyState,
  getEffectiveProductTechnicalValues,
  getProductCharacteristicAttributes,
  getTechnicalValue,
  hasTechnicalValue,
  isMobileVariableTechnicalField,
  isProductTechnicalFieldRequired,
  isProductTechnicalFieldRequiredForCatalog,
  isQuantityCharacteristic,
  resolveMobileVariableTechnicalFieldNames,
} from '../../domain/productCharacteristics';
import { getProductTechnicalDimensionField } from '../../../../../../shared-utils/productTechnicalDimensions';
import { getProductTechnicalRootPatch } from '../../../../../../shared-utils/productTechnicalRootPatch';
import type { MobileProductTechnicalField } from '../../services/mobileProductTechnicalService';
import { normalizeSearchTerm } from './productTechnicalTabFieldVisibility';

type ProductTechnicalFieldScope = 'not_inform' | 'global' | 'variation';

interface Args {
  setFormData: (fn: (previous: any) => any) => void;
  parentData?: any;
  technicalFields: MobileProductTechnicalField[];
  categoryIds: string[];
  selectedCategoryName: string;
}

export const createProductTechnicalFieldScopeAction = ({
  setFormData,
  parentData,
  technicalFields,
  categoryIds,
  selectedCategoryName,
}: Args) => (fieldName: string, scope: ProductTechnicalFieldScope) => {
  const requiredCatalogField = technicalFields.find(
    (field) => normalizeSearchTerm(field.name) === normalizeSearchTerm(fieldName)
  );
  if (
    scope === 'not_inform' &&
    requiredCatalogField &&
    (isProductTechnicalFieldRequired(
      requiredCatalogField,
      categoryIds,
      selectedCategoryName
    ) ||
      isProductTechnicalFieldRequiredForCatalog(
        requiredCatalogField,
        categoryIds,
        selectedCategoryName
      ))
  ) return;

  setFormData((previous: any) => {
    const configuredNames = resolveMobileVariableTechnicalFieldNames(previous);
    const isVariable = isMobileVariableTechnicalField(fieldName, configuredNames);
    const variableTechnicalFields =
      scope === 'variation'
        ? isVariable
          ? configuredNames
          : [...configuredNames, fieldName]
        : configuredNames.filter(
            (name) => !isMobileVariableTechnicalField(fieldName, [name])
          );
    const next = { ...previous, variableTechnicalFields };
    if (scope === 'not_inform') {
      const dependency = getCharacteristicDependencyState(
        fieldName,
        getEffectiveProductTechnicalValues(previous)
      );
      if (
        dependency.isDependent &&
        !dependency.isDisabled &&
        !isProductTechnicalFieldRequired(
          requiredCatalogField || { name: fieldName },
          categoryIds,
          selectedCategoryName
        ) &&
        !isProductTechnicalFieldRequiredForCatalog(
          requiredCatalogField || { name: fieldName },
          categoryIds,
          selectedCategoryName
        )
      ) {
        return {
          ...next,
          technicalValues: {
            ...(previous.technicalValues || {}),
            [fieldName]: 'Não se aplica',
          },
        };
      }
      const technicalValues = Object.fromEntries(
        Object.entries(previous.technicalValues || {}).filter(
          ([name]) => normalizeSearchTerm(name) !== normalizeSearchTerm(fieldName)
        )
      );
      const attributes = getProductCharacteristicAttributes(previous.attributes).filter(
        (attribute) => normalizeSearchTerm(attribute.name) !== normalizeSearchTerm(fieldName)
      );
      const dimensionField = parentData ? null : getProductTechnicalDimensionField(fieldName);
      return {
        ...next,
        technicalValues,
        attributes,
        ...(!parentData ? getProductTechnicalRootPatch(fieldName, undefined) : {}),
        ...(dimensionField ? { [dimensionField]: undefined } : {}),
      };
    }
    const currentTechnicalValue = getTechnicalValue(
      getEffectiveProductTechnicalValues(previous),
      fieldName
    );
    const isCurrentlyNotApplicable = [
      'nao se aplica',
      'n/a',
      'nao informar',
    ].includes(normalizeSearchTerm(String(currentTechnicalValue ?? '')));
    if (
      scope === 'global' &&
      (isCurrentlyNotApplicable ||
        !hasTechnicalValue(getEffectiveProductTechnicalValues(previous), fieldName))
    ) {
      return {
        ...next,
        technicalValues: {
          ...(previous.technicalValues || {}),
          [fieldName]: requiredCatalogField?.data_type === 'boolean' || isQuantityCharacteristic(fieldName) ? null : '',
        },
      };
    }
    return next;
  });
};
