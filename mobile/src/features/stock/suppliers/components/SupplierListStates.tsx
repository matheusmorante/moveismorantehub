import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { RefreshCw } from 'lucide-react-native';
import { styles } from '../screens/suppliersScreen.styles';

interface SupplierColors {
  bg: string;
  surface: string;
  border: string;
  text: string;
  muted: string;
}

interface SupplierListStatesProps {
  loading: boolean;
  error?: string | null;
  search: string;
  activeOnly?: boolean;
  onRetry: () => void;
  colors: SupplierColors;
}

export const SupplierListEmptyState: React.FC<SupplierListStatesProps> = ({
  loading,
  error,
  search,
  activeOnly,
  onRetry,
  colors,
}) => {
  if (loading) {
    return (
      <View style={styles.state}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={{ color: colors.muted, marginTop: 10 }}>Carregando fornecedores...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.state}>
        <Text style={[styles.stateTitle, { color: colors.text }]}>
          Não foi possível carregar
        </Text>
        <Text style={{ color: colors.muted, textAlign: 'center', marginTop: 6 }}>
          {error}
        </Text>
        <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
          <RefreshCw size={15} color="#fff" />
          <Text style={styles.addButtonText}>Tentar novamente</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isFiltered = Boolean(search || activeOnly !== undefined);

  return (
    <View style={styles.state}>
      <Text style={[styles.stateTitle, { color: colors.text }]}>
        {isFiltered ? 'Nenhum fornecedor encontrado' : 'Nenhum fornecedor cadastrado'}
      </Text>
      <Text style={{ color: colors.muted, textAlign: 'center', marginTop: 6 }}>
        {isFiltered
          ? 'Ajuste a busca ou o filtro de status.'
          : 'Cadastre o primeiro fornecedor para começar.'}
      </Text>
    </View>
  );
};
