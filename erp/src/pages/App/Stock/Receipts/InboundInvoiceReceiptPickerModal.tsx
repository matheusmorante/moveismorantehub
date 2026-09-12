import React, { useEffect, useMemo, useState } from 'react';
import { fetchInboundInvoices } from '@/pages/utils/inboundNfe/inboundInvoicesService';
import { InboundInvoice } from '@/pages/utils/inboundNfe/inboundNfeTypes';
import { formatCurrency, formatToBRDate } from '@/pages/utils/formatters';
import { normalizeSearchTerm } from '@/pages/utils/textUtils';
import { InboundDocumentImportModal } from '../InboundInvoices/InboundDocumentImportModal';
import { DateFilterConfig, DateFilterMode } from '../InboundInvoices/components/InboundInvoicesHeader';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (invoice: InboundInvoice) => void;
    onCreate: (invoice: InboundInvoice) => void;
}

const normalizeDigits = (value: string) => value.replace(/\D/g, '');

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

const statusLabel = (status?: string) => {
    switch (status) {
        case 'received':
            return 'Recebida no Estoque';
        case 'manifested':
            return 'Manifestada';
        case 'pending':
        default:
            return 'Disponível';
    }
};

const isInDateFilter = (value: string | undefined, filter: DateFilterConfig) => {
    if (!value) return false;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return false;
    const now = new Date();
    const y = date.getFullYear();
    const m = date.getMonth() + 1;
    const ym = `${y}-${String(m).padStart(2, '0')}`;

    if (filter.mode === 'current_month') {
        return y === now.getFullYear() && date.getMonth() === now.getMonth();
    }
    if (filter.mode === 'previous_month') {
        const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        return y === prevMonthDate.getFullYear() && date.getMonth() === prevMonthDate.getMonth();
    }
    if (filter.mode === 'current_year') {
        return y === now.getFullYear();
    }
    if (filter.mode === 'previous_year') {
        return y === now.getFullYear() - 1;
    }
    if (filter.mode === 'custom_month') {
        return ym === filter.customMonth;
    }
    if (filter.mode === 'custom_range') {
        return (!filter.startMonth || ym >= filter.startMonth) && (!filter.endMonth || ym <= filter.endMonth);
    }
    return true;
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
    const [dateFilter, setDateFilter] = useState<DateFilterConfig>(() => ({
        mode: 'current_month',
        customMonth: getCurrentYearMonth(),
        startMonth: getPreviousYearMonth(),
        endMonth: getCurrentYearMonth(),
    }));

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
            .filter((inv) => inv.status !== 'received')
            .filter((inv) => isInDateFilter(inv.issuedAt, dateFilter))
            .filter((inv) => {
                if (!term) return true;
                const emitter = normalizeSearchTerm(inv.emitterName || '');
                const cnpj = normalizeDigits(inv.emitterCnpj || '');
                const key = normalizeDigits(inv.nfeKey || '');
                const number = normalizeDigits(inv.nfeNumber || '');
                return emitter.includes(term) || (termDigits.length > 0 && (cnpj.includes(termDigits) || number.includes(termDigits) || key.includes(termDigits)));
            })
            .sort((left, right) => Number(new Date(right.issuedAt)) - Number(new Date(left.issuedAt)));
    }, [invoices, searchTerm, dateFilter]);

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
                    <div className="flex flex-wrap items-center gap-2">
                        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white p-1.5 text-xs font-bold text-slate-700 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
                            <div className="flex items-center gap-1.5 px-2 py-1">
                                <i className="bi bi-calendar-event text-blue-600 dark:text-blue-400 text-sm" />
                                <span className="text-slate-500 font-semibold">Período:</span>
                            </div>

                            <select
                                value={dateFilter.mode}
                                onChange={(e) => setDateFilter({ ...dateFilter, mode: e.target.value as DateFilterMode })}
                                className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-800 outline-none cursor-pointer border border-transparent focus:border-blue-500 dark:bg-slate-800 dark:text-slate-100"
                            >
                                <option value="current_month">Mês Atual</option>
                                <option value="previous_month">Mês Anterior</option>
                                <option value="current_year">Este Ano</option>
                                <option value="previous_year">Ano Passado</option>
                                <option value="custom_month">Outro Mês</option>
                                <option value="custom_range">Intervalo Personalizado</option>
                            </select>

                            {dateFilter.mode === 'custom_month' && (
                                <div className="flex items-center gap-1.5 pl-1">
                                    <input
                                        type="month"
                                        required
                                        value={dateFilter.customMonth}
                                        onChange={(e) => {
                                            if (e.target.value) {
                                                setDateFilter({
                                                    ...dateFilter,
                                                    customMonth: e.target.value,
                                                });
                                            }
                                        }}
                                        className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-800 outline-none cursor-pointer border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                                    />
                                </div>
                            )}

                            {dateFilter.mode === 'custom_range' && (
                                <div className="flex items-center gap-2 pl-1">
                                    <div className="flex items-center gap-1">
                                        <span className="text-[11px] text-slate-400">De:</span>
                                        <input
                                            type="month"
                                            required
                                            value={dateFilter.startMonth}
                                            onChange={(e) => {
                                                if (e.target.value) {
                                                    setDateFilter({
                                                        ...dateFilter,
                                                        startMonth: e.target.value,
                                                    });
                                                }
                                            }}
                                            className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-800 outline-none cursor-pointer border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                                        />
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <span className="text-[11px] text-slate-400">Até:</span>
                                        <input
                                            type="month"
                                            required
                                            value={dateFilter.endMonth}
                                            onChange={(e) => {
                                                if (e.target.value) {
                                                    setDateFilter({
                                                        ...dateFilter,
                                                        endMonth: e.target.value,
                                                    });
                                                }
                                            }}
                                            className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-800 outline-none cursor-pointer border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
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
                                    <p className="text-[10px] text-slate-500">CNPJ: {inv.emitterCnpj || 'Não informado'} · Emissão: {formatToBRDate(inv.issuedAt)}</p>
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
