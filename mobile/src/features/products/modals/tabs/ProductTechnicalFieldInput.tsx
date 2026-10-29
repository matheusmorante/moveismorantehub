import type React from 'react';
import { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  getTechnicalFieldInputMode,
  getTechnicalFieldIntegerPlaceholder,
  getTechnicalFieldMaxLength,
  getTechnicalFieldTextPlaceholder,
  resolveTechnicalFieldDataType,
  TECHNICAL_CHOICE_SEARCH_DEBOUNCE_MS,
  TECHNICAL_CHOICE_SEARCH_MIN_CHARACTERS,
} from '../../domain/technicalFieldInputRules';
import { isQuantityCharacteristic } from '../../../../../../shared-utils/productCharacteristicDependencies';
import { normalizeSearchTerm } from '../../../../../../shared-utils/productText';
import { isProductTechnicalFieldYesNo } from '../../../../../../shared-utils/productTechnicalFieldYesNo';
import { parseProductBooleanCharacteristicValue } from '../../../../../../shared-utils/productBooleanCharacteristicValue';
import {
  getTechnicalFieldIntegerMaxValue,
  isWeightCapacityCharacteristic,
  isWeightCharacteristicName,
} from '../../../../../../shared-utils/productTechnicalFieldRules';

type TechnicalOption = { id?: string; value: string };

type Props = {
  field: {
    name: string;
    data_type?: string;
    decimal_places?: 1 | 2 | 3 | null;
    options?: TechnicalOption[];
  };
  value: unknown;
  disabled?: boolean;
  dark?: boolean;
  placeholder?: string;
  onChange: (value: unknown) => void;
};

const normalizeValue = (value: unknown) =>
  String(value ?? '')
    .trim()
    .toLocaleLowerCase('pt-BR');

const normalizeYesNoValue = (value: unknown) =>
  normalizeValue(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '');

const formatDecimal = (value: unknown, decimalPlaces: 1 | 2 | 3) => {
  if (value === '' || value === null || value === undefined) return '';
  const numeric = Number(String(value).trim().replace(',', '.'));
  return Number.isFinite(numeric) ? numeric.toFixed(decimalPlaces).replace('.', ',') : '';
};

const formatPercentage = (value: unknown) =>
  value === '' || value === null || value === undefined ? '' : String(value).replace('.', ',');

const getSelectedValues = (value: unknown) =>
  (Array.isArray(value) ? value : value ? String(value).split(',') : [])
    .map((item) => String(item).trim())
    .filter(Boolean);

