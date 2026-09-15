import { useState, useEffect } from 'react';
import { supabase } from './supabaseConfig';
import { ApiUsageGuard } from '@/services/apiMonitoring/apiUsageGuard';
import { AI_LIMITS } from '@/services/aiGateway/config/aiLimitsConfig';

export interface GeminiQuotaStatus {
    isUnavailable: boolean;
    reason?: string;
    usedToday: number;
    limitToday: number;
    checkedAt: number;
}

const QUOTA_COOLDOWN_KEY = 'morante_gemini_quota_exhausted_until';
let cachedStatus: GeminiQuotaStatus | null = null;
let lastCheckTime = 0;
const CACHE_TTL_MS = 20000; // 20 segundos

export const recordGeminiQuotaExhausted = (cooldownMinutes = 15) => {
    try {
        const until = Date.now() + cooldownMinutes * 60 * 1000;
        sessionStorage.setItem(QUOTA_COOLDOWN_KEY, String(until));
        cachedStatus = {
            isUnavailable: true,
            reason: 'Limite de requisições do Gemini atingido temporariamente.',
            usedToday: AI_LIMITS.global.perDay,
            limitToday: AI_LIMITS.global.perDay,
            checkedAt: Date.now(),
        };
    } catch {}
};

export const checkGeminiQuotaStatus = async (forceRefresh = false): Promise<GeminiQuotaStatus> => {
    const now = Date.now();
    if (!forceRefresh && cachedStatus && now - lastCheckTime < CACHE_TTL_MS) {
        return cachedStatus;
    }

    // 1. Verificar se há cooldown ativo por erro 429 recente
    try {
        const exhaustedUntil = Number(sessionStorage.getItem(QUOTA_COOLDOWN_KEY) || 0);
        if (exhaustedUntil > now) {
            const result: GeminiQuotaStatus = {
                isUnavailable: true,
                reason: 'Cota de requisições do Gemini temporariamente esgotada.',
                usedToday: AI_LIMITS.global.perDay,
                limitToday: AI_LIMITS.global.perDay,
                checkedAt: now,
            };
            cachedStatus = result;
            lastCheckTime = now;
            return result;
        }
    } catch {}

    // 2. Checar com ApiUsageGuard
    try {
        const guard = await ApiUsageGuard.check('gemini_flash');
        if (!guard.allowed || guard.status === 'BLOCKED') {
            const result: GeminiQuotaStatus = {
                isUnavailable: true,
                reason: guard.reason || 'Cota de IA bloqueada preventivamente.',
                usedToday: AI_LIMITS.global.perDay,
                limitToday: AI_LIMITS.global.perDay,
                checkedAt: now,
            };
            cachedStatus = result;
            lastCheckTime = now;
            return result;
        }
    } catch (err) {
        console.warn('[geminiQuotaService] Falha ao verificar ApiUsageGuard:', err);
    }

    // 3. Consultar contagem do dia em api_usage_logs
    try {
        const today = new Date().toISOString().split('T')[0];
        const startOfDay = `${today}T00:00:00.000Z`;

        const { data, error } = await supabase
            .from('api_usage_logs')
            .select('id')
            .eq('provider', 'gemini')
            .eq('status', 'SUCCESS')
            .gte('created_at', startOfDay);

        if (!error && data) {
            const usedToday = data.length;
            const limitToday = AI_LIMITS.global.perDay || 120;
            const isExceeded = usedToday >= limitToday;

            const result: GeminiQuotaStatus = {
                isUnavailable: isExceeded,
                reason: isExceeded ? `Limite diário do Gemini atingido (${usedToday}/${limitToday} requisições utilizadas hoje).` : undefined,
                usedToday,
                limitToday,
                checkedAt: now,
            };
            cachedStatus = result;
            lastCheckTime = now;
            return result;
        }
    } catch (err) {
        console.warn('[geminiQuotaService] Falha ao consultar api_usage_logs:', err);
    }

    const fallback: GeminiQuotaStatus = {
        isUnavailable: false,
        usedToday: 0,
        limitToday: AI_LIMITS.global.perDay || 120,
        checkedAt: now,
    };
    cachedStatus = fallback;
    lastCheckTime = now;
    return fallback;
};

export const useGeminiQuotaStatus = () => {
    const [status, setStatus] = useState<GeminiQuotaStatus>({
        isUnavailable: false,
        usedToday: 0,
        limitToday: AI_LIMITS.global.perDay || 120,
        checkedAt: 0,
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let active = true;

        const check = async () => {
            try {
                const res = await checkGeminiQuotaStatus();
                if (active) setStatus(res);
            } finally {
                if (active) setLoading(false);
            }
        };

        void check();
        const interval = setInterval(check, 30000);

        return () => {
            active = false;
            clearInterval(interval);
        };
    }, []);

    return { ...status, loading };
};
