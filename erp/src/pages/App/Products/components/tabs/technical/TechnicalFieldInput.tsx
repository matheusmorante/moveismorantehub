import React from 'react';
import { TechnicalCombobox } from './TechnicalCombobox';
import { YesNoPowerToggle } from './YesNoPowerToggle';
import {
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

export const TechnicalFieldInput: React.FC<TechnicalFieldInputProps> = ({
  field,
  value,
  disabled,
  isInvalid,
  compact = false,
  onChange,
}) => {
  const type = resolveTechnicalInputType(field);

  if (isYesNoCharacteristic(field)) {
    return (
      <YesNoPowerToggle
        field={field}
        value={value}
        disabled={disabled}
        isInvalid={isInvalid}
        compact={compact}
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
