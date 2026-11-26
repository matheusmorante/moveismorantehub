import React from 'react';
import Order from '../../../../../types/order.type';
import { formatToBRDate, toTitleCase } from '../../../../../utils/shared/formatters';
import { formatOrderCode } from '../../../../../utils/orderCode';
import { OrderCancellationFailureNotice } from '../OrderCancellationFailureNotice';
import { OrderDeliveryPrompt } from '../OrderDeliveryPrompt';
import { OrderScheduleSummary } from '../OrderScheduleSummary';
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
        <div className="mt-2 flex items-center gap-1.5 flex-wrap">
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
            className="flex items-center gap-1.5 rounded-lg border border-blue-100 bg-blue-50 px-2 py-1 text-[9px] font-black uppercase tracking-widest text-blue-600 transition-colors hover:bg-blue-100 dark:border-blue-900/30 dark:bg-blue-900/20 dark:text-blue-400"
            title={isCancelled ? 'Pedido cancelado' : 'Abrir pedido de venda vinculado'}
          >
            <i className="bi bi-link-45deg" />
            Pedido #{order.linkedOrderCode || formatOrderCode(order)}
          </button>
          {order.orderType === 'assistance' && (
            <span
              className="inline-flex items-center gap-1 rounded border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wider text-amber-700 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-300"
            >
              <i className="bi bi-tools" aria-hidden="true" />
              Assistência
            </span>
          )}
        </div>
      )}

      <div className="mt-2 grid grid-cols-1 gap-x-4 gap-y-2 pt-2 sm:grid-cols-2">
        <div className="flex flex-col">
          <span className="text-[8px] font-black uppercase tracking-widest opacity-40 mb-0.5">
            Pedido
          </span>
          <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 font-bold">
            <i className="bi bi-calendar3 text-[10px]" />
            <span className="text-[10px]">{formatToBRDate(order.date)}</span>
          </div>
        </div>

        <div className="flex min-w-0 flex-col items-start">
          <OrderDeliveryPrompt
            order={order}
            showTrash={showTrash}
            showManualPrompt={showManualPrompt}
            onStatusUpdate={onStatusUpdate}
            fulfilledLabel={statusConfig.fulfilled?.label || 'Atendido'}
          />
          <OrderScheduleSummary
            order={order}
            className="w-full"
            legacyTimeDisplay={timeDisplay}
            statusConfig={statusConfig}
          />
        </div>
      </div>
    </div>
  );
};
