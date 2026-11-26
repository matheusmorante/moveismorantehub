import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface Props {
  isDarkMode?: boolean;
}

export const UnselectedTypePrompt: React.FC<Props> = ({ isDarkMode }) => {
  return (
    <View style={[styles.unselectedTypeBox, isDarkMode && styles.unselectedTypeBoxDark]}>
      <Text style={[styles.unselectedTypeTitle, isDarkMode && styles.unselectedTypeTitleDark]}>
        Selecione o Tipo de Movimentação
      </Text>
      <Text style={[styles.unselectedTypeDesc, isDarkMode && styles.unselectedTypeDescDark]}>
        Escolha se é uma Entrada (+) ou Saída (-) para exibir os campos de preenchimento.
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  unselectedTypeBox: {
    marginTop: 16,
    marginBottom: 20,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  unselectedTypeBoxDark: {
    backgroundColor: '#1e293b50',
    borderColor: '#334155',
  },
  unselectedTypeTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 4,
  },
  unselectedTypeTitleDark: {
    color: '#cbd5e1',
  },
  unselectedTypeDesc: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 18,
  },
  unselectedTypeDescDark: {
    color: '#94a3b8',
  },
});
