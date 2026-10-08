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
} from '../../domain/technicalFieldInputRules';

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
  onChange: (value: unknown) => void;
};

const normalizeValue = (value: unknown) =>
  String(value ?? '')
    .trim()
    .toLocaleLowerCase('pt-BR');

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
  onChange,
}) => {
  const type = resolveTechnicalFieldDataType(field.name, field.data_type);
  const decimalPlaces = type === 'decimal' ? (field.decimal_places ?? 2) : 2;
  const [pickerVisible, setPickerVisible] = useState(false);
  const [search, setSearch] = useState('');
  const [decimalDraft, setDecimalDraft] = useState(() =>
    type === 'percentage' ? formatPercentage(value) : formatDecimal(value, decimalPlaces)
  );
  const options = field.options || [];
  const inputMode = getTechnicalFieldInputMode(type, options.length);
  const selectedValues = useMemo(() => getSelectedValues(value), [value]);
  const stringValue = Array.isArray(value) ? value.join(', ') : String(value ?? '');

  useEffect(() => {
    setDecimalDraft(
      type === 'percentage' ? formatPercentage(value) : formatDecimal(value, decimalPlaces)
    );
  }, [value, decimalPlaces, type]);

  if (type === 'integer' || type === 'number' || type === 'weight') {
    return (
      <TextInput
        editable={!disabled}
        value={stringValue}
        maxLength={15}
        onChangeText={(text) => {
          if (text === '') {
            onChange('');
            return;
          }
          if (!/^\d+$/.test(text)) return;
          const numeric = Number(text);
          if (!Number.isSafeInteger(numeric)) return;
          onChange(numeric);
        }}
        keyboardType="number-pad"
        placeholder={
          type === 'weight'
            ? 'Informe o peso em quilogramas'
            : getTechnicalFieldIntegerPlaceholder(field.name)
        }
        placeholderTextColor="#94a3b8"
        style={[styles.input, dark && styles.darkInput, disabled && styles.disabled]}
      />
    );
  }

  if (type === 'decimal' || type === 'measure') {
    return (
      <TextInput
        editable={!disabled}
        value={decimalDraft}
        maxLength={18}
        onChangeText={(text) => {
          const raw = text.replace('.', ',');
          if (!raw) {
            setDecimalDraft('');
            onChange('');
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
        placeholder={formatDecimal(0, type === 'decimal' ? decimalPlaces : 2)}
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

  if (type === 'boolean') {
    const currentValue =
      value === true || value === 'true'
        ? 'true'
        : value === false || value === 'false'
          ? 'false'
          : '';
    return (
      <View>
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
          accessibilityRole="button"
          accessibilityLabel={`Selecionar sim ou não para ${field.name}`}
        >
          <Text style={[styles.pickerText, dark && styles.lightText]}>
            {currentValue === 'true' ? 'Sim' : currentValue === 'false' ? 'Não' : 'Selecione'}
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
                {`Escolher ${field.name}`}
              </Text>
              {[
                { label: 'Selecione', value: '' },
                { label: 'Sim', value: 'true' },
                { label: 'Não', value: 'false' },
              ].map((option) => (
                <TouchableOpacity
                  key={option.value || 'empty'}
                  onPress={() => {
                    onChange(option.value === '' ? '' : option.value === 'true');
                    setPickerVisible(false);
                  }}
                  style={[styles.option, dark && styles.darkOption]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: currentValue === option.value }}
                >
                  <Text style={[styles.optionText, dark && styles.lightText]}>{option.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </Modal>
      </View>
    );
  }

  if (inputMode === 'inline') {
    return (
      <View style={styles.chips}>
        {options.map((option) => {
          const selected = selectedValues.some(
            (item) => normalizeValue(item) === normalizeValue(option.value)
          );
          return (
            <TouchableOpacity
              key={option.id || option.value}
              disabled={disabled}
              accessibilityRole="button"
              accessibilityState={{ selected, disabled }}
              onPress={() => onChange(option.value)}
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
    );
  }

  if (inputMode === 'searchable') {
    const multiple = type === 'multi_select';
    return (
      <View style={styles.selectionWrap}>
        {multiple && selectedValues.length > 0 && (
          <View style={styles.chips}>
            {selectedValues.map((selected) => (
              <TouchableOpacity
                key={selected}
                disabled={disabled}
                onPress={() =>
                  onChange(
                    selectedValues.filter(
                      (item) => normalizeValue(item) !== normalizeValue(selected)
                    )
                  )
                }
                style={[styles.chip, styles.selectedChip, disabled && styles.disabled]}
              >
                <Text style={[styles.chipText, styles.selectedText]}>{selected} ×</Text>
              </TouchableOpacity>
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
                placeholder="Pesquisar opções"
                placeholderTextColor="#94a3b8"
                style={[styles.input, dark && styles.darkInput]}
              />
              <ScrollView keyboardShouldPersistTaps="handled" style={styles.optionList}>
                {options
                  .filter((option) => normalizeValue(option.value).includes(normalizeValue(search)))
                  .map((option) => {
                    const selected = selectedValues.some(
                      (item) => normalizeValue(item) === normalizeValue(option.value)
                    );
                    return (
                      <TouchableOpacity
                        key={option.id || option.value}
                        onPress={() => {
                          if (multiple) {
                            onChange(
                              selected
                                ? selectedValues.filter(
                                    (item) => normalizeValue(item) !== normalizeValue(option.value)
                                  )
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
                {options.filter((option) =>
                  normalizeValue(option.value).includes(normalizeValue(search))
                ).length === 0 && (
                  <Text style={[styles.emptyText, dark && styles.lightText]}>
                    Nenhuma opção encontrada.
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
