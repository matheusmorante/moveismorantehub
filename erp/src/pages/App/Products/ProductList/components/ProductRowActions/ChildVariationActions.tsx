import React, { useState, useRef } from 'react';
import DropdownPortal from '@/components/shared/DropdownPortal';
import { useDeleteVariation } from '../../hooks/useDeleteVariation';
import { ActionProductLike } from '../ProductRowActionsCell';

export interface ChildVariationActionsProps {
    readonly product: ActionProductLike;
    readonly onMoveToAnotherFamily?: (product: ActionProductLike) => void;
    readonly onMergeWithAnotherVariation?: (product: ActionProductLike) => void;
    readonly onRefresh?: () => void;
}

export const ChildVariationActions: React.FC<ChildVariationActionsProps> = ({
    product,
    onMoveToAnotherFamily,
    onMergeWithAnotherVariation,
    onRefresh,
}) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const menuAnchorRef = useRef<HTMLButtonElement>(null);
    const parentId = product.parentId || product.id || '';
    
    const { checkingUsageId, usageCache, handleCheckAndAskDelete } = useDeleteVariation(parentId, onRefresh);
    const variationId = product.variationId || product.id;
    const isUsed = usageCache[variationId || ''] === true;
    const isUsageChecking = checkingUsageId === variationId;

    if (!onMoveToAnotherFamily || !product.variationId) return null;

    return (
        <div className="relative inline-flex">
            <button
                ref={menuAnchorRef}
                type="button"
                onClick={(event) => {
                    event.stopPropagation();
                    setIsMenuOpen((value) => !value);
                }}
                aria-label="Mais opções da variação"
                aria-expanded={isMenuOpen}
                className="w-8 h-8 inline-flex items-center justify-center rounded-xl border border-slate-200/80 bg-slate-100 text-slate-700 transition-all hover:bg-blue-50 hover:text-blue-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 cursor-pointer"
                title="Mais opções do produto"
            >
                <i className="bi bi-three-dots text-xs font-bold" />
            </button>
            {isMenuOpen && (
                <DropdownPortal isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} anchorRef={menuAnchorRef} className="min-w-[220px]">
                    <div role="menu" className="rounded-2xl border border-slate-100 bg-white py-2 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
                        {product.mergedToVariationId ? (
                            <div className="px-4 py-2.5 text-left">
                                <span className="text-[10px] text-slate-400">Esta variação foi mesclada e é mantida apenas para histórico. Nenhuma ação está disponível.</span>
                            </div>
                        ) : (
                            <>
                                <button
                                    type="button"
                                    role="menuitem"
                                    onClick={async (event) => {
                                        event.stopPropagation();
                                        setIsMenuOpen(false);
                                        
                                        if (!product.supplierId) {
                                            const { toast } = await import('react-toastify');
                                            toast.error('Este produto não possui um fornecedor. Selecione um fornecedor antes de mover ou mesclar suas variações.');
                                            return;
                                        }

                                        const attrs = product.attributes || [];
                                        const hasValidAttribute = attrs.some((a: any) => a.name?.trim() && a.value?.trim());
                                        
                                        if (!hasValidAttribute) {
                                            const { toast } = await import('react-toastify');
                                            toast.error('Este produto deve ter um atributo / valor definido.');
                                            return;
                                        }

                                        onMoveToAnotherFamily(product);
                                    }}
                                    className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-950 cursor-pointer"
                                >
                                    <i className="bi bi-arrow-left-right text-indigo-500" />
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-700 dark:text-slate-200">Mover para outro produto pai</span>
                                </button>
                                {onMergeWithAnotherVariation && (
                                    <button
                                        type="button"
                                        role="menuitem"
                                        onClick={async (event) => {
                                            event.stopPropagation();
                                            setIsMenuOpen(false);
                                            
                                            if (!product.supplierId) {
                                                const { toast } = await import('react-toastify');
                                                toast.error('Este produto não possui um fornecedor. Selecione um fornecedor antes de mover ou mesclar suas variações.');
                                                return;
                                            }

                                            onMergeWithAnotherVariation(product);
                                        }}
                                        className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-950 cursor-pointer"
                                    >
                                        <i className="bi bi-intersect text-violet-500" />
                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-700 dark:text-slate-200">Mesclar com outra variação</span>
                                    </button>
                                )}
                                <div className="border-t border-slate-50 dark:border-slate-800/50 my-1">
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setIsMenuOpen(false);
                                            if (variationId) handleCheckAndAskDelete(variationId);
                                        }}
                                        disabled={isUsageChecking || isUsed}
                                        className={`w-full px-4 py-2.5 text-left flex items-center gap-3 cursor-pointer transition-colors ${isUsageChecking || isUsed ? 'opacity-50 cursor-not-allowed text-slate-500' : 'hover:bg-red-50 dark:hover:bg-red-950/30 text-red-600 dark:text-red-400'}`}
                                        title={isUsed ? "Variação em uso. Não pode ser deletada." : "Excluir Variação"}
                                    >
                                        {isUsageChecking ? (
                                            <i className="bi bi-arrow-repeat animate-spin text-slate-400" />
                                        ) : (
                                            <i className={`bi bi-trash3-fill ${isUsed ? 'text-slate-400' : 'text-red-500'}`} />
                                        )}
                                        <span className="text-[10px] font-black uppercase tracking-widest">
                                            {isUsageChecking ? 'Verificando Uso...' : 'Excluir Variação'}
                                        </span>
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </DropdownPortal>
            )}
        </div>
    );
};
