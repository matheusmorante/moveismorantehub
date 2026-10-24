import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '@/context/AuthContext';
import { canPerform } from '@/pages/utils/permissionService';
import { canPrintProductIdentificationLabels } from '@/pages/utils/accessRoles';
import { InboundInvoicesHeader, DateFilterConfig } from '../components/InboundInvoicesHeader';
import { InboundInvoicesTable } from '../components/InboundInvoicesTable';
import { InboundInvoiceDetailsModal } from '../modals/InboundInvoiceDetailsModal';
import { InboundDocumentImportModal } from '../modals/InboundDocumentImportModal';
import { ManageInboundInvoiceMappingsModal } from '../modals/ManageInboundInvoiceMappingsModal';
import { InboundPostImportActionModal } from '../modals/InboundPostImportActionModal';
import { InboundInvoicesPagination } from '../components/InboundInvoicesPagination';
import { fetchInboundInvoicesPage } from '@/pages/utils/inboundNfe/inboundInvoicesService';
import { InboundInvoice } from '@/pages/utils/inboundNfe/inboundNfeTypes';
import { prepareIdentificationLabelProducts } from '@/pages/App/Stock/LabelPrinting/services/identificationLabelPrefillService';
import { LabelPrintSelectionModal } from '@/pages/App/Products/components/modals/product/LabelPrintSelectionModal';
import type { IdentificationLabelProduct } from '@/pages/App/Stock/LabelPrinting/services/identificationLabelPrefillService';

const getCurrentYearMonth = (): string => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
};

const getPreviousYearMonth = (): string => {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
};

