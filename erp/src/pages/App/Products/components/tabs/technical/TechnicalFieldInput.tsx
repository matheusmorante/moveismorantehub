import React from 'react';
import { toast } from 'react-toastify';
import { TechnicalCombobox } from './TechnicalCombobox';
import { flattenFormErrors, useZodForm } from '@/hooks/useZodForm';
import { saveAttributeValue } from '@/pages/utils/variationService';
import { normalizeSearchTerm } from '@/pages/utils/textUtils';
import { bulkAttributeFormSchema } from '../../../../../../../../shared-utils/catalogFormSchemas';
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

const ColorCharacteristicInput: React.FC<{
  field: TechnicalFieldInputProps['field'];
  value: unknown;
  disabled?: boolean;
  onChange: TechnicalFieldInputProps['onChange'];
}> = ({ field, value, disabled, onChange }) => {
  const form = useZodForm(bulkAttributeFormSchema, { name: field.id, value: '' });

  const handleCreateOption = async (newValue: string) => {
    const result = await form.validateAndRun(
      { name: field.id, value: newValue },
      async ({ name, value: validatedValue }) => {
        try {
          const saved = await saveAttributeValue(name, validatedValue);
          toast.success(`Cor "${saved.value}" cadastrada e selecionada.`);
          return { id: saved.id, value: saved.value };
        } catch (error: unknown) {
          toast.error(error instanceof Error ? error.message : 'Erro ao cadastrar cor.');
          return null;
        }
      },
      (errors) => toast.error(Object.values(flattenFormErrors(errors))[0] || 'Informe a cor.')
    );
    return result === false ? null : result;
  };

  return (
    <ChoiceSearch
      options={field.options}
      value={String(value ?? '')}
      disabled={disabled}
      multiple={false}
      onChange={onChange}
      onCreateOption={handleCreateOption}
      createOptionLabel="cor"
    />
  );
};

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

  if (normalizeSearchTerm(field.name) === 'cor') {
    return (
      <ColorCharacteristicInput
        field={field}
        value={value}
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
