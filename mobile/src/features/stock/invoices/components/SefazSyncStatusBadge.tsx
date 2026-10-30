import React, { useEffect, useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { AlertTriangle, RefreshCw } from 'lucide-react-native';
import * as stockService from '../../../../services/stockService';

const NSU_RECOVERY_CHECK_INTERVAL_MS = 5 * 60 * 1000;

interface Props {
  isDarkMode: boolean;
  onSyncSuccess?: () => void;
}

export const SefazSyncStatusBadge: React.FC<Props> = ({ isDarkMode, onSyncSuccess }) => {
  const [status, setStatus] = useState<any>(null);
  const [isRetrying, setIsRetrying] = useState(false);
  const [automationNotice, setAutomationNotice] = useState<string | null>(null);
  const onSyncSuccessRef = useRef(onSyncSuccess);
  const autoSyncInFlight = useRef(false);
  const scienceInFlight = useRef(false);
  const scienceRequestedWhileInFlight = useRef(false);
  const scienceRetryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scienceFailureCount = useRef(0);
  const scienceQueueMounted = useRef(false);
  const processScienceQueueRef = useRef<() => Promise<void>>(async () => {});

  const scheduleScienceQueue = useCallback((delayMs: number) => {
    if (!scienceQueueMounted.current || scienceRetryTimer.current) return;
    scienceRetryTimer.current = setTimeout(() => {
      scienceRetryTimer.current = null;
      void processScienceQueueRef.current();
    }, Math.max(0, delayMs));
  }, []);

  const requestScienceProcessing = useCallback(() => {
    if (scienceInFlight.current) {
      scienceRequestedWhileInFlight.current = true;
      return;
    }
    scheduleScienceQueue(0);
  }, [scheduleScienceQueue]);

  useEffect(() => {
    onSyncSuccessRef.current = onSyncSuccess;
  }, [onSyncSuccess]);

  const loadStatus = useCallback(async () => {
    try {
      const current = await stockService.fetchSefazSyncStatus();
      setStatus(current);
    } catch (e) {
      console.warn('Erro ao carregar status SEFAZ no mobile:', e);
    }
  }, []);

  const processAutomaticScienceQueue = useCallback(async () => {
    if (scienceInFlight.current) {
      scienceRequestedWhileInFlight.current = true;
      return;
    }
    scienceInFlight.current = true;
    let retryDelayMs: number | null = null;
    try {
      const result = await stockService.processNextAutomaticInboundScience();
      const science = result.data || {};
      if (scienceQueueMounted.current) {
        if (science.sefazBlocked) {
          const count = science.processedCount || 0;
          setAutomationNotice(
            count
              ? `Ciência registrada para ${count} NF-e; após a rejeição 656, a fila ficará pausada por 1 hora.`
              : 'Ciência automática pausada por 1 hora após a rejeição 656 da SEFAZ.'
          );
        } else if (science.xmlRetrieved) {
          setAutomationNotice(
            science.message || `XML completo recebido; ${science.xmlItemsCount || 0} item(ns) foram atualizados.`
          );
          onSyncSuccessRef.current?.();
        } else if (science.xmlLookupPending) {
          setAutomationNotice(science.message || 'Consulta automática do XML pendente; a fila respeitará cinco minutos por CNPJ.');
        } else if (science.success && science.processed) {
          const count = science.processedCount || 1;
          const rejected = science.rejectedCount || 0;
          setAutomationNotice(
            rejected
              ? `Ciência registrada para ${count} NF-e; ${rejected} evento(s) foram rejeitados. A busca do XML seguirá automaticamente.`
              : `Ciência registrada para ${count} NF-e; a busca automática do XML seguirá respeitando cinco minutos por CNPJ.`
          );
          onSyncSuccessRef.current?.();
        } else if (science.communicationUnconfirmed && science.error) {
          setAutomationNotice(`Comunicação sem confirmação: ${science.error}`);
        } else if (science.pending && science.error) {
          setAutomationNotice(`Lote de Ciência pendente de reconciliação: ${science.error}`);
        } else if (result.error && !science.skipped) {
          setAutomationNotice(`Ciência automática pendente: ${result.error.message}`);
        }
      }

      const retryAfter = typeof science.retryAfter === 'string' ? science.retryAfter : null;
      const nextAllowedAt = typeof science.nextAllowedAt === 'string' ? science.nextAllowedAt : null;
      const retryAt = retryAfter || nextAllowedAt;
      const retryAtMs = retryAt ? Date.parse(retryAt) : NaN;
      const retryable = science.retryable === true ||
        (!result.data && result.error?.message?.startsWith('Falha de comunicação'));
      if (retryable && !retryAfter) {
        scienceFailureCount.current += 1;
        retryDelayMs = Math.min(5_000 * 2 ** (scienceFailureCount.current - 1), 5 * 60_000);
      } else if (science.hasMore || retryAfter) {
        scienceFailureCount.current = 0;
        retryDelayMs = Math.max(5_000, Number.isFinite(retryAtMs) ? retryAtMs - Date.now() : 5_000);
      } else {
        scienceFailureCount.current = 0;
      }
    } catch (error) {
      scienceFailureCount.current += 1;
      retryDelayMs = Math.min(5_000 * 2 ** (scienceFailureCount.current - 1), 5 * 60_000);
      console.warn('Erro na fila automática de Ciência no mobile:', error);
    } finally {
      scienceInFlight.current = false;
      if (retryDelayMs !== null) scheduleScienceQueue(retryDelayMs);
      if (scienceRequestedWhileInFlight.current) {
        scienceRequestedWhileInFlight.current = false;
        scheduleScienceQueue(0);
      }
    }
  }, [scheduleScienceQueue]);

  processScienceQueueRef.current = processAutomaticScienceQueue;

  const recoverMissingNsu = useCallback(async () => {
    try {
      const result = await stockService.recoverNextMissingNsuFromSefaz();
      if (result?.data?.success && (result.data.newDocsCount || 0) > 0) {
        onSyncSuccessRef.current?.();
        requestScienceProcessing();
      }
    } catch (e) {
      console.warn('Erro ao recuperar NSU pendente no mobile:', e);
    }
  }, [requestScienceProcessing]);

  const syncIfDue = useCallback(async () => {
    if (autoSyncInFlight.current) return;
    autoSyncInFlight.current = true;
    let attemptedSync = false;
    try {
      const current = await stockService.fetchSefazSyncStatus();
      setStatus(current);
      if (!current?.can_sync_now) return;

      attemptedSync = true;
      const result = await stockService.triggerSefazSync();
      if (result?.data?.success && (result.data.newDocsCount || 0) > 0) {
        onSyncSuccessRef.current?.();
      }
      if (result?.data?.success) requestScienceProcessing();
    } catch (e) {
      console.warn('Erro na descoberta automática da SEFAZ no mobile:', e);
    } finally {
      autoSyncInFlight.current = false;
      if (attemptedSync) await loadStatus();
    }
  }, [loadStatus, requestScienceProcessing]);

  useEffect(() => {
    scienceQueueMounted.current = true;
    void (async () => {
      await syncIfDue();
      requestScienceProcessing();
      await recoverMissingNsu();
    })();
    const interval = setInterval(() => {
      void syncIfDue();
    }, 45000); // Polling leve a cada 45 segundos
    const recoveryInterval = setInterval(() => {
      void recoverMissingNsu();
    }, NSU_RECOVERY_CHECK_INTERVAL_MS);
    return () => {
      scienceQueueMounted.current = false;
      clearInterval(interval);
      clearInterval(recoveryInterval);
      if (scienceRetryTimer.current) clearTimeout(scienceRetryTimer.current);
      scienceRetryTimer.current = null;
    };
  }, [loadStatus, recoverMissingNsu, requestScienceProcessing, syncIfDue]);

  const handleRetry = async () => {
    if (isRetrying) return;
    setIsRetrying(true);
    try {
      const res = await stockService.triggerSefazSync();
      if (res?.data?.success && onSyncSuccess) {
        onSyncSuccess();
      }
      if (res?.data?.success) requestScienceProcessing();
    } catch (err) {
      console.error('Falha no retry da SEFAZ:', err);
    } finally {
      setIsRetrying(false);
      await loadStatus();
    }
  };

  if (!status) return null;

  // last_sync_at representa a descoberta geral por distNSU, não a recuperação consNSU.
  let lastSyncText = 'nenhuma busca de novas notas realizada ainda';
  if (status.last_sync_at) {
    const diffMin = Math.floor((Date.now() - new Date(status.last_sync_at).getTime()) / 60000);
    if (diffMin <= 0) {
      lastSyncText = 'busca de novas notas feita agora';
    } else if (diffMin < 60) {
      lastSyncText = `busca de novas notas há ${diffMin} min`;
    } else {
      const hours = Math.floor(diffMin / 60);
      lastSyncText = `busca de novas notas há ${hours}h`;
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
        {automationNotice && <Text accessibilityRole="alert" style={[styles.errorText, isDarkMode && styles.errorTextDark]}>{automationNotice}</Text>}
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
        {automationNotice && <Text style={[styles.subText, isDarkMode && styles.subTextDark]}>{automationNotice}</Text>}
      </View>
    );
  }

  // No app, mantenha somente avisos operacionais; os horários de rotina ficam ocultos.
  if (!automationNotice) return null;

  return (
    <View style={styles.container}>
      <Text accessibilityRole="alert" style={[styles.subText, isDarkMode && styles.subTextDark]}>
        {automationNotice}
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
