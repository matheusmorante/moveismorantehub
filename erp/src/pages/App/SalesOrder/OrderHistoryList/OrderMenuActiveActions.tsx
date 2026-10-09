import React from 'react';
import Order from '../../../types/order.type';
import { buttons } from '../OrderActions/orderActionsConfig';
import PostSaleActionMenuButton, { isPostSaleAction } from './PostSaleActionMenuButton';
import UndoFulfillmentButton from './UndoFulfillmentButton';
import CancelScheduledSaleButton from './CancelScheduledSaleButton';
import { ReturnNfeActionMenuButton } from './ReturnNfeActionMenuButton';
import { canGenerateReturn } from '@/pages/utils/returnPolicy';

interface OrderMenuActiveActionsProps {
  order: Order;
  isEditLocked: boolean;
  isCancelled: boolean;
  canReconcileTemporaryProducts: boolean;
  onEdit: (
    order: Order,
    initialStep?: number,
    highlightTemporary?: boolean,
    reconciliationMode?: boolean
  ) => void;
  onAction: (actionKey: string, order: Order) => void;
  onStatusUpdate: (
    id: string,
    newStatus: Order['status'],
    options?: { productionConfirmed?: boolean }
  ) => void;
  onShowPostSaleActions?: (order: Order) => void;
  onCloseMenu: () => void;
  hideEditAction?: boolean;
}

export const OrderMenuActiveActions: React.FC<OrderMenuActiveActionsProps> = ({
  order,
  isEditLocked,
  isCancelled,
  canReconcileTemporaryProducts,
  onEdit,
  onAction,
  onStatusUpdate,
  onShowPostSaleActions,
  onCloseMenu,
  hideEditAction,
}) => {
  return (
    <>
      {isCancelled && ['sale', 'showroom'].includes(order.orderType || 'sale') && (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onAction('retryOrderFiscalCancellation', order);
            onCloseMenu();
          }}
          className="flex w-full items-center gap-3 rounded-xl p-2.5 text-left text-sky-700 transition-all hover:bg-sky-50 dark:text-sky-300 dark:hover:bg-sky-950/30"
          title="Verificar a situação fiscal; uma nova tentativa só será enviada após confirmação"
        >
          <i className="bi bi-arrow-repeat text-lg" />
          <span className="text-xs font-black uppercase tracking-widest">
            Verificar tratamento fiscal
          </span>
        </button>
      )}

      {canReconcileTemporaryProducts && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onEdit(order, 2, true, true);
            onCloseMenu();
          }}
          className="flex w-full items-center gap-3 rounded-xl p-2.5 text-amber-600 transition-all hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-950/30"
        >
          <i className="bi bi-link-45deg text-lg" />
          <span className="text-xs font-black uppercase tracking-widest">
            Conciliação Comercial
          </span>
        </button>
      )}

      {!isEditLocked && !isCancelled && !hideEditAction && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onEdit(order);
            onCloseMenu();
          }}
          className={`flex items-center gap-3 w-full p-2.5 rounded-xl transition-all hover:bg-slate-50 dark:hover:bg-slate-800 group/item ${
            order.orderType === 'assistance'
              ? 'text-orange-600'
              : order.orderType === 'budget'
                ? 'text-blue-600'
                : order.orderType === 'return'
                  ? 'text-amber-600'
                  : 'text-emerald-600'
          }`}
          title={`Editar est${order.orderType === 'assistance' ? 'a assistência' : order.orderType === 'budget' ? 'e orçamento' : order.orderType === 'return' ? 'a devolução' : 'a venda'}`}
        >
          <i className="bi bi-pencil-fill text-lg" />
          <div className="flex flex-col text-left">
            <span className="text-xs font-black uppercase tracking-widest">
              {order.orderType === 'assistance'
                ? 'Editar Assistência'
                : order.orderType === 'budget'
                  ? 'Editar Orçamento'
                  : order.orderType === 'return'
                    ? 'Editar Devolução'
                    : 'Editar Venda'}
            </span>
          </div>
        </button>
      )}

      <PostSaleActionMenuButton
        order={order}
        onOpen={onShowPostSaleActions}
        onCloseMenu={onCloseMenu}
      />

      <ReturnNfeActionMenuButton
        order={order}
        onAction={onAction}
        onCloseMenu={onCloseMenu}
      />

      {buttons
        .filter((btn) => {
          if (isPostSaleAction(btn.key)) return false;
          if (btn.key === 'sendCustomerReviews' && order.orderType === 'assistance') return false;
          if (btn.orderTypes && !btn.orderTypes.includes(order.orderType || 'sale')) return false;

          if (btn.key === 'generateReturn' && !canGenerateReturn(order)) return false;
          if (btn.key === 'undoReturn' && (!hasReturn || order.status === 'cancelled'))
            return false;
          if (btn.key === 'issueNfe' && order.nfeData?.status === 'homologada') return false;

          return true;
        })
        .map((btn) => {
          const isPrintReceipt = btn.key === 'printReceipt';
          const disablePrintReceipt =
            isPrintReceipt &&
            (!order.customerData?.fullName ||
              order.customerData.fullName === 'Nenhum' ||
              order.customerData.fullName === 'Ao Consumidor');
          return (
            <button
              key={btn.key}
              disabled={disablePrintReceipt}
              onClick={async (e) => {
                e.stopPropagation();
                if (disablePrintReceipt) return;
                onAction(btn.key, order);
                onCloseMenu();
              }}
              className={`flex items-center gap-3 w-full p-2.5 rounded-xl transition-all ${disablePrintReceipt ? 'opacity-50 cursor-not-allowed text-slate-400 dark:text-slate-600 bg-slate-50 dark:bg-slate-900/50' : `hover:bg-slate-50 dark:hover:bg-slate-800 group/item ${btn.color}`}`}
              title={
                disablePrintReceipt
                  ? 'Não é possível imprimir recibo sem cliente associado'
                  : btn.tooltip
              }
            >
              <div className="flex items-center gap-3 text-left">
                <i className={`bi ${btn.icon} text-lg`} />
                <span className="text-xs font-black uppercase tracking-widest">
                  {typeof btn.label === 'function' ? btn.label(order) : btn.label}
                </span>
              </div>
            </button>
          );
        })}

      <UndoFulfillmentButton
        order={order}
        onStatusUpdate={onStatusUpdate}
        onCloseMenu={onCloseMenu}
      />

      <CancelScheduledSaleButton
        order={order}
        onStatusUpdate={onStatusUpdate}
        onAction={onAction}
        onEdit={onEdit}
        onCloseMenu={onCloseMenu}
      />
    </>
  );
};
