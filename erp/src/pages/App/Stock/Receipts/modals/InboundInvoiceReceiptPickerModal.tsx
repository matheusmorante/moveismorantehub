import { useEffect, useMemo, useState } from 'react';
import { fetchInboundInvoices } from '@/pages/utils/inboundNfe/inboundInvoicesService';
import type { InboundInvoice } from '@/pages/utils/inboundNfe/inboundNfeTypes';
import { InboundDocumentImportModal } from '@/pages/App/Stock/InboundInvoices/modals/InboundDocumentImportModal';
import { ManageInboundInvoiceMappingsModal } from '@/pages/App/Stock/InboundInvoices/modals/ManageInboundInvoiceMappingsModal';
import {
  INBOUND_INVOICES_PAGE_SIZE,
  InboundInvoicesPagination,
} from '@/pages/App/Stock/InboundInvoices/components/InboundInvoicesPagination';
import type { DateFilterConfig } from '@/pages/App/Stock/InboundInvoices/components/InboundInvoicesHeader';
import {
  getCurrentYearMonth,
  getPreviousYearMonth,
  filterInboundInvoicesForReceipt,
} from '../utils/inboundInvoicePickerFilters';
import { InboundInvoiceReceiptFilterBar } from './inbound-invoice-picker/InboundInvoiceReceiptFilterBar';
import { InboundInvoiceReceiptItem } from './inbound-invoice-picker/InboundInvoiceReceiptItem';
import { supabase } from '@/pages/utils/supabaseConfig';
import { normalizeFiscalIdentifier } from '../../../../../../../shared-utils/fiscalIdentifiers';
import {
  effectiveInvoiceReceiptStatus,
  fetchInUseInvoiceKeys,
  fetchReceivedInvoiceKeys,
} from '../../../../../../../shared-utils/receiptInvoiceAvailability';

interface InboundInvoiceReceiptPickerModalProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly onSelect: (invoice: InboundInvoice) => void;
  readonly onCreate: (invoice: InboundInvoice) => void;
  readonly onManageReceipt: (invoice: InboundInvoice) => void;
  readonly canAccessReceipts: boolean;
}

