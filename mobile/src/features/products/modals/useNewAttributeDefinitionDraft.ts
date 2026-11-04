import { useState } from 'react';
import {
  normalizeManagedCharacteristicType,
  type CharacteristicFillConfigurationPayload,
} from '../../../../../shared-utils/characteristicFormRules';
import { getCharacteristicTextLimits } from '../../../../../shared-utils/characteristicTextLimits';
import { normalizeProductAttributeOptionValue } from '../../../../../shared-utils/productAttributeOptionRules';
import type { MobileAttributeDataType } from '../services/mobileAttributeService';
import { parseOptionalNumber, type FillLimitInputValues } from './attributesManagerFormModel';

export function useNewAttributeDefinitionDraft() {
  const [newDataType, setNewDataType] = useState<MobileAttributeDataType>('radio');
  const [newUnit, setNewUnit] = useState('cm');
  const [newDecimalPlaces, setNewDecimalPlaces] = useState<1 | 2 | 3>(2);
  const [isSavingNew, setIsSavingNew] = useState(false);
  const [newAttrName, setNewAttrName] = useState('');
  const [newOptionInput, setNewOptionInput] = useState('');
  const [newOptions, setNewOptions] = useState<string[]>([]);
  const [newConfigurationInputs, setNewConfigurationInputs] = useState<FillLimitInputValues>({
    minValue: '',
    maxValue: '',
    minSelections: '',
    maxSelections: '',
  });

  const newFillType = normalizeManagedCharacteristicType(newDataType);
  const newConfiguration: CharacteristicFillConfigurationPayload =
    getCharacteristicTextLimits(newFillType) ??
    (newFillType === 'integer' || newFillType === 'decimal'
      ? {
          minValue: parseOptionalNumber(newConfigurationInputs.minValue),
          maxValue: parseOptionalNumber(newConfigurationInputs.maxValue),
        }
      : newFillType === 'multi_select'
        ? {
            minSelections: parseOptionalNumber(newConfigurationInputs.minSelections),
            maxSelections: parseOptionalNumber(newConfigurationInputs.maxSelections),
          }
        : {});
  const newDefinition = {
    name: newAttrName, dataType: newDataType, unit: newDataType === 'measure' ? newUnit : '',
    decimalPlaces: newDecimalPlaces, active: true,
    configuration: newConfiguration,
    options: [...newOptions, ...((newDataType === 'radio' || newDataType === 'multi_select') && newOptionInput.trim() ? [newOptionInput.trim()] : [])]
      .map((value) => ({ id: '', value: normalizeProductAttributeOptionValue(value) })),
  };

  return {
    newDataType,
    setNewDataType,
    newUnit,
    setNewUnit,
    newDecimalPlaces,
    setNewDecimalPlaces,
    isSavingNew,
    setIsSavingNew,
    newAttrName,
    setNewAttrName,
    newOptionInput,
    setNewOptionInput,
    newOptions,
    setNewOptions,
    newConfigurationInputs,
    setNewConfigurationInputs,
    newFillType,
    newDefinition,
  };
}
