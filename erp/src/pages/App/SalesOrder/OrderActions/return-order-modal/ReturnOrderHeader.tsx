import React from 'react';
import { Undo2 } from 'lucide-react';
import type Order from '../../../../types/order.type';
import { formatOrderCode } from '../../../../utils/orderCode';

interface ReturnOrderHeaderProps {
  order: Order;
  onClose: () => void;
}

export const ReturnOrderHeader: React.FC<ReturnOrderHeaderProps> = ({ order, onClose }) => {
  return (
    <header className="flex shrink-0 items-center justify-between border-b border-slate-50 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-600 dark:bg-amber-900/30">
          <Undo2 className="h-5 w-5" />
        </div>
        <div>
          <h2
            id="return-order-title"
            className="text-xl font-black uppercase tracking-tight text-slate-800 dark:text-white"
          >
            Gerar pedido de devolução
          </h2>
          <p className="mt-0.5 text-[10px] font-black uppercase tracking-widest text-slate-400">
            Pedido #{formatOrderCode(order)} • {order.customerData?.fullName}
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={onClose}
        className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
      >
        <i className="bi bi-x-lg text-lg" />
      </button>
    </header>
  );
};
