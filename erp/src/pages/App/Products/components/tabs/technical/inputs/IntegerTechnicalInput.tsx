import React from 'react';
import {
  getTechnicalFieldIntegerMaxValue,
  isTechnicalFieldPlacesCount,
} from '../../../../../../../../../shared-utils/productTechnicalFieldRules';
import {
  isQuantityCharacteristic,
  type TechnicalFieldDefinition,
} from '@/pages/utils/technicalValuesService';

interface IntegerTechnicalInputProps {
  field: TechnicalFieldDefinition;
  value: any;
  disabled?: boolean;
  onChange: (value: number | '' | null) => void;
}

export const IntegerTechnicalInput: React.FC<IntegerTechnicalInputProps> = ({
  field,
  value,
  disabled,
  onChange,
}) => {
  const isLugares = isTechnicalFieldPlacesCount(field.name);
  const isQuantity = isQuantityCharacteristic(field.name);
  const maxValue = getTechnicalFieldIntegerMaxValue(field.name);
  const numericDisplayValue = (() => {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string' && value.trim()) {
      const match = value.match(/\d+/);
      if (match) return parseInt(match[0], 10);
    }
    return '';
  })();

  const placeholder = isLugares
    ? 'Digite o número de quantidades'
    : isQuantity
      ? `Insira a quantidade de ${field.name.replace(/^.*?quantidade\s+de\s+/i, '').trim()}`
      : /p[eé]s?/i.test(field.name)
        ? 'Insira a quantidade de pés'
        : 'Insira um número inteiro';

  return (
    <input
      type="number"
      step="1"
      min="0"
      placeholder={placeholder}
      value={numericDisplayValue}
      disabled={disabled}
      onChange={(e) => {
        if (e.target.value === '') {
          if (
            isQuantity &&
            value !== undefined &&
            value !== null &&
            String(value).trim() !== ''
          ) return;
          onChange(isQuantity ? null : '');
          return;
        }
        const parsed = parseInt(e.target.value, 10);
        if (Number.isNaN(parsed)) {
          if (
            isQuantity &&
            value !== undefined &&
            value !== null &&
            String(value).trim() !== ''
          ) return;
          onChange('');
          return;
        }
        const val = Math.max(0, Math.min(maxValue, parsed));
        onChange(val);
      }}
      className="w-full border-b-2 border-slate-300 bg-transparent py-2 text-xs outline-none focus:border-blue-600 dark:text-slate-100 placeholder:text-slate-400 placeholder:font-normal"
    />
  );
};
