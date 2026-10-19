import React from 'react';
import { Text, View } from 'react-native';
import { ClipboardList } from 'lucide-react-native';

interface InventoryScreenEmptyStateProps {
  isDarkMode: boolean;
}

export const InventoryScreenEmptyState: React.FC<InventoryScreenEmptyStateProps> = ({
  isDarkMode,
}) => {
  return (
    <View
      style={{
        padding: 32,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 40,
      }}
    >
      <View
        style={{
          width: 64,
          height: 64,
          borderRadius: 32,
          backgroundColor: isDarkMode ? '#1e293b' : '#f1f5f9',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 16,
        }}
      >
        <ClipboardList size={32} color={isDarkMode ? '#64748b' : '#94a3b8'} />
      </View>
      <Text
        style={{
          fontSize: 16,
          fontWeight: '700',
          color: isDarkMode ? '#f8fafc' : '#0f172a',
          marginBottom: 8,
        }}
      >
        Nenhum inventário ainda
      </Text>
      <Text style={{ textAlign: 'center', color: isDarkMode ? '#94a3b8' : '#64748b' }}>
        Toque no botão "Novo Inventário" para começar a auditar seu estoque.
      </Text>
    </View>
  );
};
