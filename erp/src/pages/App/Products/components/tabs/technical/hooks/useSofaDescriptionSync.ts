import { useEffect } from 'react';
import type Product from '@/pages/types/product.type';
import { TechnicalFieldDefinition } from '@/pages/utils/technicalValuesService';
import { extractSofaDescriptionCharacteristics } from '../sofaDescriptionCharacteristics';
import { applyTechnicalValueChangeToProduct } from '../technicalSyncUtils';
import {
  SOFA_ONLY_DIMENSION_DEFAULTS,
  SOFA_RETRACTABLE_FIELD,
  isMissingTechnicalValue,
} from './sofaTechnicalConstants';

export interface UseSofaDescriptionSyncParams {
  readonly formData: Partial<Product>;
  readonly setFormData: React.Dispatch<React.SetStateAction<Partial<Product>>>;
  readonly isSofaCategorySelected: boolean;
  readonly allTechnicalFields: readonly TechnicalFieldDefinition[];
}

export const useSofaDescriptionSync = ({
  formData,
  setFormData,
  isSofaCategorySelected,
  allTechnicalFields,
}: UseSofaDescriptionSyncParams): void => {
  useEffect(() => {
    if (!isSofaCategorySelected || !formData.description || allTechnicalFields.length === 0) return;

    const extractedValues = extractSofaDescriptionCharacteristics(
      formData.description,
      [...allTechnicalFields, ...SOFA_ONLY_DIMENSION_DEFAULTS, SOFA_RETRACTABLE_FIELD],
      formData.categoryIds || []
    );
    if (Object.keys(extractedValues).length === 0) return;

    setFormData((prev) => {
      let next = prev;
      Object.entries(extractedValues).forEach(([fieldName, value]) => {
        if (isMissingTechnicalValue(next.technicalValues?.[fieldName])) {
          next = applyTechnicalValueChangeToProduct(next, fieldName, value);
        }
      });
      return next;
    });
  }, [
    allTechnicalFields,
    formData.categoryIds,
    formData.description,
    isSofaCategorySelected,
    setFormData,
  ]);
};
