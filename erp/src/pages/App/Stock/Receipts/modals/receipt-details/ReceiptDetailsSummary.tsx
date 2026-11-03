import React from 'react';
import type { GoodsReceipt } from '@/pages/utils/goodsReceiptService';
import { formatCurrency, formatToBRDate } from '@/pages/utils/formatters';

interface Props {
  readonly receipt: GoodsReceipt;
}

export const ReceiptDetailsSummary: React.FC<Props> = ({ receipt }) => {
  const rawKey = (receipt.fiscalKey || '').replace(/\D/g, '');
  const hasInvoice = Boolean(receipt.fiscalKey || receipt.invoiceNumber);
  const formattedFiscalKey =
    rawKey.length === 44 ? rawKey.match(/.{1,4}/g)?.join(' ') : receipt.fiscalKey;
  const hasNonFiscalFreight = receipt.nonFiscalFreightValue !== undefined;
  const hasNonFiscalOtherExpenses = receipt.nonFiscalOtherExpensesValue !== undefined;
  const hasFiscalFreight = Number(receipt.fiscalFreight) > 0;
  const hasFiscalIpi = Number(receipt.fiscalIpi) > 0;
  const hasLegacyFreightPercent = Number(receipt.freightPercent) > 0 && !hasNonFiscalFreight;
  const hasExpenses = hasNonFiscalFreight || hasNonFiscalOtherExpenses || hasFiscalFreight || hasFiscalIpi || hasLegacyFreightPercent;

  return (
    <div className="space-y-4">
      {/* Top Info Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
        <div>
          <span className="block text-[10px] font-black uppercase tracking-widest text-slate-400">
            Fornecedor / Fábrica
          </span>
          <span className="text-sm font-bold text-slate-800 dark:text-slate-100">
            {receipt.supplierName}
          </span>
        </div>
        <div>
          <span className="block text-[10px] font-black uppercase tracking-widest text-slate-400">
            Data do Recebimento
          </span>
          <span className="text-sm font-bold text-slate-800 dark:text-slate-100">
            {formatToBRDate(receipt.receivedAt)}
          </span>
        </div>
        <div>
          <span className="block text-[10px] font-black uppercase tracking-widest text-slate-400">
            Número da NF
          </span>
          <span className="text-sm font-bold text-slate-800 dark:text-slate-100">
            {receipt.invoiceNumber || (receipt.fiscalKey ? 'Identificada pela chave' : 'Sem nota fiscal')}
          </span>
        </div>
        {receipt.invoiceDate ? (
          <div>
            <span className="block text-[10px] font-black uppercase tracking-widest text-slate-400">
              Data de emissão da NF
            </span>
            <span className="text-sm font-bold text-slate-800 dark:text-slate-100">
              {formatToBRDate(receipt.invoiceDate)}
            </span>
          </div>
        ) : null}
      </div>

      {/* Fiscal Key & Encargos */}
      <div className={`grid grid-cols-1 ${formattedFiscalKey ? 'md:grid-cols-3' : ''} gap-4`}>
        {formattedFiscalKey ? (
          <div className="md:col-span-2 rounded-2xl border border-slate-100 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 shadow-sm">
            <span className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">
              Chave de Acesso (NF-e)
            </span>
            <span className="font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400 break-all select-all">
              {formattedFiscalKey}
            </span>
          </div>
        ) : null}

        <div className={`relative rounded-2xl border border-slate-100 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 shadow-sm ${formattedFiscalKey ? '' : 'w-full'}`}>
          <span className="absolute top-2 right-2 text-[9px] font-black uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-500 px-1.5 py-0.5 rounded">
            {hasInvoice ? 'Despesas não fiscais' : 'Despesas'}
          </span>
          <div className="grid w-full grid-cols-2 gap-x-4 gap-y-3 pt-3">
            {hasNonFiscalFreight ? (
              <div>
                <span className="block text-[10px] font-black uppercase tracking-widest text-slate-400">
                  {hasInvoice ? 'Frete não fiscal' : 'Frete'}
                </span>
                <span className="text-sm font-black text-slate-700 dark:text-slate-200">
                  {receipt.nonFiscalFreightMode === 'percent'
                    ? `${receipt.nonFiscalFreightValue}%`
                    : formatCurrency(receipt.nonFiscalFreightValue || 0)}
                </span>
              </div>
            ) : hasLegacyFreightPercent ? (
              <div>
                <span className="block text-[10px] font-black uppercase tracking-widest text-slate-400">Frete</span>
                <span className="text-sm font-black text-slate-700 dark:text-slate-200">{receipt.freightPercent}%</span>
              </div>
            ) : null}
            {hasNonFiscalOtherExpenses ? (
              <div>
                <span className="block text-[10px] font-black uppercase tracking-widest text-slate-400">
                  {hasInvoice ? 'Outras despesas não fiscais' : 'Outras despesas'}
                </span>
                <span className="text-sm font-black text-slate-700 dark:text-slate-200">
                  {receipt.nonFiscalOtherExpensesMode === 'percent'
                    ? `${receipt.nonFiscalOtherExpensesValue}%`
                    : formatCurrency(receipt.nonFiscalOtherExpensesValue || 0)}
                </span>
              </div>
            ) : null}
            {hasFiscalFreight ? (
              <div>
                <span className="block text-[10px] font-black uppercase tracking-widest text-slate-400">Frete da nota</span>
                <span className="text-sm font-black text-slate-700 dark:text-slate-200">{formatCurrency(receipt.fiscalFreight || 0)}</span>
              </div>
            ) : null}
            {hasFiscalIpi ? (
              <div>
                <span className="block text-[10px] font-black uppercase tracking-widest text-slate-400">IPI da nota</span>
                <span className="text-sm font-black text-slate-700 dark:text-slate-200">{formatCurrency(receipt.fiscalIpi || 0)}</span>
              </div>
            ) : null}
            {!hasExpenses ? (
              <span className="col-span-2 text-xs text-slate-400">Nenhuma despesa informada.</span>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};
