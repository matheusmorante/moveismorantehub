import React, { useEffect, useState } from 'react';
import { fetchInboundInvoices } from '@/pages/utils/inboundNfe/inboundInvoicesService';
import { InboundInvoice } from '@/pages/utils/inboundNfe/inboundNfeTypes';
import { formatCurrency } from '@/pages/utils/formatters';
import { normalizeSearchTerm } from '@/pages/utils/textUtils';
import { InboundXmlImportModal } from '../InboundInvoices/InboundXmlImportModal';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (invoice: InboundInvoice) => void;
    supplierId?: string;
    supplierName?: string;
}

export default function InboundInvoiceReceiptPickerModal({
    isOpen,
    onClose,
    onSelect,
    supplierId,
    supplierName
}: Props) {
    const [invoices, setInvoices] = useState<InboundInvoice[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);

    const loadInvoices = async () => {
        try {
            const list = await fetchInboundInvoices();
            setInvoices(list);
        } catch (e) {
            console.error('Erro ao carregar NF-e para recebimento:', e);
        }
    };

    useEffect(() => {
        if (isOpen) {
            loadInvoices();
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const available = invoices.filter((inv) => {
        if (inv.status === 'received') return false;
        if (!searchTerm.trim()) return true;
        const term = normalizeSearchTerm(searchTerm);
        const name = normalizeSearchTerm(inv.emitterName || '');
        const key = inv.nfeKey || '';
        const num = inv.nfeNumber || '';
        return name.includes(term) || key.includes(term) || num.includes(term);
    });

    return (
        <div className="fixed inset-0 z-[1000001] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm animate-in fade-in">
            <section className="max-h-[88vh] w-full max-w-3xl overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-slate-900 flex flex-col">
                <header className="flex items-center justify-between border-b border-slate-100 p-5 dark:border-slate-800">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600/10 text-indigo-600">
                            <i className="bi bi-file-earmark-arrow-down-fill text-lg" />
                        </div>
                        <div>
                            <h3 className="text-base font-black text-slate-800 dark:text-slate-100">
                                Usar Nota Fiscal de Entrada
                            </h3>
                            <p className="text-xs text-slate-400">
                                Selecione uma NF-e para importar fornecedor, chave e itens automaticamente
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => setIsImportModalOpen(true)}
                            className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
                        >
                            <i className="bi bi-filetype-xml text-emerald-600 mr-1.5" />
                            Importar XML
                        </button>
                        <button onClick={onClose} className="p-2 text-slate-400 hover:text-red-500">
                            <i className="bi bi-x-lg" />
                        </button>
                    </div>
                </header>

                <div className="p-4 border-b border-slate-100 dark:border-slate-800">
                    <div className="relative">
                        <i className="bi bi-search absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs" />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Buscar nota por fornecedor, número ou chave..."
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-4 text-xs font-medium text-slate-700 outline-none focus:bg-white focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-5 space-y-3">
                    {available.length === 0 ? (
                        <div className="py-12 text-center text-slate-400">
                            <i className="bi bi-inbox text-3xl text-slate-300 dark:text-slate-700" />
                            <p className="mt-2 text-xs font-bold">Nenhuma nota fiscal pendente encontrada.</p>
                            <p className="mt-1 text-[11px]">Importe um arquivo XML ou consulte a SEFAZ no menu Notas Fiscais de Entrada.</p>
                        </div>
                    ) : (
                        available.map((inv) => (
                            <div
                                key={inv.id}
                                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm hover:border-indigo-400 transition-all dark:border-slate-800 dark:bg-slate-950"
                            >
                                <div className="space-y-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-xs text-slate-800 dark:text-slate-100">
                                            NF-e #{inv.nfeNumber}
                                        </span>
                                        <span className="text-[10px] text-slate-400">Série {inv.series}</span>
                                        <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[9px] font-black uppercase text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                                            {inv.itemsCount || inv.items.length} itens
                                        </span>
                                    </div>
                                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate">
                                        {inv.emitterName}
                                    </p>
                                    <p className="text-[10px] font-mono text-slate-400 truncate">
                                        Chave: {inv.nfeKey}
                                    </p>
                                </div>

                                <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800">
                                    <div className="text-right">
                                        <span className="block text-[10px] uppercase tracking-wider text-slate-400">Total</span>
                                        <span className="text-sm font-black text-emerald-600">
                                            {formatCurrency(inv.totalInvoice)}
                                        </span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            onSelect(inv);
                                            onClose();
                                        }}
                                        className="rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-black uppercase tracking-wider text-white shadow-sm hover:bg-indigo-700 active:scale-95 transition-all"
                                    >
                                        Usar Nota
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </section>

            <InboundXmlImportModal
                isOpen={isImportModalOpen}
                onClose={() => setIsImportModalOpen(false)}
                onImportSuccess={(newInv) => {
                    loadInvoices();
                    onSelect(newInv);
                    onClose();
                }}
            />
        </div>
    );
}
