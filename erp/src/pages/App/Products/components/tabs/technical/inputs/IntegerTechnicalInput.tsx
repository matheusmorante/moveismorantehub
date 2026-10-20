import React from 'react';
import type { TechnicalFieldDefinition } from '@/pages/utils/technicalValuesService';

interface IntegerTechnicalInputProps {
  field: TechnicalFieldDefinition;
  value: any;
  disabled?: boolean;
  onChange: (value: number | '') => void;
}

export const IntegerTechnicalInput: React.FC<IntegerTechnicalInputProps> = ({
  field,
  value,
  disabled,
  onChange,
}) => {
  const isLugares = /lugar(es)?/i.test(field.name);
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
    : /porta/i.test(field.name)
      ? 'Insira a quantidade de portas'
      : /gaveta/i.test(field.name)
        ? 'Insira a quantidade de gavetas'
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
          onChange('');
          return;
        }
        const parsed = parseInt(e.target.value, 10);
        if (Number.isNaN(parsed)) {
          onChange('');
          return;
        }
        let val = Math.max(0, parsed);
        if (isLugares) {
          if (val > 100) val = 100;
        } else if (val > 50) {
          val = 50;
        }
        onChange(val);
      }}
      className="w-full border-b-2 border-slate-300 bg-transparent py-2 text-xs outline-none focus:border-blue-600 dark:text-slate-100 placeholder:text-slate-400 placeholder:font-normal"
    />
  );
};
