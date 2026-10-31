import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { InboundInvoice } from '@/pages/utils/inboundNfe/inboundNfeTypes';
import { formatCurrency } from '@/pages/utils/formatters';
import { InboundInvoiceActionsMenu } from './InboundInvoiceActionsMenu';
import { SummaryXmlStatusBadge } from './SummaryXmlStatusBadge';
import {
  getInboundReceiptBlockedReason,
  hasCompleteInboundInvoiceMappings,
} from '../inboundReceiptEligibility';
import { isSalvadosOnlySupplier } from '../../../../../../../shared-utils/productSupplierStockOrigin';
import { hasInboundItemCommercialData } from '../../../../../../../shared-utils/inboundInvoiceCompleteness';

const SalvadosBindingStatus: React.FC = () => {
  const [isInfoOpen, setIsInfoOpen] = useState(false);

  useEffect(() => {
    if (!isInfoOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsInfoOpen(false);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [isInfoOpen]);

  return (
    <>
      <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-1 text-[10px] font-black uppercase text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
        Vinculação não se aplica
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            setIsInfoOpen(true);
          }}
          aria-label="Por que a vinculação não se aplica?"
          aria-haspopup="dialog"
          title="Por que a vinculação não se aplica?"
          className="inline-flex cursor-pointer items-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          <i className="bi bi-info-circle text-xs" aria-hidden="true" />
        </button>
      </span>
      {isInfoOpen && createPortal(
        <div
          className="fixed inset-0 z-[1000006] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
          onClick={() => setIsInfoOpen(false)}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-label="Por que a vinculação não se aplica"
            onClick={(event) => event.stopPropagation()}
            className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl dark:bg-slate-900"
          >
            <div className="flex items-start justify-between gap-4">
              <h2 className="text-base font-black text-slate-900 dark:text-slate-100">
                Vinculação não se aplica
              </h2>
              <button
                type="button"
                onClick={() => setIsInfoOpen(false)}
                aria-label="Fechar explicação"
                className="rounded-lg p-1 text-slate-500 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:hover:bg-slate-800"
              >
                <i className="bi bi-x-lg" aria-hidden="true" />
              </button>
            </div>
            <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
              O fornecedor desta nota tem origem de estoque Salvados. Itens dessa origem não geram
              movimentação de estoque, então não precisam ser vinculados a produtos.
            </p>
          </section>
        </div>,
        document.body
      )}
    </>
  );
};

interface InboundInvoicesTableProps {
  readonly invoices: readonly InboundInvoice[];
  readonly onViewDetails: (invoice: InboundInvoice) => void;
  readonly onDownloadXml: (invoice: InboundInvoice) => void;
  readonly onImportSummaryXml: (invoice: InboundInvoice) => void;
  readonly onManageMappings: (invoice: InboundInvoice) => void;
  readonly canAccessReceipts?: boolean;
  readonly onGenerateReceipt?: (invoice: InboundInvoice) => void;
  readonly canPrintIdentificationLabels?: boolean;
  readonly onPrintIdentificationLabels?: (invoice: InboundInvoice) => void;
}

