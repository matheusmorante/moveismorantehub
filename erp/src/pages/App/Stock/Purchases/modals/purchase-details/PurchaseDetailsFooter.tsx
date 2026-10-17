import React from 'react';
import Purchase from '../../../../../types/purchase.type';

interface PurchaseDetailsFooterProps {
  purchase: Purchase;
  onClose: () => void;
  onCheckReceipt?: (purchase: Purchase) => void;
  onEdit?: (purchase: Purchase) => void;
}

export const PurchaseDetailsFooter: React.FC<PurchaseDetailsFooterProps> = ({
  purchase,
  onClose,
  onCheckReceipt,
  onEdit,
}) => {
  return (
    <div className="p-5 sm:p-6 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
      <button
        type="button"
        onClick={onClose}
        className="w-full sm:w-auto px-6 py-3 border border-slate-200 dark:border-slate-700 font-bold text-slate-600 dark:text-slate-300 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-xs uppercase tracking-widest"
      >
        Fechar
      </button>

      <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
        {onCheckReceipt && purchase.status !== 'cancelled' && (
          <button
            type="button"
            onClick={() => onCheckReceipt(purchase)}
            className="w-full sm:w-auto px-6 py-3 bg-emerald-600 text-white font-bold rounded-2xl hover:bg-emerald-700 transition-all shadow-md shadow-emerald-200 dark:shadow-none flex items-center justify-center gap-2 text-xs uppercase tracking-wider"
          >
            <i className="bi bi-qr-code-scan" aria-hidden="true" />
            <span>Conferir Pedido</span>
          </button>
        )}
        {onEdit && (
          <button
            type="button"
            onClick={() => onEdit(purchase)}
            className="w-full sm:w-auto px-6 py-3 bg-blue-600 text-white font-bold rounded-2xl hover:bg-blue-700 transition-all shadow-md shadow-blue-200 dark:shadow-none flex items-center justify-center gap-2 text-xs uppercase tracking-wider"
          >
            <i className="bi bi-pencil-square" aria-hidden="true" />
            <span>Editar Compra</span>
          </button>
        )}
      </div>
    </div>
  );
};
