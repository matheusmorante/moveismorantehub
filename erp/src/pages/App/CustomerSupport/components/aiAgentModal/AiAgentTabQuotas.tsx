import React, { useState, useEffect, useCallback } from 'react';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'react-toastify';
import { supabase } from '@/pages/utils/supabaseConfig';
import { getSettings, saveSettings } from '@/pages/utils/settings';
import { ApiUsageGuard } from '@/services/apiMonitoring/apiUsageGuard';
import {
  aiUsageLimitsSchema,
  type AiUsageLimitsConfig,
  DEFAULT_AI_USAGE_LIMITS,
} from '../../../../../../../shared-utils/aiUsageLimitSchemas';
import { QuotaMetricsCards, type LiveQuotaMetrics } from './quotas/QuotaMetricsCards';
import { QuotaFormFields } from './quotas/QuotaFormFields';

export interface AiAgentTabQuotasProps {
  isAdministrator?: boolean;
}

export const AiAgentTabQuotas: React.FC<AiAgentTabQuotasProps> = ({ isAdministrator = false }) => {
  const [metrics, setMetrics] = useState<LiveQuotaMetrics | null>(null);
  const [loadingMetrics, setLoadingMetrics] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const initialSettings = getSettings();
  const currentLimits: AiUsageLimitsConfig = {
    ...DEFAULT_AI_USAGE_LIMITS,
    ...(initialSettings.aiUsageLimits || {}),
  };

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isDirty },
  } = useForm<AiUsageLimitsConfig>({
    resolver: zodResolver(aiUsageLimitsSchema) as Resolver<AiUsageLimitsConfig>,
    defaultValues: currentLimits,
  });

  const watchedOperatingHoursEnabled = watch('operatingHours.enabled');
  const watchedAllowOffHours = watch('operatingHours.allowOffHoursEmergency');

  const fetchLiveMetrics = useCallback(async () => {
    try {
      setLoadingMetrics(true);
      const { data, error } = await supabase.rpc('get_ai_quota_metrics');

      if (!error && data) {
        setMetrics({
          monthlyBudgetBRL: Number(data.monthly_budget_brl ?? 30.0),
          monthCostBRL: Number(data.month_cost_brl ?? 0),
          remainingMonthBudgetBRL: Number(data.remaining_month_budget_brl ?? 30.0),
          monthPercent: Number(data.month_percent ?? 0),
          todayRequests: Number(data.today_requests ?? 0),
          todayTokens: Number(data.today_tokens ?? 0),
          todayCostBRL: Number(data.today_cost_brl ?? 0),
          hourRequests: Number(data.hour_requests ?? 0),
          hourTokens: Number(data.hour_tokens ?? 0),
          isOperatingHours: Boolean(data.is_operating_hours ?? true),
          status: data.status || 'ALLOW',
          reason: data.reason,
        });
      } else {
        setMetrics(null);
      }
    } catch (err) {
      console.warn('[AiAgentTabQuotas] Erro ao carregar métricas:', err);
    } finally {
      setLoadingMetrics(false);
    }
  }, []);

  useEffect(() => {
    if (isAdministrator) void fetchLiveMetrics();
    else { setMetrics(null); setLoadingMetrics(false); }
  }, [fetchLiveMetrics, isAdministrator]);

  const onSubmit = async (values: AiUsageLimitsConfig) => {
    if (!isAdministrator) return;
    try {
      setIsSaving(true);
      const current = getSettings();
      const updated = {
        ...current,
        aiUsageLimits: values,
      };

      const { confirmed } = await saveSettings(updated, { confirm: true });
      if (confirmed) {
        ApiUsageGuard.clearCache();
        toast.success('Limites e cotas de IA atualizados com sucesso!');
        reset(values);
        await fetchLiveMetrics();
      } else {
        toast.error('Não foi possível salvar os limites de IA.');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao salvar os limites de IA.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isAdministrator) return <p>Somente administradores podem consultar custos e cotas de IA.</p>;

  return (
    <div className="space-y-6">
      {/* 1. Header explicativo */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-sm">
            <i className="bi bi-shield-check text-xl" aria-hidden="true" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Guarda Unificada de Custos e Cotas de IA
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Protege o ERP, Mobile e WhatsApp contra gastos excessivos. O consumo máximo é restrito a R$ 30,00/mês.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => void fetchLiveMetrics()}
          disabled={loadingMetrics}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-all cursor-pointer shadow-xs disabled:opacity-50"
        >
          <i className={`bi bi-arrow-clockwise ${loadingMetrics ? 'animate-spin' : ''}`} aria-hidden="true" />
          <span>Atualizar Métricas</span>
        </button>
      </div>

      {/* 2. Cartões de Métricas em Tempo Real */}
      <QuotaMetricsCards metrics={metrics} currentLimits={currentLimits} />

      {/* 3. Formulário de Configuração de Limites */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-700/60">
          <div>
            <h5 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Configurações de Cotas e Orçamento
            </h5>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Defina as travas de orçamento, volume horário/diário e controle de tokens.
            </p>
          </div>
          {isDirty && (
            <span className="text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2.5 py-1 rounded-lg border border-amber-200 dark:border-amber-800">
              Alterações não salvas
            </span>
          )}
        </div>

        <QuotaFormFields
          register={register}
          errors={errors}
          isAdministrator={isAdministrator}
          watchedOperatingHoursEnabled={watchedOperatingHoursEnabled}
          watchedAllowOffHours={watchedAllowOffHours}
        />

        {/* 4. Ações do Formulário */}
        {isAdministrator && (
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-700/60">
            <button
              type="button"
              onClick={() => reset(DEFAULT_AI_USAGE_LIMITS)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-all cursor-pointer"
            >
              Restaurar Padrões (R$ 30,00)
            </button>
            <button
              type="button"
              onClick={handleSubmit(onSubmit)}
              disabled={isSaving}
              className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition-all cursor-pointer disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <i className="bi bi-arrow-repeat animate-spin" aria-hidden="true" />
                  <span>Salvando Limites...</span>
                </>
              ) : (
                <>
                  <i className="bi bi-check2-circle text-sm" aria-hidden="true" />
                  <span>Salvar Limites de IA</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
