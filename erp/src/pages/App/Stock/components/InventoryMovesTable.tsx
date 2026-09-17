import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Check, PackageMinus, PackagePlus, Scale } from "lucide-react";
import type InventoryMove from "@/pages/types/inventoryMove.type";
import { formatDateTime } from "@/pages/utils/formatters";
import { InventoryMovesTableRow } from "./InventoryMovesTableRow";

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
                        return (
                            <InventoryMovesTableRow 
                                key={move.id}
                                move={move}
                                expandedMoveIds={expandedMoveIds}
                                toggleExpand={toggleExpand}
                                getCleanObservation={getCleanObservation}
                                isOrderLinked={isOrderLinked}
                                onEdit={onEdit}
                                onDelete={onDelete}
                                handleOpenMenu={handleOpenMenu}
                                activeMove={activeMove}
                            />
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
