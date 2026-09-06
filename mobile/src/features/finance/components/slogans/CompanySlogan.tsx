import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

/**
 * Componente visual que exibe o slogan da empresa.
 * Estilo premium, compatível com o ProductSlogan para manter identidade visual.
 */
export const CompanySlogan: React.FC<{ slogan?: string }> = ({ slogan }) => {
  const defaultSlogan = 'Qualidade que cabe no seu bolso';
  return (
    <View style={styles.container}>
      <Text style={styles.text}>{slogan ?? defaultSlogan}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: '#1e293b', // dark slate background (fallback for dark mode)
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
    marginVertical: 8,
  },
  text: {
    color: '#f1f5f9',
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
  },
});
