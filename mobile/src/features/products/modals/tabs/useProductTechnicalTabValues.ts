import { useCallback, useMemo } from 'react';
import {
  getEffectiveProductTechnicalValues,
  getEffectiveVariationTechnicalValues,
  getTechnicalValue,
  hasTechnicalValue,
  isDoorQuantityCharacteristic,
  isDrawerQuantityCharacteristic,
  isHasDoorsCharacteristic,
  isHasDrawersCharacteristic,
  isMobileProductFormTechnicalFieldVariable,
  isMobileVariableTechnicalField,
  isQuantityCharacteristic,
  resolveMobileVariableTechnicalFieldNames,
} from '../../domain/productCharacteristics';
import { getProductTechnicalRootFallbackValue } from '../../../../../../shared-utils/productTechnicalRootPatch';
import type { MobileProductTechnicalField } from '../../services/mobileProductTechnicalService';

interface Args {
  formData: any;
  parentData?: any;
  technicalFields: MobileProductTechnicalField[];
}

export const useProductTechnicalTabValues = ({
  formData,
  parentData,
  technicalFields,
}: Args) => {
  const parentTechnicalValues = useMemo(
    () => {
      if (!parentData) return {};
      const values = getEffectiveProductTechnicalValues(parentData);
      const dimensions = [
        ['Altura', parentData.height],
        ['Largura', parentData.width],
        [parentData.depthUseLength || parentData.depth_use_length ? 'Comprimento' : 'Profundidade', parentData.depth],
        ['Peso', parentData.weight],
      ] as const;
      for (const [name, value] of dimensions) {
        if (
          value !== undefined &&
          value !== null &&
          String(value).trim() &&
          !String(getTechnicalValue(values, name) ?? '').trim()
        ) {
          values[name] = value;
        }
      }
      return values;
    },
    [
      parentData?.attributes,
      parentData?.technicalValues,
      parentData?.technical_specs,
      parentData?.height,
      parentData?.width,
      parentData?.depth,
      parentData?.weight,
      parentData?.depthUseLength,
      parentData?.depth_use_length,
    ]
  );
  const variableTechnicalFieldNames = useMemo(
    () => resolveMobileVariableTechnicalFieldNames(parentData || formData),
    [
      parentData?.variableTechnicalFields,
      parentData?.technical_specs,
      parentData?.variations,
      formData.variableTechnicalFields,
      formData.variations,
    ]
  );
  const isVariableField = useCallback(
    (fieldName: string) =>
      isMobileProductFormTechnicalFieldVariable(fieldName, variableTechnicalFieldNames),
    [variableTechnicalFieldNames]
  );
  const isVariationEditing = Boolean(parentData);
  const ownTechnicalValues = useMemo(
    () => {
      // Root weight is an own fallback only for products and variations that do not inherit it.
      const values = getEffectiveVariationTechnicalValues({}, formData);
      const usesOwnWeight =
        !isVariationEditing ||
        formData.syncWeight === false ||
        formData.use_parent_dimensions === false;

      if (usesOwnWeight && !hasTechnicalValue(values, 'Peso')) {
        const fallback = getProductTechnicalRootFallbackValue('Peso', formData);
        if (fallback !== undefined) values.Peso = fallback;
      }

      return values;
    },
    [
      formData.attributes,
      formData.technicalValues,
      formData.weight,
      formData.syncWeight,
      formData.use_parent_dimensions,
      isVariationEditing,
    ]
  );
  const dependencyValues = useMemo(() => {
    const values = { ...parentTechnicalValues, ...ownTechnicalValues };

    const useVariationQuantity = (
      isQuantity: (name: string) => boolean,
      isLegacyToggle: (name: string) => boolean
    ) => {
      const quantityName = technicalFields.find(
        (field) => isQuantity(field.name) && isMobileVariableTechnicalField(field.name, variableTechnicalFieldNames)
      )?.name;
      if (!quantityName) return;

      const ownQuantity = Object.entries(ownTechnicalValues).find(([name]) => isQuantity(name));
      Object.keys(values).forEach((name) => {
        if (isQuantity(name) || isLegacyToggle(name)) delete values[name];
      });
      if (ownQuantity) values[quantityName] = ownQuantity[1];
    };

    if (parentData) {
      useVariationQuantity(isDoorQuantityCharacteristic, isHasDoorsCharacteristic);
      useVariationQuantity(isDrawerQuantityCharacteristic, isHasDrawersCharacteristic);
    }
    return values;
  }, [
    technicalFields,
    parentData,
    parentTechnicalValues,
    ownTechnicalValues,
    variableTechnicalFieldNames,
  ]);
  const categoryIds: string[] = useMemo(
    () =>
      parentData
        ? parentData.categoryIds || (parentData.categoryId ? [parentData.categoryId] : [])
        : formData.categoryIds || (formData.categoryId ? [formData.categoryId] : []),
    [parentData?.categoryIds, parentData?.categoryId, formData.categoryIds, formData.categoryId]
  );
  const selectedCategoryName = String(
    (parentData || formData).categoryName || (parentData || formData).category || ''
  );
  const isSimpleProduct =
    !parentData &&
    !formData.hasVariations &&
    (!Array.isArray(formData.variations) || formData.variations.length <= 1);

  return {
    parentTechnicalValues,
    variableTechnicalFieldNames,
    isVariableField,
    isVariationEditing,
    ownTechnicalValues,
    dependencyValues,
    categoryIds,
    selectedCategoryName,
    isSimpleProduct,
  };
};
