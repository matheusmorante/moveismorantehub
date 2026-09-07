import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { InboundInvoicesHeader } from './InboundInvoicesHeader';
import { InboundInvoicesTable } from './InboundInvoicesTable';
import { InboundInvoiceDetailsModal } from './InboundInvoiceDetailsModal';
import { InboundXmlImportModal } from './InboundXmlImportModal';
import { fetchInboundInvoices, syncSefazDfe } from '@/pages/utils/inboundNfe/inboundInvoicesService';
import { InboundInvoice } from '@/pages/utils/inboundNfe/inboundNfeTypes';

export default function InboundInvoicesPage() {
    const navigate = useNavigate();
    const [invoices, setInvoices] = useState<InboundInvoice[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isSyncing, setIsSyncing] = useState(false);
    const [selectedInvoice, setSelectedInvoice] = useState<InboundInvoice | null>(null);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);

    const loadInvoices = async () => {
        try {
            const list = await fetchInboundInvoices();
            setInvoices(list);
        } catch (err) {
            console.error('Erro ao carregar notas fiscais de entrada:', err);
        }
    };

    useEffect(() => {
        loadInvoices();
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

    const handleSyncSefaz = async () => {
        setIsSyncing(true);
        try {
            const result = await syncSefazDfe();
            toast.info(result.message);
            await loadInvoices();
        } catch (err: any) {
            toast.error(err.message || 'Erro ao sincronizar notas com a SEFAZ.');
        } finally {
            setIsSyncing(false);
        }
    };

    const handleReceiveGoods = (invoice: InboundInvoice) => {
        // Redireciona para recebimentos passando a chave da nota para pré-carregamento imediato
        navigate(`/stock/receipts?inboundKey=${invoice.nfeKey}`);
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
                onSyncSefaz={handleSyncSefaz}
                onOpenImportXml={() => setIsImportModalOpen(true)}
                isSyncing={isSyncing}
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
        </div>
    );
}
