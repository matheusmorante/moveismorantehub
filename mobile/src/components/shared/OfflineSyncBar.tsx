import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Cloud, CloudOff, AlertCircle, RefreshCw, CheckCircle2 } from 'lucide-react-native';
import { useOfflineSync } from '../../hooks/useOfflineSync';

interface Props {
  isDarkMode?: boolean;
}

export const OfflineSyncBar: React.FC<Props> = ({ isDarkMode }) => {
  const { pendingCount, syncingCount, rejectedCount, hasRejections, syncNow } = useOfflineSync();

  const totalPending = pendingCount + syncingCount;
  if (totalPending === 0 && !hasRejections) {
    return null; // Nada pendente, barra oculta
  }

  const isSyncing = syncingCount > 0;

  if (hasRejections) {
    return (
      <TouchableOpacity
        onPress={syncNow}
        activeOpacity={0.85}
        style={[styles.container, styles.containerRejected]}
      >
        <AlertCircle size={15} color="#ffffff" />
        <Text style={styles.text} numberOfLines={1}>
          {rejectedCount} {rejectedCount === 1 ? 'operação requer atenção' : 'operações requerem atenção'} (toque para detalhes)
        </Text>
        <RefreshCw size={13} color="#ffffff" />
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      onPress={syncNow}
      activeOpacity={0.85}
      style={[
        styles.container,
        isSyncing ? styles.containerSyncing : styles.containerPending,
      ]}
    >
      {isSyncing ? (
        <ActivityIndicator size="small" color="#ffffff" />
      ) : (
        <CloudOff size={15} color="#ffffff" />
      )}
      <Text style={styles.text} numberOfLines={1}>
        {isSyncing
          ? 'Transmitindo eventos para o servidor...'
          : `Aguardando conexão (${pendingCount} ${pendingCount === 1 ? 'ação pendente' : 'ações pendentes'})`}
      </Text>
      {!isSyncing && <RefreshCw size={13} color="#ffffff" />}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  containerPending: {
    backgroundColor: '#d97706', // Âmbar
  },
  containerSyncing: {
    backgroundColor: '#2563eb', // Azul
  },
  containerRejected: {
    backgroundColor: '#dc2626', // Vermelho
  },
  text: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
});