export function InboundInvoiceReceiptPickerModal({
  isOpen,
  onClose,
  onSelect,
  onCreate,
  onManageReceipt,
  canAccessReceipts,
}: InboundInvoiceReceiptPickerModalProps) {
  const [invoices, setInvoices] = useState<InboundInvoice[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [mappingInvoice, setMappingInvoice] = useState<InboundInvoice | null>(null);
  const [summaryInvoiceForXmlImport, setSummaryInvoiceForXmlImport] = useState<InboundInvoice | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [dateFilter, setDateFilter] = useState<DateFilterConfig>(() => ({
    mode: 'current_month',
    customMonth: getCurrentYearMonth(),
    startMonth: getPreviousYearMonth(),
    endMonth: getCurrentYearMonth(),
  }));

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      const term = searchTerm.trim();
      setDebouncedSearchTerm(term.length >= 3 ? term : '');
    }, 300);
    return () => window.clearTimeout(timeout);
  }, [searchTerm]);

  const loadInvoices = async () => {
    setIsLoading(true);
    setLoadError('');
    try {
      const list = await fetchInboundInvoices();
      const keys = list.map((invoice) => invoice.nfeKey);
      const [receivedKeys, inUseKeys] = await Promise.all([
        fetchReceivedInvoiceKeys(supabase, keys),
        fetchInUseInvoiceKeys(supabase, keys),
      ]);
      setInvoices(list.map((invoice) => {
        const status = effectiveInvoiceReceiptStatus(invoice.status, invoice.nfeKey, receivedKeys);
        return {
          ...invoice,
          status,
          isInUse: inUseKeys.has(normalizeFiscalIdentifier(invoice.nfeKey)) || status === 'received',
          receiptId: status === 'received' ? invoice.receiptId : undefined,
        };
      }));
    } catch (e: unknown) {
      console.error('Erro ao carregar NF-e para recebimento:', e);
      setLoadError('Não foi possível carregar as notas fiscais. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      void loadInvoices();
    }
  }, [isOpen]);

  const available = useMemo(() => {
    return filterInboundInvoicesForReceipt(invoices, debouncedSearchTerm, dateFilter);
  }, [invoices, debouncedSearchTerm, dateFilter]);
  const pageCount = Math.ceil(available.length / INBOUND_INVOICES_PAGE_SIZE);
  const paginatedInvoices = available.slice(
    (currentPage - 1) * INBOUND_INVOICES_PAGE_SIZE,
    currentPage * INBOUND_INVOICES_PAGE_SIZE,
  );

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[1000001] flex items-center justify-center p-4 animate-in fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="inbound-invoice-picker-title"
    >
      <button
        type="button"
        aria-label="Fechar seleção de nota fiscal de entrada"
        onClick={onClose}
        className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm cursor-default border-0 p-0 m-0 w-full h-full"
      />
      <section className="relative max-h-[88vh] w-full max-w-3xl overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-slate-900 flex flex-col">
        <header className="flex items-center justify-between border-b border-slate-100 p-5 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600/10 text-indigo-600">
              <i className="bi bi-file-earmark-arrow-down-fill text-lg" aria-hidden="true" />
            </div>
            <div>
              <h3
                id="inbound-invoice-picker-title"
                className="text-base font-black text-slate-800 dark:text-slate-100"
              >
                Usar Nota Fiscal de Entrada
              </h3>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(true)}
              className="rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-black text-white shadow-sm hover:bg-emerald-700 transition-colors"
            >
              <i className="bi bi-plus-lg mr-1.5" aria-hidden="true" />
              Importar nova NF
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar"
              className="p-2 text-slate-400 hover:text-red-500 transition-colors"
            >
              <i className="bi bi-x-lg" aria-hidden="true" />
            </button>
          </div>
        </header>

        <InboundInvoiceReceiptFilterBar
          searchTerm={searchTerm}
          setSearchTerm={(term) => {
            setSearchTerm(term);
            setCurrentPage(1);
          }}
          dateFilter={dateFilter}
          setDateFilter={(filter) => {
            setDateFilter(filter);
            setCurrentPage(1);
          }}
        />

        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {isLoading ? (
            <div className="py-12 text-center text-sm font-bold text-slate-400">
              <i
                className="bi bi-arrow-repeat mb-2 block animate-spin text-2xl"
                aria-hidden="true"
              />
              Buscando notas fiscais...
            </div>
          ) : loadError ? (
            <div className="py-12 text-center text-sm font-bold text-red-500">
              <p>{loadError}</p>
              <button
                type="button"
                onClick={() => void loadInvoices()}
                className="mt-3 rounded-xl bg-red-50 px-4 py-2 text-xs font-black text-red-700 hover:bg-red-100 transition-colors"
              >
                Tentar novamente
              </button>
            </div>
          ) : available.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <i
                className="bi bi-inbox text-3xl text-slate-300 dark:text-slate-700"
                aria-hidden="true"
              />
              <p className="mt-2 text-xs font-bold">
                {debouncedSearchTerm
                  ? 'Nenhuma nota fiscal encontrada para a busca e o período selecionados.'
                  : 'Nenhuma nota fiscal neste período. A busca é opcional; altere o período para consultar outras notas.'}
              </p>
            </div>
          ) : (
            paginatedInvoices.map((inv) => (
              <InboundInvoiceReceiptItem
                key={inv.id}
                invoice={inv}
                onSelect={(selected) => {
                  onSelect(selected);
                  onClose();
                }}
                onOpenMapping={(target) => setMappingInvoice(target)}
                onOpenXml={(target) => setSummaryInvoiceForXmlImport(target)}
                onManageReceipt={onManageReceipt}
              />
            ))
          )}
        </div>

        {pageCount > 0 && (
          <footer className="border-t border-slate-100 px-4 dark:border-slate-800">
            <InboundInvoicesPagination
              currentPage={currentPage}
              totalPages={pageCount}
              totalItems={available.length}
              onPageChange={setCurrentPage}
            />
          </footer>
        )}
      </section>

      <InboundDocumentImportModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onImportSuccess={(newInv) => {
          setInvoices((current) => [
            newInv,
            ...current.filter((invoice) => invoice.id !== newInv.id),
          ]);
          setIsCreateModalOpen(false);
          onCreate(newInv);
        }}
      />

      <InboundDocumentImportModal
        isOpen={Boolean(summaryInvoiceForXmlImport)}
        summaryInvoice={summaryInvoiceForXmlImport}
        onClose={() => setSummaryInvoiceForXmlImport(null)}
        onImportSuccess={() => {
          setSummaryInvoiceForXmlImport(null);
          void loadInvoices();
        }}
      />

      {mappingInvoice && (
        <ManageInboundInvoiceMappingsModal
          isOpen={Boolean(mappingInvoice)}
          onClose={() => {
            setMappingInvoice(null);
            void loadInvoices();
          }}
          invoice={mappingInvoice}
          canAccessReceipts={canAccessReceipts}
          onSaveSuccess={() => {
            void loadInvoices();
          }}
        />
      )}
    </div>
  );
}

export default InboundInvoiceReceiptPickerModal;
