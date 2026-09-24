import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { AlertTriangle, RefreshCw } from 'lucide-react-native';
import * as stockService from '../../../../services/stockService';

interface Props {
  isDarkMode: boolean;
  onSyncSuccess?: () => void;
}

export const SefazSyncStatusBadge: React.FC<Props> = ({ isDarkMode, onSyncSuccess }) => {
  const [status, setStatus] = useState<any>(null);
  const [isRetrying, setIsRetrying] = useState(false);

  const loadStatus = useCallback(async () => {
    try {
      const current = await stockService.fetchSefazSyncStatus();
      setStatus(current);
    } catch (e) {
      console.warn('Erro ao carregar status SEFAZ no mobile:', e);
    }
  }, []);

  useEffect(() => {
    void loadStatus();
    const interval = setInterval(() => {
      void loadStatus();
    }, 45000); // Polling leve a cada 45 segundos
    return () => clearInterval(interval);
  }, [loadStatus]);

  const handleRetry = async () => {
    if (isRetrying) return;
    setIsRetrying(true);
    try {
      const res = await stockService.triggerSefazSync();
      if (res?.data?.success && onSyncSuccess) {
        onSyncSuccess();
      }
    } catch (err) {
      console.error('Falha no retry da SEFAZ:', err);
    } finally {
      setIsRetrying(false);
      await loadStatus();
    }
  };

  if (!status) return null;

  // Tempo decorrido desde a última sincronização
  let lastSyncText = 'Nunca sincronizada';
  if (status.last_sync_at) {
    const diffMin = Math.floor((Date.now() - new Date(status.last_sync_at).getTime()) / 60000);
    if (diffMin <= 0) {
      lastSyncText = 'sincronizada agora';
    } else if (diffMin < 60) {
      lastSyncText = `sincronizada há ${diffMin} min`;
    } else {
      const hours = Math.floor(diffMin / 60);
      lastSyncText = `sincronizada há ${hours}h`;
    }
  }

  // Tempo restante até a próxima checagem
  let nextCheckText = 'Próxima verificação em breve';
  if (status.next_allowed_sync_at) {
    const remainingMs = new Date(status.next_allowed_sync_at).getTime() - Date.now();
    if (remainingMs > 0) {
      const remainingMin = Math.ceil(remainingMs / 60000);
      nextCheckText = `Próxima verificação em ~${remainingMin} min`;
    }
  } else if (status.last_sync_at) {
    const nextCycleMs = new Date(status.last_sync_at).getTime() + 60 * 60 * 1000 - Date.now();
    if (nextCycleMs > 0) {
      const remainingMin = Math.ceil(nextCycleMs / 60000);
      nextCheckText = `Próxima verificação em ~${remainingMin} min`;
    }
  }

  // Caso de erro técnico na sincronização
  if (status.status === 'error') {
    return (
      <View style={styles.errorContainer}>
        <View style={styles.errorRow}>
          <AlertTriangle size={13} color="#f59e0b" style={styles.iconMargin} />
          <Text style={[styles.errorText, isDarkMode && styles.errorTextDark]}>
            Não foi possível atualizar as NF-e ({lastSyncText})
          </Text>
        </View>
        <TouchableOpacity
          onPress={handleRetry}
          disabled={isRetrying}
          accessibilityRole="button"
          accessibilityLabel="Tentar atualizar SEFAZ novamente"
        >
          <Text style={[styles.retryText, isDarkMode && styles.retryTextDark]}>
            {isRetrying ? 'Tentando...' : 'Tentar novamente'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Caso esteja rodando a sincronização em background
  if (status.status === 'syncing' || isRetrying) {
    return (
      <View style={styles.syncingContainer}>
        <ActivityIndicator size="small" color="#2563eb" style={styles.spinner} />
        <Text style={[styles.syncingText, isDarkMode && styles.syncingTextDark]}>
          Verificando SEFAZ em segundo plano...
        </Text>
      </View>
    );
  }

  // Exibição padrão discreta e limpa (espelhando a Web)
  return (
    <View style={styles.container}>
      <View style={styles.statusRow}>
        <View style={styles.onlineDot} />
        <Text style={[styles.statusText, isDarkMode && styles.statusTextDark]}>
          SEFAZ {lastSyncText}
        </Text>
      </View>
      <Text style={[styles.subText, isDarkMode && styles.subTextDark]}>
        {nextCheckText}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    paddingVertical: 2,
    paddingHorizontal: 4,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  onlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10b981',
    marginRight: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#334155',
  },
  statusTextDark: {
    color: '#cbd5e1',
  },
  subText: {
    fontSize: 10,
    color: '#94a3b8',
    paddingLeft: 12,
    marginTop: 1,
  },
  subTextDark: {
    color: '#64748b',
  },
  syncingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 2,
  },
  spinner: {
    marginRight: 6,
    transform: [{ scale: 0.75 }],
  },
  syncingText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#2563eb',
  },
  syncingTextDark: {
    color: '#60a5fa',
  },
  errorContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 2,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconMargin: {
    marginRight: 4,
  },
  errorText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#b45309',
  },
  errorTextDark: {
    color: '#fbbf24',
  },
  retryText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2563eb',
    textDecorationLine: 'underline',
  },
  retryTextDark: {
    color: '#60a5fa',
  },
});
