import React, { useEffect, useState } from 'react';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';
import type { InboundInvoice } from '@/pages/utils/inboundNfe/inboundNfeTypes';
import { formatCurrency, formatToBRDate } from '@/pages/utils/formatters';
import { InboundInvoiceFiscalReview } from '../components/InboundInvoiceFiscalReview';
import { hasInboundItemCommercialData } from '../../../../../../../shared-utils/inboundInvoiceCompleteness';
import {
  INBOUND_INVOICE_DETAIL_TABS,
  type InboundInvoiceDetailTab,
} from '../../../../../../../shared-utils/inboundInvoiceDetailTabs';

const STATUS_LABEL: Record<string, string> = {
  pending: 'Pendente',
  received: 'Recebida',
  manifested: 'Manifestada',
};

const STATUS_CLASS: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  received: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  manifested: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
};

const TAB_ICONS: Record<InboundInvoiceDetailTab, string> = {
  summary: 'bi-receipt',
  parties: 'bi-people',
  items: 'bi-box-seam',
  fiscal: 'bi-calculator',
};

interface InboundInvoiceDetailsModalProps {
  readonly invoice: InboundInvoice | null;
  readonly onClose: () => void;
}

export const InboundInvoiceDetailsModal: React.FC<InboundInvoiceDetailsModalProps> = ({
  invoice,
  onClose,
}) => {
  useBodyScrollLock(Boolean(invoice));
  useEffect(() => {
    if (!invoice) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [invoice, onClose]);

  if (!invoice) return null;
  return <InboundInvoiceDetailsContent key={invoice.id} invoice={invoice} onClose={onClose} />;
};

const InboundInvoiceDetailsContent: React.FC<{
  invoice: InboundInvoice;
  onClose: () => void;
}> = ({ invoice, onClose }) => {
  const [activeTab, setActiveTab] = useState<InboundInvoiceDetailTab>('summary');

  const handleTabKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    let nextIndex: number;
    if (event.key === 'ArrowRight') nextIndex = (index + 1) % INBOUND_INVOICE_DETAIL_TABS.length;
    else if (event.key === 'ArrowLeft') nextIndex = (index - 1 + INBOUND_INVOICE_DETAIL_TABS.length) % INBOUND_INVOICE_DETAIL_TABS.length;
    else if (event.key === 'Home') nextIndex = 0;
    else if (event.key === 'End') nextIndex = INBOUND_INVOICE_DETAIL_TABS.length - 1;
    else return;

    event.preventDefault();
    setActiveTab(INBOUND_INVOICE_DETAIL_TABS[nextIndex].id);
    event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[nextIndex]?.focus();
  };

  return (
    <div
      className="fixed inset-0 z-[999999] flex items-center justify-center p-0 md:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="invoice-details-modal-title"
    >
      <button
        type="button"
        aria-label="Fechar detalhes da nota fiscal de entrada"
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm cursor-default"
        onClick={onClose}
      />
      <div className="relative flex h-[100dvh] max-h-[100dvh] w-full min-w-0 flex-col overflow-hidden bg-white shadow-2xl dark:bg-slate-950 md:h-[min(92dvh,900px)] md:max-h-[calc(100dvh-2rem)] md:max-w-7xl md:rounded-3xl md:border md:border-slate-200 dark:md:border-slate-800">
        <header className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-200 px-4 py-4 dark:border-slate-800 sm:px-6">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 id="invoice-details-modal-title" className="text-base font-black text-slate-900 dark:text-slate-100 sm:text-lg">
                Detalhes da nota fiscal de entrada
              </h2>
              <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${STATUS_CLASS[invoice.status] ?? 'bg-slate-100 text-slate-500'}`}>
                {STATUS_LABEL[invoice.status] ?? invoice.status}
              </span>
            </div>
            <p className="mt-1 text-xs font-semibold text-slate-600 dark:text-slate-300">
              NF-e #{invoice.nfeNumber || '—'} · Série {invoice.series || '—'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar detalhes"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <i className="bi bi-x-lg" aria-hidden="true" />
          </button>
        </header>

        <nav role="tablist" aria-label="Abas dos detalhes da NF de entrada" className="flex shrink-0 gap-1 overflow-x-auto border-b border-slate-200 px-2 [scrollbar-width:thin] [&::-webkit-scrollbar]:h-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-300 dark:border-slate-800 sm:px-4">
          {INBOUND_INVOICE_DETAIL_TABS.map((tab, index) => {
            const selected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                id={`inbound-invoice-tab-${tab.id}`}
                aria-selected={selected}
                aria-controls={`inbound-invoice-panel-${tab.id}`}
                tabIndex={selected ? 0 : -1}
                onClick={() => setActiveTab(tab.id)}
                onKeyDown={(event) => handleTabKeyDown(event, index)}
                className={`flex min-h-11 shrink-0 items-center gap-1 border-b-2 px-2 py-3 text-[11px] font-bold transition-colors sm:gap-1.5 sm:px-3 sm:text-xs ${selected ? 'border-blue-600 text-blue-700 dark:border-blue-400 dark:text-blue-300' : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'}`}
              >
                <i className={`bi ${TAB_ICONS[tab.id]}`} aria-hidden="true" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>

        <main key={activeTab} className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain bg-slate-50/70 p-4 dark:bg-slate-950/30 sm:p-6">
          <section role="tabpanel" id={`inbound-invoice-panel-${activeTab}`} aria-labelledby={`inbound-invoice-tab-${activeTab}`} tabIndex={0} className="space-y-4 break-words">
          {activeTab === 'summary' && (
            <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400">NF-e de entrada</p>
                  <p className="mt-1 text-lg font-black text-slate-900 dark:text-slate-100">Nº {invoice.nfeNumber || '—'} · Série {invoice.series || '—'}</p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Emissão: {invoice.issuedAt ? formatToBRDate(invoice.issuedAt) : '—'}{invoice.receivedAt ? ` · Recebida em: ${formatToBRDate(invoice.receivedAt)}` : ''}</p>
                </div>
                <div className="rounded-xl border border-blue-100 bg-blue-50/60 px-4 py-3 dark:border-blue-900/40 dark:bg-slate-950/50">
                  <p className="text-[10px] font-bold uppercase text-blue-700 dark:text-blue-400">Valor total da nota</p>
                  <p className="text-xl font-black text-slate-900 dark:text-slate-100">{formatCurrency(invoice.totalInvoice)}</p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Produtos: {formatCurrency(invoice.totalProducts)} · Frete: {formatCurrency(invoice.totalFreight)}</p>
                </div>
              </div>
              <div className="border-t border-slate-100 pt-3 dark:border-slate-800">
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Chave de acesso</p>
                <p className="mt-1 break-all font-mono text-xs text-slate-700 dark:text-slate-300">{invoice.nfeKey || 'Não informada'}</p>
              </div>
            </div>
          )}

          {activeTab === 'parties' && <div className="grid grid-cols-1 gap-3 rounded-2xl bg-white p-4 dark:bg-slate-900 sm:grid-cols-2">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                Fornecedor / Emitente
              </span>
              <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
                {invoice.emitterName}
              </p>
              <p className="text-xs text-slate-500">CNPJ: {invoice.emitterCnpj}</p>
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                Destinatário
              </span>
              <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
                {invoice.recipientName}
              </p>
              <p className="text-xs text-slate-500">CNPJ: {invoice.recipientCnpj}</p>
            </div>
          </div>}

          {activeTab === 'fiscal' && <InboundInvoiceFiscalReview invoice={invoice} />}

          {activeTab === 'items' && <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
            <div className="bg-slate-100/60 px-4 py-2.5 text-xs font-black uppercase tracking-wider text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              Itens da Nota Fiscal ({(invoice.items ?? []).length})
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {!hasInboundItemCommercialData(invoice.items) ? (
                <p className="p-4 text-center text-xs text-slate-400">
                  A sincronização automática não carrega itens e também pode chegar com valores zerados. Para conferir esta nota, baixe o XML atualizado no Portal da NF-e e importe-o pelo botão Obter XML.
                </p>
              ) : (
                (invoice.items ?? []).map((item, idx) => (
                  <div
                    key={idx}
                    className="flex flex-col gap-2 p-3.5 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0 flex-1 sm:pr-4">
                      <p className="break-words text-xs font-bold text-slate-800 dark:text-slate-100">
                        {item.productDescription}
                      </p>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[10px] text-slate-400">
                        <span>Cód: {item.productCode || 'S/C'}</span>
                        <span>EAN: {item.ean || '—'}</span>
                        <span>NCM: {item.ncm || '—'}</span>
                        <span>CEST: {item.cest || '—'}</span>
                        <span>CFOP: {item.cfop || '—'}</span>
                        {item.unit && <span>UN: {item.unit}</span>}
                      </div>
                    </div>
                    <div className="min-w-0 sm:shrink-0 sm:text-right">
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-100">
                        {item.quantity} {item.unit} × {formatCurrency(item.unitCost)}
                      </p>
                      <p className="text-xs font-black text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(item.totalCost)}
                      </p>
                      <p className="text-[10px] text-slate-500">
                        Frete {formatCurrency(item.freightValue || 0)} · IPI{' '}
                        {formatCurrency(item.ipiValue || 0)} (
                        {Number(item.ipiPercent || 0).toFixed(2)}%)
                      </p>
                      <p className="text-[10px] text-slate-500">
                        ICMS {formatCurrency(item.icmsValue || 0)} (
                        {Number(item.icmsPercent || 0).toFixed(2)}%) · ST{' '}
                        {formatCurrency(item.icmsStValue || 0)}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>}

          </section>
          {INBOUND_INVOICE_DETAIL_TABS.filter((tab) => tab.id !== activeTab).map((tab) => (
            <section
              key={tab.id}
              role="tabpanel"
              id={`inbound-invoice-panel-${tab.id}`}
              aria-labelledby={`inbound-invoice-tab-${tab.id}`}
              hidden
            />
          ))}
        </main>

        <footer className="flex shrink-0 items-center justify-end border-t border-slate-100 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-4 py-2.5 text-xs font-black uppercase text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            Fechar
          </button>
        </footer>
      </div>
    </div>
  );
};

export default InboundInvoiceDetailsModal;
