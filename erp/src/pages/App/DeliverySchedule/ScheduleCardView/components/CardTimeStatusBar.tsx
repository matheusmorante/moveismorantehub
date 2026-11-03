import React from 'react';
import Order from '../../../../types/order.type';
import { formatDate } from '../../../../utils/formatters';
import type { EffectiveScheduleResolution } from '../../../../../../../shared-utils/commercialScheduling';
import { getStatusIcon } from './cardViewHelpers';

const COMPLETED_ORDER_STATUSES = new Set([
  'fulfilled',
  'atendido',
  'delivered',
  'entregue',
  'retirado',
  'completed',
  'concluido',
  'concluído',
]);
const COMPLETED_DELIVERY_STATUSES = new Set(['completed', 'delivered', 'entregue', 'retirado']);
const TRANSIT_DELIVERY_STATUSES = new Set([
  'in_progress',
  'in_transit',
  'in-transit',
  'out_for_delivery',
  'out-for-delivery',
  'em_transito',
  'em_rota',
  'em rota',
  'em_entrega',
  'em entrega',
]);
const KNOWN_DELIVERY_STATUSES = new Set([
  ...COMPLETED_DELIVERY_STATUSES,
  ...TRANSIT_DELIVERY_STATUSES,
  'in_service',
  'arrived',
  'preparing',
  'unattended',
]);

interface CardTimeStatusBarProps {
  order: Order;
  displayTime: string;
  cls: any;
  currentStatus: any;
  scheduleRes: EffectiveScheduleResolution;
}

export const CardTimeStatusBar: React.FC<CardTimeStatusBarProps> = ({
  order,
  displayTime,
  cls,
  currentStatus,
  scheduleRes,
}) => {
  const scheduling = order.shipping?.scheduling;
  const isUsingAlternative = scheduleRes.isUsingAlternative;
  const activeOption = scheduleRes.effective;
  const orderData = (order as any).order_data || {};
  const deliveryStatus = String(
    order.deliveryStatus ||
      (order as any).delivery_status ||
      orderData.deliveryStatus ||
      orderData.shipping?.deliveryStatus ||
      ''
  )
    .trim()
    .toLowerCase();
  const orderStatus = String(order.status || '').trim().toLowerCase();
  const deliveryFinishedAt =
    order.deliveryFinishedAt ||
    (order as any).delivery_finished_at ||
    orderData.deliveryFinishedAt;
  const isCompleted =
    COMPLETED_ORDER_STATUSES.has(orderStatus) ||
    COMPLETED_DELIVERY_STATUSES.has(deliveryStatus) ||
    Boolean(deliveryFinishedAt);
  const isPickup =
    /pickup|retirada/.test(
      String(
        order.shipping?.deliveryMethod ||
          (order as any).delivery_method ||
          orderData.shipping?.deliveryMethod ||
          ''
      ).toLowerCase()
    ) ||
    String((order as any).taskType || (order as any).task_type || orderData.taskType || '').toLowerCase() ===
      'pickup';
  const serviceStartedAt =
    (order as any).deliveryServiceStartedAt || orderData.deliveryServiceStartedAt;
  const arrivedAt = order.deliveryArrivedAt || orderData.deliveryArrivedAt;
  const startedAt = order.deliveryStartedAt || orderData.deliveryStartedAt;
  const preparationStartedAt =
    (order as any).deliveryPreparationStartedAt || orderData.deliveryPreparationStartedAt;
  const canUseTimestampFallback = !KNOWN_DELIVERY_STATUSES.has(deliveryStatus);
  const activeStage = (() => {
    if (isCompleted || isPickup) return null;
    if (deliveryStatus === 'in_service' || (canUseTimestampFallback && serviceStartedAt)) {
      return { label: 'EM ATENDIMENTO', icon: 'bi-tools', style: 'bg-blue-600 border-blue-500' };
    }
    if (deliveryStatus === 'arrived' || (canUseTimestampFallback && arrivedAt)) return null;
    if (deliveryStatus === 'preparing') {
      return { label: 'EM PREPARAÇÃO', icon: 'bi-box-seam-fill', style: 'bg-amber-600 border-amber-500' };
    }
    if (
      TRANSIT_DELIVERY_STATUSES.has(deliveryStatus) ||
      (canUseTimestampFallback && startedAt)
    ) {
      return { label: 'DESLOCAMENTO', icon: 'bi-truck', style: 'bg-orange-500 border-orange-400' };
    }
    if (deliveryStatus === 'unattended') return null;
    if (canUseTimestampFallback && preparationStartedAt) {
      return { label: 'EM PREPARAÇÃO', icon: 'bi-box-seam-fill', style: 'bg-amber-600 border-amber-500' };
    }
    return null;
  })();

  return (
    <div
      className={`px-3.5 py-2.5 border-b dark:border-slate-800 flex justify-between items-center transition-colors ${cls.headerBg}`}
    >
      <div className="flex items-center gap-2 flex-wrap">
        <span className="font-black text-xs sm:text-sm tracking-tight flex items-center text-slate-800 dark:text-slate-200">
          <i className={`bi bi-clock-fill mr-1.5 ${cls.timeText}`} />
          {displayTime}
        </span>
        {isUsingAlternative && activeOption && (
          <span className="text-[9px] font-black text-amber-800 dark:text-amber-200 uppercase px-1.5 py-0.5 bg-amber-100 dark:bg-amber-950/40 rounded-md border border-amber-300 dark:border-amber-700">
            {activeOption.formattedDate}
          </span>
        )}
        {!isUsingAlternative && scheduleRes.alternatives.length > 0 && (
          <span
            className="text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded-md border border-slate-200 dark:border-slate-700"
            title={scheduleRes.alternativesSummaryText}
          >
            +{scheduleRes.alternatives.length} alt.
          </span>
        )}
        {scheduling?.dateType === 'range' && scheduling?.endDate && !isUsingAlternative && (
          <span className="text-[9px] font-bold text-blue-600 dark:text-blue-400 uppercase px-1.5 py-0.5 bg-blue-50 dark:bg-blue-900/20 rounded-md border border-blue-100 dark:border-blue-900/30">
            Até {formatDate(scheduling.endDate)}
          </span>
        )}
      </div>

      {activeStage ? (
        <div
          className={`relative overflow-hidden flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-white ${activeStage.style}`}
          role="status"
          title={activeStage.label}
          aria-label={`Etapa atual: ${activeStage.label}`}
        >
          <span aria-hidden="true" className="order-fiscal-badge-shimmer-container">
            <span className="order-fiscal-badge-shimmer-beam" />
          </span>
          <span className="relative z-10 flex items-center gap-1.5">
            <i className={`bi ${activeStage.icon} text-[9px]`} />
            <span className="text-[9px] font-black uppercase tracking-wider">
              {activeStage.label}
            </span>
          </span>
        </div>
      ) : isCompleted ? null : (
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700">
          <i className={`bi ${getStatusIcon(order.status || 'draft')} text-${currentStatus.color}-500 text-[9px]`} />
          <span className="text-[9px] font-black uppercase tracking-wider">
            {currentStatus.label}
          </span>
        </div>
      )}
    </div>
  );
};
