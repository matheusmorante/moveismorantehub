import React from 'react';
import type { InboundInvoiceItem } from '@/pages/utils/inboundNfe/inboundNfeTypes';
import { formatCurrency } from '@/pages/utils/formatters';
import { itemCostWithAdditionalCosts } from '@/pages/utils/inboundNfe/inboundItemCosts';

interface InboundIndividualProductModalProps {
  item: InboundInvoiceItem | null;
  markup: string;
  onMarkupChange: (markup: string) => void;
  onClose: () => void;
  onConfirm: () => void;
  isBusy?: boolean;
  error?: string;
}

export const InboundIndividualProductModal: React.FC<InboundIndividualProductModalProps> = ({
  item,
  markup,
  onMarkupChange,
  onClose,
  onConfirm,
  isBusy = false,
  error = '',
}) => {
  if (!item) return null;

  const finalCost = itemCostWithAdditionalCosts(item);
  const parsedMarkup = Number(markup.replace(',', '.'));
  const estimatedPrice =
    markup.trim() && Number.isFinite(parsedMarkup)
      ? formatCurrency(finalCost * (1 + parsedMarkup / 100))
      : 'Informe o acréscimo (opcional)';

  return (
    <div className="fixed inset-0 z-[1000005] flex items-center justify-center bg-slate-950/60 p-4">
      <section role="dialog" aria-modal="true" aria-label="Cadastrar produto da nota de entrada" aria-busy={isBusy} className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900">
        <h3 className="text-base font-black text-slate-800 dark:text-slate-100">
          Cadastrar produto
        </h3>
        <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
          Confirme que este produto ainda não existe no ERP. Antes de cadastrar, utilize “Vincular
          existente” para pesquisar possíveis correspondências.
        </p>
        <p className="mt-4 rounded-xl bg-slate-50 p-3 text-xs font-bold text-slate-700 dark:bg-slate-950 dark:text-slate-200">
          {item.productDescription}
        </p>
        <label className="mt-4 block text-xs font-black text-slate-600 dark:text-slate-300">
          Acréscimo sobre o custo final (%)
          <input
            type="number"
            min="0"
            step="0.01"
            value={markup}
            disabled={isBusy}
            onChange={(event) => onMarkupChange(event.target.value)}
            className="mt-1 w-full rounded-lg border px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
          />
        </label>
        <p className="mt-3 text-xs text-slate-500">
          Custo final unitário: <b>{formatCurrency(finalCost)}</b> · Preço estimado:{' '}
          <b>{estimatedPrice}</b>
        </p>
        {error && <p role="alert" className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-200">{error}</p>}
        {isBusy && <p role="status" className="mt-3 flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300"><i aria-hidden="true" className="bi bi-arrow-repeat animate-spin" />Preparando o cadastro do produto…</p>}
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isBusy}
            className="rounded-lg px-3 py-2 text-xs font-black text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isBusy}
            className="rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-black text-white hover:bg-emerald-700 cursor-pointer"
          >
            Abrir cadastro
          </button>
        </div>
      </section>
    </div>
  );
};
