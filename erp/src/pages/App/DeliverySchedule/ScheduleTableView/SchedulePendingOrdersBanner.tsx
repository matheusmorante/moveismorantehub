import React from 'react';
import Order from '../../../types/order.type';
import { formatOrderCode } from '../../../utils/orderCode';

interface SchedulePendingOrdersBannerProps {
  pendingOrders: Order[];
  isPendingOpen: boolean;
  onToggleOpen: () => void;
  onOrderClick: (order: Order) => void;
}

export const SchedulePendingOrdersBanner: React.FC<SchedulePendingOrdersBannerProps> = ({
  pendingOrders,
  isPendingOpen,
  onToggleOpen,
  onOrderClick,
}) => {
  if (pendingOrders.length === 0) return null;

  return (
    <div className="px-4 py-3 border-b border-amber-100 dark:border-amber-900/30 bg-amber-50/20">
      <div
        onClick={onToggleOpen}
        className="flex items-center justify-between cursor-pointer select-none p-2.5 rounded-2xl hover:bg-amber-100/50 dark:hover:bg-amber-900/30 transition-all"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-xl text-amber-600 dark:text-amber-400">
            <i className="bi bi-clock-history text-lg" />
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-widest leading-none">
              Entregas a Agendar
            </h3>
            <p className="text-[9px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-[0.15em] mt-1">
              {isPendingOpen
                ? 'Clique no tópico para recolher'
                : 'Aguardando agendamento de data (Clique para visualizar)'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] font-black text-amber-700 dark:text-amber-300 bg-white dark:bg-slate-900 px-3 py-1 rounded-full border border-amber-200 dark:border-amber-800 uppercase">
            {pendingOrders.length} {pendingOrders.length === 1 ? 'pendente' : 'pendentes'}
          </span>
          <div className="w-7 h-7 rounded-xl bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center text-amber-700 dark:text-amber-300 text-xs font-bold">
            <i className={`bi bi-chevron-${isPendingOpen ? 'up' : 'down'}`} />
          </div>
        </div>
      </div>

      {isPendingOpen && (
        <div className="flex gap-4 overflow-x-auto pt-3 pb-2 custom-scrollbar animate-slide-up">
          {pendingOrders.map((order) => (
            <button
              key={(order as any)._taskKey || order.id}
              onClick={() => onOrderClick(order)}
              className="flex-none w-64 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-amber-200 dark:border-amber-800/50 shadow-sm hover:shadow-md hover:border-amber-400 dark:hover:border-amber-700 transition-all text-left group"
            >
              <div className="flex justify-between items-start mb-2">
                <span className="text-[9px] font-black text-amber-600 bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 rounded-lg border border-amber-100 dark:border-amber-800">
                  #{formatOrderCode(order)}
                </span>
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                  {new Date(order.date).toLocaleDateString('pt-BR')}
                </span>
              </div>
              <h4 className="text-[11px] font-black text-slate-800 dark:text-slate-100 group-hover:text-amber-600 transition-colors uppercase truncate">
                {order.customerData?.fullName || 'Cliente não informado'}
              </h4>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
