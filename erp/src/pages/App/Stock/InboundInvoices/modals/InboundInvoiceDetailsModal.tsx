import React, { useEffect } from 'react';
import type { InboundInvoice } from '@/pages/utils/inboundNfe/inboundNfeTypes';
import { formatCurrency, formatToBRDate } from '@/pages/utils/formatters';
import { InboundInvoiceFiscalReview } from '../components/InboundInvoiceFiscalReview';

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

interface InboundInvoiceDetailsModalProps {
    readonly invoice: InboundInvoice | null;
    readonly onClose: () => void;
}

export const InboundInvoiceDetailsModal: React.FC<InboundInvoiceDetailsModalProps> = ({
    invoice,
    onClose
}) => {
    useEffect(() => {
        if (!invoice) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [invoice, onClose]);

    if (!invoice) return null;

    return (
        <div
            className="fixed inset-0 z-[999999] flex items-center justify-center p-3 sm:p-6"
            role="dialog"
            aria-modal="true"
            aria-labelledby="invoice-details-modal-title"
        >
            <button
                type="button"
                aria-label="Fechar"
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm cursor-default"
                onClick={onClose}
            />
            <div className="relative flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-slate-900 animate-in fade-in zoom-in-95 border border-slate-100 dark:border-slate-800">
                <header className="flex items-center justify-between border-b border-slate-100 bg-slate-50/50 px-6 py-4 dark:border-slate-800 dark:bg-slate-950/40">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600/10 text-blue-600">
                            <i className="bi bi-file-earmark-text text-lg" aria-hidden="true" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 id="invoice-details-modal-title" className="text-base font-black text-slate-800 dark:text-slate-100">
                                    NF-e #{invoice.nfeNumber} - Série {invoice.series}
                                </h2>
                                <span className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase ${STATUS_CLASS[invoice.status] ?? 'bg-slate-100 text-slate-500'}`}>
                                    {STATUS_LABEL[invoice.status] ?? invoice.status}
                                </span>
                            </div>
                            <p className="text-[11px] font-mono text-slate-400">
                                {invoice.nfeKey}
                            </p>
                            {invoice.issuedAt && (
                                <p className="text-[11px] text-slate-400">
                                    Emissão: <span className="font-semibold text-slate-600 dark:text-slate-300">{formatToBRDate(invoice.issuedAt)}</span>
                                    {invoice.receivedAt && (
                                        <> · Recebida em: <span className="font-semibold text-slate-600 dark:text-slate-300">{formatToBRDate(invoice.receivedAt)}</span></>
                                    )}
                                </p>
                            )}
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Fechar"
                        className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                        <i className="bi bi-x-lg" aria-hidden="true" />
                    </button>
                </header>

                <div className="flex-1 space-y-4 overflow-y-auto p-6">
                    <div className="grid grid-cols-1 gap-3 rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/40 sm:grid-cols-2">
                        <div>
                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Fornecedor / Emitente</span>
                            <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{invoice.emitterName}</p>
                            <p className="text-xs text-slate-500">CNPJ: {invoice.emitterCnpj}</p>
                        </div>
                        <div>
                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Destinatário</span>
                            <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{invoice.recipientName}</p>
                            <p className="text-xs text-slate-500">CNPJ: {invoice.recipientCnpj}</p>
                        </div>
                    </div>

                    <InboundInvoiceFiscalReview invoice={invoice} />

                    <div className="rounded-2xl border border-slate-100 overflow-hidden dark:border-slate-800">
                        <div className="bg-slate-100/60 px-4 py-2.5 text-xs font-black uppercase tracking-wider text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                            Itens da Nota Fiscal ({(invoice.items ?? []).length})
                        </div>
                        <div className="max-h-64 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                            {(invoice.items ?? []).length === 0 ? (
                                <p className="p-4 text-center text-xs text-slate-400">
                                    Itens não disponíveis para esta nota fiscal.
                                </p>
                            ) : (
                                (invoice.items ?? []).map((item, idx) => (
                                    <div key={idx} className="flex items-center justify-between p-3.5 hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                                        <div className="flex-1 min-w-0 pr-4">
                                            <p className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
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
                                        <div className="text-right shrink-0">
                                            <p className="text-xs font-bold text-slate-800 dark:text-slate-100">
                                                {item.quantity} {item.unit} × {formatCurrency(item.unitCost)}
                                            </p>
                                            <p className="text-xs font-black text-emerald-600 dark:text-emerald-400">
                                                {formatCurrency(item.totalCost)}
                                            </p>
                                            <p className="text-[10px] text-slate-500">
                                                Frete {formatCurrency(item.freightValue || 0)} · IPI {formatCurrency(item.ipiValue || 0)} ({Number(item.ipiPercent || 0).toFixed(2)}%)
                                            </p>
                                            <p className="text-[10px] text-slate-500">
                                                ICMS {formatCurrency(item.icmsValue || 0)} ({Number(item.icmsPercent || 0).toFixed(2)}%) · ST {formatCurrency(item.icmsStValue || 0)}
                                            </p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    <div className="flex justify-between items-center rounded-2xl bg-emerald-50/50 border border-emerald-100 p-4 dark:border-emerald-900/30 dark:bg-emerald-950/20">
                        <div>
                            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Total da Nota Fiscal</span>
                            <p className="text-xs text-slate-500">Produtos: {formatCurrency(invoice.totalProducts)} | Frete: {formatCurrency(invoice.totalFreight)}</p>
                        </div>
                        <span className="text-xl font-black text-emerald-600 dark:text-emerald-400">
                            {formatCurrency(invoice.totalInvoice)}
                        </span>
                    </div>
                </div>

                <footer className="flex items-center justify-end border-t border-slate-100 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-950/40">
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
