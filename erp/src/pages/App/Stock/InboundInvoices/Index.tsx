import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import { InboundInvoicesHeader, DateFilterConfig } from './InboundInvoicesHeader';
import { InboundInvoicesTable } from './InboundInvoicesTable';
import { InboundInvoiceDetailsModal } from './InboundInvoiceDetailsModal';
import { InboundDocumentImportModal } from './InboundDocumentImportModal';
import { ManageInboundInvoiceMappingsModal } from './ManageInboundInvoiceMappingsModal';
import { InboundInvoicesPagination } from './InboundInvoicesPagination';
import { fetchInboundInvoicesPage } from '@/pages/utils/inboundNfe/inboundInvoicesService';
import { InboundInvoice } from '@/pages/utils/inboundNfe/inboundNfeTypes';

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

    const loadInvoices = useCallback(async (pageToLoad = 1) => {
        setIsLoading(true);
        try {
            const res = await fetchInboundInvoicesPage({
                page: pageToLoad,
                pageSize: 30,
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
    }, [searchTerm, dateFilter]);

    useEffect(() => {
        setCurrentPage(1);
        void loadInvoices(1);
    }, [searchTerm, dateFilter, loadInvoices]);

    const handlePageChange = (newPage: number) => {
        if (newPage < 1 || newPage > totalPages || newPage === currentPage) return;
        void loadInvoices(newPage);
    };

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

    return (
        <div className="flex flex-col">
            <InboundInvoicesHeader
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
                dateFilter={dateFilter}
                onDateFilterChange={setDateFilter}
                onOpenAddInvoice={() => setIsImportModalOpen(true)}
            />

            <InboundInvoicesTable
                invoices={invoices}
                onViewDetails={setSelectedInvoice}
                onDownloadXml={handleDownloadXml}
                onManageMappings={setSelectedMappingInvoice}
            />

            <InboundInvoicesPagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={totalCount}
                itemsPerPage={30}
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
                onClose={() => setSelectedMappingInvoice(null)}
                onSaveSuccess={() => { void loadInvoices(currentPage); }}
            />

            <InboundDocumentImportModal
                isOpen={isImportModalOpen}
                onClose={() => setIsImportModalOpen(false)}
                onImportSuccess={() => { void loadInvoices(currentPage); }}
            />
        </div>
    );
}



