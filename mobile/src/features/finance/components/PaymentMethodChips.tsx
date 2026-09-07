import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';

interface Props {
  options: string[];
  selectedMethod: string;
  onSelectMethod: (method: string) => void;
  hasError?: boolean;
  isDarkMode?: boolean;
}

export const PaymentMethodChips: React.FC<Props> = ({
  options,
  selectedMethod,
  onSelectMethod,
  hasError,
  isDarkMode,
}) => {
  return (
    <View>
      <Text style={[styles.label, isDarkMode && styles.labelDark]}>
        Forma de Pagamento <Text style={styles.requiredAsterisk}>*</Text>
      </Text>
      <View style={[styles.chipsContainer, hasError && styles.inputError]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsRow}>
          {options.map(m => (
            <TouchableOpacity
              key={m}
              style={[styles.chip, selectedMethod === m && styles.chipActive]}
              onPress={() => onSelectMethod(m)}
              activeOpacity={0.7}
            >
              <Text style={[styles.chipText, selectedMethod === m && styles.chipTextActive]}>
                {m}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
    marginTop: 10,
    marginBottom: 6,
  },
  labelDark: {
    color: '#cbd5e1',
  },
  requiredAsterisk: {
    color: '#dc2626',
    fontWeight: '700',
  },
  chipsContainer: {
    borderRadius: 10,
    padding: 2,
  },
  inputError: {
    borderWidth: 1.5,
    borderColor: '#dc2626',
  },
  chipsRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  chip: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
  },
  chipActive: {
    backgroundColor: '#3b82f6',
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  chipTextActive: {
    color: '#ffffff',
  },
});
