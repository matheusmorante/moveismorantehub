import React from 'react';
import { Link } from 'react-router-dom';
import { SupportOrderSummary, formatBRL, formatDate } from '@/pages/utils/customerSupport/supportOrdersService';

interface CustomerOrdersTabProps {
  isLinked: boolean;
  canViewCommercial: boolean;
  isLoadingOrders: boolean;
  orders: SupportOrderSummary[];
  ordersError?: string;
  onRetryOrders?: () => void;
}

export const CustomerOrdersTab: React.FC<CustomerOrdersTabProps> = ({
  isLinked,
  canViewCommercial,
  isLoadingOrders,
  orders,
  ordersError = '',
  onRetryOrders,
}) => {
  return (
    <div className="space-y-3 animate-fade-in">
      {!canViewCommercial ? (
        <div className="p-6 text-center text-slate-400 text-xs">
          <i className="bi bi-shield-lock text-2xl block mb-2 opacity-50 text-amber-500"></i>
          Seu perfil de acesso não possui permissão para visualizar dados comerciais de pedidos.
        </div>
      ) : !isLinked ? (
        <div className="p-6 text-center text-slate-400 text-xs">
          <i className="bi bi-cart-x text-2xl block mb-2 opacity-50"></i>
          Vincule um cliente à conversa para visualizar seus pedidos de venda.
        </div>
      ) : isLoadingOrders ? (
        <div role="status" aria-live="polite" className="py-8 flex flex-col items-center justify-center gap-2">
          <div className="w-6 h-6 border-2 border-emerald-600/30 border-t-emerald-600 rounded-full animate-spin" />
          <span className="text-xs text-slate-400">Consultando pedidos...</span>
        </div>
      ) : ordersError ? (
        <div role="alert" className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/20 text-xs text-amber-900 dark:text-amber-200 space-y-2">
          <p>{ordersError}</p>
          {onRetryOrders && <button type="button" onClick={onRetryOrders} aria-label="Tentar carregar pedidos novamente" className="font-bold underline">
            Tentar novamente
          </button>}
        </div>
      ) : orders.length === 0 ? (
        <div className="p-6 text-center text-slate-400 text-xs">
          <i className="bi bi-receipt text-2xl block mb-2 opacity-50"></i>
          Nenhum pedido de venda registrado para este cliente.
        </div>
      ) : (
        orders.map((ord) => (
          <div
            key={ord.id}
            className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-xs space-y-2 hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <i className="bi bi-receipt text-emerald-600 dark:text-emerald-400"></i>
                Pedido #{ord.orderNumber}
              </span>
              <span
                className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                  ord.isCanceled
                    ? 'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300'
                    : ord.isCompleted
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                      : 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'
                }`}
              >
                {ord.status}
              </span>
            </div>

            <div className="text-[11px] text-slate-500 dark:text-slate-400 space-y-1">
              <div className="flex justify-between">
                <span>Valor Total:</span>
                <span className="font-bold text-slate-900 dark:text-slate-100">
                  {formatBRL(ord.totalAmount)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Data da Venda:</span>
                <span>{formatDate(ord.createdAt)}</span>
              </div>
              {ord.scheduledDate && (
                <div className="flex justify-between">
                  <span>Previsão de Entrega:</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                    {formatDate(ord.scheduledDate)}
                  </span>
                </div>
              )}
              {ord.deliveryFinishedAt && (
                <div className="flex justify-between">
                  <span>Entregue em:</span>
                  <span className="font-semibold text-blue-600 dark:text-blue-400">
                    {formatDate(ord.deliveryFinishedAt)}
                  </span>
                </div>
              )}
              <div className="pt-1.5 border-t border-slate-200/50 dark:border-slate-800 text-[10px] text-slate-500 leading-snug">
                <strong className="text-slate-400 font-normal">Itens: </strong>
                {ord.itemsPreview}
              </div>
            </div>

            {/* Link para o Pedido no ERP */}
            <div className="pt-1 flex justify-end">
              <Link
                to="/sales-order"
                state={{ saleOrderIdToOpen: ord.id }}
                className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
              >
                Abrir Pedido
                <i className="bi bi-chevron-right text-[9px]"></i>
              </Link>
            </div>
          </div>
        ))
      )}
    </div>
  );
};
