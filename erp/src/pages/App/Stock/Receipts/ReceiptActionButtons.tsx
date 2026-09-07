import React, { useState, useRef, useEffect } from 'react';

interface ReceiptActionButtonsProps {
    onSelectInboundNfe: () => void;
    onSelectPurchaseOrOrder: () => void;
    onSelectManual: () => void;
}

export const ReceiptActionButtons: React.FC<ReceiptActionButtonsProps> = ({
    onSelectInboundNfe,
    onSelectPurchaseOrOrder,
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
        <div className="relative inline-flex flex-wrap items-center gap-2" ref={dropdownRef}>
            {/* Versão expandida para telas médias/grandes */}
            <div className="hidden sm:inline-flex items-center rounded-2xl border border-emerald-500/30 bg-emerald-50/40 p-1 shadow-sm dark:border-emerald-800/40 dark:bg-emerald-950/20">
                <button
                    type="button"
                    onClick={onSelectInboundNfe}
                    className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-black uppercase tracking-wider text-indigo-700 hover:bg-white hover:shadow-sm transition-all dark:text-indigo-300 dark:hover:bg-slate-800"
                    title="Importar dados da NF-e emitida pelo fornecedor via SEFAZ ou arquivo XML"
                >
                    <i className="bi bi-file-earmark-arrow-down-fill text-indigo-600 dark:text-indigo-400" />
                    <span>Nota Fiscal de Entrada</span>
                </button>

                <div className="h-4 w-px bg-slate-200 dark:bg-slate-700" />

                <button
                    type="button"
                    onClick={onSelectPurchaseOrOrder}
                    className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-black uppercase tracking-wider text-blue-700 hover:bg-white hover:shadow-sm transition-all dark:text-blue-300 dark:hover:bg-slate-800"
                    title="Carregar itens a partir de pedidos de compra ou pedidos de venda"
                >
                    <i className="bi bi-cart-check text-blue-600 dark:text-blue-400" />
                    <span>Pedido de Venda / Compra</span>
                </button>

                <div className="h-4 w-px bg-slate-200 dark:bg-slate-700" />

                <button
                    type="button"
                    onClick={onSelectManual}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-black uppercase tracking-wider text-white shadow-sm hover:bg-emerald-700 active:scale-95 transition-all"
                    title="Registrar recebimento inserindo os itens manualmente"
                >
                    <i className="bi bi-pencil-square" />
                    <span>Recebimento Manual</span>
                </button>
            </div>

            {/* Versão Dropdown/Compacta para telas mobile (< 640px) */}
            <div className="sm:hidden relative w-full">
                <button
                    type="button"
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                    className="w-full inline-flex items-center justify-between rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-black uppercase tracking-wider text-white shadow-md hover:bg-emerald-700"
                >
                    <span className="flex items-center gap-2">
                        <i className="bi bi-plus-circle-fill text-sm" />
                        Novo Recebimento
                    </span>
                    <i className={`bi bi-chevron-down transition-transform ${isMenuOpen ? 'rotate-180' : ''}`} />
                </button>

                {isMenuOpen && (
                    <div className="absolute right-0 top-full mt-2 w-full z-50 rounded-2xl border border-slate-100 bg-white p-2 shadow-xl dark:border-slate-800 dark:bg-slate-900 animate-in fade-in">
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
                            onClick={() => { setIsMenuOpen(false); onSelectPurchaseOrOrder(); }}
                            className="flex w-full items-center gap-2.5 rounded-xl p-2.5 text-left text-xs font-bold text-blue-700 hover:bg-blue-50 dark:text-blue-300 dark:hover:bg-slate-800"
                        >
                            <i className="bi bi-cart-check text-base" />
                            <div>
                                <p className="font-black uppercase">Pedido de Venda / Compra</p>
                                <p className="text-[10px] text-slate-400 font-normal">Carrega itens de pedidos</p>
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
