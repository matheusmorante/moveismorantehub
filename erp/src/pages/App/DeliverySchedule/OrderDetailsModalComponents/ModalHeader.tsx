import React from "react";
import { formatToBRDate } from "../../../utils/formatters";

interface Props {
    reference: string;
    orderDate?: string;
    seller?: string;
    onClose: () => void;
    onEdit?: () => void;
}

const ModalHeader = ({ reference, orderDate, seller, onClose, onEdit }: Props) => (
    <div className="px-5 py-3.5 sm:px-8 sm:py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/70 dark:bg-slate-800/30 transition-colors duration-300 gap-4">
        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            <div className="bg-blue-600 p-2 sm:p-2.5 rounded-xl shadow-md shadow-blue-500/20 shrink-0">
                <i className="bi bi-receipt text-white text-base sm:text-lg" />
            </div>
            <div className="min-w-0">
                <h2 className="text-base sm:text-lg font-black text-slate-800 dark:text-slate-100 tracking-tight leading-tight">
                    Detalhes do Pedido
                </h2>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[10px] uppercase font-black tracking-wider text-slate-400 dark:text-slate-500 mt-0.5">
                    <span>Código: <strong className="text-blue-600 dark:text-blue-400 font-black">{reference}</strong></span>
                    {orderDate && (
                        <>
                            <span className="text-slate-300 dark:text-slate-700 hidden sm:inline">•</span>
                            <span>Data do Pedido: <strong className="text-slate-600 dark:text-slate-300 font-bold">{formatToBRDate(orderDate)}</strong></span>
                        </>
                    )}
                </div>
            </div>
        </div>
        <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
            {seller && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 rounded-xl text-slate-600 dark:text-slate-300 text-xs font-bold">
                    <i className="bi bi-person-badge text-blue-500 text-sm" />
                    <span className="hidden sm:inline text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">Vendedor:</span>
                    <span className="font-extrabold text-slate-700 dark:text-slate-200">{seller}</span>
                </div>
            )}
            {onEdit && (
                <button
                    onClick={onEdit}
                    className="flex items-center gap-1.5 px-3.5 py-2 sm:px-4 sm:py-2 bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-xl transition-all shadow-sm border border-blue-100 dark:border-blue-800 font-black text-[10px] uppercase tracking-wider hover:bg-blue-100 dark:hover:bg-blue-900/60 active:scale-95"
                >
                    <i className="bi bi-pencil-fill text-[11px]" />
                    <span>Editar</span>
                </button>
            )}
            <button
                onClick={onClose}
                className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center bg-white dark:bg-slate-800 hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400 rounded-xl transition-all shadow-sm border border-slate-100 dark:border-slate-700 active:scale-95"
                title="Fechar"
            >
                <i className="bi bi-x-lg text-sm sm:text-base" />
            </button>
        </div>
    </div>
);

export default ModalHeader;
