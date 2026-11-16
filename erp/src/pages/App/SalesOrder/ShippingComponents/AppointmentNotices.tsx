import React from 'react';
import SectionCard from '@/components/SectionCard';
import type Shipping from '@/pages/types/Shipping.type';
import {
  DELIVERY_NOTICE_OPTIONS,
  type DeliveryNoticeField,
} from '../components/steps/logisticsNoticeRules';

type OperationNotices = NonNullable<
  NonNullable<Shipping['scheduling']['appointments']>[number]['notices']
>;

interface Props {
  appointmentId: string;
  deliveryMethod: 'delivery' | 'pickup';
  notices?: OperationNotices;
  errors: Record<string, string | undefined>;
  cardMachineRequired: boolean;
  onChange: (field: keyof OperationNotices, value: boolean | string) => void;
}

export const AppointmentNotices: React.FC<Props> = ({
  appointmentId,
  deliveryMethod,
  notices = {},
  errors,
  cardMachineRequired,
  onChange,
}) => {
  const prefix = `shipping_appointment_${appointmentId}_notices_`;
  const isDelivery = deliveryMethod === 'delivery';
  const instructionsLabel = isDelivery
    ? 'Instruções específicas para a entrega/montagem...'
    : 'Instruções específicas para a retirada...';

  return (
    <SectionCard
      icon="bi bi-info-circle-fill"
      iconBg="bg-amber-600 shadow-amber-100 dark:shadow-amber-900/20"
      title={isDelivery ? 'Avisos sobre a Entrega' : 'Avisos sobre a Retirada'}
      className="bg-white dark:bg-slate-900"
    >
      {isDelivery && (
        <div className="mb-4 flex flex-wrap items-start gap-x-8 gap-y-3">
          {DELIVERY_NOTICE_OPTIONS.map((option) => {
            const field = option.field as DeliveryNoticeField;
            const error = errors[`${prefix}${field}`];
            const locked = field === 'bringCardMachine' && cardMachineRequired;
            const selected = locked ? true : notices[field];
            const labelId = `appointment-${appointmentId}-${field}-label`;

            return (
              <div key={field} className="flex min-w-0 flex-col gap-1">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                  <span
                    id={labelId}
                    title={locked
                      ? 'Sim obrigatório: há um pagamento no cartão pendente para esta venda.'
                      : error || undefined}
                    className={`text-sm font-bold ${error ? 'text-red-700 dark:text-red-300' : 'text-slate-700 dark:text-slate-200'}`}
                  >
                    {option.label} <span className="text-red-500">*</span>
                  </span>
                  <div role="radiogroup" aria-labelledby={labelId} aria-invalid={Boolean(error)} className="flex items-center gap-3">
                    {([true, false] as const).map((value) => (
                      <label
                        key={String(value)}
                        title={error || undefined}
                        className={`inline-flex cursor-pointer items-center gap-2 text-sm font-medium ${error ? 'text-red-700 dark:text-red-300' : 'text-slate-600 dark:text-slate-300'} ${locked ? 'cursor-not-allowed opacity-60' : ''}`}
                      >
                        <input
                          type="radio"
                          name={`appointment-${appointmentId}-${field}`}
                          value={String(value)}
                          checked={selected === value}
                          required={selected === undefined && !locked}
                          disabled={locked}
                          aria-invalid={Boolean(error)}
                          title={error || undefined}
                          onChange={() => onChange(field, value)}
                          className={`h-4 w-4 accent-blue-600 disabled:cursor-not-allowed disabled:opacity-50 ${error ? 'accent-red-600' : ''}`}
                        />
                        {value ? 'Sim' : 'Não'}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <label className="block">
        <textarea
          aria-label={instructionsLabel}
          value={notices.instructions || ''}
          onChange={(event) => onChange('instructions', event.target.value)}
          rows={4}
          className="min-h-[120px] w-full resize-y rounded-[2rem] border border-slate-100 bg-white p-4 text-sm font-medium tracking-tight text-slate-800 shadow-inner outline-none transition-all focus:border-amber-500/30 focus:ring-4 focus:ring-amber-500/5 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
        />
      </label>
    </SectionCard>
  );
};

