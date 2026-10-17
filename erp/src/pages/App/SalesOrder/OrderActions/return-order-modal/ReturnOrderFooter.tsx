import React from 'react';
import { Undo2 } from 'lucide-react';
import type Order from '../../../../types/order.type';
import { formatOrderCode } from '../../../../utils/orderCode';

interface ReturnOrderFooterProps {
  order: Order;
  selectedTotal: number;
  quantitiesCount: number;
  submitting: boolean;
  returnDataError: string | null;
  returnsLoaded: boolean;
  fiscalCapacityLoaded: boolean;
  hasAuthorizedInvoice: boolean;
  fiscalCapacityError: string | null;
  collectAtAddress: boolean | null;
  onClose: () => void;
  onGenerateReturn: () => void;
}

export const ReturnOrderFooter: React.FC<ReturnOrderFooterProps> = ({
  order,
  selectedTotal,
  quantitiesCount,
  submitting,
  returnDataError,
  returnsLoaded,
  fiscalCapacityLoaded,
  hasAuthorizedInvoice,
  fiscalCapacityError,
  collectAtAddress,
  onClose,
  onGenerateReturn,
}) => {
  const isButtonDisabled =
    submitting ||
    Boolean(returnDataError) ||
    !returnsLoaded ||
    !fiscalCapacityLoaded ||
    (hasAuthorizedInvoice && Boolean(fiscalCapacityError)) ||
    quantitiesCount === 0 ||
    collectAtAddress === null;

  return (
    <footer className="shrink-0 border-t border-slate-100 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-6 flex items-center justify-between px-2">
        <div>
          <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">
            Total da devolução
          </span>
          <div className="text-2xl font-black text-amber-600">
            R$ {selectedTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
        </div>
        <div className="text-right text-[10px] font-black uppercase text-slate-700 dark:text-slate-300">
          {quantitiesCount} itens selecionados
          <span className="mt-1 block text-[9px] text-slate-400">
            Vínculo: #{formatOrderCode(order)}
          </span>
        </div>
      </div>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={onClose}
          disabled={submitting}
          className="flex-1 rounded-2xl border border-slate-200 px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-100 dark:border-slate-800 dark:hover:bg-slate-800"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={onGenerateReturn}
          disabled={isButtonDisabled}
          className="flex flex-1 items-center justify-center gap-3 rounded-2xl bg-amber-600 px-6 py-4 text-[10px] font-black uppercase tracking-widest text-white shadow-xl shadow-amber-500/20 transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
        >
          {returnDataError ? (
            'Conferência indisponível'
          ) : submitting || !returnsLoaded || !fiscalCapacityLoaded ? (
            'Conferindo saldos...'
          ) : (
            <>
              <Undo2 className="h-4 w-4" />
              Gerar pedido de devolução
            </>
          )}
        </button>
      </div>
    </footer>
  );
};
