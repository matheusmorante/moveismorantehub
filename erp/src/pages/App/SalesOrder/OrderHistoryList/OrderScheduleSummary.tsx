import React from 'react';
import Order from '../../../types/order.type';
import { formatToBRDate } from '../../../utils/formatters';
import PickupIcon from '@/components/shared/PickupIcon';
import DeliveryTruckIcon from '@/components/shared/DeliveryTruckIcon';
import { resolveCardTimeDisplay } from './OrderHistoryCard/orderCardPresentation';

interface OrderScheduleSummaryProps {
  readonly order: Order;
  readonly showLabel?: boolean;
  readonly className?: string;
  readonly legacyTimeDisplay?: string;
  readonly layout?: 'card' | 'table';
}

export const OrderScheduleSummary: React.FC<OrderScheduleSummaryProps> = ({
  order,
  showLabel = true,
  className = '',
  legacyTimeDisplay,
  layout = 'card',
}) => {
  const isTable = layout === 'table';
  const scheduling = order.shipping?.scheduling;
  const hasAppointmentRecords =
    order.orderType === 'sale' && Boolean(scheduling?.appointments?.length);
  const entries = hasAppointmentRecords
    ? scheduling!.appointments!.map((appointment, index) => ({
        id: appointment.id || `appointment-${index + 1}`,
        scheduling: appointment.scheduling || scheduling!,
        deliveryMethod: appointment.deliveryMethod || order.shipping?.deliveryMethod,
      }))
    : scheduling
      ? [{
          id: 'primary',
          scheduling,
          deliveryMethod: order.shipping?.deliveryMethod,
        }]
      : [];
  entries.sort((a, b) => {
    const aIsImmediatePickup = a.deliveryMethod === 'pickup' && Boolean(a.scheduling.immediatePickup);
    const bIsImmediatePickup = b.deliveryMethod === 'pickup' && Boolean(b.scheduling.immediatePickup);
    return Number(bIsImmediatePickup) - Number(aIsImmediatePickup);
  });
  const hasScheduleInfo = Boolean(
    hasAppointmentRecords ||
      scheduling?.date ||
      scheduling?.pendingScheduling ||
      scheduling?.notInformed ||
      (isTable && scheduling)
  );

  if (!hasScheduleInfo) {
    return isTable ? <span className="text-xs text-slate-400">—</span> : null;
  }

  return (
    <div className={`flex min-w-0 flex-col items-start text-left ${className}`}>
      {showLabel && (
        <span className="mb-0.5 text-[8px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
          {order.orderType === 'return'
            ? 'Data de coleta'
            : 'Agendamentos'}
        </span>
      )}
      <div
        className={
          isTable
            ? 'w-full min-w-0 divide-y divide-slate-100 dark:divide-slate-800'
            : 'mt-0.5 flex min-w-0 max-w-full flex-col items-start gap-1.5'
        }
      >
        {entries.map((entry) => {
          const appointmentScheduling = entry.scheduling;
          const pending = Boolean(appointmentScheduling.pendingScheduling);
          const appointmentTime =
            !hasAppointmentRecords && legacyTimeDisplay !== undefined
              ? legacyTimeDisplay
              : resolveCardTimeDisplay(appointmentScheduling);
          const dateText = appointmentScheduling.date
            ? appointmentScheduling.dateType === 'range' && appointmentScheduling.endDate
              ? `${formatToBRDate(appointmentScheduling.date)} até ${formatToBRDate(appointmentScheduling.endDate)}`
              : formatToBRDate(appointmentScheduling.date)
            : '';

          if (isTable) {
            return (
              <div
                key={entry.id}
                className="grid w-full grid-cols-[max-content_max-content] items-center gap-x-2 whitespace-nowrap py-1 text-[11px]"
              >
                <span
                  className={`inline-flex h-4 items-center gap-1.5 font-semibold leading-4 ${
                    entry.deliveryMethod === 'pickup'
                      ? 'text-purple-700 dark:text-purple-300'
                      : 'text-emerald-700 dark:text-emerald-300'
                  }`}
                >
                  {entry.deliveryMethod === 'pickup' ? (
                    <PickupIcon className="h-3 w-3" />
                  ) : (
                    <DeliveryTruckIcon className="h-3 w-3" />
                  )}
                  {entry.deliveryMethod === 'pickup' ? 'Retirada' : 'Entrega'}
                </span>
                {pending || !dateText ? (
                  <span className="inline-flex h-4 items-center font-medium leading-4 text-amber-700 dark:text-amber-300">Falta definir</span>
                ) : (
                  <span className="inline-flex h-4 items-center gap-1.5 font-medium leading-4 text-slate-700 dark:text-slate-300">
                    {dateText}
                  </span>
                )}
              </div>
            );
          }

          return (
            <div
              key={entry.id}
              className="flex w-full min-w-0 max-w-full flex-nowrap items-center justify-start gap-x-2 overflow-hidden py-1 text-[11px]"
            >
              {order.orderType === 'sale' && (
                <span
                  className={`inline-flex h-4 shrink-0 items-center gap-1.5 font-semibold leading-4 ${
                    entry.deliveryMethod === 'pickup'
                      ? 'text-purple-700 dark:text-purple-300'
                      : 'text-emerald-700 dark:text-emerald-300'
                  }`}
                >
                  {entry.deliveryMethod === 'pickup' ? (
                    <PickupIcon className="h-3 w-3 text-purple-600 dark:text-purple-400" />
                  ) : (
                    <DeliveryTruckIcon className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                  )}
                  {entry.deliveryMethod === 'pickup' ? 'Retirada' : 'Entrega'}
                </span>
              )}
              {pending ? (
                <span className="inline-flex shrink-0 items-center font-medium text-amber-700 dark:text-amber-300">
                  Falta definir
                </span>
              ) : dateText ? (
                <span className="inline-flex h-4 min-w-0 items-center gap-1.5 font-medium leading-4 text-slate-700 dark:text-slate-300">
                  <i className="bi bi-calendar3 shrink-0 text-[11px] text-slate-400 dark:text-slate-500" />
                  <span className="truncate">{dateText}</span>
                </span>
              ) : hasAppointmentRecords || appointmentScheduling.notInformed ? (
                <span className="inline-flex shrink-0 items-center font-medium text-amber-700 dark:text-amber-300">
                  Falta definir
                </span>
              ) : null}
              {appointmentTime && !pending && (
                <span className="inline-flex h-4 shrink-0 items-center gap-1.5 font-medium leading-4 text-slate-700 dark:text-slate-300">
                  <i className="bi bi-clock shrink-0 text-[11px] text-slate-400 dark:text-slate-500" />
                  {appointmentTime}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
