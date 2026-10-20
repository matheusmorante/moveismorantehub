import React from 'react';
import Order from '../../../../types/order.type';
import { formatToBRDate, toTitleCase } from '../../../../utils/formatters';
import { formatOrderCode } from '../../../../utils/orderCode';
import { OrderCancellationFailureNotice } from '../OrderCancellationFailureNotice';
import { OrderDeliveryPrompt } from '../OrderDeliveryPrompt';
import PickupIcon from '@/components/shared/PickupIcon';
import DeliveryTruckIcon from '@/components/shared/DeliveryTruckIcon';
import { OrderHistoryCardProps, OrderStatusConfigMap } from './OrderHistoryCard.types';

interface OrderCardBodyProps extends Pick<
  OrderHistoryCardProps,
  | 'fiscalCancellationDocuments'
  | 'fiscalCancellationState'
  | 'onAction'
  | 'onFilterByOrderId'
  | 'showTrash'
  | 'onStatusUpdate'
> {
  readonly order: Order;
  readonly isCancelled: boolean;
  readonly showManualPrompt: boolean;
  readonly statusConfig: OrderStatusConfigMap;
  readonly timeDisplay: string;
}

export const OrderCardBody: React.FC<OrderCardBodyProps> = ({
  order,
  isCancelled,
  fiscalCancellationDocuments,
  fiscalCancellationState,
  onAction,
  onFilterByOrderId,
  showTrash,
  showManualPrompt,
  onStatusUpdate,
  statusConfig,
  timeDisplay,
}) => {
  const sched = order.shipping?.scheduling;

  return (
    <div className="px-3 pt-2.5 pb-3">
      <h3
        className="text-sm font-bold text-slate-800 dark:text-slate-100 leading-tight w-fit"
        title={order.customerData?.fullName || 'Cliente não informado'}
      >
        {toTitleCase(order.customerData?.fullName || 'Cliente não informado')}
      </h3>

      {fiscalCancellationDocuments?.length ? (
        <div className="mt-1 flex flex-col items-start gap-1">
          {fiscalCancellationDocuments.map((item) => (
            <OrderCancellationFailureNotice
              key={item.documentId}
              state={item.state}
              documentId={item.documentId}
              environment={item.environment}
              onRetry={(documentId) =>
                onAction(`retryOrderFiscalCancellation:${documentId}`, order)
              }
            />
          ))}
        </div>
      ) : (
        <OrderCancellationFailureNotice state={fiscalCancellationState} />
      )}

      {order.linkedOrderId && (
        <button
          type="button"
          disabled={isCancelled}
          onClick={
            isCancelled
              ? undefined
              : (event) => {
                  event.stopPropagation();
                  onFilterByOrderId?.(order.linkedOrderId!);
                }
          }
          className="mt-2 flex items-center gap-1.5 rounded-lg border border-blue-100 bg-blue-50 px-2 py-1 text-[9px] font-black uppercase tracking-widest text-blue-600 transition-colors hover:bg-blue-100 dark:border-blue-900/30 dark:bg-blue-900/20 dark:text-blue-400"
          title={isCancelled ? 'Pedido cancelado' : 'Abrir pedido de venda vinculado'}
        >
          <i className="bi bi-link-45deg" />
          Pedido #{order.linkedOrderCode || formatOrderCode(order)}
        </button>
      )}

      <OrderDeliveryPrompt
        order={order}
        showTrash={showTrash}
        showManualPrompt={showManualPrompt}
        onStatusUpdate={onStatusUpdate}
        fulfilledLabel={statusConfig.fulfilled?.label || 'Atendido'}
      />

      <div
        className={`grid grid-cols-2 gap-x-4 gap-y-2 mt-2 pt-2 border-t ${
          isCancelled
            ? 'border-red-200/60 dark:border-red-900/40'
            : 'border-slate-100 dark:border-slate-800/40'
        }`}
      >
        <div className="flex flex-col">
          <span className="text-[8px] font-black uppercase tracking-widest opacity-40 mb-0.5">
            Pedido
          </span>
          <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 font-bold">
            <i className="bi bi-calendar3 text-[10px]" />
            <span className="text-[10px]">{formatToBRDate(order.date)}</span>
          </div>
        </div>

        {(sched?.date || sched?.pendingScheduling) && (
          <div className="flex flex-col items-end text-right">
            <span className="text-[8px] font-black uppercase tracking-widest opacity-40 mb-0.5">
              {order.orderType === 'return'
                ? 'Data de coleta'
                : order.shipping?.deliveryMethod === 'pickup'
                  ? 'Retirada'
                  : 'Entrega'}
            </span>
            {sched?.pendingScheduling ? (
              <div className="inline-flex items-center gap-1.5 bg-orange-500 text-white px-2 py-0.5 rounded-md border border-orange-600 shadow-xs w-fit">
                <i className="bi bi-clock-history text-[10px]" />
                <span className="text-[9px] font-black uppercase tracking-wider">
                  AGENDAMENTO PENDENTE
                </span>
              </div>
            ) : (
              <div className="flex items-center justify-end gap-1.5 font-bold text-blue-500 dark:text-blue-400">
                {order.shipping?.deliveryMethod === 'pickup' ? (
                  <PickupIcon className="h-3 w-3" />
                ) : (
                  <DeliveryTruckIcon className="h-3 w-3" />
                )}
                <span className="text-[10px]">
                  {sched.dateType === 'range' && sched.endDate
                    ? `${formatToBRDate(sched.date)} até ${formatToBRDate(sched.endDate)}`
                    : formatToBRDate(sched.date)}
                </span>
              </div>
            )}
          </div>
        )}

        {timeDisplay && !sched?.pendingScheduling && (
          <div className="col-span-2 mt-0.5 flex justify-end">
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-md border border-blue-100 dark:border-blue-900/30">
              <i className="bi bi-clock-history text-[10px]" />
              <span className="text-[9px] font-black uppercase tracking-widest">
                {timeDisplay}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