export const InboundInvoicesTable: React.FC<InboundInvoicesTableProps> = ({
  invoices,
  onViewDetails,
  onDownloadXml,
  onImportSummaryXml,
  onManageMappings,
  canAccessReceipts = false,
  onGenerateReceipt,
  canPrintIdentificationLabels = false,
  onPrintIdentificationLabels,
}) => {
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const desktopMenuRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!desktopMenuRef.current?.contains(target) && !mobileMenuRef.current?.contains(target)) {
        setOpenMenuId(null);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpenMenuId(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const getActionsMenuProps = (invoice: InboundInvoice, canManageMappings: boolean) => {
    const isSalvadosSupplier = isSalvadosOnlySupplier(invoice.supplierStockOrigins);
    const canGenerateReceipt = Boolean(
      onGenerateReceipt &&
        !isSalvadosSupplier &&
        !getInboundReceiptBlockedReason(invoice, canAccessReceipts)
    );

    return {
      invoice,
      canManageMappings:
        canManageMappings &&
        !isSalvadosSupplier &&
        hasInboundItemCommercialData(invoice.items),
      canGenerateReceipt,
      canPrintIdentificationLabels: Boolean(
        !isSalvadosSupplier &&
        canPrintIdentificationLabels &&
          onPrintIdentificationLabels &&
          hasCompleteInboundInvoiceMappings(invoice)
      ),
      onClose: () => setOpenMenuId(null),
      onManageMappings: () => onManageMappings(invoice),
      onGenerateReceipt: () => onGenerateReceipt?.(invoice),
      onPrintIdentificationLabels: () => onPrintIdentificationLabels?.(invoice),
      onDownloadXml: () => onDownloadXml(invoice),
    };
  };

  if (invoices.length === 0) {
    return (
      <div className="rounded-[2rem] border border-slate-100 bg-white p-12 text-center shadow-xl dark:border-slate-800 dark:bg-slate-900">
        <i
          className="bi bi-file-earmark-check text-4xl text-slate-300 dark:text-slate-700"
          aria-hidden="true"
        />
        <p className="mt-3 text-sm font-bold text-slate-500 dark:text-slate-400">
          Nenhuma nota fiscal de entrada encontrada
        </p>
        <p className="mt-1 text-xs text-slate-400">
          Você pode adicionar novas notas fiscais ou importar XMLs recebidos de fornecedores.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Tabela para desktop e tablet (>= 768px); o mobile usa cards. */}
      <div className="hidden md:block overflow-x-auto rounded-3xl border border-slate-100 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-slate-100 bg-slate-50/50 text-[10px] font-black uppercase tracking-wider text-slate-400 dark:border-slate-800 dark:bg-slate-950/40">
            <tr>
              <th scope="col" className="py-3.5 pl-6 pr-3 rounded-tl-3xl">
                NF-e / Série
              </th>
              <th scope="col" className="px-3 py-3.5">
                Fornecedor / Emitente
              </th>
              <th scope="col" className="px-3 py-3.5">
                Data Emissão
              </th>
              <th scope="col" className="px-3 py-3.5">
                Itens
              </th>
              <th scope="col" className="px-3 py-3.5">
                Valor Total
              </th>
              <th scope="col" className="px-3 py-3.5">
                Status
              </th>
              <th scope="col" className="py-3.5 pl-3 pr-6 text-right rounded-tr-3xl">
                Ações
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {invoices.map((inv) => {
              const isMenuOpen = openMenuId === inv.id;
              const isIncomplete = !hasInboundItemCommercialData(inv.items);
              return (
                <tr
                  key={inv.id}
                  onClick={() => onViewDetails(inv)}
                  className={`hover:bg-slate-50/70 transition-colors cursor-pointer dark:hover:bg-slate-800/40 ${
                    isMenuOpen
                      ? 'relative z-30 bg-slate-50/90 dark:bg-slate-800/80'
                      : 'relative z-0'
                  }`}
                >
                  <td className="py-4 pl-6 pr-3 font-mono font-bold text-slate-800 dark:text-slate-200">
                    <div>#{inv.nfeNumber}</div>
                    <span className="text-[10px] text-slate-400 font-sans font-normal">
                      Série {inv.series}
                    </span>
                  </td>
                  <td className="px-3 py-4">
                    <div className="font-bold text-slate-800 dark:text-slate-100">
                      {inv.emitterName}
                    </div>
                    <div className="hidden xl:block text-[10px] text-slate-400 font-mono">
                      CNPJ: {inv.emitterCnpj}
                    </div>
                  </td>
                  <td className="px-3 py-4 text-slate-600 dark:text-slate-300 font-medium">
                    {new Date(inv.issuedAt).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="px-3 py-4 font-bold text-slate-700 dark:text-slate-200">
                    {isIncomplete ? '— itens' : `${inv.itemsCount || inv.items.length} itens`}
                  </td>
                  <td className="px-3 py-4 font-black text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(inv.totalInvoice)}
                  </td>
                  <td className="px-3 py-4">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {isIncomplete ? (
                        <SummaryXmlStatusBadge onClick={() => onImportSummaryXml(inv)} />
                      ) : inv.status === 'received' ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-black uppercase text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                              <i
                                className="bi bi-check-circle-fill text-[11px]"
                                aria-hidden="true"
                              />{' '}
                              Recebida no Estoque
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-2.5 py-1 text-[10px] font-black uppercase text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
                              <i className="bi bi-hourglass-split text-[11px]" aria-hidden="true" />{' '}
                              Disponível
                            </span>
                          )}
                      {isSalvadosOnlySupplier(inv.supplierStockOrigins) ? (
                        <SalvadosBindingStatus />
                      ) : isIncomplete ? null : hasCompleteInboundInvoiceMappings(inv) ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-black uppercase text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                              <i className="bi bi-check2-all text-xs" aria-hidden="true" />{' '}
                              Vinculação Completa
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                onManageMappings(inv);
                              }}
                              title="Clique para gerenciar os vínculos dos produtos desta NF-e"
                              aria-label={`Gerenciar vínculos pendentes da NF-e ${inv.nfeNumber}`}
                              className="inline-flex cursor-pointer items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-black uppercase text-amber-800 transition-colors hover:bg-amber-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 dark:bg-amber-950/60 dark:text-amber-300 dark:hover:bg-amber-900/70"
                            >
                              <i className="bi bi-exclamation-circle text-xs" aria-hidden="true" />{' '}
                              Vinculações Pendentes
                            </button>
                          )}
                    </div>
                  </td>
                  <td
                    className={`py-4 pl-3 pr-6 text-right ${isMenuOpen ? 'relative z-50' : 'relative z-10'}`}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div
                      className="relative inline-block text-left"
                      ref={openMenuId === inv.id ? desktopMenuRef : null}
                    >
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenMenuId(openMenuId === inv.id ? null : inv.id);
                        }}
                        className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                        title="Mais opções"
                        aria-label="Mais opções"
                        aria-haspopup="true"
                        aria-expanded={isMenuOpen}
                      >
                        <i className="bi bi-three-dots-vertical text-base" aria-hidden="true" />
                      </button>

                      {openMenuId === inv.id && (
                        <InboundInvoiceActionsMenu {...getActionsMenuProps(inv, true)} />
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Cards para telas menores que MD (< 768px) */}
      <div className="grid grid-cols-1 gap-4 md:hidden">
        {invoices.map((inv) => {
          const isCardMenuOpen = openMenuId === inv.id;
          const isIncomplete = !hasInboundItemCommercialData(inv.items);
          return (
            <div
              key={inv.id}
              onClick={() => onViewDetails(inv)}
              className={`rounded-2xl border border-slate-100 bg-white p-4 shadow-sm hover:shadow-md transition-all cursor-pointer dark:border-slate-800 dark:bg-slate-900 relative ${
                isCardMenuOpen ? 'z-30' : 'z-0'
              }`}
            >
              <div className="flex justify-between items-start mb-2">
                <div>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                    NF-e #{inv.nfeNumber}
                  </span>
                  <span className="ml-2 text-[10px] text-slate-400 font-mono">
                    Série {inv.series}
                  </span>
                </div>
                <div
                  className="flex items-center gap-1.5 flex-wrap"
                  onClick={(e) => e.stopPropagation()}
                >
                  {isIncomplete ? (
                    <SummaryXmlStatusBadge onClick={() => onImportSummaryXml(inv)} />
                  ) : inv.status === 'received' ? (
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[9px] font-black uppercase text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                          Recebida
                        </span>
                      ) : (
                        <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[9px] font-black uppercase text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
                          Disponível
                        </span>
                      )}
                  {isSalvadosOnlySupplier(inv.supplierStockOrigins) ? (
                    <SalvadosBindingStatus />
                  ) : isIncomplete ? null : hasCompleteInboundInvoiceMappings(inv) ? (
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[9px] font-black uppercase text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                          Vinculação Completa
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            onManageMappings(inv);
                          }}
                          title="Clique para gerenciar os vínculos dos produtos desta NF-e"
                          aria-label={`Gerenciar vínculos pendentes da NF-e ${inv.nfeNumber}`}
                          className="cursor-pointer rounded-full bg-amber-100 px-2 py-0.5 text-[9px] font-black uppercase text-amber-800 transition-colors hover:bg-amber-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 dark:bg-amber-950/60 dark:text-amber-300 dark:hover:bg-amber-900/70"
                        >
                          Vinculações Pendentes
                        </button>
                      )}

                  <div
                    className="relative inline-block text-left"
                    ref={openMenuId === inv.id ? mobileMenuRef : null}
                  >
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenMenuId(openMenuId === inv.id ? null : inv.id);
                      }}
                      className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                      title="Mais opções"
                      aria-label="Mais opções"
                      aria-haspopup="true"
                      aria-expanded={isCardMenuOpen}
                    >
                      <i className="bi bi-three-dots-vertical text-sm" aria-hidden="true" />
                    </button>

                    {openMenuId === inv.id && (
                      <InboundInvoiceActionsMenu
                        {...getActionsMenuProps(
                          inv,
                          !inv.supplierStockOrigins || inv.supplierStockOrigins.includes('normal')
                        )}
                      />
                    )}
                  </div>
                </div>
              </div>

              <p className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate">
                {inv.emitterName}
              </p>
              <p className="text-[10px] font-mono text-slate-400 mb-3">CNPJ: {inv.emitterCnpj}</p>

              <div className="flex justify-between items-center text-xs py-2 border-t border-slate-100 dark:border-slate-800">
                <span className="text-slate-400">
                  {isIncomplete ? '— itens' : `${inv.itemsCount || inv.items.length} itens`}
                </span>
                <div className="flex items-center gap-2">
                  <span className="font-black text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(inv.totalInvoice)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default InboundInvoicesTable;
