import { useState, useEffect, useCallback } from 'react';
import { AiQuotaManager } from '@/services/aiGateway/core/AiQuotaManager';
import { CHARACTERISTICS_AI_LIMITS } from '@/services/aiGateway/config/aiLimitsConfig';

export interface CharacteristicsQuotaStats {
  usedToday: number;
  limitToday: number;
  usedHour: number;
  limitHour: number;
}

export function useAiCharacteristicsQuota(enabled: boolean = true) {
  const [stats, setStats] = useState<CharacteristicsQuotaStats>({
    usedToday: 0,
    limitToday: CHARACTERISTICS_AI_LIMITS.perDay,
    usedHour: 0,
    limitHour: CHARACTERISTICS_AI_LIMITS.perHour,
  });
  const [loading, setLoading] = useState(false);

  const fetchStats = useCallback(async () => {
    if (!enabled) return;
    try {
      setLoading(true);
      const data = await AiQuotaManager.getCharacteristicsUsageStats();
      setStats(data);
    } catch (err) {
      console.warn('[useAiCharacteristicsQuota] Falha ao consultar consumo:', err);
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    void fetchStats();
  }, [fetchStats]);

  const isHourlyLimitReached = stats.usedHour >= stats.limitHour;
  const isDailyLimitReached = stats.usedToday >= stats.limitToday;
  const isBlocked = isHourlyLimitReached || isDailyLimitReached;

  return {
    stats,
    loading,
    refresh: fetchStats,
    isHourlyLimitReached,
    isDailyLimitReached,
    isBlocked,
  };
}
