import React from 'react';
import Order from '../../../../types/order.type';
import { DeliveryOrderCard } from './DeliveryOrderCard';

interface CardPendingSectionProps {
  pendingOrders: Order[];
  isPendingOpen: boolean;
  onTogglePending: () => void;
  onOrderClick: (order: Order) => void;
  isReadOnly?: boolean;
}

export const CardPendingSection: React.FC<CardPendingSectionProps> = ({
  pendingOrders,
  isPendingOpen,
  onTogglePending,
  onOrderClick,
  isReadOnly,
}) => {
  if (pendingOrders.length === 0) return null;

  return (
    <div className="w-full scroll-mt-4">
      {/* Tópico Flutuante com Acordeão de Entregas a Agendar */}
      <div
        onClick={onTogglePending}
        className={`sticky ${
          isReadOnly ? 'top-0' : 'top-14 xl:top-16'
        } z-30 py-2.5 bg-amber-50/95 dark:bg-amber-950/95 backdrop-blur-md flex items-center justify-between mb-3 px-4 py-3 rounded-2xl border border-amber-200/80 dark:border-amber-900/60 shadow-sm cursor-pointer hover:bg-amber-100/70 dark:hover:bg-amber-900/70 transition-all select-none`}
      >
        <div className="flex items-center gap-3">
          <span className="w-3 h-3 rounded-full bg-amber-500 animate-pulse" />
          <div>
            <h3 className="text-xs sm:text-sm font-black uppercase text-amber-800 dark:text-amber-300 tracking-wider">
              Entregas a Agendar
            </h3>
            <p className="text-[9px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-widest">
              {isPendingOpen
                ? 'Clique no tópico para recolher'
                : 'Aguardando agendamento de data (Clique para visualizar)'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] font-black text-amber-700 dark:text-amber-300 bg-white dark:bg-slate-900 px-3 py-1 rounded-full border border-amber-200 dark:border-amber-800 uppercase shadow-xs">
            {pendingOrders.length} {pendingOrders.length === 1 ? 'pendente' : 'pendentes'}
          </span>
          <div className="w-7 h-7 rounded-xl bg-amber-200/60 dark:bg-amber-900/50 flex items-center justify-center text-amber-800 dark:text-amber-200 text-xs font-bold transition-transform">
            <i className={`bi bi-chevron-${isPendingOpen ? 'up' : 'down'}`} />
          </div>
        </div>
      </div>

      {isPendingOpen && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 animate-slide-up">
          {pendingOrders.map((order, index) => (
            <DeliveryOrderCard
              key={order.id || `pending-${index}`}
              order={order}
              index={index}
              onOrderClick={onOrderClick}
              isReadOnly={isReadOnly}
            />
          ))}
        </div>
      )}
    </div>
  );
};
