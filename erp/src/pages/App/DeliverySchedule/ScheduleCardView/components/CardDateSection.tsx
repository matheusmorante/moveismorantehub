import React from 'react';
import Order from '../../../../types/order.type';
import { DeliveryOrderCard } from './DeliveryOrderCard';

interface CardDateSectionProps {
  date: string;
  orders: Order[];
  isCollapsed: boolean;
  onToggleCollapse: (date: string) => void;
  onOrderClick: (order: Order) => void;
  isReadOnly?: boolean;
}

export const CardDateSection: React.FC<CardDateSectionProps> = ({
  date,
  orders,
  isCollapsed,
  onToggleCollapse,
  onOrderClick,
  isReadOnly,
}) => {
  const formattedDate = new Date(date + 'T00:00:00').toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
  });

  return (
    <div id={`date-${date}`} className="w-full scroll-mt-4 relative">
      {/* Tópico Flutuante da Data (Sticky Header com toggle de colapso) */}
      <div
        onClick={() => onToggleCollapse(date)}
        className={`sticky ${
          isReadOnly ? 'top-0' : 'top-14 xl:top-16'
        } z-20 py-2.5 bg-slate-50/95 dark:bg-slate-900/95 backdrop-blur-md flex items-center justify-between mb-3 px-4 py-2.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm transition-all cursor-pointer hover:bg-slate-100/80 dark:hover:bg-slate-800/80 select-none`}
      >
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-blue-100 dark:bg-blue-900/40 rounded-xl text-blue-600 dark:text-blue-400">
            <i className="bi bi-calendar-event text-sm" />
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-black uppercase text-slate-800 dark:text-slate-100 tracking-wider">
              {formattedDate}
            </h3>
            <p className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
              {isCollapsed ? 'Clique para expandir' : 'Clique para recolher'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-black text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-3 py-1 rounded-full border border-blue-100 dark:border-blue-900/40 uppercase">
            {orders.length} {orders.length === 1 ? 'pedido' : 'pedidos'}
          </span>
          <div className="w-7 h-7 rounded-xl bg-blue-100/60 dark:bg-blue-900/40 flex items-center justify-center text-blue-600 dark:text-blue-400 text-xs font-bold transition-transform">
            <i className={`bi bi-chevron-${isCollapsed ? 'down' : 'up'}`} />
          </div>
        </div>
      </div>

      {!isCollapsed && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 animate-slide-up">
          {orders.map((order, index) => (
            <DeliveryOrderCard
              key={order.id || `order-${index}`}
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
