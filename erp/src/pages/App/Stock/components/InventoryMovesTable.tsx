import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Check, PackageMinus, PackagePlus, Scale } from "lucide-react";
import type InventoryMove from "@/pages/types/inventoryMove.type";
import { formatDateTime } from "@/pages/utils/formatters";

interface InventoryMovesTableProps {
    readonly moves: readonly InventoryMove[];
    readonly expandedMoveIds: Readonly<Record<string, boolean>>;
    readonly toggleExpand: (moveId: string) => void;
    readonly getCleanObservation: (move: InventoryMove) => string;
    readonly isOrderLinked: (move: InventoryMove) => boolean;
    readonly onEdit?: (move: InventoryMove) => void;
    readonly onDelete?: (move: InventoryMove) => void;
}

export const InventoryMovesTable: React.FC<InventoryMovesTableProps> = ({
    moves,
    expandedMoveIds,
    toggleExpand,
    getCleanObservation,
    isOrderLinked,
    onEdit,
    onDelete
}) => {
    const [activeMove, setActiveMove] = useState<InventoryMove | null>(null);
    const [menuPos, setMenuPos] = useState<{ top?: number; bottom?: number; right: number } | null>(null);

    useEffect(() => {
        if (!activeMove) return;
        const handleClose = () => {
            setActiveMove(null);
            setMenuPos(null);
        };
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') handleClose();
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('scroll', handleClose, true);
        window.addEventListener('resize', handleClose);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('scroll', handleClose, true);
            window.removeEventListener('resize', handleClose);
        };
    }, [activeMove]);

    const handleOpenMenu = (e: React.MouseEvent<HTMLButtonElement>, move: InventoryMove) => {
        e.stopPropagation();
        if (activeMove?.id === move.id) {
            setActiveMove(null);
            setMenuPos(null);
            return;
        }
        const rect = e.currentTarget.getBoundingClientRect();
        const spaceBelow = window.innerHeight - rect.bottom;
        if (spaceBelow < 150) {
            setMenuPos({ bottom: window.innerHeight - rect.top + 4, right: window.innerWidth - rect.right });
        } else {
            setMenuPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
        }
        setActiveMove(move);
    };

    return (
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm overflow-x-auto overflow-y-auto max-h-[calc(100vh-230px)] custom-scrollbar">
            <table className="w-full text-left border-collapse whitespace-nowrap">
                <thead>
                    <tr className="bg-slate-50/50 dark:bg-slate-955/50 border-b border-slate-100 dark:border-slate-800/50">
                        <th scope="col" className="px-5 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Data e Horário</th>
                        <th scope="col" className="px-5 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Produto e Detalhes</th>
                        <th scope="col" className="px-5 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Tipo</th>
                        <th scope="col" className="px-5 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Status</th>
                        <th scope="col" className="px-5 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Qtd.</th>
                        {(onEdit || onDelete) && (
                            <th scope="col" className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Ações</th>
                        )}
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-800/40">
                    {moves.map((move) => {
                        const isReversed = move.status === 'reversed' || move.status === 'cancelled';
                        const cleanObs = getCleanObservation(move);
                        const isExpanded = Boolean(move.id && expandedMoveIds[move.id]);
                        const reasonText = move.reversalReason || (isReversed && typeof move.observation === 'string' && !move.observation.startsWith('{') ? move.observation : '');

                        const numQuantity = Number(move.quantity);
                        const isExit = move.type === 'withdrawal' || move.type === 'exit';
                        const quantityFormatted = isExit
                            ? `-${Math.abs(numQuantity)}` 
                            : move.type === 'entry' 
                            ? `+${numQuantity}` 
                            : (numQuantity > 0 ? `+${numQuantity}` : numQuantity);

                        return (
                            <tr key={move.id} className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition-colors ${
                                isReversed ? 'bg-rose-50/20 dark:bg-rose-950/10' : ''
                            }`}>
                                <td className="px-5 py-3.5 text-xs font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap">
                                    <div>{formatDateTime(move.date)}</div>
                                    {isReversed && move.reversedAt && (
                                        <div className="text-[10px] text-rose-500 font-normal">
                                            Estornado em {formatDateTime(move.reversedAt)}
                                        </div>
                                    )}
                                </td>
                                <td className="px-5 py-3.5">
                                    <div className="flex flex-col gap-0.5 max-w-xl">
                                        <span className={`font-bold text-xs ${isReversed ? 'text-slate-400 dark:text-slate-500' : 'text-slate-800 dark:text-slate-200'}`}>
                                            {move.productName || move.productDescription || 'Produto Desconhecido'}
                                        </span>

                                        {(cleanObs || (isReversed && reasonText)) && (
                                            <div className="flex flex-col gap-1.5 mt-1">
                                                {cleanObs && (
                                                    <div className="text-[11px] font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700/60 px-2.5 py-1 rounded-xl flex items-start gap-1.5 whitespace-normal leading-relaxed">
                                                        <i className="bi bi-chat-left-text text-[10px] text-slate-400 mt-0.5 shrink-0" aria-hidden="true" />
                                                        <div className="break-words flex-1">
                                                            <span className="mr-1 font-extrabold text-[9px] uppercase tracking-widest text-slate-500 dark:text-slate-400">Observação:</span>
                                                            {cleanObs.length > 90 && !isExpanded ? (
                                                                <>
                                                                    <span>{cleanObs.slice(0, 90)}...</span>
                                                                    <button 
                                                                        type="button" 
                                                                        onClick={() => {
                                                                            if (move.id) toggleExpand(move.id);
                                                                        }} 
                                                                        aria-expanded={isExpanded}
                                                                        className="text-blue-500 hover:text-blue-600 font-bold text-[10px] ml-1 underline cursor-pointer"
                                                                    >
                                                                        Ler mais
                                                                    </button>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <span>{cleanObs}</span>
                                                                    {cleanObs.length > 90 && (
                                                                        <button 
                                                                            type="button" 
                                                                            onClick={() => {
                                                                            if (move.id) toggleExpand(move.id);
                                                                        }} 
                                                                        aria-expanded={isExpanded}
                                                                        className="text-blue-500 hover:text-blue-600 font-bold text-[10px] ml-1 underline cursor-pointer"
                                                                    >
                                                                        Ler menos
                                                                    </button>
                                                                )}
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            )}

                                            {isReversed && reasonText && (
                                                <div className="text-[11px] font-medium text-amber-900 dark:text-amber-200 bg-amber-50 dark:bg-amber-950/40 px-2.5 py-1 rounded-xl border border-amber-200/80 dark:border-amber-800/60 flex items-start gap-1.5 whitespace-normal leading-relaxed">
                                                    <i className="bi bi-arrow-counterclockwise text-[11px] text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" aria-hidden="true" />
                                                    <div className="break-words flex-1">
                                                        <span className="font-extrabold uppercase text-[9px] tracking-widest text-amber-700 dark:text-amber-400 mr-1">Observação:</span>
                                                        {reasonText.length > 90 && !isExpanded ? (
                                                            <>
                                                                <span>{reasonText.slice(0, 90)}...</span>
                                                                <button 
                                                                    type="button" 
                                                                    onClick={() => {
                                                                        if (move.id) toggleExpand(move.id);
                                                                    }} 
                                                                    aria-expanded={isExpanded}
                                                                    className="text-amber-700 hover:text-amber-800 dark:text-amber-300 font-black text-[10px] ml-1 underline cursor-pointer"
                                                                >
                                                                    Ler mais
                                                                </button>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <span>{reasonText}</span>
                                                                {reasonText.length > 90 && (
                                                                    <button 
                                                                        type="button" 
                                                                        onClick={() => {
                                                                            if (move.id) toggleExpand(move.id);
                                                                        }} 
                                                                        aria-expanded={isExpanded}
                                                                        className="text-amber-700 hover:text-amber-800 dark:text-amber-300 font-black text-[10px] ml-1 underline cursor-pointer"
                                                                    >
                                                                        Ler menos
                                                                    </button>
                                                                )}
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                    </div>
                                </td>
                                <td className="px-5 py-3.5">
                                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                                        isReversed 
                                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-300 dark:border-amber-800/60' 
                                            : move.type === 'entry' 
                                            ? 'bg-emerald-100/50 text-emerald-600 dark:bg-emerald-955/20 dark:text-emerald-400' 
                                            : isExit 
                                            ? 'bg-rose-100/50 text-rose-600 dark:bg-rose-955/20 dark:text-rose-400' 
                                            : 'bg-amber-500/15 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400 border border-amber-500/20'
                                    }`}>
                                        {move.type === 'entry' ? (
                                            <>
                                                <span className="relative inline-flex items-center">
                                                    <PackagePlus className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                                                    {!isReversed && (
                                                        <span className="absolute -top-1 -right-1 flex h-2 w-2 items-center justify-center rounded-full bg-emerald-700 text-white ring-1 ring-white dark:ring-slate-900 pointer-events-none">
                                                            <Check className="h-1.5 w-1.5 stroke-[3]" />
                                                        </span>
                                                    )}
                                                </span>
                                                Entrada
                                            </>
                                        ) : isExit ? (
                                            <>
                                                <span className="relative inline-flex items-center">
                                                    <PackageMinus className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                                                    {!isReversed && (
                                                        <span className="absolute -top-1 -right-1 flex h-2 w-2 items-center justify-center rounded-full bg-emerald-700 text-white ring-1 ring-white dark:ring-slate-900 pointer-events-none">
                                                            <Check className="h-1.5 w-1.5 stroke-[3]" />
                                                        </span>
                                                    )}
                                                </span>
                                                Saída
                                            </>
                                        ) : (
                                            <><Scale className="h-3 w-3 shrink-0" aria-hidden="true" /> Ajuste</>
                                        )}
                                    </span>
                                </td>
                                <td className="px-5 py-3.5 text-center">
                                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                        isReversed
                                            ? 'bg-amber-50 text-amber-700 border border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/50'
                                            : 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/50'
                                    }`}>
                                        <i className={`bi ${isReversed ? 'bi-arrow-counterclockwise' : 'bi-check-circle-fill'} text-[10px]`} aria-hidden="true" />
                                        {isReversed ? 'Estornada' : 'Efetivada'}
                                    </span>
                                </td>
                                <td className={`px-5 py-3.5 font-black text-xs text-center ${
                                    isReversed ? 'text-slate-400 dark:text-slate-500' :
                                    move.type === 'entry' ? 'text-emerald-600 dark:text-emerald-400' :
                                    isExit ? 'text-rose-600 dark:text-rose-400' :
                                    'text-amber-600 dark:text-amber-400'
                                }`}>
                                    {quantityFormatted}
                                </td>
                                <td className="px-6 py-4 text-right">
                                    {isReversed ? (
                                        <span className="text-[9px] font-black text-rose-500 dark:text-rose-400 uppercase tracking-widest select-none flex items-center justify-end gap-1">
                                            <i className="bi bi-x-circle" aria-hidden="true" /> Sem Efeito
                                        </span>
                                    ) : null}
                                </td>

                                {(onEdit || onDelete) && (
                                    <td className="px-6 py-3.5 text-right">
                                        {isOrderLinked(move) ? (
                                            <span className="inline-flex rounded-xl p-2 text-slate-300 dark:text-slate-600" title="Movimentação vinculada ao pedido: o estorno é realizado pela alteração de status do pedido">
                                                <i className="bi bi-lock-fill" aria-hidden="true" />
                                            </span>
                                        ) : (
                                            <button 
                                                type="button" 
                                                onClick={(e) => handleOpenMenu(e, move)}
                                                className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
                                                title="Mais Ações"
                                                aria-label="Mais Ações"
                                                aria-haspopup="true"
                                                aria-expanded={activeMove?.id === move.id}
                                            >
                                                <i className="bi bi-three-dots-vertical text-sm" aria-hidden="true" />
                                            </button>
                                        )}
                                    </td>
                                )}
                            </tr>
                        );
                    })}
                </tbody>
            </table>

            {activeMove && menuPos && typeof document !== 'undefined' && createPortal(
                <>
                    <button 
                        type="button"
                        aria-label="Fechar menu"
                        className="fixed inset-0 z-[99998] cursor-default bg-transparent"
                        onClick={(e) => {
                            e.stopPropagation();
                            setActiveMove(null);
                            setMenuPos(null);
                        }} 
                    />
                    <div 
                        role="menu"
                        aria-label="Ações da movimentação"
                        className="fixed w-36 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-2xl py-1.5 z-[99999] animate-in fade-in zoom-in-95 duration-100"
                        style={{ 
                            top: menuPos.top !== undefined ? `${menuPos.top}px` : 'auto', 
                            bottom: menuPos.bottom !== undefined ? `${menuPos.bottom}px` : 'auto', 
                            right: `${menuPos.right}px` 
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {onEdit && (
                            <button
                                type="button"
                                role="menuitem"
                                onClick={() => {
                                    onEdit(activeMove);
                                    setActiveMove(null);
                                    setMenuPos(null);
                                }}
                                className="w-full px-3.5 py-2 text-left text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/60 flex items-center gap-2 transition-colors cursor-pointer"
                            >
                                <i className="bi bi-pencil text-slate-400 text-xs" aria-hidden="true" />
                                Editar
                            </button>
                        )}
                        {onDelete && (
                            <button
                                type="button"
                                role="menuitem"
                                onClick={() => {
                                    onDelete(activeMove);
                                    setActiveMove(null);
                                    setMenuPos(null);
                                }}
                                className="w-full px-3.5 py-2 text-left text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 flex items-center gap-2 transition-colors cursor-pointer"
                            >
                                <i className="bi bi-arrow-counterclockwise text-xs" aria-hidden="true" />
                                Estornar
                            </button>
                        )}
                    </div>
                </>,
                document.body
            )}
        </div>
    );
};

export default InventoryMovesTable;
