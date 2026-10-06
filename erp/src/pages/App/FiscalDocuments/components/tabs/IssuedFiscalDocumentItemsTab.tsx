import React, { useState } from 'react';
import { formatCurrency } from '@/pages/utils/formatters';
import type { ParsedFiscalDetails, ParsedFiscalItem } from '../../types/fiscalDocuments.types';
import { getItemOriginLabel } from '../../utils/fiscalPresentationHelpers';

interface IssuedFiscalDocumentItemsTabProps {
  parsed: ParsedFiscalDetails | null;
}

function ItemTaxDetails({ item }: { item: ParsedFiscalItem }) {
  const hasIcms = Boolean(
    (item.icmsBase && Number(item.icmsBase) > 0) ||
      (item.icmsValue && Number(item.icmsValue) > 0) ||
      (item.icmsRate && Number(item.icmsRate) > 0)
  );

  const hasIpi = Boolean(
    (item.ipiValue && Number(item.ipiValue) > 0) || (item.ipiRate && Number(item.ipiRate) > 0)
  );

  const hasPis = Boolean(
    (item.pisValue && Number(item.pisValue) > 0) || (item.pisRate && Number(item.pisRate) > 0)
  );

  const hasCofins = Boolean(
    (item.cofinsValue && Number(item.cofinsValue) > 0) ||
      (item.cofinsRate && Number(item.cofinsRate) > 0)
  );

  if (!hasIcms && !hasIpi && !hasPis && !hasCofins) {
    return (
      <div className="mt-2 rounded-xl bg-slate-50 p-2.5 text-[11px] text-slate-500 dark:bg-slate-950/60 dark:text-slate-400">
        Item sem destaque de tributos estaduais ou federais no XML.
      </div>
    );
  }

  return (
    <div className="mt-2 grid gap-2 rounded-xl border border-slate-100 bg-slate-50 p-3 text-[11px] dark:border-slate-800 dark:bg-slate-950/60 sm:grid-cols-2">
      {hasIcms && (
        <div className="space-y-0.5">
          <span className="font-bold text-slate-700 dark:text-slate-200">ICMS</span>
          <div className="text-slate-600 dark:text-slate-400">
            {item.icmsBase && `Base: ${formatCurrency(Number(item.icmsBase) || 0)}`}
            {item.icmsRate && ` · Alíquota: ${item.icmsRate}%`}
            {item.icmsValue && ` · Valor: ${formatCurrency(Number(item.icmsValue) || 0)}`}
          </div>
        </div>
      )}

      {hasIpi && (
        <div className="space-y-0.5">
          <span className="font-bold text-slate-700 dark:text-slate-200">IPI</span>
          <div className="text-slate-600 dark:text-slate-400">
            {item.ipiRate && `Alíquota: ${item.ipiRate}%`}
            {item.ipiValue && ` · Valor: ${formatCurrency(Number(item.ipiValue) || 0)}`}
          </div>
        </div>
      )}

      {hasPis && (
        <div className="space-y-0.5">
          <span className="font-bold text-slate-700 dark:text-slate-200">PIS</span>
          <div className="text-slate-600 dark:text-slate-400">
            {item.pisRate && `Alíquota: ${item.pisRate}%`}
            {item.pisValue && ` · Valor: ${formatCurrency(Number(item.pisValue) || 0)}`}
          </div>
        </div>
      )}

      {hasCofins && (
        <div className="space-y-0.5">
          <span className="font-bold text-slate-700 dark:text-slate-200">COFINS</span>
          <div className="text-slate-600 dark:text-slate-400">
            {item.cofinsRate && `Alíquota: ${item.cofinsRate}%`}
            {item.cofinsValue && ` · Valor: ${formatCurrency(Number(item.cofinsValue) || 0)}`}
          </div>
        </div>
      )}
    </div>
  );
}

