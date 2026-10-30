import React from 'react';
import type { InboundInvoice } from '@/pages/utils/inboundNfe/inboundNfeTypes';
import { formatCurrency, formatToBRDate } from '@/pages/utils/formatters';
import { statusLabel } from '../../utils/inboundInvoicePickerFilters';

interface InboundInvoiceReceiptItemProps {
  invoice: InboundInvoice;
  onSelect: (invoice: InboundInvoice) => void;
  onOpenMapping: (invoice: InboundInvoice) => void;
}

export const InboundInvoiceReceiptItem: React.FC<InboundInvoiceReceiptItemProps> = ({
  invoice: inv,
  onSelect,
  onOpenMapping,
}) => {
  const isFullyLinked = Boolean(
    inv.items &&
      inv.items.length > 0 &&
      inv.items.every((item) =>
        item.linkMode === 'not_applicable'
          ? true
          : item.linkMode === 'composition'
            ? Boolean(item.compositionLinks?.some((link) => link.productId))
            : Boolean(item.matchedProductId)
      )
  );

  return (
    <div
      key={inv.id}
      className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border p-4 shadow-sm hover:border-indigo-400 transition-all ${
        isFullyLinked
          ? 'border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-950'
          : 'border-slate-300 bg-slate-100 dark:border-slate-700 dark:bg-slate-800'
      }`}
    >
      <div className="space-y-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-bold text-xs text-slate-800 dark:text-slate-100">
            NF-e #{inv.nfeNumber}
          </span>
          <span className="text-[10px] text-slate-500 dark:text-slate-400">Série {inv.series}</span>
          <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[9px] font-black uppercase text-blue-700 dark:bg-blue-950 dark:text-blue-300">
            {inv.itemsCount || inv.items?.length || 0} itens
          </span>
        </div>
        <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate">
          {inv.emitterName}
        </p>
        <p className="text-[10px] text-slate-500 dark:text-slate-400">
          CNPJ: {inv.emitterCnpj || 'Não informado'} · Emissão:{' '}
          {formatToBRDate(inv.issuedAt)}
        </p>
        <p className="text-[10px] font-mono text-slate-500 dark:text-slate-400 truncate">
          Chave: {inv.nfeKey}
        </p>
        <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
          <span
            className={`inline-flex rounded-full px-2 py-0.5 text-[9px] font-black uppercase ${
              inv.status === 'received'
                ? 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                : 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
            }`}
          >
            {statusLabel(inv.status)}
          </span>
          {isFullyLinked ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[9px] font-black uppercase text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
              <i className="bi bi-check2-all text-[11px]" aria-hidden="true" />{' '}
              Vinculação Completa
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[9px] font-black uppercase text-amber-800 dark:bg-amber-950 dark:text-amber-300">
              <i className="bi bi-exclamation-circle text-[10px]" aria-hidden="true" />{' '}
              Vinculações Pendentes
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800">
        <div className="text-right">
          <span className="block text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Total
          </span>
          <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">
            {formatCurrency(inv.totalInvoice)}
          </span>
        </div>
        {isFullyLinked ? (
          <button
            type="button"
            onClick={() => onSelect(inv)}
            className="rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-black uppercase tracking-wider text-white shadow-sm hover:bg-indigo-700 active:scale-95 transition-all"
          >
            Usar NF
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onOpenMapping(inv)}
            className="rounded-xl bg-blue-600 px-3.5 py-2 text-xs font-black uppercase tracking-wider text-white shadow-sm hover:bg-blue-700 active:scale-95 transition-all"
          >
            Finalizar Vinculação
          </button>
        )}
      </div>
    </div>
  );
};
