import React from 'react';
import type { UseFormRegister, FieldErrors } from 'react-hook-form';
import type { AiUsageLimitsConfig } from '../../../../../../../shared-utils/aiUsageLimitSchemas';
import { QuotaNumberField } from './QuotaNumberField';
import { QuotaOperatingHoursSection } from './QuotaOperatingHoursSection';

interface QuotaFormFieldsProps {
  register: UseFormRegister<AiUsageLimitsConfig>;
  errors: FieldErrors<AiUsageLimitsConfig>;
  isAdministrator: boolean;
  watchedOperatingHoursEnabled?: boolean;
  watchedAllowOffHours?: boolean;
}

export const QuotaFormFields: React.FC<QuotaFormFieldsProps> = ({
  register,
  errors,
  isAdministrator,
  watchedOperatingHoursEnabled,
  watchedAllowOffHours,
}) => {
  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <QuotaNumberField
          id="ai-monthly-budget"
          label="Orçamento Mensal Máximo (R$)"
          hint="Teto fixado em R$ 30,00 por mês para controle total."
          prefix="R$"
          step="0.50"
          min={5}
          max={1000}
          disabled={!isAdministrator}
          registerProps={register('monthlyBudgetBRL', { valueAsNumber: true })}
          error={errors.monthlyBudgetBRL}
        />

        <QuotaNumberField
          id="ai-hard-limit-pct"
          label="Limite Rígido de Bloqueio (%)"
          hint="Bloqueia chamadas aos 95% (R$ 28,50) para prevenir excessos."
          suffix="%"
          min={50}
          max={100}
          disabled={!isAdministrator}
          registerProps={register('hardLimitPercent', { valueAsNumber: true })}
          error={errors.hardLimitPercent}
        />

        <QuotaNumberField
          id="ai-daily-budget"
          label="Cota Diária Máxima (R$)"
          hint="Média diária (R$ 1,50/dia) distribuída no mês de 30 dias."
          prefix="R$"
          step="0.10"
          min={0.5}
          max={100}
          disabled={!isAdministrator}
          registerProps={register('dailyBudgetBRL', { valueAsNumber: true })}
          error={errors.dailyBudgetBRL}
        />

        <QuotaNumberField
          id="ai-daily-max-req"
          label="Requisições Máximas por Dia"
          hint="Padrão: 250 requisições/dia (amplo para a loja)."
          min={10}
          max={10000}
          disabled={!isAdministrator}
          registerProps={register('dailyMaxRequests', { valueAsNumber: true })}
          error={errors.dailyMaxRequests}
        />

        <QuotaNumberField
          id="ai-hourly-max-req"
          label="Requisições Máximas por Hora"
          hint="Padrão: 60 requisições/hora (1 por minuto em média)."
          min={5}
          max={1000}
          disabled={!isAdministrator}
          registerProps={register('hourlyMaxRequests', { valueAsNumber: true })}
          error={errors.hourlyMaxRequests}
        />

        <QuotaNumberField
          id="ai-circuit-breaker"
          label="Anti-Loop (Máx Requisições/Minuto)"
          hint="Pausa imediata se disparar mais de 15 chamadas em 1 min."
          min={2}
          max={120}
          disabled={!isAdministrator}
          registerProps={register('circuitBreakerPerMinute', { valueAsNumber: true })}
          error={errors.circuitBreakerPerMinute}
        />

        <QuotaNumberField
          id="ai-hourly-tokens"
          label="Tokens Máximos por Hora"
          hint="Padrão: 90.000 tokens/hora."
          step="5000"
          min={5000}
          max={1000000}
          disabled={!isAdministrator}
          registerProps={register('hourlyMaxTokens', { valueAsNumber: true })}
          error={errors.hourlyMaxTokens}
        />

        <QuotaNumberField
          id="ai-daily-tokens"
          label="Tokens Máximos por Dia"
          hint="Padrão: 350.000 tokens/dia."
          step="10000"
          min={10000}
          max={5000000}
          disabled={!isAdministrator}
          registerProps={register('dailyMaxTokens', { valueAsNumber: true })}
          error={errors.dailyMaxTokens}
        />
      </div>

      <QuotaOperatingHoursSection
        register={register}
        isAdministrator={isAdministrator}
        watchedOperatingHoursEnabled={watchedOperatingHoursEnabled}
        watchedAllowOffHours={watchedAllowOffHours}
      />
    </>
  );
};
