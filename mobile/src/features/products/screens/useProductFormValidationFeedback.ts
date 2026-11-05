import { useCallback, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { Alert } from 'react-native';
import { flattenFormErrors } from '../../../hooks/useZodForm';
import {
  hasMobileProductDescriptionTechnicalValidationError,
  isMobileProductCategoryError,
  isMobileProductCostPriceError,
  isMobileProductNameError,
  isMobileProductSupplierError,
  isMobileProductUnitPriceError,
  resolveMobileProductFormErrorMessage,
  resolveMobileProductFormErrorNavigation,
  type MobileProductFormErrorNavigation,
} from '../domain/mobileProductFormErrorNavigation';
import type { TabId } from './productFormTabs';

interface UseProductFormValidationFeedbackParams {
  setActiveTab: Dispatch<SetStateAction<TabId>>;
  setAutoSaveError: Dispatch<SetStateAction<string>>;
}

export function useProductFormValidationFeedback({
  setActiveTab,
  setAutoSaveError,
}: UseProductFormValidationFeedbackParams) {
  const [nameError, setNameError] = useState(false);
  const [categoryError, setCategoryError] = useState(false);
  const [costPriceError, setCostPriceError] = useState(false);
  const [unitPriceError, setUnitPriceError] = useState(false);
  const [supplierError, setSupplierError] = useState(false);
  const [descriptionTechnicalValidationError, setDescriptionTechnicalValidationError] = useState(false);
  const [variationValidationTarget, setVariationValidationTarget] =
    useState<MobileProductFormErrorNavigation | null>(null);
  const [ncmError, setNcmError] = useState(false);

  const clearVariationValidationTarget = useCallback(
    () => setVariationValidationTarget(null),
    []
  );

  const resetFieldValidationErrors = useCallback(() => {
    setNameError(false);
    setCategoryError(false);
    setCostPriceError(false);
    setUnitPriceError(false);
    setSupplierError(false);
    setDescriptionTechnicalValidationError(false);
  }, []);

  const presentValidationErrors = useCallback((
    errors: Parameters<typeof flattenFormErrors>[0],
    isDraft: boolean,
    showAlert: boolean
  ) => {
    const messages = flattenFormErrors(errors);
    if (showAlert) {
      setDescriptionTechnicalValidationError(
        !isDraft && hasMobileProductDescriptionTechnicalValidationError(messages)
      );
    }
    const firstErrorPath = Object.keys(messages)[0] || '';
    const fieldPath = isMobileProductNameError('name', messages) ? 'name' : firstErrorPath;
    setNameError(fieldPath === 'name');
    setCategoryError(isMobileProductCategoryError('categoryIds', messages));
    setCostPriceError(isMobileProductCostPriceError(firstErrorPath, messages));
    setUnitPriceError(isMobileProductUnitPriceError(firstErrorPath, messages));
    setSupplierError(isMobileProductSupplierError(firstErrorPath, messages));
    const navigation = resolveMobileProductFormErrorNavigation(fieldPath);
    if (navigation) setActiveTab(navigation.tab);
    setVariationValidationTarget(
      navigation?.variationIndex !== undefined ? navigation : null
    );
    setNcmError(navigation?.tab === 'fiscal');
    const message = resolveMobileProductFormErrorMessage(fieldPath, messages, isDraft);
    if (showAlert) Alert.alert('Confira os campos', message);
    else setAutoSaveError(message);
  }, [setActiveTab, setAutoSaveError]);

  return {
    nameError,
    setNameError,
    categoryError,
    setCategoryError,
    costPriceError,
    setCostPriceError,
    unitPriceError,
    setUnitPriceError,
    supplierError,
    setSupplierError,
    descriptionTechnicalValidationError,
    setDescriptionTechnicalValidationError,
    variationValidationTarget,
    ncmError,
    clearVariationValidationTarget,
    resetFieldValidationErrors,
    presentValidationErrors,
  };
}
