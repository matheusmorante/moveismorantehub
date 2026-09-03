import React from "react";
import InventoryMove from "../../../types/inventoryMove.type";
import { formatDateTime } from "../../../utils/formatters";

interface InventoryMoveCardProps {
    move: InventoryMove;
    cleanObs: string;
    isReversed: boolean;
    isExpanded: boolean;
    isOrderLinked: boolean;
    onToggleExpand: () => void;
    onEdit?: () => void;
    onDelete?: () => void;
}

const InventoryMoveCard: React.FC<InventoryMoveCardProps> = ({
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

    const quantityFormatted = isExit
        ? `-${Math.abs(move.quantity)}`
        : isEntry
        ? `+${move.quantity}`
        : Number(move.quantity) > 0
        ? `+${move.quantity}`
        : String(move.quantity);

    const quantityColor = isReversed
        ? 'text-slate-400 dark:text-slate-500 line-through'
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
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        isReversed
                            ? 'bg-amber-50 text-amber-700 border border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/50'
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/50'
                    }`}>
                        <i className={`bi ${isReversed ? 'bi-arrow-counterclockwise' : 'bi-check-circle-fill'} text-[10px]`}></i>
                        {isReversed ? 'Estornada' : 'Efetivada'}
                    </span>

                    <span className={`text-base font-black ${quantityColor}`}>
                        {quantityFormatted} un
                    </span>
                </div>
            </div>

            {/* Conteúdo: Produto e Tipo */}
            <div className="py-3 flex flex-col gap-2">
                <div className="flex items-center justify-between gap-2">
                    <span className={`font-bold text-sm ${isReversed ? 'line-through text-slate-400 dark:text-slate-500' : 'text-slate-800 dark:text-slate-100'}`}>
                        {move.productName || move.productDescription || 'Produto Desconhecido'}
                    </span>

                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider shrink-0 ${typeBadgeBg}`}>
                        {isEntry ? (
                            <><i className="bi bi-box-arrow-up text-xs"></i> Entrada</>
                        ) : isExit ? (
                            <><i className="bi bi-box-arrow-down text-xs"></i> Saída</>
                        ) : (
                            <><span className="inline-flex items-center gap-0.5"><i className="bi bi-box-seam text-xs"></i><i className="bi bi-wrench text-[9px]"></i></span> Ajuste</>
                        )}
                    </span>
                </div>

                {/* Motivo da criação */}
                {cleanObs && (
                    <div className="text-xs font-medium text-slate-600 dark:text-slate-300 flex items-start gap-2 bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800/50">
                        <i className="bi bi-chat-left-text text-xs text-slate-400 mt-0.5 shrink-0"></i>
                        <div className="break-words flex-1">
                            <span className="mr-1 font-extrabold text-[10px] uppercase tracking-widest text-slate-500 dark:text-slate-400">Motivo da movimentação:</span>
                            {cleanObs.length > 90 && !isExpanded ? (
                                <>
                                    <span>{cleanObs.slice(0, 90)}...</span>
                                    <button 
                                        type="button" 
                                        onClick={onToggleExpand} 
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

                {/* Motivo do Estorno */}
                {isReversed && reasonText && (
                    <div className="text-xs font-bold text-rose-700 dark:text-rose-300 flex items-start gap-2 bg-rose-50/90 dark:bg-rose-950/40 p-2.5 rounded-xl border border-rose-200/70 dark:border-rose-900/50">
                        <i className="bi bi-arrow-counterclockwise text-sm text-rose-500 mt-0.5 shrink-0"></i>
                        <div className="break-words flex-1">
                            <span className="font-extrabold uppercase text-[10px] tracking-widest text-rose-500 dark:text-rose-400 mr-1">Motivo do estorno:</span>
                            {reasonText.length > 90 && !isExpanded ? (
                                <>
                                    <span>{reasonText.slice(0, 90)}...</span>
                                    <button 
                                        type="button" 
                                        onClick={onToggleExpand} 
                                        className="text-rose-600 hover:text-rose-700 dark:text-rose-300 font-black text-xs ml-1.5 underline cursor-pointer"
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
                                            className="text-rose-600 hover:text-rose-700 dark:text-rose-300 font-black text-xs ml-1.5 underline cursor-pointer"
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

            {/* Footer / Ações */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between">
                <div>
                    {isReversed ? (
                        <span className="text-[10px] font-black text-rose-500 dark:text-rose-400 uppercase tracking-widest flex items-center gap-1">
                            <i className="bi bi-x-circle"></i> Sem Efeito
                        </span>
                    ) : isOrderLinked ? (
                        <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 flex items-center gap-1" title="O estorno é realizado pelo status do pedido">
                            <i className="bi bi-lock-fill text-xs"></i> Vinculado ao Pedido
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
                                <i className="bi bi-pencil text-xs"></i> Editar
                            </button>
                        )}
                        {onDelete && (
                            <button
                                type="button"
                                onClick={onDelete}
                                className="px-3 py-1 text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                            >
                                <i className="bi bi-arrow-counterclockwise text-xs"></i> Estornar
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default InventoryMoveCard;
