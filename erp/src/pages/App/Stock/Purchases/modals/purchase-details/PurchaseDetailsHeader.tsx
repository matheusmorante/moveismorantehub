import React from 'react';
import Purchase from '../../../../../types/purchase.type';
import { formatToBRDate } from '../../../../../utils/formatters';

interface PurchaseDetailsHeaderProps {
  purchase: Purchase;
  onEdit?: (purchase: Purchase) => void;
  onCheckReceipt?: (purchase: Purchase) => void;
  onPrint: () => void;
  onClose: () => void;
}

export const PurchaseDetailsHeader: React.FC<PurchaseDetailsHeaderProps> = ({
  purchase,
  onEdit,
  onCheckReceipt,
  onPrint,
  onClose,
}) => {
  return (
    <div className="p-5 sm:p-6 xl:p-8 bg-gradient-to-r from-blue-600 to-indigo-700 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0 shadow-lg">
      <div className="flex items-start sm:items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center text-white border border-white/20 shrink-0">
          <i className="bi bi-box-seam text-2xl" aria-hidden="true" />
        </div>
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl xl:text-2xl font-black tracking-tight uppercase">
              Pedido de Compra #{purchase.purchaseNumber || purchase.id?.slice(-4)}
            </h2>
            <span
              className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                purchase.status === 'fulfilled'
                  ? 'bg-emerald-500 text-white'
                  : purchase.status === 'ordered'
                    ? 'bg-blue-200 text-blue-900'
                    : 'bg-red-500 text-white'
              }`}
            >
              {purchase.status === 'fulfilled'
                ? 'Atendido'
                : purchase.status === 'ordered'
                  ? 'Em Ordem'
                  : 'Cancelado'}
            </span>
            {purchase.stockProcessed && (
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-100 border border-emerald-400/40 flex items-center gap-1">
                <i className="bi bi-clock-history text-xs" aria-hidden="true" /> Movimento legado
              </span>
            )}
          </div>
          <p className="text-xs font-semibold text-blue-100 mt-1 flex items-center gap-2 flex-wrap">
            <span>
              <i className="bi bi-building mr-1" aria-hidden="true" />
              {purchase.supplierName}
            </span>
            <span>•</span>
            <span>
              <i className="bi bi-calendar3 mr-1" aria-hidden="true" />
              {formatToBRDate(purchase.date)}
            </span>
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap self-end sm:self-center">
        {onEdit && (
          <button
            type="button"
            onClick={() => onEdit(purchase)}
            className="flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white px-3.5 py-2.5 rounded-xl font-black uppercase tracking-wider text-xs transition-all active:scale-95"
            title="Editar Informações do Pedido"
          >
            <i className="bi bi-pencil-square text-sm" aria-hidden="true" />
            <span className="hidden md:inline">Editar</span>
          </button>
        )}
        {onCheckReceipt && purchase.status !== 'cancelled' && (
          <button
            type="button"
            onClick={() => onCheckReceipt(purchase)}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2.5 rounded-xl font-black uppercase tracking-wider text-xs transition-all active:scale-95 shadow-sm"
            title="Conferência de Entrega (3-Way Match)"
          >
            <i className="bi bi-qr-code-scan text-sm" aria-hidden="true" />
            <span className="hidden md:inline">Conferir</span>
          </button>
        )}
        <button
          type="button"
          onClick={onPrint}
          className="flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white px-3.5 py-2.5 rounded-xl font-black uppercase tracking-wider text-xs transition-all active:scale-95"
          title="Imprimir / Exportar Pedido"
          aria-label="Imprimir pedido de compra"
        >
          <i className="bi bi-printer text-sm" aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={onClose}
          className="p-2 hover:bg-white/20 rounded-xl transition-colors text-white"
          aria-label="Fechar modal"
        >
          <i className="bi bi-x-lg text-lg" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
};