export function IssuedFiscalDocumentItemsTab({
  parsed,
}: IssuedFiscalDocumentItemsTabProps) {
  const [expandedTaxes, setExpandedTaxes] = useState<Record<string, boolean>>({});
  const [showTaxTotals, setShowTaxTotals] = useState(false);

  if (!parsed?.items.length) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-8 text-center dark:border-slate-800 dark:bg-slate-900/50">
        <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
          Não há itens disponíveis no XML armazenado.
        </p>
      </div>
    );
  }

  const toggleItemTax = (itemKey: string) => {
    setExpandedTaxes((prev) => ({ ...prev, [itemKey]: !prev[itemKey] }));
  };

  const commercialTotals = parsed.totals.filter((t) => !t.isTaxDetail);
  const taxTotals = parsed.totals.filter((t) => t.isTaxDetail);

  return (
    <div className="space-y-4">
      {/* Lista de Itens em Linhas/Cards Compactos Responsivos */}
      <div className="space-y-2.5">
        {parsed.items.map((item, index) => {
          const itemKey = `${item.code}-${index}`;
          const isTaxOpen = Boolean(expandedTaxes[itemKey]);
          const originLabel = getItemOriginLabel(item.origin);

          return (
            <div
              key={itemKey}
              className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm transition-all dark:border-slate-800 dark:bg-slate-900 sm:p-4"
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1">
                  <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    {item.description || 'Item sem descrição'}
                  </h4>
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-500 dark:text-slate-400">
                    <span className="font-medium text-slate-700 dark:text-slate-300">
                      {item.quantity} {item.unit} × {item.unitValue ? formatCurrency(Number(item.unitValue) || 0) : '—'}
                    </span>
                    {item.discount && Number(item.discount) > 0 && (
                      <span className="text-emerald-700 dark:text-emerald-400">
                        (desconto {formatCurrency(Number(item.discount))})
                      </span>
                    )}
                    <span className="font-mono text-[10px]">Cód: {item.code}</span>
                  </div>
                </div>

                <div className="text-left sm:text-right">
                  <div className="text-base font-extrabold text-slate-900 dark:text-slate-100 sm:text-lg">
                    {item.total ? formatCurrency(Number(item.total) || 0) : '—'}
                  </div>
                </div>
              </div>

              {/* Tags Fiscais Compactas do Item */}
              <div className="mt-2.5 flex flex-wrap items-center gap-1.5 text-[10px]">
                <span className="rounded-md bg-slate-100 px-2 py-0.5 font-mono text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  NCM {item.ncm}
                </span>
                <span className="rounded-md bg-slate-100 px-2 py-0.5 font-mono text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  CFOP {item.cfop}
                </span>
                {item.cst && (
                  <span className="rounded-md bg-slate-100 px-2 py-0.5 font-mono text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                    CST/CSOSN {item.cst}
                  </span>
                )}
                {originLabel && (
                  <span className="rounded-md bg-slate-100 px-2 py-0.5 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                    {originLabel}
                  </span>
                )}
                {item.cest && (
                  <span className="rounded-md bg-amber-50 px-2 py-0.5 font-mono font-semibold text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">
                    CEST {item.cest}
                  </span>
                )}
                {item.ean && (
                  <span className="rounded-md bg-slate-100 px-2 py-0.5 font-mono text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                    EAN {item.ean}
                  </span>
                )}

                <button
                  type="button"
                  onClick={() => toggleItemTax(itemKey)}
                  className="ml-auto inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400"
                >
                  {isTaxOpen ? 'Ocultar tributação' : 'Ver tributação'}
                  <i className={`bi ${isTaxOpen ? 'bi-chevron-up' : 'bi-chevron-down'}`} />
                </button>
              </div>

              {isTaxOpen && <ItemTaxDetails item={item} />}
            </div>
          );
        })}
      </div>

      {/* Seção de Totais e Hierarquia Financeira */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-5">
        <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Totais da nota fiscal
        </h4>

        <div className="space-y-1.5 text-sm">
          {commercialTotals
            .filter((t) => t.label !== 'Total da NF-e')
            .map((t) => (
              <div key={t.label} className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>{t.label}</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {formatCurrency(Number(t.value) || 0)}
                </span>
              </div>
            ))}

          <div className="border-t border-slate-200 pt-2.5 dark:border-slate-800">
            <div className="flex items-center justify-between text-base font-black text-slate-900 dark:text-slate-100 sm:text-lg">
              <span>Total da nota</span>
              <span className="text-blue-700 dark:text-blue-400">
                {formatCurrency(
                  Number(commercialTotals.find((t) => t.label === 'Total da NF-e')?.value) || 0
                )}
              </span>
            </div>
          </div>
        </div>

        {/* Detalhes Tributários Totais (Progressive Disclosure) */}
        {taxTotals.length > 0 && (
          <div className="mt-4 border-t border-slate-100 pt-3 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setShowTaxTotals(!showTaxTotals)}
              className="flex w-full items-center justify-between text-xs font-bold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
            >
              <span>Detalhes tributários consolidados (ICMS, ST, PIS, COFINS)</span>
              <i className={`bi ${showTaxTotals ? 'bi-chevron-up' : 'bi-chevron-down'}`} />
            </button>

            {showTaxTotals && (
              <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {taxTotals.map((tax) => (
                  <div
                    key={tax.label}
                    className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-xs dark:border-slate-800 dark:bg-slate-950/60"
                  >
                    <span className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400">
                      {tax.label}
                    </span>
                    <div className="font-bold text-slate-800 dark:text-slate-200">
                      {formatCurrency(Number(tax.value) || 0)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
