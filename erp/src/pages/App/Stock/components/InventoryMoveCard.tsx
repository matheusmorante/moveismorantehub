import React from "react";
import { Check, PackageMinus, PackagePlus, Scale } from "lucide-react";
import type InventoryMove from "@/pages/types/inventoryMove.type";
import { formatDateTime } from "@/pages/utils/formatters";

interface InventoryMoveCardProps {
    readonly move: InventoryMove;
    readonly cleanObs: string;
    readonly isReversed: boolean;
    readonly isExpanded: boolean;
    readonly isOrderLinked: boolean;
    readonly onToggleExpand: () => void;
    readonly onEdit?: () => void;
    readonly onDelete?: () => void;
}

export const InventoryMoveCard: React.FC<InventoryMoveCardProps> = ({
    move,
    cleanObs,
    isReversed,
    isExpanded,
    isOrderLinked,
    onToggleExpand,
    onEdit,
    onDelete
}) => {
    const isEntry = move.type === 'entry';
    const isExit = move.type === 'withdrawal' || move.type === 'exit';

    const typeBadgeBg = isReversed
        ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-300 dark:border-amber-800/60'
        : isEntry
        ? 'bg-emerald-100/50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400'
        : isExit
        ? 'bg-rose-100/50 text-rose-600 dark:bg-rose-950/20 dark:text-rose-400'
        : 'bg-amber-500/15 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400 border border-amber-500/20';

    const numQuantity = Number(move.quantity);
    const quantityFormatted = isExit
        ? `-${Math.abs(numQuantity)}`
        : isEntry
        ? `+${numQuantity}`
        : numQuantity > 0
        ? `+${numQuantity}`
        : String(numQuantity);

    const quantityColor = isReversed
        ? 'text-slate-400 dark:text-slate-500'
        : isEntry
        ? 'text-emerald-600 dark:text-emerald-400'
        : isExit
        ? 'text-rose-600 dark:text-rose-400'
        : 'text-amber-600 dark:text-amber-400';

    const reasonText = move.reversalReason || (isReversed && typeof move.observation === 'string' && !move.observation.startsWith('{') ? move.observation : '');

    return (
        <div className={`p-4 rounded-2xl border transition-all ${
            isReversed 
                ? 'bg-rose-50/20 dark:bg-rose-950/10 border-rose-100 dark:border-rose-900/30' 
                : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 shadow-2xs'
        }`}>
            {/* Header: Data/Horário + Status + Qtd */}
            <div className="flex items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800/60 pb-3 flex-wrap">
                <div className="flex flex-col">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        {formatDateTime(move.date)}
                    </span>
                    {isReversed && move.reversedAt && (
                        <span className="text-[10px] text-rose-500 font-medium mt-0.5">
                            Estornado em {formatDateTime(move.reversedAt)}
                        </span>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider shrink-0 ${typeBadgeBg}`}>
                        {isEntry ? (
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

                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        isReversed
                            ? 'bg-amber-50 text-amber-700 border border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/50'
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/50'
                    }`}>
                        <i className={`bi ${isReversed ? 'bi-arrow-counterclockwise' : 'bi-check-circle-fill'} text-[10px]`} aria-hidden="true" />
                        {isReversed ? 'Estornada' : 'Efetivada'}
                    </span>

                    <span className={`text-base font-black ${quantityColor}`}>
                        {quantityFormatted} un
                    </span>
                </div>
            </div>

            {/* Conteúdo: Produto */}
            <div className="py-3 flex flex-col gap-2">
                <span className={`font-bold text-sm ${isReversed ? 'text-slate-400 dark:text-slate-500' : 'text-slate-800 dark:text-slate-100'}`}>
                    {move.productName || move.productDescription || 'Produto Desconhecido'}
                </span>

                {/* Container de Observações */}
                {(cleanObs || (isReversed && reasonText)) && (
                    <div className="flex flex-col gap-2 mt-0.5">
                        {/* Rótulo cinza: Observação normal */}
                        {cleanObs && (
                            <div className="text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700/60 p-2.5 rounded-xl flex items-start gap-2">
                                <i className="bi bi-chat-left-text text-xs text-slate-400 mt-0.5 shrink-0" aria-hidden="true" />
                                <div className="break-words flex-1">
                                    <span className="mr-1 font-extrabold text-[10px] uppercase tracking-widest text-slate-500 dark:text-slate-400">Observação:</span>
                                    {cleanObs.length > 90 && !isExpanded ? (
                                        <>
                                            <span>{cleanObs.slice(0, 90)}...</span>
                                            <button 
                                                type="button" 
                                                onClick={onToggleExpand}
                                                aria-expanded={isExpanded}
                                                className="text-blue-500 hover:text-blue-600 font-bold text-xs ml-1.5 underline cursor-pointer"
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
                                                    onClick={onToggleExpand}
                                                    aria-expanded={isExpanded}
                                                    className="text-blue-500 hover:text-blue-600 font-bold text-xs ml-1.5 underline cursor-pointer"
                                                >
                                                    Ler menos
                                                </button>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Rótulo amarelo: Observação do Estorno */}
                        {isReversed && reasonText && (
                            <div className="text-xs font-medium text-amber-900 dark:text-amber-200 bg-amber-50 dark:bg-amber-950/40 p-2.5 rounded-xl border border-amber-200/80 dark:border-amber-800/60 flex items-start gap-2">
                                <i className="bi bi-arrow-counterclockwise text-sm text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" aria-hidden="true" />
                                <div className="break-words flex-1">
                                    <span className="font-extrabold uppercase text-[10px] tracking-widest text-amber-700 dark:text-amber-400 mr-1">Observação:</span>
                                    {reasonText.length > 90 && !isExpanded ? (
                                        <>
                                            <span>{reasonText.slice(0, 90)}...</span>
                                            <button 
                                                type="button" 
                                                onClick={onToggleExpand}
                                                aria-expanded={isExpanded}
                                                className="text-amber-700 hover:text-amber-800 dark:text-amber-300 font-black text-xs ml-1.5 underline cursor-pointer"
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
                                                    onClick={onToggleExpand}
                                                    aria-expanded={isExpanded}
                                                    className="text-amber-700 hover:text-amber-800 dark:text-amber-300 font-black text-xs ml-1.5 underline cursor-pointer"
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

            {/* Footer / Ações */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between">
                <div>
                    {isReversed ? (
                        <span className="text-[10px] font-black text-rose-500 dark:text-rose-400 uppercase tracking-widest flex items-center gap-1">
                            <i className="bi bi-x-circle" aria-hidden="true" /> Sem Efeito
                        </span>
                    ) : isOrderLinked ? (
                        <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 flex items-center gap-1" title="O estorno é realizado pelo status do pedido">
                            <i className="bi bi-lock-fill text-xs" aria-hidden="true" /> Vinculado ao Pedido
                        </span>
                    ) : null}
                </div>

                {!isReversed && !isOrderLinked && (
                    <div className="flex items-center gap-2">
                        {onEdit && (
                            <button
                                type="button"
                                onClick={onEdit}
                                className="px-3 py-1 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                            >
                                <i className="bi bi-pencil text-xs" aria-hidden="true" /> Editar
                            </button>
                        )}
                        {onDelete && (
                            <button
                                type="button"
                                onClick={onDelete}
                                className="px-3 py-1 text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                            >
                                <i className="bi bi-arrow-counterclockwise text-xs" aria-hidden="true" /> Estornar
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default InventoryMoveCard;
