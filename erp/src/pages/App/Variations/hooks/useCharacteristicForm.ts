import { useEffect, useMemo, useState } from 'react';
import { flattenFormErrors, useZodForm } from '@/hooks/useZodForm';
import type {
  default as VariationType,
  CategoryApplication,
  CharacteristicGroup,
} from '../../../types/variation.type';
import {
  getVariationErrorMessage,
  saveVariation,
} from '../../../utils/variationService';
import { sortAttributeValuesNaturally } from '../../../utils/attributeValueSorting';
import {
  type CharacteristicFormData,
  type CharacteristicSaveStatus,
  createManagedCharacteristicFormSchema,
  getInitialCharacteristicFormData,
  isChoiceCharacteristicType,
} from '../domain/characteristicFormRules';
import type { ProductCategoryOption } from '../../../utils/characteristicGroupService';
import { getCharacteristicTextLimits } from '../../../../../../shared-utils/characteristicTextLimits';

const getSortedInitialCharacteristicFormData = (
  ...args: Parameters<typeof getInitialCharacteristicFormData>
): CharacteristicFormData => {
  const initialData = getInitialCharacteristicFormData(...args);
  return {
    ...initialData,
    active: true,
    options: sortAttributeValuesNaturally(initialData.options).map((option, sortOrder) => ({
      ...option,
      sortOrder,
    })),
  };
};

interface UseCharacteristicFormParams {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly onSuccess?: () => void | Promise<void>;
  readonly variation?: VariationType | null;
  readonly allVariations?: readonly VariationType[];
  readonly groups?: readonly CharacteristicGroup[];
  readonly categories?: readonly ProductCategoryOption[];
  readonly defaultGroupId?: string;
}

export const useCharacteristicForm = ({
  isOpen,
  onClose,
  onSuccess,
  variation,
  allVariations = [],
  groups = [],
  categories = [],
  defaultGroupId = '',
}: UseCharacteristicFormParams) => {
  const [formData, setFormData] = useState<CharacteristicFormData>(() =>
    getSortedInitialCharacteristicFormData(variation, defaultGroupId, categories)
  );
  const [saveStatus, setSaveStatus] = useState<CharacteristicSaveStatus>('saved');
  const [saveError, setSaveError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const schema = useMemo(
    () => createManagedCharacteristicFormSchema(
      allVariations,
      variation?.id,
      groups,
      categories.map((category) => category.id)
    ),
    [allVariations, categories, groups, variation?.id]
  );
  const { validateAndRun } = useZodForm(schema, formData);

  useEffect(() => {
    if (!isOpen) return;
    setFormData(getSortedInitialCharacteristicFormData(variation, defaultGroupId, categories));
    setSaveStatus('saved');
    setSaveError('');
  }, [categories, defaultGroupId, isOpen, variation?.id]);

  const changeFormData = (update: (current: CharacteristicFormData) => CharacteristicFormData) => {
    setFormData((current) => update(current));
    setSaveStatus('saved');
    setSaveError('');
  };

  const handleTypeChange = (dataType: CharacteristicFormData['dataType']) => {
    changeFormData((current) => ({
      ...current,
      dataType,
      unit: '',
      configuration: getCharacteristicTextLimits(dataType) ?? {},
    }));
  };

  const save = async () => {
    if (isSaving) return;
    setIsSaving(true);
    setSaveStatus('saving');
    setSaveError('');
    try {
      const savedId = await validateAndRun(
        formData,
        async (values) => saveVariation({
          id: variation?.id,
          name: values.name,
          groupId: values.groupId,
          options: values.dataType === 'boolean'
            ? undefined
            : (isChoiceCharacteristicType(values.dataType) ? values.options : []).map((option, index) => ({
                ...option,
                active: option.active !== false,
                sortOrder: index,
              })),
          active: true,
          dataType: values.dataType,
          unit: values.unit.trim(),
          decimalPlaces: values.dataType === 'decimal' ? values.decimalPlaces : undefined,
          configuration: {
            ...values.configuration,
          },
          dependency: null,
          categoryApplications: values.categoryApplications.map((item) => ({
            categoryId: item.categoryId,
            // The Zod resolver rejects empty applications before this operation runs.
            application: item.application as CategoryApplication['application'],
          })),
          isCustom: variation?.isCustom ?? true,
        }),
        (errors) => {
          const firstError = Object.values(flattenFormErrors(errors))[0];
          setSaveStatus('error');
          setSaveError(firstError || 'Confira os campos da característica.');
        }
      );
      if (savedId === false) return;
      setSaveStatus('saved');
      await onSuccess?.();
      onClose();
    } catch (error: unknown) {
      setSaveStatus('error');
      setSaveError(getVariationErrorMessage(error, 'Não foi possível salvar a característica.'));
    } finally {
      setIsSaving(false);
    }
  };

  return {
    formData,
    setFormData,
    changeFormData,
    handleTypeChange,
    save,
    saveStatus,
    saveError,
    isSaving: isSaving || !isOpen,
  };
};
