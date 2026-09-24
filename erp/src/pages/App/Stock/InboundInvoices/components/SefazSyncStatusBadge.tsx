import React, { useEffect, useState, useCallback } from 'react';
import {
    fetchSefazSyncStatus,
    syncInboundInvoicesFromSefaz,
    SefazSyncStatus,
} from '@/pages/utils/inboundNfe/services/sefazInboundSyncService';

interface SefazSyncStatusBadgeProps {
    onSyncSuccess?: () => void;
}

export const SefazSyncStatusBadge: React.FC<SefazSyncStatusBadgeProps> = ({ onSyncSuccess }) => {
    const [status, setStatus] = useState<SefazSyncStatus | null>(null);
    const [isRetrying, setIsRetrying] = useState(false);

    const loadStatus = useCallback(async () => {
        const current = await fetchSefazSyncStatus();
        setStatus(current);
    }, []);

    useEffect(() => {
        void loadStatus();
        const interval = setInterval(() => {
            void loadStatus();
        }, 45000); // Polling leve a cada 45 segundos para atualizar o indicador
        return () => clearInterval(interval);
    }, [loadStatus]);

    const handleRetry = async () => {
        if (isRetrying) return;
        setIsRetrying(true);
        try {
            const res = await syncInboundInvoicesFromSefaz();
            if (res.success && onSyncSuccess) {
                onSyncSuccess();
            }
        } finally {
            setIsRetrying(false);
            await loadStatus();
        }
    };

    if (!status) return null;

    // Tempo decorrido desde a última sincronização
    let lastSyncText = 'Nunca sincronizada';
    if (status.lastSyncAt) {
        const diffMin = Math.floor((Date.now() - new Date(status.lastSyncAt).getTime()) / 60000);
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
    if (status.nextAllowedSyncAt) {
        const remainingMs = new Date(status.nextAllowedSyncAt).getTime() - Date.now();
        if (remainingMs > 0) {
            const remainingMin = Math.ceil(remainingMs / 60000);
            nextCheckText = `Próxima verificação em ~${remainingMin} min`;
        }
    } else if (status.lastSyncAt) {
        const nextCycleMs = new Date(status.lastSyncAt).getTime() + 60 * 60 * 1000 - Date.now();
        if (nextCycleMs > 0) {
            const remainingMin = Math.ceil(nextCycleMs / 60000);
            nextCheckText = `Próxima verificação em ~${remainingMin} min`;
        }
    }

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
            </div>
        );
    }

    // Caso esteja rodando a sincronização em background
    if (status.status === 'syncing' || isRetrying) {
        return (
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-blue-600 dark:text-blue-400">
                <i className="bi bi-arrow-repeat animate-spin text-xs" />
                <span>Verificando SEFAZ em segundo plano...</span>
            </div>
        );
    }

    const syncIsStale = !status.lastSyncAt || (lastSyncText !== 'sincronizada agora' &&
        ((Date.now() - new Date(status.lastSyncAt).getTime()) / 3600000) >= 24);
    const syncTone = syncIsStale
        ? 'text-amber-700 dark:text-amber-300'
        : 'text-emerald-700 dark:text-emerald-300';
    const syncDot = syncIsStale ? 'bg-amber-500' : 'bg-emerald-500';
    const friendlyLastSync = status.lastSyncAt && syncIsStale
        ? `Última sincronização: há ${Math.max(1, Math.floor((Date.now() - new Date(status.lastSyncAt).getTime()) / 86400000))} dia(s)`
        : lastSyncText;

    // Exibição semântica: atraso não deve parecer uma sincronização saudável.
    return (
        <div className="flex flex-col text-[11px] leading-tight text-slate-500 dark:text-slate-400">
            <span className={`flex items-center gap-1.5 font-semibold ${syncTone}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${syncDot} shrink-0`} />
                <span>SEFAZ {friendlyLastSync}</span>
            </span>
            <span className="text-[10px] text-slate-400 dark:text-slate-500 pl-3">
                {nextCheckText}
            </span>
        </div>
    );
};
