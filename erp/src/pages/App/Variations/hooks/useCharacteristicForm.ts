import { useEffect, useMemo, useState } from 'react';
import { flattenFormErrors, useZodForm } from '@/hooks/useZodForm';
import type {
  default as VariationType,
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
  isFactoryDefaultCharacteristicName,
  normalizeManagedCharacteristicType,
} from '../domain/characteristicFormRules';
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
  readonly onSuccess?: (
    savedId: string,
    values: CharacteristicFormData,
    wasNew: boolean,
  ) => void | Promise<void>;
  readonly variation?: VariationType | null;
  readonly allVariations?: readonly VariationType[];
  readonly groups?: readonly CharacteristicGroup[];
  readonly defaultGroupId?: string;
}

export const useCharacteristicForm = ({
  isOpen,
  onClose,
  onSuccess,
  variation,
  allVariations = [],
  groups = [],
  defaultGroupId = '',
}: UseCharacteristicFormParams) => {
  const [formData, setFormData] = useState<CharacteristicFormData>(() =>
    getSortedInitialCharacteristicFormData(variation, defaultGroupId)
  );
  const [saveStatus, setSaveStatus] = useState<CharacteristicSaveStatus>('saved');
  const [saveError, setSaveError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const schema = useMemo(
    () => createManagedCharacteristicFormSchema(
      allVariations,
      variation?.id,
      groups,
      true,
    ),
    [allVariations, groups, variation?.id]
  );
  const isFactoryDefault = Boolean(
    variation?.id && isFactoryDefaultCharacteristicName(variation.name)
  );
  const { validateAndRun } = useZodForm(schema, formData);

  useEffect(() => {
    if (!isOpen) return;
    setFormData(getSortedInitialCharacteristicFormData(variation, defaultGroupId));
    setSaveStatus('saved');
    setSaveError('');
  }, [defaultGroupId, isOpen, variation?.id]);

  const changeFormData = (update: (current: CharacteristicFormData) => CharacteristicFormData) => {
    setFormData((current) => {
      const updated = update(current);
      if (!isFactoryDefault || !variation) return updated;
      return {
        ...updated,
        name: variation.name,
        dataType: normalizeManagedCharacteristicType(variation.dataType),
      };
    });
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
      const wasNew = !variation?.id;
      let savedValues = formData;
      const savedId = await validateAndRun(
        formData,
        async (values) => {
          savedValues = values;
          const dataType = isFactoryDefault
            ? normalizeManagedCharacteristicType(variation?.dataType)
            : values.dataType;
          return saveVariation({
            id: variation?.id,
            name: isFactoryDefault ? (variation?.name ?? values.name) : values.name,
            groupId: values.groupId,
            active: true,
            dataType,
            unit: values.unit.trim(),
            decimalPlaces: dataType === 'decimal' ? values.decimalPlaces : undefined,
            configuration: {
              ...values.configuration,
            },
            dependency: null,
            isCustom: variation?.isCustom ?? true,
          });
        },
        (errors) => {
          const firstError = Object.values(flattenFormErrors(errors))[0];
          setSaveStatus('error');
          setSaveError(firstError || 'Confira os campos da característica.');
        }
      );
      if (savedId === false) return;
      setSaveStatus('saved');
      await onSuccess?.(savedId, savedValues, wasNew);
      if (!wasNew || !onSuccess) onClose();
    } catch (error: unknown) {
      setSaveStatus('error');
      setSaveError(getVariationErrorMessage(error, 'Não foi possível salvar a característica.'));
    } finally {
      setIsSaving(false);
    }
  };

  return {
    formData,
    isFactoryDefault,
    setFormData,
    changeFormData,
    handleTypeChange,
    save,
    saveStatus,
    saveError,
    isSaving: isSaving || !isOpen,
  };
};
