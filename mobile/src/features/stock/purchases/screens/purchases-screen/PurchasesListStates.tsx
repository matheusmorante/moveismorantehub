import React from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import { RefreshCw } from 'lucide-react-native';
import { styles } from './purchasesScreen.styles';

interface PurchasesListStatesProps {
  loading: boolean;
  error: string | null;
  hasFilter: boolean;
  colors: { surface: string; border: string; text: string; muted: string };
  isDarkMode: boolean;
  onRetry: () => void;
}

export const PurchasesListStates: React.FC<PurchasesListStatesProps> = ({
  loading,
  error,
  hasFilter,
  colors,
  isDarkMode,
  onRetry,
}) => {
  if (loading) {
    return (
      <View style={styles.state}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={{ color: colors.muted, marginTop: 10 }}>Carregando pedidos...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View
        style={[
          styles.state,
          { backgroundColor: isDarkMode ? '#451a03' : '#fff7ed', borderColor: '#fdba74' },
        ]}
      >
        <Text style={styles.errorTitle}>Não foi possível carregar os pedidos</Text>
        <Text style={{ color: colors.muted, textAlign: 'center', marginTop: 5 }}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
          <RefreshCw size={15} color="#fff" />
          <Text style={styles.retryText}>Tentar novamente</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.state,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
    >
      <Text style={[styles.emptyTitle, { color: colors.text }]}>
        {hasFilter ? 'Nenhum pedido encontrado' : 'Selecione ou crie um pedido'}
      </Text>
      <Text style={{ color: colors.muted, textAlign: 'center', marginTop: 5 }}>
        {hasFilter
          ? 'Ajuste os filtros para buscar novamente.'
          : 'Os pedidos de compra do ERP aparecem aqui.'}
      </Text>
    </View>
  );
};
