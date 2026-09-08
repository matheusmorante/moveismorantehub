import React, { useState, useRef, useEffect } from 'react';

interface ReceiptActionButtonsProps {
    onSelectInboundNfe: () => void;
    onSelectPurchase: () => void;
    onSelectManual: () => void;
}

export const ReceiptActionButtons: React.FC<ReceiptActionButtonsProps> = ({
    onSelectInboundNfe,
    onSelectPurchase,
    onSelectManual
}) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="relative inline-flex" ref={dropdownRef}>
            <div className="relative w-full sm:w-auto">
                <button
                    type="button"
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                    className="inline-flex w-full items-center justify-between gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-black uppercase tracking-wider text-white shadow-md hover:bg-emerald-700 transition-colors sm:w-auto"
                >
                    <span className="flex items-center gap-2">
                        <i className="bi bi-plus-lg text-sm" />
                        Receber Mercadoria
                    </span>
                    <i className={`bi bi-chevron-down text-[11px] transition-transform ${isMenuOpen ? 'rotate-180' : ''}`} />
                </button>

                {isMenuOpen && (
                    <div className="absolute right-0 top-full z-50 mt-2 w-full min-w-[19rem] rounded-2xl border border-slate-100 bg-white p-2 shadow-xl animate-in fade-in dark:border-slate-800 dark:bg-slate-900 space-y-1">
                        <button
                            type="button"
                            onClick={() => { setIsMenuOpen(false); onSelectManual(); }}
                            className="flex w-full items-center gap-3 rounded-xl p-2.5 text-left text-xs font-bold text-emerald-700 hover:bg-emerald-50 dark:text-emerald-300 dark:hover:bg-slate-800 transition-colors"
                        >
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                                <i className="bi bi-pencil-square text-sm" />
                            </div>
                            <div>
                                <p className="font-black text-slate-800 dark:text-slate-100">Recebimento manual</p>
                                <p className="text-[11px] text-slate-400 font-normal">Registrar os itens manualmente</p>
                            </div>
                        </button>

                        <button
                            type="button"
                            onClick={() => { setIsMenuOpen(false); onSelectInboundNfe(); }}
                            className="flex w-full items-center gap-3 rounded-xl p-2.5 text-left text-xs font-bold text-indigo-700 hover:bg-indigo-50 dark:text-indigo-300 dark:hover:bg-slate-800 transition-colors"
                        >
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
                                <i className="bi bi-file-earmark-arrow-down-fill text-sm" />
                            </div>
                            <div>
                                <p className="font-black text-slate-800 dark:text-slate-100">Por Nota Fiscal de Entrada</p>
                                <p className="text-[11px] text-slate-400 font-normal">Importar/preencher a partir da NF-e</p>
                            </div>
                        </button>

                        <button
                            type="button"
                            onClick={() => { setIsMenuOpen(false); onSelectPurchase(); }}
                            className="flex w-full items-center gap-3 rounded-xl p-2.5 text-left text-xs font-bold text-blue-700 hover:bg-blue-50 dark:text-blue-300 dark:hover:bg-slate-800 transition-colors"
                        >
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
                                <i className="bi bi-cart-check text-sm" />
                            </div>
                            <div>
                                <p className="font-black text-slate-800 dark:text-slate-100">Por Pedido de Compra</p>
                                <p className="text-[11px] text-slate-400 font-normal">Receber itens de um pedido existente</p>
                            </div>
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};
