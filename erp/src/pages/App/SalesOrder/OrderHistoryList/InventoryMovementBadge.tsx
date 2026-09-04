import React, { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { Package, PackageCheck, PackageX, X } from "lucide-react";
import type Order from "../../../types/order.type";
import { isPartialSaleStockMovement } from "../../../utils/saleInventoryRules";
import { binaryOrderBadgeClass } from "./orderBadgeStyles";

type Props = { 
    orderType?: string; 
    hasMovement: boolean; 
    isReversed?: boolean; 
    isPartial?: boolean;
    order?: Order;
};

const InventoryMovementBadge = ({ orderType, hasMovement, isReversed, isPartial, order }: Props) => {
    const [isOpen, setIsOpen] = useState(false);
    const [coords, setCoords] = useState<{ top: number; left: number; placement: 'top' | 'bottom' } | null>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const hoverTimerRef = useRef<NodeJS.Timeout | null>(null);
    const closeTimerRef = useRef<NodeJS.Timeout | null>(null);

    const resolvedOrderType = orderType || order?.orderType;
    const isReturn = resolvedOrderType === 'return';

    // Determina se a movimentação é parcial (apenas parte dos itens tiveram saída/entrada)
    const isPartialMovement = isPartial ?? (order?.isPartialStockProcessed ?? (order ? isPartialSaleStockMovement(order) : false));

    const title = isReversed
        ? (isReturn ? 'Entrada de estoque estornada' : 'Saída de estoque estornada')
        : isPartialMovement && hasMovement
        ? (isReturn ? 'Entrada parcial de estoque registrada' : 'Saída parcial de estoque (apenas alguns itens geraram saída)')
        : isReturn
        ? (hasMovement ? 'Entrada de estoque registrada pela devolução' : 'Entrada de estoque ainda não registrada')
        : (hasMovement ? 'Saída de estoque registrada pela venda' : 'Saída de estoque ainda não registrada');

    const explanation = isReversed
        ? (isReturn
            ? 'A entrada de estoque vinculada a esta devolução foi estornada / cancelada.'
            : 'A saída de estoque vinculada a esta venda foi estornada (ex: cancelamento do pedido).')
        : isPartialMovement && hasMovement
        ? (isReturn
            ? 'Esta devolução teve entrada de estoque registrada para apenas parte dos itens devolvidos.'
            : 'Apenas alguns itens deste pedido tiveram movimentação de saída de estoque gerada. Itens sem cadastro (temporários) ou itens que não geraram movimentação deixam o status de movimentação parcial.')
        : isReturn
        ? (hasMovement
            ? 'Esta devolução possui uma entrada de estoque vinculada e efetiva. A entrada foi criada quando a devolução foi atendida.'
            : 'Ainda não há entrada de estoque vinculada a esta devolução. O selo só ficará verde depois que uma entrada real for registrada para os itens devolvidos.')
        : (hasMovement
            ? 'Este pedido possui uma saída de estoque vinculada e efetiva para todos os itens vendidos.'
            : 'Ainda não há saída de estoque vinculada a este pedido. Alterar o status do pedido, por si só, não deixa este selo verde.');

    // Cor do badge:
    // - Se estornada: vermelho
    // - Se parcial com saída/entrada: amarelo com borda e texto branco
    // - Se completo com saída/entrada: verde
    // - Se sem movimentação: cinza
    const badgeColorClass = isReversed
        ? 'border-red-700 bg-red-600 text-white hover:bg-red-700'
        : isPartialMovement && hasMovement
        ? 'border-amber-600 bg-amber-500 text-white hover:bg-amber-600 dark:border-amber-700 dark:bg-amber-600 shadow-sm'
        : binaryOrderBadgeClass(hasMovement);

    const updatePosition = useCallback(() => {
        if (!buttonRef.current) return;
        const rect = buttonRef.current.getBoundingClientRect();
        const popoverWidth = 288; // ~w-72
        const popoverHeight = 160;

        // Calcula se cabe abaixo ou deve abrir acima
        const spaceBelow = window.innerHeight - rect.bottom;
        const placement = spaceBelow < popoverHeight + 20 && rect.top > popoverHeight + 20 ? 'top' : 'bottom';

        const top = placement === 'bottom' ? rect.bottom + 6 : rect.top - popoverHeight - 6;
        let left = rect.left + rect.width / 2 - popoverWidth / 2;

        // Evita estourar os limites da tela
        left = Math.max(12, Math.min(window.innerWidth - popoverWidth - 12, left));

        setCoords({ top, left, placement });
    }, []);

    const handleMouseEnter = () => {
        if (closeTimerRef.current) {
            clearTimeout(closeTimerRef.current);
            closeTimerRef.current = null;
        }
        if (hoverTimerRef.current) {
            clearTimeout(hoverTimerRef.current);
        }
        // Delay de 500ms para abrir ao repousar o mouse
        hoverTimerRef.current = setTimeout(() => {
            updatePosition();
            setIsOpen(true);
        }, 500);
    };

    const handleMouseLeave = () => {
        if (hoverTimerRef.current) {
            clearTimeout(hoverTimerRef.current);
            hoverTimerRef.current = null;
        }
        // Delay breve para fechar ao tirar o mouse
        closeTimerRef.current = setTimeout(() => {
            setIsOpen(false);
        }, 200);
    };

    const handleClick = (event: React.MouseEvent) => {
        event.stopPropagation();
        if (hoverTimerRef.current) {
            clearTimeout(hoverTimerRef.current);
            hoverTimerRef.current = null;
        }
        if (!isOpen) {
            updatePosition();
            setIsOpen(true);
        } else {
            setIsOpen(false);
        }
    };

    useEffect(() => {
        if (!isOpen) return;
        const handleScrollOrResize = () => updatePosition();
        window.addEventListener('scroll', handleScrollOrResize, true);
        window.addEventListener('resize', handleScrollOrResize);
        return () => {
            window.removeEventListener('scroll', handleScrollOrResize, true);
            window.removeEventListener('resize', handleScrollOrResize);
        };
    }, [isOpen, updatePosition]);

    useEffect(() => {
        return () => {
            if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
            if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
        };
    }, []);

    return (
        <div className="relative inline-flex items-center">
            <button
                ref={buttonRef}
                type="button"
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
                onClick={handleClick}
                className={`flex h-6 w-6 items-center justify-center rounded-md border shadow-sm transition-all active:scale-95 ${badgeColorClass}`}
                title={title}
                aria-label={title}
            >
                {isReversed ? (
                    <PackageX className="h-3.5 w-3.5" />
                ) : hasMovement ? (
                    <PackageCheck className="h-3.5 w-3.5" />
                ) : (
                    <Package className="h-3.5 w-3.5" />
                )}
            </button>

            {isOpen && coords && typeof document !== 'undefined' && createPortal(
                <div
                    style={{ position: 'fixed', top: `${coords.top}px`, left: `${coords.left}px` }}
                    className="z-[9999] w-72 sm:w-80 rounded-2xl border border-slate-200/90 dark:border-slate-700/80 bg-white/95 dark:bg-slate-900/95 p-4 shadow-2xl backdrop-blur-md animate-in fade-in zoom-in-95 duration-150 pointer-events-auto"
                    onMouseEnter={() => {
                        if (closeTimerRef.current) {
                            clearTimeout(closeTimerRef.current);
                            closeTimerRef.current = null;
                        }
                    }}
                    onMouseLeave={handleMouseLeave}
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="flex items-start justify-between gap-2.5">
                        <div className="flex items-center gap-2.5">
                            <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${badgeColorClass}`}>
                                {isReversed ? (
                                    <PackageX className="h-4 w-4" />
                                ) : hasMovement ? (
                                    <PackageCheck className="h-4 w-4" />
                                ) : (
                                    <Package className="h-4 w-4" />
                                )}
                            </div>
                            <div>
                                <h4 className="text-xs font-black tracking-tight text-slate-800 dark:text-slate-100">
                                    {isReturn ? 'Estoque (Devolução)' : 'Estoque (Venda)'}
                                </h4>
                                <span className={`text-[9px] font-black uppercase tracking-wider ${
                                    isReversed
                                        ? 'text-red-600 dark:text-red-400'
                                        : isPartialMovement && hasMovement
                                        ? 'text-amber-600 dark:text-amber-400'
                                        : hasMovement
                                        ? 'text-emerald-600 dark:text-emerald-400'
                                        : 'text-slate-400 dark:text-slate-500'
                                }`}>
                                    {isReversed
                                        ? (isReturn ? 'Entrada Estornada' : 'Saída Estornada')
                                        : isPartialMovement && hasMovement
                                        ? (isReturn ? 'Entrada Parcial' : 'Saída Parcial')
                                        : hasMovement
                                        ? (isReturn ? 'Entrada Efetivada' : 'Saída Efetivada')
                                        : 'Sem Movimentação'}
                                </span>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={() => setIsOpen(false)}
                            className="flex h-5 w-5 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors"
                            title="Fechar"
                        >
                            <X className="h-3.5 w-3.5" />
                        </button>
                    </div>

                    <p className="mt-2.5 text-[11px] font-medium leading-relaxed text-slate-600 dark:text-slate-300">
                        {explanation}
                    </p>
                </div>,
                document.body
            )}
        </div>
    );
};

export default InventoryMovementBadge;
