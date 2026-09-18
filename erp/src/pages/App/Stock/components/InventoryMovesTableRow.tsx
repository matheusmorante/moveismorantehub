import React from "react"
import { Check, PackageMinus, PackagePlus, RotateCcw, Scale } from "lucide-react"
import type InventoryMove from "@/pages/types/inventoryMove.type"
import { formatDateTime } from "@/pages/utils/formatters"

interface InventoryMovesTableRowProps {
    readonly move: InventoryMove;
    readonly expandedMoveIds: Readonly<Record<string, boolean>>;
    readonly toggleExpand: (moveId: string) => void;
    readonly getCleanObservation: (move: InventoryMove) => string;
    readonly isOrderLinked: (move: InventoryMove) => boolean;
    readonly onEdit?: (move: InventoryMove) => void;
    readonly onDelete?: (move: InventoryMove) => void;
    readonly handleOpenMenu: (e: React.MouseEvent<HTMLButtonElement>, move: InventoryMove) => void;
    readonly activeMove: InventoryMove | null;
}

export const InventoryMovesTableRow: React.FC<InventoryMovesTableRowProps> = ({
    move,
    expandedMoveIds,
    toggleExpand,
    getCleanObservation,
    isOrderLinked,
    onEdit,
    onDelete,
    handleOpenMenu,
    activeMove
}) => {
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
            isReversed ? 'bg-rose-50/20 dark:bg-rose-950/10' 
            : move.type === 'entry' ? 'bg-emerald-50/50 dark:bg-emerald-900/10'
            : isExit ? 'bg-rose-50/50 dark:bg-rose-900/10'
            : 'bg-amber-50/50 dark:bg-amber-900/10'
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
                        <div className="mt-1">
                            {(() => {
                                const finalObs = (isReversed && reasonText)
                                    ? (cleanObs && cleanObs !== reasonText ? `Original: ${cleanObs} | Estorno: ${reasonText}` : reasonText)
                                    : cleanObs;

                                const isAmber = isReversed && reasonText;
                                const bgClass = isAmber 
                                    ? "bg-amber-50 dark:bg-amber-950/40 border-amber-200/80 dark:border-amber-800/60 text-amber-900 dark:text-amber-200" 
                                    : "bg-slate-100 dark:bg-slate-800/70 border-slate-200/80 dark:border-slate-700/60 text-slate-700 dark:text-slate-200";
                                const iconClass = isAmber ? "bi-arrow-counterclockwise text-amber-600 dark:text-amber-400" : "bi-chat-left-text text-slate-400";
                                const labelClass = isAmber ? "text-amber-700 dark:text-amber-400" : "text-slate-500 dark:text-slate-400";

                                return (
                                    <div className={`text-[11px] font-medium border px-2.5 py-1 rounded-xl flex items-start gap-1.5 whitespace-normal leading-relaxed ${bgClass}`}>
                                        <i className={`bi ${iconClass} text-[10px] mt-0.5 shrink-0`} aria-hidden="true" />
                                        <div className="break-words flex-1">
                                            <span className={`mr-1 font-extrabold text-[9px] uppercase tracking-widest ${labelClass}`}>
                                                {isAmber ? 'Motivo/Obs:' : 'Observação:'}
                                            </span>
                                            {finalObs.length > 90 && !isExpanded ? (
                                                <>
                                                    <span>{finalObs.slice(0, 90)}...</span>
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
                                                    <span>{finalObs}</span>
                                                    {finalObs.length > 90 && (
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
                                );
                            })()}
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
                                {isReversed ? (
                                    <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5 items-center justify-center rounded-full bg-rose-500 text-white ring-1 ring-white dark:ring-slate-900 pointer-events-none">
                                        <RotateCcw className="h-1.5 w-1.5 stroke-[3]" />
                                    </span>
                                ) : (
                                    <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5 items-center justify-center rounded-full bg-emerald-700 text-white ring-1 ring-white dark:ring-slate-900 pointer-events-none">
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
                                {isReversed ? (
                                    <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5 items-center justify-center rounded-full bg-rose-500 text-white ring-1 ring-white dark:ring-slate-900 pointer-events-none">
                                        <RotateCcw className="h-1.5 w-1.5 stroke-[3]" />
                                    </span>
                                ) : (
                                    <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5 items-center justify-center rounded-full bg-emerald-700 text-white ring-1 ring-white dark:ring-slate-900 pointer-events-none">
                                        <Check className="h-1.5 w-1.5 stroke-[3]" />
                                    </span>
                                )}
                            </span>
                            Saída
                        </>
                    ) : (
                        <>
                            <span className="relative inline-flex items-center">
                                <Scale className="h-3 w-3 shrink-0" aria-hidden="true" />
                                {isReversed ? (
                                    <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5 items-center justify-center rounded-full bg-rose-500 text-white ring-1 ring-white dark:ring-slate-900 pointer-events-none">
                                        <RotateCcw className="h-1.5 w-1.5 stroke-[3]" />
                                    </span>
                                ) : (
                                    <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5 items-center justify-center rounded-full bg-emerald-700 text-white ring-1 ring-white dark:ring-slate-900 pointer-events-none">
                                        <Check className="h-1.5 w-1.5 stroke-[3]" />
                                    </span>
                                )}
                            </span> Ajuste
                        </>
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
            
            {(onEdit || onDelete) && (
                <td className="px-6 py-3.5 text-right">
                    {!isReversed && !isOrderLinked(move) && (
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
};
