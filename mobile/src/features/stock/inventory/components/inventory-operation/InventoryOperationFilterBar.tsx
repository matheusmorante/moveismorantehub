import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

interface Props {
  isDarkMode: boolean;
  scopeType?: string | null;
  onAddManualItem?: () => void;
}

export const InventoryOperationFilterBar: React.FC<Props> = ({
  isDarkMode,
  scopeType,
  onAddManualItem,
}) => {
  const surface = isDarkMode ? '#1e293b' : '#ffffff';
  const border = isDarkMode ? '#334155' : '#e2e8f0';

  if (scopeType !== 'custom' || !onAddManualItem) return null;

  return (
    <View style={[styles.addItemBar, { backgroundColor: surface, borderBottomColor: border }]}>
      <TouchableOpacity accessibilityRole="button" style={styles.addItemBtn} onPress={onAddManualItem}>
        <Text style={styles.addItemBtnText}>+ Adicionar Item</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  addItemBar: { paddingHorizontal: 16, paddingVertical: 8, borderBottomWidth: 1 },
  addItemBtn: {
    backgroundColor: 'rgba(16,185,129,0.1)',
    borderWidth: 1,
    borderColor: '#10b981',
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
  },
  addItemBtnText: { color: '#10b981', fontWeight: '800', fontSize: 13 },
});
