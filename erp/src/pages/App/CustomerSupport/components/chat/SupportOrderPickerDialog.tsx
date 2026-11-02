import React from 'react';
import type { SupportOrderSummary } from '@/pages/utils/customerSupport/supportOrdersService';

type SupportOrderFilter = 'all' | 'orders' | 'quotes';

interface SupportOrderPickerDialogProps {
  customerId?: string | null;
  orderFilter: SupportOrderFilter;
  onOrderFilterChange: (filter: SupportOrderFilter) => void;
  isLoading: boolean;
  error: string;
  orders: SupportOrderSummary[];
  isQuoteOrder: (order: SupportOrderSummary) => boolean;
  selectedOrderId: string;
  onSelectOrder: (orderId: string) => void;
  orderFieldError?: React.ReactNode;
  isCreatingPdf: boolean;
  formatMoney: (value: number) => string;
  formatDate: (value: string) => string;
  onClose: () => void;
  onSubmit: React.FormEventHandler<HTMLFormElement>;
}

export const SupportOrderPickerDialog: React.FC<SupportOrderPickerDialogProps> = ({
  customerId,
  orderFilter,
  onOrderFilterChange,
  isLoading,
  error,
  orders,
  isQuoteOrder,
  selectedOrderId,
  onSelectOrder,
  orderFieldError,
  isCreatingPdf,
  formatMoney,
  formatDate,
  onClose,
  onSubmit,
}) => {
  const visibleOrders = orders.filter((order) =>
    orderFilter === 'all' || (orderFilter === 'quotes' ? isQuoteOrder(order) : !isQuoteOrder(order))
  );

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="support-order-picker-title" className="fixed inset-0 z-[999999] flex items-center justify-center bg-slate-950/60 p-3 backdrop-blur-sm">
      <form onSubmit={onSubmit} className="flex max-h-[88vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
        <header className="flex items-center justify-between border-b border-slate-100 p-4 dark:border-slate-800">
          <div><h2 id="support-order-picker-title" className="text-sm font-bold">Pedidos e orçamentos</h2><p className="mt-1 text-xs text-slate-500">Selecione um documento recente para preparar um resumo em PDF.</p></div>
          <button type="button" onClick={onClose} aria-label="Fechar documentos comerciais" className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"><i className="bi bi-x-lg" /></button>
        </header>
        {!customerId && <p className="m-4 rounded-lg bg-amber-50 p-3 text-xs text-amber-800">Vincule um cliente à conversa para consultar os documentos comerciais.</p>}
        <div className="flex gap-2 border-b border-slate-100 px-4 py-3 dark:border-slate-800">
          {(['all', 'orders', 'quotes'] as const).map((filter) => (
            <button key={filter} type="button" aria-pressed={orderFilter === filter} onClick={() => onOrderFilterChange(filter)} className={`rounded-full px-3 py-1.5 text-xs font-semibold ${orderFilter === filter ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}>
              {filter === 'all' ? 'Todos' : filter === 'orders' ? 'Pedidos' : 'Orçamentos'}
            </button>
          ))}
        </div>
        <div className="min-h-28 flex-1 space-y-2 overflow-y-auto p-4">
          {isLoading && <p className="py-8 text-center text-xs text-slate-500">Carregando documentos…</p>}
          {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-xs text-red-700 dark:bg-red-950/30 dark:text-red-300">{error}</p>}
          {!isLoading && !error && visibleOrders.length === 0 && <p className="py-8 text-center text-xs text-slate-500">Nenhum documento encontrado para este cliente.</p>}
          {visibleOrders.map((order) => {
            const quote = isQuoteOrder(order);
            const selected = selectedOrderId === order.id;
            return (
              <button key={order.id} type="button" aria-pressed={selected} onClick={() => onSelectOrder(order.id)} className={`w-full rounded-xl border p-3 text-left transition-colors ${selected ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30' : 'border-slate-200 hover:border-slate-300 dark:border-slate-700 dark:hover:border-slate-600'}`}>
                <span className="flex items-center justify-between gap-2"><span className="text-xs font-bold">{quote ? 'Orçamento' : 'Pedido'} #{order.orderNumber}</span><span className="text-xs font-bold text-emerald-700 dark:text-emerald-300">{formatMoney(order.totalAmount)}</span></span>
                <span className="mt-1 block truncate text-[11px] text-slate-500">{order.status} · {formatDate(order.createdAt)} · {order.itemsCount} itens</span>
                <span className="mt-1 block truncate text-[10px] text-slate-500">{order.itemsPreview}</span>
              </button>
            );
          })}
        </div>
        {orderFieldError && <p role="alert" className="px-4 pb-2 text-xs text-red-600">{orderFieldError}</p>}
        <footer className="flex items-center justify-between gap-3 border-t border-slate-100 p-4 dark:border-slate-800">
          <span className="text-[10px] text-slate-500">São exibidos até 20 documentos recentes.</span>
          <button type="submit" disabled={isCreatingPdf || !selectedOrderId} className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50">{isCreatingPdf ? 'Preparando PDF…' : 'Adicionar ao rascunho'}</button>
        </footer>
      </form>
    </div>
  );
};