export const ProductTechnicalFieldInput: React.FC<Props> = ({
  field,
  value,
  disabled = false,
  dark = false,
  placeholder,
  onChange,
}) => {
  const type = resolveTechnicalFieldDataType(field.name, field.data_type);
  const isQuantity = isQuantityCharacteristic(field.name);
  const isWeight =
    type === 'weight' ||
    field.data_type === 'weight' ||
    isWeightCharacteristicName(field.name) ||
    isWeightCapacityCharacteristic(field.name);
  const decimalPlaces = isWeight
    ? 1
    : type === 'decimal'
      ? (field.decimal_places ?? 2)
      : 2;
  const [pickerVisible, setPickerVisible] = useState(false);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [decimalDraft, setDecimalDraft] = useState(() =>
    type === 'percentage' ? formatPercentage(value) : formatDecimal(value, decimalPlaces)
  );
  const options = field.options || [];
  const inputMode = getTechnicalFieldInputMode(type, options.length);
  const selectedValues = useMemo(() => getSelectedValues(value), [value]);
  const stringValue = Array.isArray(value) ? value.join(', ') : String(value ?? '');
  const normalizedSearch = normalizeSearchTerm(search);

  useEffect(() => {
    if (normalizedSearch.length < TECHNICAL_CHOICE_SEARCH_MIN_CHARACTERS) {
      setDebouncedSearch('');
      return;
    }
    const timeout = setTimeout(
      () => setDebouncedSearch(normalizedSearch),
      TECHNICAL_CHOICE_SEARCH_DEBOUNCE_MS
    );
    return () => clearTimeout(timeout);
  }, [normalizedSearch]);

  useEffect(() => {
    setDecimalDraft(
      type === 'percentage' ? formatPercentage(value) : formatDecimal(value, decimalPlaces)
    );
  }, [value, decimalPlaces, type]);

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
      accessibilityLabel={`${field.name}: ${label}`}
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

  if (type === 'boolean' || field.data_type === 'boolean') {
    const answer = parseProductBooleanCharacteristicValue(value);
    return (
      <View
        accessibilityRole="radiogroup"
        accessibilityLabel={field.name}
        style={styles.booleanOptions}
      >
        {renderRadioOption('yes', 'Sim', answer === true, true)}
        {renderRadioOption('no', 'Não', answer === false, false)}
      </View>
    );
  }

  if (disabled && placeholder) {
    return (
      <TextInput
        editable={false}
        value=""
        placeholder={placeholder}
        placeholderTextColor="#94a3b8"
        accessibilityLabel={`${field.name}: ${placeholder}`}
        style={[styles.input, dark && styles.darkInput, styles.disabled]}
      />
    );
  }

  if (type === 'integer' || type === 'number') {
    const maxValue = getTechnicalFieldIntegerMaxValue(field.name);
    return (
      <TextInput
        editable={!disabled}
        value={stringValue}
        maxLength={15}
        onChangeText={(text) => {
          if (text === '') {
            if (
              isQuantity &&
              value !== undefined &&
              value !== null &&
              String(value).trim() !== ''
            ) return;
            onChange(isQuantity ? null : '');
            return;
          }
          if (!/^\d+$/.test(text)) return;
          const numeric = Number(text);
          if (!Number.isSafeInteger(numeric)) return;
          onChange(Math.min(maxValue, numeric));
        }}
        keyboardType="number-pad"
        placeholder={getTechnicalFieldIntegerPlaceholder(field.name)}
        placeholderTextColor="#94a3b8"
        style={[styles.input, dark && styles.darkInput, disabled && styles.disabled]}
      />
    );
  }

  if (type === 'decimal' || type === 'measure' || type === 'weight' || isWeight) {
    return (
      <TextInput
        editable={!disabled}
        value={decimalDraft}
        maxLength={18}
        onChangeText={(text) => {
          const raw = text.replace('.', ',');
          if (!raw) {
            if (
              isQuantity &&
              value !== undefined &&
              value !== null &&
              String(value).trim() !== ''
            ) return;
            setDecimalDraft('');
            onChange(isQuantity ? null : '');
            return;
          }
          const precisionPattern = new RegExp(`^\\d*(?:,\\d{0,${decimalPlaces}})?$`);
          if (!precisionPattern.test(raw)) return;
          setDecimalDraft(raw);
          if (raw.endsWith(',')) return;
          const numeric = Number(raw.replace(',', '.'));
          if (!Number.isFinite(numeric)) return;
          onChange(numeric);
        }}
        onBlur={() => {
          if (!decimalDraft || decimalDraft.endsWith(',')) return;
          const numeric = Number(decimalDraft.replace(',', '.'));
          if (!Number.isFinite(numeric)) return;
          setDecimalDraft(formatDecimal(numeric, decimalPlaces));
          onChange(numeric);
        }}
        keyboardType="decimal-pad"
        placeholder={formatDecimal(0, decimalPlaces)}
        placeholderTextColor="#94a3b8"
        style={[styles.input, dark && styles.darkInput, disabled && styles.disabled]}
      />
    );
  }

  if (type === 'percentage') {
    return (
      <TextInput
        editable={!disabled}
        value={decimalDraft}
        onChangeText={(text) => {
          const raw = text.replace('.', ',');
          if (raw === '') {
            setDecimalDraft('');
            onChange('');
            return;
          }
          if (!/^\d{0,3}(?:,\d{0,2})?$/.test(raw)) return;
          const numeric = Number(raw.replace(',', '.'));
          if (!Number.isFinite(numeric) || numeric > 100) return;
          setDecimalDraft(raw);
          if (!raw.endsWith(',')) onChange(numeric);
        }}
        onBlur={() => {
          if (!decimalDraft || decimalDraft.endsWith(',')) return;
          const numeric = Number(decimalDraft.replace(',', '.'));
          if (!Number.isFinite(numeric) || numeric > 100) return;
          const formatted = String(numeric).replace('.', ',');
          setDecimalDraft(formatted);
          onChange(numeric);
        }}
        keyboardType="decimal-pad"
        maxLength={6}
        placeholder="0 a 100"
        placeholderTextColor="#94a3b8"
        style={[styles.input, dark && styles.darkInput, disabled && styles.disabled]}
      />
    );
  }

  if (isProductTechnicalFieldYesNo({
      name: field.name,
      dataType: field.data_type,
      options: field.options,
    })) {
    const yesValue =
      options.find((option) => normalizeYesNoValue(option.value) === 'sim')?.value || 'Sim';
    const noValue =
      options.find((option) => normalizeYesNoValue(option.value) === 'nao')?.value || 'Não';
    const notApplicableValue = options.find((option) => normalizeYesNoValue(option.value) === 'nao se aplica')?.value;
    const normalizedValue = normalizeYesNoValue(value);
    const currentValue =
      value === true || value === 1 || ['true', '1', 'sim', 's', 'yes', 'ligado'].includes(normalizedValue)
        ? 'yes'
        : value === false || value === 0 || ['false', '0', 'nao', 'no', 'desligado'].includes(normalizedValue)
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
          accessibilityLabel={field.name}
          style={styles.booleanOptions}
        >
          {yesNoOptions.map((option) => {
            const selected = currentValue === option.key;
            return renderRadioOption(option.key, option.label, selected, option.outputValue);
          })}
        </View>
      </View>
    );
  }

  if (inputMode === 'inline') {
    const selectedChoiceValue = Array.isArray(value)
      ? String(value[0] ?? '')
      : String(value ?? '');
    return (
      <View style={styles.selectionWrap}>
        <View style={styles.chips}>
          {options.map((option) => {
            const selected = selectedChoiceValue === option.value;
            return (
              <TouchableOpacity
                key={option.id || option.value}
                disabled={disabled}
                accessibilityRole="button"
                accessibilityLabel={
                  selected
                    ? `${option.value} para ${field.name}, toque novamente para limpar a seleção`
                    : `${option.value} para ${field.name}`
                }
                accessibilityState={{ selected, disabled }}
                onPress={() => onChange(selected ? '' : option.value)}
                style={[
                  styles.chip,
                  dark && styles.darkChip,
                  selected && styles.selectedChip,
                  disabled && styles.disabled,
                ]}
              >
                <Text
                  style={[styles.chipText, dark && styles.lightText, selected && styles.selectedText]}
                >
                  {option.value}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  }

  if (inputMode === 'searchable') {
    const multiple = type === 'multi_select';
    const isSearchActive =
      normalizedSearch.length >= TECHNICAL_CHOICE_SEARCH_MIN_CHARACTERS &&
      debouncedSearch === normalizedSearch;
    const visibleOptions = isSearchActive
      ? options.filter((option) => normalizeSearchTerm(option.value).includes(debouncedSearch))
      : multiple
        ? options
        : [];
    return (
      <View style={styles.selectionWrap}>
        {multiple && selectedValues.length > 0 && (
          <View style={styles.chips}>
            {selectedValues.map((selected) => (
              <View
                key={selected}
                style={[styles.chip, styles.selectedChip, disabled && styles.disabled]}
              >
                <Text style={[styles.chipText, styles.selectedText]}>{selected}</Text>
              </View>
            ))}
          </View>
        )}
        <TouchableOpacity
          disabled={disabled}
          onPress={() => {
            setSearch('');
            setPickerVisible(true);
          }}
          style={[
            styles.input,
            styles.pickerButton,
            dark && styles.darkInput,
            disabled && styles.disabled,
          ]}
        >
          <Text style={[styles.pickerText, dark && styles.lightText]}>
            {multiple ? 'Adicionar opções' : selectedValues[0] || 'Selecionar uma opção'}
          </Text>
        </TouchableOpacity>
        <Modal
          visible={pickerVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setPickerVisible(false)}
        >
          <View style={styles.modalBackdrop}>
            <View style={[styles.modalCard, dark && styles.darkModalCard]}>
              <Text style={[styles.modalTitle, dark && styles.lightText]}>
                {multiple ? `Selecionar ${field.name}` : `Escolher ${field.name}`}
              </Text>
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder={
                  multiple
                    ? selectedValues.length > 0
                      ? 'Adicionar mais opções...'
                      : 'Selecione ou pesquise...'
                    : `Digite pelo menos ${TECHNICAL_CHOICE_SEARCH_MIN_CHARACTERS} caracteres para pesquisar...`
                }
                placeholderTextColor="#94a3b8"
                style={[styles.input, dark && styles.darkInput]}
              />
              <ScrollView keyboardShouldPersistTaps="handled" style={styles.optionList}>
                {visibleOptions.map((option) => {
                    // Match ERP ChoiceSearch: a stored selection is checked only
                    // when its value exactly equals the current option label.
                    const selected = selectedValues.includes(option.value);
                    return (
                      <TouchableOpacity
                        key={option.id || option.value}
                        onPress={() => {
                          if (multiple) {
                            onChange(
                              selected
                                ? selectedValues.filter((item) => item !== option.value)
                                : [...selectedValues, option.value]
                            );
                          } else {
                            onChange(option.value);
                            setPickerVisible(false);
                          }
                        }}
                        style={[styles.option, dark && styles.darkOption]}
                      >
                        <Text style={[styles.optionText, dark && styles.lightText]}>
                          {selected ? '✓  ' : ''}
                          {option.value}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                {visibleOptions.length === 0 && (
                  <Text style={[styles.emptyText, dark && styles.lightText]}>
                    {!multiple && normalizedSearch.length < TECHNICAL_CHOICE_SEARCH_MIN_CHARACTERS
                      ? `Digite pelo menos ${TECHNICAL_CHOICE_SEARCH_MIN_CHARACTERS} caracteres para pesquisar.`
                      : 'Nenhuma opção encontrada.'}
                  </Text>
                )}
              </ScrollView>
              <TouchableOpacity onPress={() => setPickerVisible(false)} style={styles.doneButton}>
                <Text style={styles.doneText}>{multiple ? 'Concluir seleção' : 'Fechar'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>
    );
  }

  return (
    <TextInput
      editable={!disabled}
      value={stringValue}
      onChangeText={(text) => onChange(text)}
      maxLength={getTechnicalFieldMaxLength(type)}
      placeholder={
        type === 'text_long'
          ? 'Digite a descrição detalhada'
          : getTechnicalFieldTextPlaceholder(field.name) || 'Informe o valor'
      }
      placeholderTextColor="#94a3b8"
      multiline={type === 'text_long'}
      style={[
        styles.input,
        type === 'text_long' && styles.multiline,
        dark && styles.darkInput,
        disabled && styles.disabled,
      ]}
    />
  );
};

const styles = StyleSheet.create({
  input: {
    minHeight: 40,
    borderBottomWidth: 1,
    borderColor: '#cbd5e1',
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: '#0f172a',
    fontSize: 13,
  },
  darkInput: { borderColor: '#475569', color: '#f1f5f9', backgroundColor: '#0f172a' },
  disabled: { opacity: 0.5 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  booleanOptions: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 16 },
  radioOption: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 2,
  },
  radioCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#64748b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  darkRadioCircle: { borderColor: '#94a3b8' },
  radioCircleSelected: { borderColor: '#059669' },
  radioDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#059669' },
  chip: {
    minHeight: 44,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 16,
    paddingHorizontal: 11,
    paddingVertical: 7,
    backgroundColor: '#fff',
  },
  darkChip: { borderColor: '#475569', backgroundColor: '#0f172a' },
  selectedChip: { borderColor: '#2563eb', backgroundColor: '#eff6ff' },
  chipText: { fontSize: 12, color: '#334155' },
  selectedText: { color: '#1d4ed8' },
  lightText: { color: '#e2e8f0' },
  selectionWrap: { gap: 8 },
  pickerButton: { justifyContent: 'center' },
  pickerText: { color: '#334155', fontSize: 13 },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
  },
  modalCard: {
    maxHeight: '80%',
    borderRadius: 14,
    padding: 16,
    gap: 10,
    backgroundColor: '#fff',
  },
  darkModalCard: { backgroundColor: '#0f172a' },
  modalTitle: { color: '#0f172a', fontSize: 15, fontWeight: '600' },
  optionList: { maxHeight: 300 },
  option: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 10,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  darkOption: { borderBottomColor: '#334155' },
  optionText: { color: '#0f172a', fontSize: 13 },
  emptyText: { padding: 12, color: '#64748b', fontSize: 12 },
  doneButton: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    padding: 10,
    backgroundColor: '#2563eb',
  },
  doneText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  multiline: { minHeight: 84, textAlignVertical: 'top' },
});
