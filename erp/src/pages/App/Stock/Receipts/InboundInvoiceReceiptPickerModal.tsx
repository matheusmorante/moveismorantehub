import React, { useEffect, useMemo, useState } from 'react';
import { fetchInboundInvoices } from '@/pages/utils/inboundNfe/inboundInvoicesService';
import { InboundInvoice } from '@/pages/utils/inboundNfe/inboundNfeTypes';
import { formatCurrency } from '@/pages/utils/formatters';
import { normalizeSearchTerm } from '@/pages/utils/textUtils';
import { InboundDocumentImportModal } from '../InboundInvoices/InboundDocumentImportModal';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (invoice: InboundInvoice) => void;
    onCreate: (invoice: InboundInvoice) => void;
}

type PeriodFilter = 'this_month' | 'last_3_months' | 'this_year' | 'custom';
type StatusFilter = 'available' | 'all' | 'pending' | 'manifested' | 'received';

const normalizeDigits = (value: string) => value.replace(/\D/g, '');
const parseDate = (value?: string) => {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
};

const isInPeriod = (value: string | undefined, period: PeriodFilter, start: string, end: string) => {
    const date = parseDate(value);
    if (!date) return false;
    const now = new Date();
    if (period === 'custom') {
        const dateOnly = date.toISOString().slice(0, 10);
        return (!start || dateOnly >= start) && (!end || dateOnly <= end);
    }
    if (period === 'this_year') return date.getFullYear() === now.getFullYear();
    if (period === 'last_3_months') {
        const minimum = new Date(now.getFullYear(), now.getMonth() - 2, 1);
        return date >= minimum;
    }
    return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
};

const statusLabel = (status: InboundInvoice['status']) => {
    if (status === 'received') return 'Recebida integralmente';
    if (status === 'manifested') return 'Manifestada';
    return 'Sem recebimento';
};

export default function InboundInvoiceReceiptPickerModal({
    isOpen,
    onClose,
    onSelect,
    onCreate
}: Props) {
    const [invoices, setInvoices] = useState<InboundInvoice[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [loadError, setLoadError] = useState('');
    const [period, setPeriod] = useState<PeriodFilter>('this_month');
    const [status, setStatus] = useState<StatusFilter>('available');
    const [customStartDate, setCustomStartDate] = useState('');
    const [customEndDate, setCustomEndDate] = useState('');

    const loadInvoices = async () => {
        setIsLoading(true);
        setLoadError('');
        try {
            const list = await fetchInboundInvoices();
            setInvoices(list);
        } catch (e) {
            console.error('Erro ao carregar NF-e para recebimento:', e);
            setLoadError('Não foi possível carregar as notas fiscais. Tente novamente.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen) {
            loadInvoices();
        }
    }, [isOpen]);

    const available = useMemo(() => {
        const term = normalizeSearchTerm(searchTerm);
        const termDigits = normalizeDigits(searchTerm);
        return invoices
            .filter((inv) => {
                if (status === 'available' && inv.status === 'received') return false;
                if (status !== 'all' && status !== 'available' && inv.status !== status) return false;
                return isInPeriod(inv.issuedAt, period, customStartDate, customEndDate);
            })
            .filter((inv) => {
                if (!term) return true;
                const emitter = normalizeSearchTerm(inv.emitterName || '');
                const cnpj = normalizeDigits(inv.emitterCnpj || '');
                const key = normalizeDigits(inv.nfeKey || '');
                const number = normalizeDigits(inv.nfeNumber || '');
                return emitter.includes(term) || (termDigits.length > 0 && (cnpj.includes(termDigits) || number.includes(termDigits) || key.includes(termDigits)));
            })
            .sort((left, right) => Number(new Date(right.issuedAt)) - Number(new Date(left.issuedAt)));
    }, [invoices, searchTerm, period, status, customStartDate, customEndDate]);

    if (!isOpen) return null;

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
                            onClick={() => setIsCreateModalOpen(true)}
                            className="rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-black text-white shadow-sm hover:bg-emerald-700"
                        >
                            <i className="bi bi-plus-lg mr-1.5" />
                            Cadastrar nova NF de entrada
                        </button>
                        <button onClick={onClose} className="p-2 text-slate-400 hover:text-red-500">
                            <i className="bi bi-x-lg" />
                        </button>
                    </div>
                </header>

                <div className="space-y-3 border-b border-slate-100 p-4 dark:border-slate-800">
                    <div className="relative">
                        <i className="bi bi-search absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs" />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Emitente, CNPJ, nº da nota ou chave de acesso"
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-4 text-xs font-medium text-slate-700 outline-none focus:bg-white focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
                        />
                    </div>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
                        <select value={period} onChange={(event) => setPeriod(event.target.value as PeriodFilter)} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200">
                            <option value="this_month">Este mês</option>
                            <option value="last_3_months">Últimos 3 meses</option>
                            <option value="this_year">Este ano</option>
                            <option value="custom">Personalizado</option>
                        </select>
                        <select value={status} onChange={(event) => setStatus(event.target.value as StatusFilter)} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200">
                            <option value="available">Disponíveis para recebimento</option>
                            <option value="all">Todos os status</option>
                            <option value="pending">Sem recebimento</option>
                            <option value="manifested">Manifestadas</option>
                            <option value="received">Recebidas integralmente</option>
                        </select>
                        {period === 'custom' && <input type="date" value={customStartDate} onChange={(event) => setCustomStartDate(event.target.value)} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200" />}
                        {period === 'custom' && <input type="date" value={customEndDate} onChange={(event) => setCustomEndDate(event.target.value)} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200" />}
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-5 space-y-3">
                    {isLoading ? (
                        <div className="py-12 text-center text-sm font-bold text-slate-400"><i className="bi bi-arrow-repeat mb-2 block animate-spin text-2xl" />Buscando notas fiscais...</div>
                    ) : loadError ? (
                        <div className="py-12 text-center text-sm font-bold text-red-500"><p>{loadError}</p><button type="button" onClick={() => void loadInvoices()} className="mt-3 rounded-xl bg-red-50 px-4 py-2 text-xs font-black text-red-700">Tentar novamente</button></div>
                    ) : available.length === 0 ? (
                        <div className="py-12 text-center text-slate-400">
                            <i className="bi bi-inbox text-3xl text-slate-300 dark:text-slate-700" />
                                    <p className="mt-2 text-xs font-bold">Nenhuma nota fiscal encontrada para os filtros selecionados.</p>
                                    <button type="button" onClick={() => setIsCreateModalOpen(true)} className="mt-3 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-black text-white">Cadastrar nova NF de entrada</button>
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
                                    <p className="text-[10px] text-slate-500">CNPJ: {inv.emitterCnpj || 'Não informado'} · Emissão: {parseDate(inv.issuedAt)?.toLocaleDateString('pt-BR') || '—'}</p>
                                    <p className="text-[10px] font-mono text-slate-400 truncate">
                                        Chave: {inv.nfeKey}
                                    </p>
                                    <span className={`inline-flex rounded-full px-2 py-0.5 text-[9px] font-black uppercase ${inv.status === 'received' ? 'bg-slate-100 text-slate-500' : 'bg-emerald-100 text-emerald-700'}`}>{statusLabel(inv.status)}</span>
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

            <InboundDocumentImportModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onImportSuccess={(newInv) => {
                    setInvoices((current) => [newInv, ...current.filter((invoice) => invoice.id !== newInv.id)]);
                    setIsCreateModalOpen(false);
                    onCreate(newInv);
                }}
            />
        </div>
    );
}
