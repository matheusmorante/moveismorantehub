import React from 'react';
import Order from '../../../../types/order.type';
import { formatCurrency } from '../../../../utils/formatters';
import { OrderOptionsMenu } from '../OrderOptionsMenu';
import { OrderHistoryCardProps } from './OrderHistoryCard.types';

interface OrderCardFooterProps extends Pick<
  OrderHistoryCardProps,
  | 'onEdit'
  | 'onDelete'
  | 'onRestore'
  | 'onPermanentDelete'
  | 'onAction'
  | 'onStatusUpdate'
  | 'onShowPostSaleActions'
  | 'showTrash'
> {
  readonly order: Order;
  readonly isCancelled: boolean;
  readonly isDraft: boolean;
  readonly isEditLocked: boolean;
}

export const OrderCardFooter: React.FC<OrderCardFooterProps> = ({
  order,
  isCancelled,
  isDraft,
  isEditLocked,
  showTrash,
  onEdit,
  onDelete,
  onRestore,
  onPermanentDelete,
  onAction,
  onStatusUpdate,
  onShowPostSaleActions,
}) => {
  return (
    <div
      className={`flex justify-between items-center border-t ${
        isCancelled
          ? 'border-red-200/60 dark:border-red-900/40'
          : 'border-slate-50 dark:border-slate-800/50'
      } px-3 pt-2.5 pb-3`}
    >
      <div className="flex flex-col">
        <span className="text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest mb-0.5">
          {order.orderType === 'return' ? 'Total devolvido' : 'Total'}
        </span>
        <span className="text-base font-black text-blue-600 dark:text-blue-400">
          {formatCurrency(order.paymentsSummary?.totalOrderValue || 0)}
        </span>
      </div>

      <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
        {isDraft && !showTrash && (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onEdit(order);
            }}
            className="w-8 h-8 rounded-xl transition-all bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400 cursor-pointer flex items-center justify-center border border-blue-100 dark:border-blue-900/30 shadow-sm"
            title="Retomar cadastramento do pedido"
            aria-label="Retomar cadastramento do pedido"
          >
            <i className="bi bi-play-fill text-lg" aria-hidden="true" />
          </button>
        )}

        {!isEditLocked && !isCancelled && !isDraft && !showTrash && (
          <button
            type="button"
            onClick={() => onEdit(order)}
            className="w-8 h-8 rounded-xl transition-all bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400 cursor-pointer flex items-center justify-center border border-blue-100 dark:border-blue-900/30 shadow-sm"
            title="Editar pedido"
          >
            <i className="bi bi-pencil-fill text-sm" />
          </button>
        )}

        <OrderOptionsMenu
          order={order}
          showTrash={showTrash}
          onEdit={onEdit}
          onDelete={onDelete}
          onRestore={onRestore}
          onPermanentDelete={onPermanentDelete}
          onAction={onAction}
          onStatusUpdate={onStatusUpdate}
          onShowPostSaleActions={onShowPostSaleActions}
          hideResumeDraftAction={isDraft && !showTrash}
          hideEditAction={!isEditLocked && !isCancelled && !isDraft && !showTrash}
          buttonClassName={`w-8 h-8 ${isCancelled ? 'relative z-30' : ''}`}
        />
      </div>
    </div>
  );
};
