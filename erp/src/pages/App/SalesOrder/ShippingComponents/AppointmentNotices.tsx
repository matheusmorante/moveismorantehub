import React, { useEffect } from 'react';
import SectionCard from '@/components/display/SectionCard';
import NoticeInput from '@/components/inputs/NoticeInput';
import type Shipping from '@/pages/types/Shipping.type';
import {
  DELIVERY_NOTICE_OPTIONS,
  normalizeNotice,
  type DeliveryNoticeField,
} from '../components/steps/logisticsNoticeRules';
import { joinNoticeTags, splitNoticeTags } from '@/pages/utils/shared/noticeTags';

type OperationNotices = NonNullable<
  NonNullable<Shipping['scheduling']['appointments']>[number]['notices']
>;

interface Props {
  appointmentId: string;
  deliveryMethod: 'delivery' | 'pickup';
  notices?: OperationNotices;
  errors: Record<string, string | undefined>;
  cardMachineRequired: boolean;
  onChange: (changes: Partial<OperationNotices>) => void;
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
  const managedNotices = new Set(DELIVERY_NOTICE_OPTIONS.map((option) => normalizeNotice(option.notice)));
  const selectedNoticeLabels = DELIVERY_NOTICE_OPTIONS
    .filter((option) => notices[option.field] === true || (option.field === 'bringCardMachine' && cardMachineRequired))
    .map((option) => option.notice);
  const customInstructions = splitNoticeTags(notices.instructions)
    .filter((instruction) => !managedNotices.has(normalizeNotice(instruction)));
  const instructionsValue = joinNoticeTags([...selectedNoticeLabels, ...customInstructions]);

  useEffect(() => {
    if ((notices.instructions || '') !== instructionsValue) {
      onChange({ instructions: instructionsValue });
    }
  }, [instructionsValue, notices.instructions, onChange]);

  return (
    <SectionCard
      icon="bi bi-info-circle-fill"
      iconBg="bg-amber-600 shadow-amber-100 dark:shadow-amber-900/20"
      title={isDelivery ? 'Avisos sobre a Entrega' : 'Avisos sobre a Retirada'}
      className="bg-white dark:bg-slate-900"
    >
      {isDelivery && (
        <div className="mb-4 flex flex-col gap-y-3 md:flex-row md:flex-wrap md:gap-x-8">
          {DELIVERY_NOTICE_OPTIONS.map((option) => {
            const field = option.field as DeliveryNoticeField;
            const error = errors[`${prefix}${field}`];
            const locked = field === 'bringCardMachine' && cardMachineRequired;
            const selected = locked ? true : notices[field];
            const labelId = `appointment-${appointmentId}-${field}-label`;

            return (
              <div key={field} className="flex w-full min-w-0 flex-col gap-1 md:w-auto">
                <div className="flex flex-col items-start gap-1 md:flex-row md:flex-wrap md:items-center md:gap-x-4 md:gap-y-1">
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
                          onChange={() => {
                            const nextNotices = { ...notices, [field]: value };
                            const nextSelectedLabels = DELIVERY_NOTICE_OPTIONS
                              .filter((option) => nextNotices[option.field] === true || (option.field === 'bringCardMachine' && cardMachineRequired))
                              .map((option) => option.notice);
                            const nextCustomInstructions = splitNoticeTags(notices.instructions)
                              .filter((instruction) => !managedNotices.has(normalizeNotice(instruction)));
                            onChange({
                              [field]: value,
                              instructions: joinNoticeTags([...nextSelectedLabels, ...nextCustomInstructions]),
                            });
                          }}
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

      <NoticeInput
        ariaLabel={instructionsLabel}
        value={instructionsValue}
        onChange={(instructions) => onChange({ instructions })}
        placeholder=""
        enableSuggestions={false}
        className="w-full"
      />
    </SectionCard>
  );
};

