import React from 'react';
import type { TechnicalFieldDefinition } from '@/pages/utils/technicalValuesService';
import { parseProductBooleanCharacteristicValue } from '../../../../../../../../shared-utils/productBooleanCharacteristicValue';

export interface YesNoPowerToggleProps {
  readonly field: TechnicalFieldDefinition;
  readonly value: unknown;
  readonly disabled?: boolean;
  readonly isInvalid?: boolean;
  readonly compact?: boolean;
  readonly onChange: (value: any) => void;
}

/**
 * Grupo de opções radio para características binárias de Sim ou Não.
 */
export const YesNoPowerToggle: React.FC<YesNoPowerToggleProps> = ({
  field,
  value,
  disabled = false,
  isInvalid = false,
  compact = false,
  onChange,
}) => {
  const radioGroupName = React.useId();
  const answer = parseProductBooleanCharacteristicValue(value);
  const isBooleanField = field.dataType === 'boolean';
  const yesValue =
    field.options?.find((option) => /^sim$/i.test(option.value.trim()))?.value ?? 'Sim';
  const noValue =
    field.options?.find((option) => /^n[aã]o$/i.test(option.value.trim()))?.value ?? 'Não';

  const renderOption = (label: 'Sim' | 'Não', checked: boolean) => {
    const booleanValue = label === 'Sim';
    const outputValue = isBooleanField ? booleanValue : booleanValue ? yesValue : noValue;

    return (
      <label
        key={label}
        className={`inline-flex cursor-pointer items-center gap-2 text-xs font-semibold ${
          isInvalid ? 'text-red-600 dark:text-red-400' : 'text-slate-700 dark:text-slate-200'
        } ${disabled ? 'cursor-not-allowed opacity-60' : ''}`}
      >
        <input
          type="radio"
          name={radioGroupName}
          value={booleanValue ? 'sim' : 'nao'}
          checked={checked}
          disabled={disabled}
          aria-invalid={isInvalid}
          onChange={() => onChange(outputValue)}
          className="h-4 w-4 accent-emerald-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900"
        />
        <span>{label}</span>
      </label>
    );
  };

  return (
    <fieldset
      disabled={disabled}
      aria-invalid={isInvalid}
      className={`m-0 flex w-full items-center border-0 p-0 ${
        compact ? 'gap-4' : 'gap-6'
      } ${disabled ? 'opacity-60' : ''}`}
    >
      <legend className="sr-only">{field.name}</legend>
      {renderOption('Sim', answer === true)}
      {renderOption('Não', answer === false)}
    </fieldset>
  );
};
