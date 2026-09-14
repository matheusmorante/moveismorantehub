export interface AiQuotaAlert {
    id: string;
    model: string;
    featureLabel?: string;
    message: string;
    timestamp: number;
}

const STORAGE_KEY = 'morante_ai_quota_alerts';
let activeAlerts: AiQuotaAlert[] = (() => {
    try {
        if (typeof window !== 'undefined' && window.localStorage) {
            const raw = localStorage.getItem(STORAGE_KEY);
            return raw ? JSON.parse(raw) : [];
        }
    } catch {
        // fallback silencioso
    }
    return [];
})();

const listeners = new Set<(alerts: AiQuotaAlert[]) => void>();

function persistAlerts(): void {
    try {
        if (typeof window !== 'undefined' && window.localStorage) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(activeAlerts));
        }
    } catch {
        // storage indisponível
    }
    listeners.forEach((cb) => {
        try {
            cb([...activeAlerts]);
        } catch {
            // listener ignorado
        }
    });
}

/**
 * Detecta se um erro ou resposta de IA decorre de esgotamento de cota,
 * rate limit (HTTP 429), limites diários da aplicação ou recurso esgotado.
 */
export function isQuotaExceeded(error: any): boolean {
    if (!error) return false;
    const msg = String(error?.message || error?.errorMessage || error?.userFriendlyMessage || error || '').toLowerCase();
    const code = String(error?.errorCode || error?.status || '').toUpperCase();
    return (
        code === '429' ||
        code === 'AI_RATE_LIMIT_EXCEEDED' ||
        code === 'AI_DAILY_LIMIT_REACHED' ||
        code === 'AI_QUOTA_EXCEEDED' ||
        code === 'AI_CIRCUIT_BREAKER_OPEN' ||
        code === 'RESOURCE_EXHAUSTED' ||
        msg.includes('429') ||
        msg.includes('resource_exhausted') ||
        msg.includes('quota') ||
        msg.includes('cota') ||
        msg.includes('rate limit') ||
        msg.includes('limite diário') ||
        msg.includes('limite de uso') ||
        msg.includes('temporariamente pausado') ||
        msg.includes('circuit breaker') ||
        msg.includes('exceeded')
    );
}

/**
 * Registra um alerta de cota de IA para ser exibido como banner elegante no Header do ERP.
 * Não utiliza toast flutuante para evitar poluição visual.
 */
export function notifyAiQuotaWarning(model: string, featureLabel?: string): void {
    const cleanModel = model?.trim() || 'Gemini';
    const id = cleanModel.toLowerCase();
    const contextMsg = featureLabel ? ` para ${featureLabel}` : '';
    const message = `Cota da API Gemini (${cleanModel}) atingida${contextMsg}. O ERP está operando em modo manual sem interrupções.`;

    // Atualiza ou insere o alerta para esse modelo
    const existingIndex = activeAlerts.findIndex((a) => a.id === id);
    const newAlert: AiQuotaAlert = {
        id,
        model: cleanModel,
        featureLabel,
        message,
        timestamp: Date.now(),
    };

    if (existingIndex >= 0) {
        activeAlerts[existingIndex] = newAlert;
    } else {
        activeAlerts.unshift(newAlert);
    }

    persistAlerts();
    console.warn(`[AiQuotaNotifier] Header alert: ${message}`);
}

/**
 * Obtém a lista atual de alertas de cota ativos.
 */
export function getActiveAiQuotaAlerts(): AiQuotaAlert[] {
    return [...activeAlerts];
}

/**
 * Remove o alerta de cota de um modelo específico quando ele responder com sucesso (cota normalizada).
 */
export function clearModelAiQuotaAlert(model: string): void {
    const cleanModel = model?.trim() || 'Gemini';
    const id = cleanModel.toLowerCase();
    const prevLength = activeAlerts.length;
    activeAlerts = activeAlerts.filter((a) => a.id !== id && !a.id.includes(id) && !id.includes(a.id));
    if (activeAlerts.length !== prevLength) {
        persistAlerts();
    }
}

/**
 * Remove um alerta de cota pelo identificador (quando o usuário fecha o aviso no Header).
 */
export function dismissAiQuotaAlert(id: string): void {
    activeAlerts = activeAlerts.filter((a) => a.id !== id);
    persistAlerts();
}

/**
 * Limpa todos os alertas ativos (ex: ao restabelecer a conexão ou testes).
 */
export function clearAllAiQuotaAlerts(): void {
    activeAlerts = [];
    persistAlerts();
}

/**
 * Inscreve um componente para receber atualizações em tempo real sobre alertas de cota.
 */
export function subscribeAiQuotaAlerts(callback: (alerts: AiQuotaAlert[]) => void): () => void {
    listeners.add(callback);
    callback([...activeAlerts]);
    return () => {
        listeners.delete(callback);
    };
}

/**
 * Utilitário para limpar os alertas (usado em testes automatizados).
 */
export function resetQuotaCooldown(): void {
    clearAllAiQuotaAlerts();
}