export default function InboundInvoicesPage() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const canAccessReceipts = canPerform(
    'viewStockReceipts',
    profile?.roles || profile?.role
  );
  const canPrintLabels = canPrintProductIdentificationLabels(profile);
  const [invoices, setInvoices] = useState<InboundInvoice[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState<DateFilterConfig>(() => ({
    mode: 'current_month',
    customMonth: getCurrentYearMonth(),
    startMonth: getPreviousYearMonth(),
    endMonth: getCurrentYearMonth(),
  }));

  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  const [selectedInvoice, setSelectedInvoice] = useState<InboundInvoice | null>(null);
  const [selectedMappingInvoice, setSelectedMappingInvoice] = useState<InboundInvoice | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [summaryInvoiceForXmlImport, setSummaryInvoiceForXmlImport] = useState<InboundInvoice | null>(null);
  const [postImportInvoice, setPostImportInvoice] = useState<InboundInvoice | null>(null);
  const [labelPrintProducts, setLabelPrintProducts] = useState<IdentificationLabelProduct[] | null>(null);
  const handleCloseLabelPrintModal = useCallback(() => setLabelPrintProducts(null), []);

  // Global Drag & Drop State
  const [globalDragging, setGlobalDragging] = useState(false);
  const [droppedFile, setDroppedFile] = useState<File | null>(null);

  const loadInvoices = useCallback(
    async (pageToLoad = 1) => {
      setIsLoading(true);
      try {
        const res = await fetchInboundInvoicesPage({
          page: pageToLoad,
          pageSize: 15,
          searchTerm,
          dateFilter,
        });
        setInvoices(res.invoices);
        setTotalCount(res.totalCount);
        setTotalPages(res.totalPages);
        setCurrentPage(res.page);
      } catch (err) {
        console.error('Erro ao carregar notas fiscais de entrada:', err);
        toast.error('Erro ao carregar lista de notas fiscais.');
      } finally {
        setIsLoading(false);
      }
    },
    [searchTerm, dateFilter]
  );

  useEffect(() => {
    setCurrentPage(1);
    void loadInvoices(1);
  }, [searchTerm, dateFilter, loadInvoices]);

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages || newPage === currentPage) return;
    void loadInvoices(newPage);
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.types.includes('Files')) {
      setGlobalDragging(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget === e.target) {
      setGlobalDragging(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setGlobalDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (file && (file.name.toLowerCase().endsWith('.xml') || file.type.includes('xml'))) {
      setSummaryInvoiceForXmlImport(null);
      setDroppedFile(file);
      setIsImportModalOpen(true);
    } else if (file) {
      toast.error('Formato inválido. Arraste apenas o arquivo XML da NF-e.');
    }
  }, []);

  const handleDownloadXml = (invoice: InboundInvoice) => {
    if (!invoice.rawXml) return toast.info('XML completo não armazenado para esta nota.');
    const blob = new Blob([invoice.rawXml], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `NFe_${invoice.nfeKey}.xml`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleGenerateReceipt = (invoice: InboundInvoice) => {
    const params = new URLSearchParams({ inboundKey: invoice.nfeKey });
    navigate(`/estoque/recebimentos?${params.toString()}`);
  };

  const handlePrintIdentificationLabels = async (invoice: InboundInvoice) => {
    if (!canPrintLabels) return toast.error('Seu usuário não tem acesso à impressão de etiquetas.');
    try {
      const references = (invoice.items || []).flatMap((item) => {
        if (item.linkMode === 'composition' && item.compositionLinks?.length) {
          return item.compositionLinks.map((link) => ({
            productId: link.productId,
            variationId: link.variationId,
            quantity: item.quantity * link.quantityMultiplier,
          }));
        }
        return item.matchedProductId
          ? [
              {
                productId: item.matchedProductId,
                variationId: item.matchedVariationId,
                quantity: item.quantity,
              },
            ]
          : [];
      });
      const batchProducts = await prepareIdentificationLabelProducts(references);
      setLabelPrintProducts(batchProducts);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Não foi possível preparar as etiquetas desta NF-e.'
      );
    }
  };

  return (
    <div
      className="flex flex-col relative min-h-screen"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {globalDragging && (
        <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-blue-900/40 backdrop-blur-sm border-[6px] border-blue-500 border-dashed m-4 rounded-3xl animate-in fade-in pointer-events-none">
          <div className="flex flex-col items-center justify-center bg-white dark:bg-slate-900 p-8 rounded-2xl shadow-2xl">
            <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400 mb-4 animate-bounce">
              <i className="bi bi-cloud-arrow-up-fill text-4xl" />
            </div>
            <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100 mb-2">
              Solte o XML da Nota Fiscal Aqui
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              A nota será importada automaticamente para o Morante Hub.
            </p>
          </div>
        </div>
      )}

      <InboundInvoicesHeader
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        dateFilter={dateFilter}
        onDateFilterChange={setDateFilter}
        onOpenAddInvoice={() => {
          setSummaryInvoiceForXmlImport(null);
          setIsImportModalOpen(true);
        }}
        onSyncSuccess={() => void loadInvoices(currentPage)}
      />

      <InboundInvoicesTable
        invoices={invoices}
        onViewDetails={setSelectedInvoice}
        onDownloadXml={handleDownloadXml}
        onImportSummaryXml={(invoice) => {
          setSummaryInvoiceForXmlImport(invoice);
          setIsImportModalOpen(true);
        }}
        onManageMappings={setSelectedMappingInvoice}
        canAccessReceipts={canAccessReceipts}
        onGenerateReceipt={handleGenerateReceipt}
        canPrintIdentificationLabels={canPrintLabels}
        onPrintIdentificationLabels={handlePrintIdentificationLabels}
      />

      <InboundInvoicesPagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={totalCount}
        itemsPerPage={15}
        onPageChange={handlePageChange}
        loading={isLoading}
      />

      <InboundInvoiceDetailsModal
        invoice={selectedInvoice}
        onClose={() => setSelectedInvoice(null)}
      />

      <ManageInboundInvoiceMappingsModal
        isOpen={Boolean(selectedMappingInvoice)}
        invoice={selectedMappingInvoice}
        canAccessReceipts={canAccessReceipts}
        onClose={() => setSelectedMappingInvoice(null)}
        onSaveSuccess={() => {
          void loadInvoices(currentPage);
        }}
        onGenerateReceipt={(invoice) => {
          setSelectedMappingInvoice(null);
          handleGenerateReceipt(invoice);
        }}
      />

      <InboundDocumentImportModal
        isOpen={isImportModalOpen}
        initialFile={droppedFile}
        summaryInvoice={summaryInvoiceForXmlImport}
        onClose={() => {
          setIsImportModalOpen(false);
          setDroppedFile(null);
          setSummaryInvoiceForXmlImport(null);
        }}
        onImportSuccess={(savedInvoice) => {
          void loadInvoices(currentPage);
          setPostImportInvoice(savedInvoice);
          setDroppedFile(null);
        }}
      />

      <InboundPostImportActionModal
        isOpen={Boolean(postImportInvoice)}
        invoice={postImportInvoice}
        onClose={() => setPostImportInvoice(null)}
        onManageMappings={() => {
          const targetInvoice = postImportInvoice;
          setPostImportInvoice(null);
          if (targetInvoice) {
            setSelectedMappingInvoice(targetInvoice);
          }
        }}
      />

      {labelPrintProducts?.length ? (
        <LabelPrintSelectionModal
          isOpen
          onClose={handleCloseLabelPrintModal}
          initialProduct={labelPrintProducts[0]}
          initialProducts={labelPrintProducts}
          labelType="identification"
        />
      ) : null}
    </div>
  );
}
