import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  fetchSefazSyncStatus,
  processNextAutomaticInboundScience,
  recoverNextMissingNsuFromSefaz,
  syncInboundInvoicesFromSefaz,
  SefazSyncStatus,
  InboundManifestationResult,
} from '@/pages/utils/inboundNfe/services/sefazInboundSyncService';

const NSU_RECOVERY_CHECK_INTERVAL_MS = 5 * 60 * 1000;

interface SefazSyncStatusBadgeProps {
  onSyncSuccess?: () => void;
}

export const SefazSyncStatusBadge: React.FC<SefazSyncStatusBadgeProps> = ({ onSyncSuccess }) => {
  const [status, setStatus] = useState<SefazSyncStatus | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);
  const [automationNotice, setAutomationNotice] = useState<string | null>(null);
  const [nextRecoveryCheckAt, setNextRecoveryCheckAt] = useState<number | null>(null);
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
    const current = await fetchSefazSyncStatus();
    setStatus(current);
  }, []);

  const processAutomaticScienceQueue = useCallback(async () => {
    if (scienceInFlight.current) {
      scienceRequestedWhileInFlight.current = true;
      return;
    }
    scienceInFlight.current = true;
    let retryDelayMs: number | null = null;
    try {
      const science: InboundManifestationResult = await processNextAutomaticInboundScience();
      if (scienceQueueMounted.current) {
        if (science.sefazBlocked) {
          const count = science.processedCount || 0;
          setAutomationNotice(
            count
              ? `Ciência registrada para ${count} NF-e; após a rejeição 656, a fila ficará pausada por 1 hora.`
              : 'Ciência automática pausada por 1 hora após a rejeição 656 da SEFAZ.'
          );
        } else if (science.xmlRetrieved) {
          const itemsCount = science.xmlItemsCount || 0;
          setAutomationNotice(
            science.message || (itemsCount
              ? `XML completo recebido; ${itemsCount} item(ns) foram atualizados.`
              : 'XML completo recebido e salvo na nota de entrada.')
          );
          onSyncSuccessRef.current?.();
        } else if (science.xmlLookupPending) {
          setAutomationNotice(science.message || 'Consulta automática do XML pendente; a fila respeitará o intervalo de cinco minutos por CNPJ.');
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
        } else if (!science.success && !science.skipped && science.error) {
          setAutomationNotice(`Ciência automática pendente: ${science.error}`);
        }
      }

      const retryAt = science.retryAfter || science.nextAllowedAt;
      const retryAtMs = retryAt ? Date.parse(retryAt) : NaN;
      if (science.retryable && !science.retryAfter) {
        scienceFailureCount.current += 1;
        retryDelayMs = Math.min(5_000 * 2 ** (scienceFailureCount.current - 1), 5 * 60_000);
      } else if (science.hasMore || science.retryAfter) {
        scienceFailureCount.current = 0;
        retryDelayMs = Math.max(5_000, Number.isFinite(retryAtMs) ? retryAtMs - Date.now() : 5_000);
      } else {
        scienceFailureCount.current = 0;
      }
    } catch (error) {
      scienceFailureCount.current += 1;
      retryDelayMs = Math.min(5_000 * 2 ** (scienceFailureCount.current - 1), 5 * 60_000);
      console.error('[SefazSyncStatusBadge] Falha na fila automática de Ciência:', error);
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
      const result = await recoverNextMissingNsuFromSefaz();
      if (result.success && (result.newDocsCount || 0) > 0) {
        onSyncSuccessRef.current?.();
        requestScienceProcessing();
      }
    } catch (error) {
      console.error('[SefazSyncStatusBadge] Falha ao recuperar NSU pendente:', error);
    }
  }, [requestScienceProcessing]);

  const syncIfDue = useCallback(async () => {
    if (autoSyncInFlight.current) return;
    autoSyncInFlight.current = true;
    let attemptedSync = false;
    try {
      const current = await fetchSefazSyncStatus();
      setStatus(current);
      if (!current.canSyncNow) return;

      attemptedSync = true;
      const result = await syncInboundInvoicesFromSefaz();
      if (result.success && (result.newDocsCount || 0) > 0) {
        onSyncSuccessRef.current?.();
      }
      if (result.success) requestScienceProcessing();
    } catch (error) {
      console.error('[SefazSyncStatusBadge] Falha na descoberta automática:', error);
    } finally {
      autoSyncInFlight.current = false;
      if (attemptedSync) await loadStatus();
    }
  }, [loadStatus, requestScienceProcessing]);

  useEffect(() => {
    scienceQueueMounted.current = true;
    setNextRecoveryCheckAt(Date.now() + NSU_RECOVERY_CHECK_INTERVAL_MS);
    void (async () => {
      await syncIfDue();
      requestScienceProcessing();
      await recoverMissingNsu();
    })();
    const interval = setInterval(() => {
      void syncIfDue();
    }, 45000); // Polling leve a cada 45 segundos para atualizar o indicador
    const recoveryInterval = setInterval(() => {
      setNextRecoveryCheckAt(Date.now() + NSU_RECOVERY_CHECK_INTERVAL_MS);
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
      const res = await syncInboundInvoicesFromSefaz();
      if (res.success && onSyncSuccess) {
        onSyncSuccess();
      }
      if (res.success) requestScienceProcessing();
    } finally {
      setIsRetrying(false);
      await loadStatus();
    }
  };

  if (!status) return null;

  // lastSyncAt representa a descoberta geral por distNSU, não a recuperação consNSU.
  let lastSyncText = 'nenhuma busca de novas notas realizada ainda';
  if (status.lastSyncAt) {
    const diffMin = Math.floor((Date.now() - new Date(status.lastSyncAt).getTime()) / 60000);
    if (diffMin <= 0) {
      lastSyncText = 'busca de novas notas feita agora';
    } else if (diffMin < 60) {
      lastSyncText = `busca de novas notas há ${diffMin} min`;
    } else {
      const hours = Math.floor(diffMin / 60);
      lastSyncText = `busca de novas notas há ${hours}h`;
    }
  }

  // distNSU descobre documentos novos uma vez por hora.
  let nextDiscoveryText = 'Próxima busca de novas notas em breve';
  if (status.nextAllowedSyncAt) {
    const remainingMs = new Date(status.nextAllowedSyncAt).getTime() - Date.now();
    if (remainingMs > 0) {
      const remainingMin = Math.ceil(remainingMs / 60000);
      nextDiscoveryText = `Próxima busca de novas notas em ~${remainingMin} min`;
    } else {
      nextDiscoveryText = 'Nova busca de notas liberada';
    }
  } else if (status.lastSyncAt) {
    const nextCycleMs = new Date(status.lastSyncAt).getTime() + 60 * 60 * 1000 - Date.now();
    if (nextCycleMs > 0) {
      const remainingMin = Math.ceil(nextCycleMs / 60000);
      nextDiscoveryText = `Próxima busca de novas notas em ~${remainingMin} min`;
    } else {
      nextDiscoveryText = 'Nova busca de notas liberada';
    }
  }
  const recoveryRemainingMs = nextRecoveryCheckAt === null ? null : nextRecoveryCheckAt - Date.now();
  const nextRecoveryCheckText = recoveryRemainingMs === null
    ? 'Checagem de notas pendentes a cada 5 min'
    : recoveryRemainingMs > 0
      ? `Próxima checagem de notas pendentes em ~${Math.ceil(recoveryRemainingMs / 60000)} min, se houver`
      : 'Checagem de notas pendentes em andamento';

  // Caso de erro técnico na sincronização
  if (status.status === 'error') {
    return (
      <div className="flex flex-wrap items-center gap-2 text-[11px] text-amber-700 dark:text-amber-300">
        <span className="flex items-center gap-1 font-medium">
          <i className="bi bi-exclamation-triangle-fill text-amber-500" />
          Não foi possível atualizar as NF-e ({lastSyncText})
        </span>
        <button
          type="button"
          disabled={isRetrying}
          onClick={handleRetry}
          className="font-bold underline text-blue-600 hover:text-blue-700 dark:text-blue-400 cursor-pointer disabled:opacity-50"
        >
          {isRetrying ? 'Tentando...' : 'Tentar novamente'}
        </button>
        {automationNotice && <span role="status" className="basis-full">{automationNotice}</span>}
      </div>
    );
  }

  // Caso esteja rodando a sincronização em background
  if (status.status === 'syncing' || isRetrying) {
    return (
      <div className="flex items-center gap-1.5 text-[11px] font-medium text-blue-600 dark:text-blue-400">
        <i className="bi bi-arrow-repeat animate-spin text-xs" />
        <span>Verificando SEFAZ em segundo plano...</span>
        {automationNotice && <span role="status">{automationNotice}</span>}
      </div>
    );
  }

  const syncIsStale =
    !status.lastSyncAt ||
    (lastSyncText !== 'busca de novas notas feita agora' &&
      (Date.now() - new Date(status.lastSyncAt).getTime()) / 3600000 >= 24);
  const syncTone = syncIsStale
    ? 'text-amber-700 dark:text-amber-300'
    : 'text-emerald-700 dark:text-emerald-300';
  const syncDot = syncIsStale ? 'bg-amber-500' : 'bg-emerald-500';
  const friendlyLastSync =
    status.lastSyncAt && syncIsStale
      ? `Busca de novas notas há ${Math.max(1, Math.floor((Date.now() - new Date(status.lastSyncAt).getTime()) / 86400000))} dia(s)`
      : lastSyncText;

  // Exibição semântica: atraso não deve parecer uma sincronização saudável.
  return (
    <div className="flex flex-col text-[11px] leading-tight text-slate-500 dark:text-slate-400">
      <span className={`flex items-center gap-1.5 font-semibold ${syncTone}`}>
        <span className={`h-1.5 w-1.5 rounded-full ${syncDot} shrink-0`} />
        <span>SEFAZ: {friendlyLastSync}</span>
      </span>
      <span className="text-[10px] text-slate-400 dark:text-slate-500 pl-3">{nextDiscoveryText}</span>
      <span className="text-[10px] text-slate-400 dark:text-slate-500 pl-3">{nextRecoveryCheckText}</span>
      {automationNotice && <span role="status" className="pl-3 text-[10px] text-amber-700 dark:text-amber-300">{automationNotice}</span>}
    </div>
  );
};
