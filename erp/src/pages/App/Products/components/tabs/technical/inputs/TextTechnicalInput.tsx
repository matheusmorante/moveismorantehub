import React from 'react';
import type { TechnicalFieldDefinition } from '@/pages/utils/technicalValuesService';
import { getTechnicalFieldTextPlaceholder } from '../../../../../../../../../shared-utils/productTechnicalFieldRules';
import { getCharacteristicTextLimits } from '../../../../../../../../../shared-utils/characteristicTextLimits';

interface TextTechnicalInputProps {
  field: TechnicalFieldDefinition;
  type: 'text_short' | 'text' | 'text_long';
  value: any;
  disabled?: boolean;
  onChange: (value: string) => void;
}

export const TextTechnicalInput: React.FC<TextTechnicalInputProps> = ({
  field,
  type,
  value,
  disabled,
  onChange,
}) => {
  const textLimits = getCharacteristicTextLimits(type);

  if (type === 'text_long') {
    return (
      <textarea
        value={value ?? ''}
        minLength={textLimits?.minLength}
        maxLength={textLimits?.maxLength}
        rows={4}
        placeholder="Digite a descrição detalhada"
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className="w-full resize-y border-b-2 border-slate-300 bg-transparent py-2 text-xs outline-none focus:border-blue-600 dark:text-slate-100 placeholder:text-slate-400"
      />
    );
  }

  const placeholder = getTechnicalFieldTextPlaceholder(field.name);

  return (
    <input
      type="text"
      value={value ?? ''}
      minLength={textLimits?.minLength}
      maxLength={textLimits?.maxLength}
      placeholder={placeholder}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      className="w-full border-b-2 border-slate-300 bg-transparent py-2 text-xs outline-none focus:border-blue-600 dark:text-slate-100 placeholder:text-slate-400 placeholder:font-normal"
    />
  );
};
