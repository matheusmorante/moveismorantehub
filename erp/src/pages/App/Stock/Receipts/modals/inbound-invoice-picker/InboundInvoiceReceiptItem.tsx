import React from 'react';
import type { InboundInvoice } from '@/pages/utils/inboundNfe/inboundNfeTypes';
import { formatCurrency, formatToBRDate } from '@/pages/utils/formatters';
import { statusLabel } from '../../utils/inboundInvoicePickerFilters';
import { hasCompleteInboundInvoiceItems } from '@/pages/App/Stock/InboundInvoices/inboundReceiptEligibility';

interface InboundInvoiceReceiptItemProps {
  invoice: InboundInvoice;
  onSelect: (invoice: InboundInvoice) => void;
  onOpenMapping: (invoice: InboundInvoice) => void;
  onOpenXml: (invoice: InboundInvoice) => void;
  onManageReceipt?: (invoice: InboundInvoice) => void;
}

export const InboundInvoiceReceiptItem: React.FC<InboundInvoiceReceiptItemProps> = ({
  invoice: inv,
  onSelect,
  onOpenMapping,
  onOpenXml,
  onManageReceipt,
}) => {
  const hasFiscalKey = Boolean(inv.nfeKey?.trim());
  const needsXml = /<(?:[\w.-]+:)?resNFe\b/i.test(inv.rawXml || '') || !hasCompleteInboundInvoiceItems(inv);
  const isInUse = Boolean(inv.isInUse || inv.status === 'received');
  const isFullyLinked = Boolean(
    !needsXml &&
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
  const isUnavailable = isInUse || needsXml || !isFullyLinked;

  return (
    <div
      key={inv.id}
      data-testid="inbound-invoice-receipt-item"
      data-state={isUnavailable ? 'unavailable' : 'available'}
      className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border p-4 shadow-sm transition-all ${
        isUnavailable
          ? 'border-slate-300 bg-slate-900/[0.12] dark:border-slate-700 dark:bg-slate-950/40'
          : isFullyLinked
          ? 'border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-950'
          : 'border-slate-300 bg-slate-100 dark:border-slate-700 dark:bg-slate-800'
      } ${isUnavailable ? '' : 'hover:border-indigo-400'}`}
    >
      <div className="space-y-1 min-w-0">
        <div className={isUnavailable ? 'opacity-40' : undefined}>
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
        </div>
        <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
          {!isInUse && (
            <span className="inline-flex rounded-full bg-blue-100 px-2 py-0.5 text-[9px] font-black uppercase text-blue-700 dark:bg-blue-950 dark:text-blue-300">
              {statusLabel(inv.status)}
            </span>
          )}
          {!isInUse && !needsXml && (isFullyLinked ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[9px] font-black uppercase text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
              <i className="bi bi-check2-all text-[11px]" aria-hidden="true" />{' '}
              Vinculação Completa
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[9px] font-black uppercase text-amber-800 dark:bg-amber-950 dark:text-amber-300">
              <i className="bi bi-exclamation-circle text-[10px]" aria-hidden="true" />{' '}
              Vinculação incompleta
            </span>
          ))}
          {!isInUse && !needsXml && !isFullyLinked && (
            <p className="basis-full text-[10px] font-semibold text-amber-800 dark:text-amber-300">
              Finalize os vínculos dos produtos para liberar o recebimento.
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800">
        <div className={`text-right ${isUnavailable ? 'opacity-40' : ''}`}>
          <span className="block text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Total
          </span>
          <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">
            {formatCurrency(inv.totalInvoice)}
          </span>
        </div>
        {isInUse ? (
          <div className="flex flex-col items-end gap-2">
            <span className="text-xs font-black text-emerald-700 dark:text-emerald-300">Em uso</span>
            <button
              type="button"
              onClick={() => onManageReceipt?.(inv)}
              aria-label={`Gerenciar recebimento vinculado à NF-e ${inv.nfeNumber}`}
              className="rounded-xl bg-blue-600 px-3.5 py-2 text-xs font-black uppercase tracking-wider text-white shadow-sm hover:bg-blue-700 active:scale-95 transition-all"
            >
              Gerenciar
            </button>
          </div>
        ) : !hasFiscalKey ? (
          <button
            type="button"
            disabled
            title="A chave de acesso da nota não está disponível."
            className="rounded-xl bg-slate-100 px-3.5 py-2 text-xs font-black uppercase text-slate-500 cursor-not-allowed dark:bg-slate-800"
          >
            Chave indisponível
          </button>
        ) : needsXml ? (
          <div className="flex flex-col items-end gap-1.5">
            <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase text-amber-800 dark:text-amber-300">
              <i className="bi bi-exclamation-circle text-[10px]" aria-hidden="true" /> NF incompleta
            </span>
            <button
              type="button"
              onClick={() => onOpenXml(inv)}
              className="rounded-xl bg-blue-600 px-3.5 py-2 text-xs font-black uppercase tracking-wider text-white shadow-sm hover:bg-blue-700 active:scale-95 transition-all"
            >
              Obtenha o XML
            </button>
          </div>
        ) : isFullyLinked ? (
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
            Gerenciar vínculos
          </button>
        )}
      </div>
    </div>
  );
};
