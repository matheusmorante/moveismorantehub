import React from 'react';
import { MaskedNumericInput } from '../../../../components/shared/MaskedNumericInput';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export type RateioMode = 'percent' | 'fixed';

export const parseRateioInputValue = (value: string) => {
  const trimmed = value.trim().replace(/\s/g, '');
  const normalized = trimmed.includes(',')
    ? trimmed.replace(/\./g, '').replace(',', '.')
    : trimmed;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
};

export const ReceiptRateioField: React.FC<{
  label: string;
  mode: RateioMode;
  value: string;
  baseTotal: number;
  readOnly?: boolean;
  colors: { bg: string; surface: string; border: string; text: string; muted: string };
  isDarkMode: boolean;
  onModeChange: (mode: RateioMode) => void;
  onValueChange: (value: string) => void;
}> = ({ label, mode, value, baseTotal, readOnly = false, colors, isDarkMode, onModeChange, onValueChange }) => {
  const switchMode = (nextMode: RateioMode) => {
    if (nextMode === mode) return;
    const currentValue = parseRateioInputValue(value);
    if (currentValue > 0 && baseTotal > 0) {
      const converted = nextMode === 'fixed'
        ? (baseTotal * currentValue) / 100
        : (currentValue / baseTotal) * 100;
      onValueChange(String(Number(converted.toFixed(2))));
    }
    onModeChange(nextMode);
  };
  const displayValue = mode === 'percent'
    ? `${new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 }).format(parseRateioInputValue(value))}%`
    : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(parseRateioInputValue(value));

  return (
    <View
      style={[
        styles.rateioField,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
    >
      <View style={styles.rateioFieldHeader}>
        <Text style={[styles.rateioLabel, { color: colors.muted }]}>{label}</Text>
        {!readOnly ? (
          <View
            style={[
              styles.rateioModeSwitch,
              { backgroundColor: colors.bg, borderColor: colors.border },
            ]}
          >
            {(['percent', 'fixed'] as const).map((option) => {
              const active = mode === option;
              return (
                <TouchableOpacity
                  key={option}
                  accessibilityRole="button"
                  accessibilityLabel={`${label} em ${option === 'percent' ? 'porcentagem' : 'reais'}`}
                  accessibilityState={{ selected: active }}
                  onPress={() => switchMode(option)}
                  style={[
                    styles.rateioModeButton,
                    active && { backgroundColor: option === 'percent' ? '#2563eb' : '#475569' },
                  ]}
                >
                  <Text
                    style={[
                      styles.rateioModeText,
                      { color: active ? '#fff' : colors.muted },
                    ]}
                  >
                    {option === 'percent' ? '%' : 'R$'}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ) : null}
      </View>
      <View
        style={[
          styles.rateioInputRow,
          { backgroundColor: colors.bg, borderBottomColor: colors.border },
        ]}
      >
        {readOnly ? (
          <Text
            accessibilityLabel={`${label} do recebimento: ${displayValue}`}
            style={[styles.rateioInput, { color: colors.text }]}
          >
            {displayValue}
          </Text>
        ) : (
          <>
            <MaskedNumericInput
              value={value.trim() ? parseRateioInputValue(value) : null}
              onChangeValue={(nextValue) => onValueChange(nextValue === null ? '' : String(nextValue))}
              fractionDigits={2}
              accessibilityLabel={`${label} do recebimento`}
              placeholder="0,00"
              placeholderTextColor={colors.muted}
              style={[
                styles.rateioInput,
                {
                  color: colors.text,
                  backgroundColor: 'transparent',
                  borderColor: 'transparent',
                  borderRadius: 0,
                  paddingHorizontal: 0,
                  textAlign: 'left',
                },
              ]}
            />
            <Text style={[styles.rateioSuffix, { color: isDarkMode ? '#cbd5e1' : '#475569' }]}>
              {mode === 'percent' ? '%' : 'R$'}
            </Text>
          </>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  rateioField: { flex: 1, minWidth: 0, borderWidth: 1, borderRadius: 12, padding: 10, gap: 8 },
  rateioFieldHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6 },
  rateioLabel: { fontSize: 10, fontWeight: '900', textTransform: 'uppercase' },
  rateioModeSwitch: { flexDirection: 'row', borderWidth: 1, borderRadius: 8, padding: 2 },
  rateioModeButton: { minWidth: 30, alignItems: 'center', justifyContent: 'center', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 4 },
  rateioModeText: { fontSize: 10, fontWeight: '900' },
  rateioInputRow: { minHeight: 42, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, paddingHorizontal: 8 },
  rateioInput: { flex: 1, minWidth: 0, minHeight: 40, paddingVertical: 8, fontSize: 14, borderWidth: 0 },
  rateioSuffix: { fontSize: 12, fontWeight: '800', paddingHorizontal: 4 },
});
