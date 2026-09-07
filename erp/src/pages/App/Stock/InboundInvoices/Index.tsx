import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { InboundInvoicesHeader } from './InboundInvoicesHeader';
import { InboundInvoicesTable } from './InboundInvoicesTable';
import { InboundInvoiceDetailsModal } from './InboundInvoiceDetailsModal';
import { InboundXmlImportModal } from './InboundXmlImportModal';
import { InboundAccessKeyModal } from './InboundAccessKeyModal';
import { fetchInboundInvoices, getLastInboundInvoiceSyncAt, syncSefazDfe } from '@/pages/utils/inboundNfe/inboundInvoicesService';
import { InboundInvoice } from '@/pages/utils/inboundNfe/inboundNfeTypes';

export default function InboundInvoicesPage() {
    const navigate = useNavigate();
    const [invoices, setInvoices] = useState<InboundInvoice[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isSyncing, setIsSyncing] = useState(false);
    const [selectedInvoice, setSelectedInvoice] = useState<InboundInvoice | null>(null);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [isAccessKeyModalOpen, setIsAccessKeyModalOpen] = useState(false);
    const [lastSyncAt, setLastSyncAt] = useState<string | null>(getLastInboundInvoiceSyncAt);
    const isSyncInProgressRef = useRef(false);

    const loadInvoices = async () => {
        try {
            const list = await fetchInboundInvoices();
            setInvoices(list);
        } catch (err) {
            console.error('Erro ao carregar notas fiscais de entrada:', err);
        }
    };

    const synchronizeInvoices = async () => {
        if (isSyncInProgressRef.current) return;
        isSyncInProgressRef.current = true;
        setIsSyncing(true);
        try {
            await syncSefazDfe();
            setLastSyncAt(getLastInboundInvoiceSyncAt());
            await loadInvoices();
        } catch (error) {
            console.error('Erro na atualização automática das NF-e:', error);
        } finally {
            setIsSyncing(false);
            isSyncInProgressRef.current = false;
        }
    };

    useEffect(() => {
        void loadInvoices();
        void synchronizeInvoices();
        const intervalId = window.setInterval(() => void synchronizeInvoices(), 60 * 60 * 1000);
        return () => window.clearInterval(intervalId);
    }, []);

    const filteredInvoices = useMemo(() => {
        if (!searchTerm.trim()) return invoices;
        const term = searchTerm.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        return invoices.filter((inv) => {
            const emitter = (inv.emitterName || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
            const key = inv.nfeKey || '';
            const num = inv.nfeNumber || '';
            const cnpj = inv.emitterCnpj || '';
            return emitter.includes(term) || key.includes(term) || num.includes(term) || cnpj.includes(term);
        });
    }, [invoices, searchTerm]);

    const handleReceiveGoods = (invoice: InboundInvoice) => {
        // Redireciona para recebimentos passando a chave da nota para pré-carregamento imediato
        navigate(`/stock/receipts?inboundKey=${invoice.nfeKey}`);
    };

    const handleAccessKeyLookup = async (accessKey: string) => {
        await synchronizeInvoices();
        const updatedInvoices = await fetchInboundInvoices();
        const invoice = updatedInvoices.find((candidate) => candidate.nfeKey === accessKey);
        if (!invoice) {
            toast.info('A chave ainda não foi disponibilizada na distribuição DF-e. Tente novamente após a próxima atualização.');
            return;
        }
        setInvoices(updatedInvoices);
        setSelectedInvoice(invoice);
        setIsAccessKeyModalOpen(false);
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
                onOpenImportXml={() => setIsImportModalOpen(true)}
                onOpenAccessKey={() => setIsAccessKeyModalOpen(true)}
                isSyncing={isSyncing}
                lastSyncAt={lastSyncAt}
            />

            <InboundInvoicesTable
                invoices={filteredInvoices}
                onViewDetails={setSelectedInvoice}
                onReceiveGoods={handleReceiveGoods}
                onDownloadXml={handleDownloadXml}
            />

            <InboundInvoiceDetailsModal
                invoice={selectedInvoice}
                onClose={() => setSelectedInvoice(null)}
                onReceiveGoods={handleReceiveGoods}
            />

            <InboundXmlImportModal
                isOpen={isImportModalOpen}
                onClose={() => setIsImportModalOpen(false)}
                onImportSuccess={() => loadInvoices()}
            />
            <InboundAccessKeyModal
                isOpen={isAccessKeyModalOpen}
                isLoading={isSyncing}
                onClose={() => setIsAccessKeyModalOpen(false)}
                onSubmit={handleAccessKeyLookup}
            />
        </div>
    );
}
