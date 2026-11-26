import type React from 'react';
import { useCallback } from 'react';
import {
  getProductCharacteristicAttributes,
  getTechnicalValue,
  removeProductCharacteristicAttribute,
  upsertProductCharacteristicAttribute,
} from '../../../domain/productCharacteristics';
import {
  getProductTechnicalRootPatch,
} from '../../../../../../../shared-utils/productTechnicalRootPatch';
import {
  getProductTechnicalDimensionField,
  parseProductTechnicalDimension,
} from '../../../../../../../shared-utils/productTechnicalDimensions';
import { isQuantityCharacteristic } from '../../../../../../../shared-utils/productCharacteristicDependencies';
import { getDefaultShowNameForVariationOverride } from '../../../../../../../shared-utils/productVariationAttributeDefaults';
import {
  cleanupDependentCharacteristicsOnZero,
  cleanupDependentVariationAttributesOnQuantityChange,
} from '../../../../../../../shared-utils/productDependentCharacteristicCleanup';
import { removeProductTechnicalValueAliases } from '../../../../../../../shared-utils/productTechnicalValueAliases';
import type { MobileProductTechnicalField } from '../../../services/categories/mobileProductTechnicalService';
import { createProductTechnicalFieldScopeAction } from './productTechnicalFieldScopeAction';
import { normalizeName } from './productTechnicalTabFieldVisibility';

/** Encapsula mutações de valores técnicos, limpeza manual em variações, escopo e alternância profundidade/comprimento. */
export function useProductTechnicalValueHandlers({
  setFormData,
  setManualFieldNames,
  parentData,
  technicalFields,
  ownTechnicalValues,
  parentTechnicalValues,
  categoryIds,
  selectedCategoryName,
}: {
  setFormData: (fn: (prev: any) => any) => void;
  setManualFieldNames: React.Dispatch<React.SetStateAction<string[]>>;
  parentData?: any;
  technicalFields: MobileProductTechnicalField[];
  ownTechnicalValues: Record<string, any>;
  parentTechnicalValues: Record<string, any>;
  categoryIds: string[];
  selectedCategoryName: string;
}) {
  const setTechnicalValue = useCallback(
    (name: string, value: any) =>
      setFormData((prev: any) => {
        const currentValue = getTechnicalValue(prev.technicalValues || {}, name);
        const currentHasQuantity =
          currentValue !== undefined &&
          currentValue !== null &&
          String(currentValue).trim() !== '' &&
          Number.isFinite(Number(String(currentValue).replace(',', '.')));
        if (
          isQuantityCharacteristic(name) &&
          (value === '' || value === null || value === undefined) &&
          currentHasQuantity
        ) {
          return prev;
        }

        const technicalValues = cleanupDependentCharacteristicsOnZero(
          {
            ...removeProductTechnicalValueAliases(prev.technicalValues || {}, name),
            [name]: value,
          },
          name,
          value
        );
        const next: any = {
          ...prev,
          ...(!parentData ? getProductTechnicalRootPatch(name, value) : {}),
          technicalValues,
        };
        if (parentData) {
          const attributes = cleanupDependentVariationAttributesOnQuantityChange(
            getProductCharacteristicAttributes(prev.attributes)
          );
          next.attributes = upsertProductCharacteristicAttribute(
            attributes,
            name,
            value,
            getDefaultShowNameForVariationOverride(name)
          );
        }
        // O ERP grava as dimensões físicas no Produto pai. Na edição da variação,
        // a característica própria fica em technicalValues/attributes e não altera
        // as colunas herdadas de dimensão da variação.
        const dimensionField = parentData ? null : getProductTechnicalDimensionField(name);
        if (dimensionField) {
          next[dimensionField] = parseProductTechnicalDimension(value);
        }
        return next;
      }),
    [parentData, setFormData]
  );

  const removeManualVariationField = (fieldName: string) => {
    setManualFieldNames((previous) => previous.filter((name) => name !== fieldName));
    setFormData((previous: any) => ({
      ...previous,
      technicalValues: removeProductTechnicalValueAliases(
        previous.technicalValues || {},
        fieldName
      ),
      attributes: removeProductCharacteristicAttribute(previous.attributes, fieldName),
    }));
  };

  const setFieldScope = createProductTechnicalFieldScopeAction({
    setFormData,
    parentData,
    technicalFields,
    categoryIds,
    selectedCategoryName,
  });

  const toggleDepthLength = (field: any) => {
    const sourceName = field.name;
    const targetName =
      normalizeName(sourceName) === 'profundidade' ? 'Comprimento' : 'Profundidade';
    const targetField = technicalFields.find(
      (technicalField) => normalizeName(technicalField.name) === normalizeName(targetName)
    );
    if (!targetField) return;

    const currentValue =
      getTechnicalValue(ownTechnicalValues, sourceName) ??
      getTechnicalValue(parentTechnicalValues, sourceName) ??
      '';
    setFormData((prev: any) => {
      const technicalValues = Object.fromEntries(
        Object.entries(prev.technicalValues || {}).filter(
          ([name]) =>
            normalizeName(name) !== normalizeName(sourceName) &&
            normalizeName(name) !== normalizeName(targetField.name)
        )
      );
      technicalValues[targetField.name] = currentValue;
      const next: any = { ...prev, technicalValues };
      if (parentData) {
        next.attributes = upsertProductCharacteristicAttribute(
          prev.attributes,
          targetField.name,
          currentValue
        );
        next.attributes = removeProductCharacteristicAttribute(next.attributes, sourceName);
        next.depth = currentValue;
        next.syncDepth = false;
      } else {
        next.depth = currentValue;
      }
      return next;
    });
  };

  return {
    setTechnicalValue,
    removeManualVariationField,
    setFieldScope,
    toggleDepthLength,
  };
}
