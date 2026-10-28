import React from 'react';
import { TechnicalCombobox } from './TechnicalCombobox';
import {
  isQuantityCharacteristic,
  isDimensionCharacteristicName,
  isWeightCharacteristicName,
  isYesNoCharacteristic,
} from '@/pages/utils/technicalValuesService';
import {
  TechnicalFieldInputProps,
  resolveTechnicalInputType,
  TextTechnicalInput,
  IntegerTechnicalInput,
  DecimalTechnicalInput,
  PercentageTechnicalInput,
  ChoiceDropdown,
  ChoiceSearch,
  SIMPLE_CHOICE_DROPDOWN_LIMIT,
} from './inputs';
import { YesNoPowerToggle } from './YesNoPowerToggle';

export const TechnicalFieldInput: React.FC<TechnicalFieldInputProps> = ({
  field,
  value,
  placeholder,
  disabled,
  isInvalid,
  onChange,
}) => {
  if (field.dataType === 'boolean') {
    return (
      <YesNoPowerToggle
        field={field}
        value={value}
        disabled={disabled}
        isInvalid={isInvalid}
        compact
        onChange={onChange}
      />
    );
  }

  if (disabled && placeholder) {
    return (
      <input
        type="text"
        value=""
        disabled
        placeholder={placeholder}
        aria-label={`${field.name}: ${placeholder}`}
        className="w-full border-b-2 border-slate-300 bg-transparent py-2 text-xs outline-none placeholder:text-slate-400 placeholder:font-normal disabled:cursor-not-allowed disabled:opacity-50 dark:text-slate-100"
      />
    );
  }

  const type = resolveTechnicalInputType(field);

  if (isYesNoCharacteristic(field)) {
    const options = field.options?.length
      ? field.options
      : [
          { id: 'sim', value: 'Sim' },
          { id: 'nao', value: 'Não' },
        ];
    const normalizedValue = String(value ?? '').trim().toLocaleLowerCase('pt-BR');
    const isAffirmative =
      value === true ||
      value === 1 ||
      ['true', '1', 'sim', 's', 'yes', 'ligado'].includes(normalizedValue);
    const isNegative =
      value === false ||
      value === 0 ||
      ['false', '0', 'não', 'nao', 'no', 'desligado'].includes(normalizedValue);
    const yesOptionValue =
      options.find((option) => /^sim$/i.test(option.value.trim()))?.value || 'Sim';
    const noOptionValue =
      options.find((option) => /^n[aã]o$/i.test(option.value.trim()))?.value || 'Não';
    const selectedValue = isAffirmative
      ? yesOptionValue
      : isNegative
        ? noOptionValue
        : String(value ?? '');

    return (
      <ChoiceDropdown
        options={options}
        value={selectedValue}
        disabled={disabled}
        onChange={onChange}
      />
    );
  }

  if (type === 'text_short' || type === 'text' || type === 'text_long') {
    return (
      <TextTechnicalInput
        field={field}
        type={type}
        value={value}
        disabled={disabled}
        onChange={onChange}
      />
    );
  }

  if (type === 'integer' || type === 'number') {
    return (
      <IntegerTechnicalInput
        field={field}
        value={value}
        disabled={disabled}
        onChange={onChange}
      />
    );
  }

  const isWeight = isWeightCharacteristicName(field.name) || field.dataType === 'weight';
  const isDimension = isDimensionCharacteristicName(field.name) || type === 'measure';
  if (type === 'decimal' || isDimension || isWeight) {
    const decimalPlaces = isWeight ? 1 : isDimension ? 2 : type === 'decimal' ? field.decimalPlaces ?? 2 : 2;
    return (
      <DecimalTechnicalInput
        value={value}
        decimalPlaces={decimalPlaces as 1 | 2 | 3}
        disabled={disabled}
        preventClearing={isQuantityCharacteristic(field.name)}
        placeholder={isDimension || isWeight ? '' : undefined}
        onChange={onChange}
      />
    );
  }

  if (type === 'percentage') {
    return <PercentageTechnicalInput value={value} disabled={disabled} onChange={onChange} />;
  }

  const fieldOptions = field.options || [];
  const usesSimpleChoiceDropdown =
    fieldOptions.length > 0 && fieldOptions.length <= SIMPLE_CHOICE_DROPDOWN_LIMIT;

  if (type === 'radio' || type === 'list') {
    if (usesSimpleChoiceDropdown) {
      return (
        <ChoiceDropdown
          options={fieldOptions}
          value={value}
          disabled={disabled}
          onChange={onChange}
        />
      );
    }
    return (
      <ChoiceSearch
        options={fieldOptions}
        value={value}
        disabled={disabled}
        multiple={false}
        onChange={onChange}
      />
    );
  }

  if (type === 'multi_select') {
    const selected = Array.isArray(value)
      ? value
      : value
        ? String(value)
            .split(',')
            .map((v) => v.trim())
            .filter(Boolean)
        : [];
    return (
      <ChoiceSearch
        options={field.options}
        value={selected}
        disabled={disabled}
        multiple
        onChange={onChange}
      />
    );
  }

  return (
    <TechnicalCombobox
      fieldName={field.name}
      value={Array.isArray(value) ? value.join(', ') : (value ?? '')}
      options={field.options}
      isInvalid={isInvalid}
      disabled={disabled}
      onChange={onChange}
    />
  );
};
