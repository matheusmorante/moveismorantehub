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
                    className="inline-flex w-full items-center justify-between rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-black uppercase tracking-wider text-white shadow-md hover:bg-emerald-700 sm:w-auto"
                >
                    <span className="flex items-center gap-2">
                        <i className="bi bi-plus-circle-fill text-sm" />
                        Novo Recebimento
                    </span>
                    <i className={`bi bi-chevron-down transition-transform ${isMenuOpen ? 'rotate-180' : ''}`} />
                </button>

                {isMenuOpen && (
                    <div className="absolute right-0 top-full z-50 mt-2 w-full min-w-[18rem] rounded-2xl border border-slate-100 bg-white p-2 shadow-xl animate-in fade-in dark:border-slate-800 dark:bg-slate-900">
                        <button
                            type="button"
                            onClick={() => { setIsMenuOpen(false); onSelectInboundNfe(); }}
                            className="flex w-full items-center gap-2.5 rounded-xl p-2.5 text-left text-xs font-bold text-indigo-700 hover:bg-indigo-50 dark:text-indigo-300 dark:hover:bg-slate-800"
                        >
                            <i className="bi bi-file-earmark-arrow-down-fill text-base" />
                            <div>
                                <p className="font-black uppercase">Nota Fiscal de Entrada</p>
                                <p className="text-[10px] text-slate-400 font-normal">Puxa da SEFAZ ou arquivo XML</p>
                            </div>
                        </button>

                        <button
                            type="button"
                            onClick={() => { setIsMenuOpen(false); onSelectPurchase(); }}
                            className="flex w-full items-center gap-2.5 rounded-xl p-2.5 text-left text-xs font-bold text-blue-700 hover:bg-blue-50 dark:text-blue-300 dark:hover:bg-slate-800"
                        >
                            <i className="bi bi-cart-check text-base" />
                            <div>
                                <p className="font-black uppercase">Pedido de Compra</p>
                                <p className="text-[10px] text-slate-400 font-normal">Preenche itens e valores do pedido de compra</p>
                            </div>
                        </button>

                        <button
                            type="button"
                            onClick={() => { setIsMenuOpen(false); onSelectManual(); }}
                            className="flex w-full items-center gap-2.5 rounded-xl p-2.5 text-left text-xs font-bold text-emerald-700 hover:bg-emerald-50 dark:text-emerald-300 dark:hover:bg-slate-800"
                        >
                            <i className="bi bi-pencil-square text-base" />
                            <div>
                                <p className="font-black uppercase">Recebimento Manual</p>
                                <p className="text-[10px] text-slate-400 font-normal">Digitação manual dos itens</p>
                            </div>
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};
