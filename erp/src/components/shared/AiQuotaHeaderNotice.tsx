import React, { useEffect, useState } from 'react';
import {
    AiQuotaAlert,
    dismissAiQuotaAlert,
    subscribeAiQuotaAlerts,
} from '../../services/aiGateway/aiQuotaNotifier';

export const AiQuotaHeaderNotice: React.FC = () => {
    const [alerts, setAlerts] = useState<AiQuotaAlert[]>([]);

    useEffect(() => {
        const unsubscribe = subscribeAiQuotaAlerts((currentAlerts) => {
            setAlerts(currentAlerts);
        });
        return unsubscribe;
    }, []);

    if (!alerts || alerts.length === 0) {
        return null;
    }

    return (
        <div className="w-full bg-amber-500/10 dark:bg-amber-500/15 border-b border-amber-500/20 text-amber-900 dark:text-amber-200 px-3 sm:px-6 py-1.5 transition-all text-xs font-medium animate-fadeIn">
            <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 flex-shrink-0">
                        <i className="bi bi-exclamation-triangle-fill text-[11px]" />
                    </span>
                    <span className="font-semibold text-amber-800 dark:text-amber-300">
                        Aviso de Cota de IA:
                    </span>
                    <div className="flex items-center gap-1.5 flex-wrap">
                        {alerts.map((alert) => (
                            <span
                                key={alert.id}
                                className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-amber-500/15 dark:bg-amber-500/20 border border-amber-500/30 text-[11px]"
                            >
                                <span className="font-bold">{alert.model}</span>
                                <span className="text-amber-700/80 dark:text-amber-300/80">
                                    {alert.featureLabel ? `(${alert.featureLabel})` : 'atingida'}
                                </span>
                                <button
                                    type="button"
                                    onClick={() => dismissAiQuotaAlert(alert.id)}
                                    className="ml-1 text-amber-600 dark:text-amber-400 hover:text-amber-900 dark:hover:text-amber-100 transition-colors p-0.5 rounded"
                                    title="Dispensar aviso deste modelo"
                                    aria-label="Dispensar aviso"
                                >
                                    <i className="bi bi-x text-xs" />
                                </button>
                            </span>
                        ))}
                    </div>
                    <span className="hidden md:inline text-amber-700/90 dark:text-amber-300/90 text-[11px]">
                        • Operação 100% normal em modo manual liberada.
                    </span>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                    <button
                        type="button"
                        onClick={() => alerts.forEach((a) => dismissAiQuotaAlert(a.id))}
                        className="text-[10px] font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-300 hover:underline px-1 py-0.5 rounded"
                    >
                        Fechar avisos
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AiQuotaHeaderNotice;
