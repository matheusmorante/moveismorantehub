import { useEffect, useState } from 'react';
import { supabase } from './supabaseConfig';
import { ApiUsageGuard } from '@/services/apiMonitoring/apiUsageGuard';
import { AI_LIMITS } from '@/services/aiGateway/config/aiLimitsConfig';

export interface AiQuotaStatus {
  isUnavailable: boolean;
  reason?: string;
  usedToday: number;
  limitToday: number;
  checkedAt: number;
}

const QUOTA_COOLDOWN_KEY = 'morante_ai_quota_exhausted_until';
let cachedStatus: AiQuotaStatus | null = null;
let lastCheckTime = 0;
const CACHE_TTL_MS = 20_000;

export const recordAiQuotaExhausted = (cooldownMinutes = 15) => {
  try {
    const until = Date.now() + cooldownMinutes * 60_000;
    sessionStorage.setItem(QUOTA_COOLDOWN_KEY, String(until));
    cachedStatus = {
      isUnavailable: true,
      reason: 'Limite de requisições da IA atingido temporariamente.',
      usedToday: AI_LIMITS.global.perDay,
      limitToday: AI_LIMITS.global.perDay,
      checkedAt: Date.now(),
    };
  } catch {
    /* no-op: o aviso local é apenas um failsafe curto */
  }
};

export const checkAiQuotaStatus = async (forceRefresh = false): Promise<AiQuotaStatus> => {
  const now = Date.now();
  if (!forceRefresh && cachedStatus && now - lastCheckTime < CACHE_TTL_MS) return cachedStatus;

  try {
    const exhaustedUntil = Number(sessionStorage.getItem(QUOTA_COOLDOWN_KEY) || 0);
    if (exhaustedUntil > now) {
      const result: AiQuotaStatus = {
        isUnavailable: true,
        reason: 'Limite de requisições da IA temporariamente esgotado.',
        usedToday: AI_LIMITS.global.perDay,
        limitToday: AI_LIMITS.global.perDay,
        checkedAt: now,
      };
      cachedStatus = result;
      lastCheckTime = now;
      return result;
    }
  } catch {
    /* no-op: o estado remoto ainda pode ser consultado */
  }

  try {
    const guard = await ApiUsageGuard.check('openai_gpt');
    if (!guard.allowed || guard.status === 'BLOCKED') {
      const result: AiQuotaStatus = {
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
  } catch (error) {
    console.warn('[openAiQuotaService] Falha ao verificar ApiUsageGuard:', error);
  }

  try {
    const startOfDay = `${new Date().toISOString().split('T')[0]}T00:00:00.000Z`;
    const { count, error } = await supabase
      .from('api_usage_logs')
      .select('id', { count: 'exact', head: true })
      .in('provider', ['gemini', 'openai'])
      .eq('status', 'SUCCESS')
      .gte('created_at', startOfDay);

    if (!error && count !== null) {
      const limitToday = AI_LIMITS.global.perDay || 120;
      const isUnavailable = count >= limitToday;
      const result: AiQuotaStatus = {
        isUnavailable,
        reason: isUnavailable
          ? `Limite diário da IA atingido (${count}/${limitToday} requisições utilizadas hoje).`
          : undefined,
        usedToday: count,
        limitToday,
        checkedAt: now,
      };
      cachedStatus = result;
      lastCheckTime = now;
      return result;
    }
  } catch (error) {
    console.warn('[openAiQuotaService] Falha ao consultar api_usage_logs:', error);
  }

  const fallback: AiQuotaStatus = {
    isUnavailable: false,
    usedToday: 0,
    limitToday: AI_LIMITS.global.perDay || 120,
    checkedAt: now,
  };
  cachedStatus = fallback;
  lastCheckTime = now;
  return fallback;
};

export const useAiQuotaStatus = () => {
  const [status, setStatus] = useState<AiQuotaStatus>({
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
        const result = await checkAiQuotaStatus();
        if (active) setStatus(result);
      } finally {
        if (active) setLoading(false);
      }
    };
    void check();
    const interval = setInterval(check, 30_000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  return { ...status, loading };
};
