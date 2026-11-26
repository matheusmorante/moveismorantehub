import React from 'react';
import Order from '../../../../types/order.type';
import { getLocalISODate } from '../../../../utils/shared/formatters';
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
  const isToday = date === getLocalISODate();
  const dateLabel = new Date(date + 'T00:00:00').toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
  });
  const formattedDate = isToday
    ? `Hoje, ${dateLabel}`
    : new Date(date + 'T00:00:00').toLocaleDateString('pt-BR', {
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
        } z-20 flex items-center justify-between mb-3 px-4 py-2.5 rounded-2xl border shadow-sm backdrop-blur-md transition-all cursor-pointer select-none ${
          isToday
            ? 'border-blue-800 bg-blue-700 text-white shadow-blue-900/15 hover:bg-blue-800 dark:border-blue-500 dark:bg-blue-800 dark:hover:bg-blue-700'
            : 'border-slate-200/80 bg-slate-50/95 hover:bg-slate-100/80 dark:border-slate-800 dark:bg-slate-900/95 dark:hover:bg-slate-800/80'
        }`}
      >
        <div className="flex items-center gap-2.5">
          <div className={`p-1.5 rounded-xl ${
            isToday
              ? 'bg-white/15 text-white'
              : 'bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400'
          }`}>
            <i className="bi bi-calendar-event text-sm" />
          </div>
          <div>
            <h3 className={`text-xs sm:text-sm font-black tracking-wider ${
              isToday ? 'normal-case text-white' : 'uppercase text-slate-800 dark:text-slate-100'
            }`}>
              {formattedDate}
            </h3>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`shrink-0 whitespace-nowrap text-[10px] font-black uppercase ${
            isToday ? 'text-blue-50' : 'text-blue-600 dark:text-blue-400'
          }`}>
            {orders.length} {orders.length === 1 ? 'pedido' : 'pedidos'}
          </span>
          <div className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-bold transition-transform ${
            isToday
              ? 'bg-white/15 text-white'
              : 'bg-blue-100/60 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400'
          }`}>
            <i className={`bi bi-chevron-${isCollapsed ? 'down' : 'up'}`} />
          </div>
        </div>
      </div>

      {!isCollapsed && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 animate-slide-up">
          {orders.map((order, index) => (
            <DeliveryOrderCard
              key={(order as any)._taskKey || order.id || `order-${index}`}
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
