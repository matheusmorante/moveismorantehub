import React from 'react';
import Order from '../../../../types/order.type';
import { formatToBRDate } from '../../../../utils/shared/formatters';
import PickupIcon from '@/components/shared/PickupIcon';
import DeliveryTruckIcon from '@/components/shared/DeliveryTruckIcon';
import { resolveCardTimeDisplay } from './OrderHistoryCard/orderCardPresentation';
import { getOrderStatusLabel } from '@/pages/utils/orderStatusPresentation';

interface OrderScheduleSummaryProps {
  readonly order: Order;
  readonly showLabel?: boolean;
  readonly className?: string;
  readonly legacyTimeDisplay?: string;
  readonly layout?: 'card' | 'table';
  readonly statusConfig?: Record<string, { label: string }>;
}

export const OrderScheduleSummary: React.FC<OrderScheduleSummaryProps> = ({
  order,
  showLabel = true,
  className = '',
  legacyTimeDisplay,
  layout = 'card',
  statusConfig,
}) => {
  const isTable = layout === 'table';
  const isAssistanceOrder = order.orderType === 'assistance';
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
  const rawStatus = String(order.status || 'draft').trim().toLowerCase();
  const statusKey = ({
    completed: 'scheduled',
    agendado: 'scheduled',
    rascunho: 'draft',
    atendido: 'fulfilled',
    canceled: 'cancelled',
    cancelado: 'cancelled',
  } as Record<string, string>)[rawStatus] || rawStatus;
  const statusFallback = statusConfig?.[statusKey]?.label || ({
    draft: 'Rascunho',
    scheduled: 'Agendado',
    fulfilled: 'Atendido',
    cancelled: 'Cancelado',
  } as Record<string, string>)[statusKey] || rawStatus;
  const statusIcon = ({
    draft: 'bi-clock',
    scheduled: 'bi-calendar3',
    fulfilled: 'bi-check-circle-fill',
    cancelled: 'bi-x-circle-fill',
  } as Record<string, string>)[statusKey] || 'bi-dot';
  const statusColor = ({
    draft: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
    scheduled: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
    fulfilled: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
    cancelled: 'bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300',
  } as Record<string, string>)[statusKey] || 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300';

  if (!hasScheduleInfo) {
    return isTable ? <span className="text-xs text-slate-400">—</span> : null;
  }

  return (
    <div className={`flex min-w-0 flex-col items-start text-left ${className}`}>
      {showLabel && (
        <span className="mb-0.5 text-[8px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
          {order.orderType === 'return'
            ? 'Data de coleta'
            : isAssistanceOrder
              ? 'Agendamento da Assistência'
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
          const statusOrder = {
            ...order,
            status: statusKey,
            shipping: {
              ...order.shipping,
              deliveryMethod: entry.deliveryMethod,
              scheduling: appointmentScheduling,
            },
          };
          const appointmentStatusLabel = getOrderStatusLabel(statusOrder, statusFallback);
          const statusBadge = order.orderType === 'sale' ? (
            <span
              className={`inline-flex h-4 shrink-0 items-center gap-1 rounded px-1.5 text-[9px] font-bold leading-4 ${statusColor}`}
              title={`Status: ${appointmentStatusLabel}`}
              aria-label={`Status: ${appointmentStatusLabel}`}
            >
              <i className={`bi ${statusIcon} text-[10px] leading-none`} aria-hidden="true" />
              {appointmentStatusLabel}
            </span>
          ) : null;

          if (isTable) {
            return (
              <div
                key={entry.id}
                className="grid w-full grid-cols-[max-content_max-content] items-center gap-x-2 whitespace-nowrap py-1 text-[11px]"
              >
                <div className="inline-flex min-w-0 items-center gap-1.5">
                  {statusBadge}
                  <span
                    className={`inline-flex h-4 items-center gap-1.5 font-semibold leading-4 ${
                      isAssistanceOrder
                        ? 'text-amber-700 dark:text-amber-300'
                        : entry.deliveryMethod === 'pickup'
                        ? 'text-purple-700 dark:text-purple-300'
                        : 'text-emerald-700 dark:text-emerald-300'
                    }`}
                  >
                    {isAssistanceOrder ? (
                      <i className="bi bi-tools" aria-hidden="true" />
                    ) : entry.deliveryMethod === 'pickup' ? (
                      <PickupIcon className="h-3 w-3" />
                    ) : (
                      <DeliveryTruckIcon className="h-3 w-3" />
                    )}
                    {isAssistanceOrder ? 'Assistência' : entry.deliveryMethod === 'pickup' ? 'Retirada' : 'Entrega'}
                  </span>
                </div>
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
              {statusBadge}
              {(order.orderType === 'sale' || isAssistanceOrder) && (
                <span
                  className={`inline-flex h-4 shrink-0 items-center gap-1.5 font-semibold leading-4 ${
                    isAssistanceOrder
                      ? 'text-amber-700 dark:text-amber-300'
                      : entry.deliveryMethod === 'pickup'
                      ? 'text-purple-700 dark:text-purple-300'
                      : 'text-emerald-700 dark:text-emerald-300'
                  }`}
                >
                  {isAssistanceOrder ? (
                    <i className="bi bi-tools" aria-hidden="true" />
                  ) : entry.deliveryMethod === 'pickup' ? (
                    <PickupIcon className="h-3 w-3 text-purple-600 dark:text-purple-400" />
                  ) : (
                    <DeliveryTruckIcon className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                  )}
                  {isAssistanceOrder ? 'Assistência' : entry.deliveryMethod === 'pickup' ? 'Retirada' : 'Entrega'}
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
