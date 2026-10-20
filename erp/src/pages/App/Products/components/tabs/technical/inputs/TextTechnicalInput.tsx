import React from 'react';
import type { TechnicalFieldDefinition } from '@/pages/utils/technicalValuesService';

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
  if (type === 'text_long') {
    return (
      <textarea
        value={value ?? ''}
        maxLength={4000}
        rows={4}
        placeholder="Digite a descrição detalhada"
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className="w-full resize-y border-b-2 border-slate-300 bg-transparent py-2 text-xs outline-none focus:border-blue-600 dark:text-slate-100 placeholder:text-slate-400"
      />
    );
  }

  const isMarca = /^marca$/i.test(field.name.trim());
  const isModelo = /^modelo$/i.test(field.name.trim());
  const isModeloLinha = /^(modelo\s*\/\s*linha|linha\s*\/\s*modelo)$/i.test(field.name.trim());
  const isLinha = /^linha$/i.test(field.name.trim());
  const placeholder = isMarca
    ? 'Digite a marca'
    : isModelo
      ? 'Digite o modelo'
      : isModeloLinha
        ? 'Digite o modelo / linha'
        : isLinha
          ? 'Digite a linha'
          : undefined;

  return (
    <input
      type="text"
      value={value ?? ''}
      maxLength={120}
      placeholder={placeholder}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      className="w-full border-b-2 border-slate-300 bg-transparent py-2 text-xs outline-none focus:border-blue-600 dark:text-slate-100 placeholder:text-slate-400 placeholder:font-normal"
    />
  );
};
