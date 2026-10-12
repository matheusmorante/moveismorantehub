import { useEffect, useState } from 'react';
import type Order from '../../../types/order.type';
import { getOrderFulfillmentCountdown } from '@/pages/utils/orderFulfillmentCountdown';
import { getFulfillmentLabels } from '@/pages/utils/orderStatusPresentation';

interface OrderDeliveryPromptProps {
  order: Order;
  showTrash?: boolean;
  showManualPrompt?: boolean;
  onStatusUpdate: (id: string, newStatus: Order['status']) => void;
  fulfilledLabel?: string;
}

export const OrderDeliveryPrompt = ({
  order,
  showTrash,
  showManualPrompt = true,
  onStatusUpdate,
  fulfilledLabel = 'Atendido',
}: OrderDeliveryPromptProps) => {
  const [showConfirm, setShowConfirm] = useState(false);
  const [currentTime, setCurrentTime] = useState(() => new Date());
  const orderData = (order as any).order_data || {};
  const orderType = String(
    order.orderType || (order as any).order_type || orderData.orderType || ''
  )
    .trim()
    .toLowerCase();
  const returnMethod = String(
    order.returnMethod || orderData.returnMethod || orderData.return_method || ''
  ).toLowerCase();
  const isScheduledReturnCollection =
    orderType === 'return' && order.status === 'scheduled' && returnMethod !== 'store_delivery';
  const countdown = getOrderFulfillmentCountdown(order, undefined, currentTime);
  const fulfillmentLabels = getFulfillmentLabels(order, fulfilledLabel);
  const shouldRefreshCountdown = isScheduledReturnCollection || countdown.deadline !== null;

  useEffect(() => {
    if (!shouldRefreshCountdown) return;
    const timer = window.setInterval(() => setCurrentTime(new Date()), 30_000);
    return () => window.clearInterval(timer);
  }, [shouldRefreshCountdown]);

  useEffect(() => {
    if (!showConfirm) return;
    const timer = setTimeout(() => setShowConfirm(false), 5000);
    return () => clearTimeout(timer);
  }, [showConfirm]);

  if (isScheduledReturnCollection) {
    if (showTrash || order.deleted) return null;
    const timerMessage = countdown.isExpired
      ? 'Prazo vencido. Atualizando para Devolvido.'
      : countdown.countdownLabel || 'Prazo da coleta não definido';

    return (
      <div
        role="status"
        className="mt-1 flex w-fit flex-col items-start rounded-lg border border-amber-200 bg-amber-50 px-2 py-1 text-left text-amber-700 shadow-sm dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-300"
        aria-label={`Status: Coleta agendada. ${timerMessage}`}
      >
        <div className="flex items-center gap-1.5">
          <i className="bi bi-calendar-check text-[10px]" />
          <span className="text-[9px] font-black uppercase tracking-widest">
            {fulfillmentLabels.preFulfillmentStatus}
          </span>
        </div>
        <span className="mt-0.5 text-[8px] font-bold tracking-tight">{timerMessage}</span>
      </div>
    );
  }

  if (
    !countdown.isPastDelivery ||
    order.status === 'fulfilled' ||
    order.status === 'cancelled' ||
    showTrash ||
    !showManualPrompt
  ) {
    return null;
  }

  if (showConfirm) {
    return (
      <div className="flex items-center gap-1.5 animate-slide-up mt-1">
        <span className="text-[9px] text-slate-500 dark:text-slate-400 font-bold">
          {fulfillmentLabels.confirmationQuestion}
        </span>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onStatusUpdate(order.id!, 'fulfilled');
            setShowConfirm(false);
          }}
          className="px-2 py-1 bg-emerald-600 text-white text-[9px] font-black uppercase rounded-md hover:bg-emerald-700 transition-colors shadow-sm cursor-pointer"
        >
          Sim
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setShowConfirm(false);
          }}
          className="px-2 py-1 bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-[9px] font-black uppercase rounded-md hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors shadow-sm cursor-pointer"
        >
          Não
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        setShowConfirm(true);
      }}
      className="flex flex-col items-start px-2 py-1 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-500 rounded-lg border border-red-200 dark:border-red-900/30 w-fit hover:scale-105 transition-all active:scale-95 shadow-sm text-left cursor-pointer mt-1"
      title={fulfillmentLabels.confirmationQuestion}
      aria-label={`Confirmação automática em ${countdown.countdownLabel}`}
    >
      <div className="flex items-center gap-1.5">
        <i className="bi bi-clock-history text-[10px]" />
        <span className="text-[9px] font-black uppercase tracking-widest">
          Confirmação automática em
        </span>
      </div>
      {countdown.countdownLabel && (
        <span className="text-[8px] font-bold text-red-500 dark:text-red-400 tracking-tight mt-0.5">
          {countdown.countdownLabel}
        </span>
      )}
    </button>
  );
};
