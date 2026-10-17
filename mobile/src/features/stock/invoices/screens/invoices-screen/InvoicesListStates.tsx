import React from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import { ReceiptText } from 'lucide-react-native';
import { styles } from './invoicesScreen.styles';

export const InvoicesLoadingState: React.FC = () => (
  <View style={styles.stateBox}>
    <ActivityIndicator color="#2563eb" />
    <Text style={styles.stateText}>Carregando notas fiscais...</Text>
  </View>
);

interface InvoicesErrorStateProps {
  error: string;
  onRetry: () => void;
}

export const InvoicesErrorState: React.FC<InvoicesErrorStateProps> = ({ error, onRetry }) => (
  <View style={styles.stateBox}>
    <Text style={[styles.stateText, styles.errorText]}>{error}</Text>
    <TouchableOpacity style={styles.retryBtn} onPress={onRetry}>
      <Text style={styles.retryText}>Tentar novamente</Text>
    </TouchableOpacity>
  </View>
);

interface InvoicesEmptyStateProps {
  isDarkMode: boolean;
}

export const InvoicesEmptyState: React.FC<InvoicesEmptyStateProps> = ({ isDarkMode }) => (
  <View style={[styles.emptyCard, isDarkMode && styles.emptyCardDark]}>
    <ReceiptText size={30} color={isDarkMode ? '#475569' : '#cbd5e1'} />
    <Text style={[styles.emptyTitle, isDarkMode && styles.textDark]}>
      Nenhuma nota fiscal de entrada encontrada
    </Text>
    <Text style={styles.emptyText}>
      Você pode adicionar novas notas fiscais ou importar XMLs recebidos de fornecedores.
    </Text>
  </View>
);
