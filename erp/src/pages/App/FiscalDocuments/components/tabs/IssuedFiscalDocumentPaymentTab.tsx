import React from 'react';
import { formatCurrency, formatToBRDate } from '@/pages/utils/formatters';
import type { ParsedFiscalDetails } from '../../types/fiscalDocuments.types';
import {
  getPaymentIndicatorLabel,
  getPaymentMethodLabel,
} from '../../utils/fiscalPresentationHelpers';

interface IssuedFiscalDocumentPaymentTabProps {
  parsed: ParsedFiscalDetails | null;
}

export function IssuedFiscalDocumentPaymentTab({
  parsed,
}: IssuedFiscalDocumentPaymentTabProps) {
  const payments = parsed?.payments || [];
  const installments = parsed?.installments || [];
  const changeValue = parsed?.changeValue;

  if (!payments.length && !installments.length) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-8 text-center dark:border-slate-800 dark:bg-slate-900/50">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-2xl text-slate-400 dark:bg-slate-800 dark:text-slate-500">
          <i className="bi bi-credit-card" />
        </div>
        <p className="mt-3 text-sm font-semibold text-slate-700 dark:text-slate-200">
          Sem registros de pagamento
        </p>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          O XML armazenado não informa modalidades ou parcelas de pagamento.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Bloco 1: Formas de Pagamento e Transações */}
      {payments.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-5">
          <h4 className="mb-3 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            <i className="bi bi-wallet2 text-blue-600 dark:text-blue-400" />
            Formas de pagamento
          </h4>

          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {payments.map((payment, index) => {
              const methodLabel = getPaymentMethodLabel(payment.method);
              const indicatorLabel = payment.indicator
                ? getPaymentIndicatorLabel(payment.indicator)
                : '';

              return (
                <div key={`${payment.method}-${index}`} className="py-3 first:pt-0 last:pb-0">
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <div>
                      <span className="font-extrabold text-slate-900 dark:text-slate-100">
                        {methodLabel}
                      </span>
                      {indicatorLabel && (
                        <span className="ml-2 inline-flex rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                          {indicatorLabel}
                        </span>
                      )}
                    </div>
                    <span className="text-right font-black text-slate-900 dark:text-slate-100">
                      {formatCurrency(Number(payment.value) || 0)}
                    </span>
                  </div>

                  {/* Detalhes do Cartão / Maquininha (quando presente) */}
                  {payment.card && (payment.card.brand || payment.card.integration || payment.card.authorization) && (
                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl bg-slate-50 px-3 py-1.5 text-[11px] text-slate-600 dark:bg-slate-950/60 dark:text-slate-300">
                      {payment.card.brand && (
                        <span>
                          <strong className="text-slate-700 dark:text-slate-200">Bandeira:</strong> {payment.card.brand}
                        </span>
                      )}
                      {payment.card.integration && (
                        <span>
                          <strong className="text-slate-700 dark:text-slate-200">Processamento:</strong> {payment.card.integration}
                        </span>
                      )}
                      {payment.card.authorization && (
                        <span>
                          <strong className="text-slate-700 dark:text-slate-200">Autorização:</strong> {payment.card.authorization}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Troco em Dinheiro (somente quando > 0) */}
          {changeValue && Number(changeValue) > 0 && (
            <div className="mt-3 flex items-center justify-between rounded-xl bg-amber-50 px-3.5 py-2 text-xs font-bold text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
              <span>Troco em dinheiro</span>
              <span>{formatCurrency(Number(changeValue))}</span>
            </div>
          )}
        </div>
      )}

      {/* Bloco 2: Duplicatas / Parcelas a Prazo (quando houver cobr/dup) */}
      {installments.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-5">
          <div className="mb-3 flex items-center justify-between">
            <h4 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              <i className="bi bi-calendar-event text-blue-600 dark:text-blue-400" />
              Parcelamento e faturas a prazo ({installments.length}x)
            </h4>
          </div>

          {/* Versão Desktop: Tabela limpa */}
          <div className="hidden sm:block overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-[10px] uppercase font-bold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                <tr>
                  <th className="px-3 py-2">Parcela</th>
                  <th className="px-3 py-2">Vencimento</th>
                  <th className="px-3 py-2 text-right">Valor da parcela</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {installments.map((dup, i) => (
                  <tr key={`${dup.number}-${i}`}>
                    <td className="px-3 py-2.5 font-bold text-slate-800 dark:text-slate-200">
                      {dup.number ? `${dup.number}ª parcela` : `Parcela ${i + 1}`}
                    </td>
                    <td className="px-3 py-2.5 text-slate-600 dark:text-slate-300">
                      {dup.dueDate ? formatToBRDate(dup.dueDate) : '—'}
                    </td>
                    <td className="px-3 py-2.5 text-right font-black text-slate-900 dark:text-slate-100">
                      {formatCurrency(Number(dup.value) || 0)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Versão Mobile: Cards/Linhas compactos */}
          <div className="space-y-2 sm:hidden">
            {installments.map((dup, i) => (
              <div
                key={`mobile-${dup.number}-${i}`}
                className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5 text-xs dark:border-slate-800 dark:bg-slate-950"
              >
                <div>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {dup.number ? `${dup.number}ª parcela` : `Parcela ${i + 1}`}
                  </span>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    Vencimento: {dup.dueDate ? formatToBRDate(dup.dueDate) : '—'}
                  </div>
                </div>
                <span className="font-black text-slate-900 dark:text-slate-100">
                  {formatCurrency(Number(dup.value) || 0)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
