import React from 'react';
import { InboundInvoice } from '@/pages/utils/inboundNfe/inboundNfeTypes';
import { formatCurrency } from '@/pages/utils/formatters';

interface InboundPostImportActionModalProps {
    readonly isOpen: boolean;
    readonly invoice: InboundInvoice | null;
    readonly onClose: () => void;
    readonly onManageMappings: () => void;
}

export const InboundPostImportActionModal: React.FC<InboundPostImportActionModalProps> = ({
    isOpen,
    invoice,
    onClose,
    onManageMappings,
}) => {
    if (!isOpen || !invoice) return null;

    const itemsCount = invoice.items?.length || 0;
    const totalValue = invoice.totalInvoice || 0;
    const supplierName = invoice.emitterTradeName || invoice.emitterName || 'Fornecedor';

    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="post-import-title"
            className="fixed inset-0 z-[1000003] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in"
        >
            <div
                className="relative w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl border border-slate-100 dark:bg-slate-900 dark:border-slate-800 animate-in zoom-in-95 duration-150"
            >
                {/* Ícone de Sucesso */}
                <div className="flex flex-col items-center text-center">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 mb-3 shadow-inner">
                        <i className="bi bi-check-circle-fill text-3xl" aria-hidden="true" />
                    </div>

                    <h2 id="post-import-title" className="text-lg font-black text-slate-800 dark:text-slate-100">
                        Nota Fiscal Adicionada!
                    </h2>

                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        A nota fiscal foi salva no sistema com sucesso.
                    </p>
                </div>

                {/* Resumo da Nota */}
                <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-950/50 space-y-2 text-xs">
                    <div className="flex justify-between items-center text-slate-700 dark:text-slate-200">
                        <span className="text-slate-400 uppercase font-black tracking-wider text-[10px]">NF-e</span>
                        <span className="font-mono font-black">#{invoice.nfeNumber || '—'} · Série {invoice.series || '1'}</span>
                    </div>
                    <div className="flex justify-between items-center text-slate-700 dark:text-slate-200">
                        <span className="text-slate-400 uppercase font-black tracking-wider text-[10px]">Fornecedor</span>
                        <span className="font-bold truncate max-w-[200px]" title={supplierName}>{supplierName}</span>
                    </div>
                    <div className="flex justify-between items-center text-slate-700 dark:text-slate-200">
                        <span className="text-slate-400 uppercase font-black tracking-wider text-[10px]">Total</span>
                        <span className="font-mono font-black text-emerald-600 dark:text-emerald-400">{formatCurrency(totalValue)}</span>
                    </div>
                    <div className="flex justify-between items-center text-slate-700 dark:text-slate-200">
                        <span className="text-slate-400 uppercase font-black tracking-wider text-[10px]">Itens</span>
                        <span className="font-bold">{itemsCount} {itemsCount === 1 ? 'item' : 'itens'}</span>
                    </div>
                </div>

                {/* Pergunta de Gerenciamento de Vínculos */}
                <div className="mt-4 text-center px-1">
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-200">
                        Deseja gerenciar os vínculos dos produtos desta nota fiscal agora?
                    </p>
                    <p className="mt-0.5 text-[11px] text-slate-400">
                        Vincule os produtos do fornecedor aos itens do catálogo para dar entrada no estoque.
                    </p>
                </div>

                {/* Ações */}
                <footer className="mt-6 flex flex-col sm:flex-row-reverse gap-2.5">
                    <button
                        type="button"
                        onClick={onManageMappings}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-black uppercase tracking-wider text-white shadow-md hover:bg-blue-700 active:scale-[0.98] transition-all cursor-pointer flex-1"
                    >
                        <i className="bi bi-link-45deg text-sm" aria-hidden="true" />
                        Gerenciar vínculos
                    </button>
                    <button
                        type="button"
                        onClick={onClose}
                        className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                    >
                        Só fechar
                    </button>
                </footer>
            </div>
        </div>
    );
};

export default InboundPostImportActionModal;
