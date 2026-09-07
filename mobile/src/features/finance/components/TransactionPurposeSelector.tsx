import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface Props {
  purpose: 'BUSINESS' | 'PERSONAL_PARTNER';
  onPurposeChange: (purpose: 'BUSINESS' | 'PERSONAL_PARTNER') => void;
  isDarkMode?: boolean;
}

export const TransactionPurposeSelector: React.FC<Props> = ({
  purpose,
  onPurposeChange,
  isDarkMode,
}) => {
  return (
    <View>
      <Text style={[styles.label, isDarkMode && styles.labelDark]}>Finalidade</Text>
      <View style={styles.typeRow}>
        <TouchableOpacity
          style={[styles.typeBtn, purpose === 'BUSINESS' && styles.typeBtnActive]}
          onPress={() => onPurposeChange('BUSINESS')}
          activeOpacity={0.7}
        >
          <Text style={[styles.typeBtnText, purpose === 'BUSINESS' && styles.typeBtnTextActive]}>
            🏢 Operação da Empresa
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.typeBtn, purpose === 'PERSONAL_PARTNER' && styles.typeBtnActive]}
          onPress={() => onPurposeChange('PERSONAL_PARTNER')}
          activeOpacity={0.7}
        >
          <Text style={[styles.typeBtnText, purpose === 'PERSONAL_PARTNER' && styles.typeBtnTextActive]}>
            👤 Uso Particular
          </Text>
        </TouchableOpacity>
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
  typeRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 6,
  },
  typeBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
  },
  typeBtnActive: {
    backgroundColor: '#eff6ff',
    borderWidth: 1.5,
    borderColor: '#3b82f6',
  },
  typeBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748b',
  },
  typeBtnTextActive: {
    color: '#2563eb',
  },
});
