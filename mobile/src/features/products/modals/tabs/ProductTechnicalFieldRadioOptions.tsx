import type React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { parseProductBooleanCharacteristicValue } from '../../../../../../shared-utils/productBooleanCharacteristicValue';
import { styles } from './productTechnicalFieldInput.styles';

type TechnicalOption = { id?: string; value: string };

type Props = {
  variant: 'boolean' | 'yes-no';
  fieldName: string;
  options: TechnicalOption[];
  value: unknown;
  disabled: boolean;
  dark: boolean;
  onChange: (value: unknown) => void;
};

const normalizeValue = (value: unknown) =>
  String(value ?? '')
    .trim()
    .toLocaleLowerCase('pt-BR');

const normalizeYesNoValue = (value: unknown) =>
  normalizeValue(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '');

export const ProductTechnicalFieldRadioOptions: React.FC<Props> = ({
  variant,
  fieldName,
  options,
  value,
  disabled,
  dark,
  onChange,
}) => {
  const renderRadioOption = (
    key: string,
    label: string,
    selected: boolean,
    outputValue: unknown
  ) => (
    <TouchableOpacity
      key={key}
      disabled={disabled}
      onPress={() => onChange(outputValue)}
      accessibilityRole="radio"
      accessibilityLabel={`${fieldName}: ${label}`}
      accessibilityState={{ selected, disabled }}
      style={[styles.radioOption, disabled && styles.disabled]}
    >
      <View
        style={[
          styles.radioCircle,
          dark && styles.darkRadioCircle,
          selected && styles.radioCircleSelected,
        ]}
      >
        {selected ? <View style={styles.radioDot} /> : null}
      </View>
      <Text style={[styles.chipText, dark && styles.lightText, selected && styles.selectedText]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  if (variant === 'boolean') {
    const answer = parseProductBooleanCharacteristicValue(value);
    return (
      <View
        accessibilityRole="radiogroup"
        accessibilityLabel={fieldName}
        style={styles.booleanOptions}
      >
        {renderRadioOption('yes', 'Sim', answer === true, true)}
        {renderRadioOption('no', 'Não', answer === false, false)}
      </View>
    );
  }

  const yesValue =
    options.find((option) => normalizeYesNoValue(option.value) === 'sim')?.value || 'Sim';
  const noValue =
    options.find((option) => normalizeYesNoValue(option.value) === 'nao')?.value || 'Não';
  const notApplicableValue = options.find(
    (option) => normalizeYesNoValue(option.value) === 'nao se aplica'
  )?.value;
  const normalizedValue = normalizeYesNoValue(value);
  const currentValue =
    value === true ||
    value === 1 ||
    ['true', '1', 'sim', 's', 'yes', 'ligado'].includes(normalizedValue)
      ? 'yes'
      : value === false ||
        value === 0 ||
        ['false', '0', 'nao', 'no', 'desligado'].includes(normalizedValue)
        ? 'no'
        : notApplicableValue !== undefined && String(value ?? '') === notApplicableValue
          ? 'not_applicable'
          : '';
  const yesNoOptions = [
    { key: 'yes', label: yesValue, outputValue: yesValue },
    { key: 'no', label: noValue, outputValue: noValue },
    ...(notApplicableValue
      ? [
          {
            key: 'not_applicable',
            label: notApplicableValue,
            outputValue: notApplicableValue,
          },
        ]
      : []),
  ];

  return (
    <View style={styles.selectionWrap}>
      <View
        accessibilityRole="radiogroup"
        accessibilityLabel={fieldName}
        style={styles.booleanOptions}
      >
        {yesNoOptions.map((option) => {
          const selected = currentValue === option.key;
          return renderRadioOption(option.key, option.label, selected, option.outputValue);
        })}
      </View>
    </View>
  );
};
