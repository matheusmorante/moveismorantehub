import React, { useState, useRef, useCallback } from 'react';
import Product from '@/pages/types/product.type';
import DropdownPortal from '@/components/shared/DropdownPortal';
import { LabelPrintType } from '../../components/modals/LabelPrintSelectionModal';

export interface ActionProductLike extends Product {
    readonly is_draft?: boolean;
    readonly variationId?: string;
    readonly mergedToVariationId?: string;
}

export interface ProductRowActionsCellProps {
    readonly product: ActionProductLike;
    readonly isChildVar: boolean;
    readonly showTrash?: boolean;
    readonly onEdit: (product: Product) => void;
    readonly onRestore: (id: string) => void;
    readonly onDelete: (id: string) => void;
    readonly onDuplicate?: (product: Product) => void;
    readonly onShowHistory?: (product: Product) => void;
    readonly onLaunchStock?: (product: Product) => void;
    readonly onOpenSalesModal: () => void;
    readonly onOpenLabelModal: (type: LabelPrintType) => void;
    readonly onMoveToAnotherFamily?: (product: Product) => void;
    readonly onMergeWithAnotherVariation?: (product: Product) => void;
}

/**
 * Célula de ações da tabela de produtos (menu flutuante com impressão, movimentação e edição).
 */
export const ProductRowActionsCell: React.FC<ProductRowActionsCellProps> = ({
    product,
    isChildVar,
    showTrash,
    onEdit,
    onRestore,
    onDelete,
    onDuplicate,
    onLaunchStock,
    onOpenSalesModal,
    onOpenLabelModal,
    onMoveToAnotherFamily,
    onMergeWithAnotherVariation,
}) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const menuAnchorRef = useRef<HTMLButtonElement>(null);
    const isDraft = Boolean(product.isDraft) || Boolean((product as any).is_draft) || product.status === 'draft';

    const handleCopyAiInstructions = useCallback(async (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsMenuOpen(false);
        try {
            const { postShareService } = await import('@/pages/App/Marketing/Posts/services/postShareService');
            const url = await postShareService.getOrCreateShareUrl(product.id || '');
            await navigator.clipboard.writeText(url);
            const { toast } = await import('react-toastify');
            toast.success('Link de instruções para IA copiado com sucesso!');
        } catch {
            const { toast } = await import('react-toastify');
            toast.error('Não foi possível gerar o link para IA.');
        }
    }, [product.id]);

    if (isChildVar) {
        return (
            <td key="actions" className="px-3 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                {onMoveToAnotherFamily && product.variationId && (
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
                                    <button
                                        type="button"
                                        role="menuitem"
                                        onClick={(event) => {
                                            event.stopPropagation();
                                            setIsMenuOpen(false);
                                            onMoveToAnotherFamily(product);
                                        }}
                                        className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-950 cursor-pointer"
                                    >
                                        <i className="bi bi-arrow-left-right text-indigo-500" />
                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-700 dark:text-slate-200">Mover para outro produto pai</span>
                                    </button>
                                    {onMergeWithAnotherVariation && !product.mergedToVariationId && (
                                        <button
                                            type="button"
                                            role="menuitem"
                                            onClick={(event) => {
                                                event.stopPropagation();
                                                setIsMenuOpen(false);
                                                onMergeWithAnotherVariation(product);
                                            }}
                                            className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-950 cursor-pointer"
                                        >
                                            <i className="bi bi-intersect text-violet-500" />
                                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-700 dark:text-slate-200">Fundir com outra variação</span>
                                        </button>
                                    )}
                                </div>
                            </DropdownPortal>
                        )}
                    </div>
                )}
            </td>
        );
    }

    return (
        <td key="actions" className="px-3 py-3 text-center" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-center gap-2">
                {showTrash ? (
                    <button
                        type="button"
                        onClick={() => onRestore(product.id || '')}
                        className="p-1 text-emerald-600 hover:text-emerald-700 cursor-pointer"
                        title="Restaurar"
                        aria-label="Restaurar produto"
                    >
                        <i className="bi bi-arrow-counterclockwise" />
                    </button>
                ) : (
                    <>
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                onEdit(product);
                            }}
                            className="w-8 h-8 flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/40 rounded-xl transition-all border border-slate-200/80 dark:border-slate-700 shadow-2xs cursor-pointer active:scale-95"
                            title={isDraft ? "Continuar Cadastramento" : "Editar Produto"}
                            aria-label={isDraft ? "Continuar Cadastramento" : "Editar Produto"}
                        >
                            <i className={isDraft ? "bi bi-pencil-square text-xs font-bold text-amber-600 dark:text-amber-400" : "bi bi-pencil text-xs font-bold"} />
                        </button>

                        <div className="relative">
                            <button
                                ref={menuAnchorRef}
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setIsMenuOpen((prev) => !prev);
                                }}
                                aria-label="Mais opções"
                                aria-haspopup="menu"
                                aria-expanded={isMenuOpen}
                                className="w-8 h-8 flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/40 rounded-xl transition-all border border-slate-200/80 dark:border-slate-700 shadow-2xs cursor-pointer active:scale-95"
                                title="Mais opções"
                            >
                                <i className="bi bi-three-dots text-xs font-bold" />
                            </button>

                            {isMenuOpen && (
                                <DropdownPortal
                                    isOpen={isMenuOpen}
                                    onClose={() => setIsMenuOpen(false)}
                                    anchorRef={menuAnchorRef}
                                    className="min-w-[180px]"
                                >
                                    <div 
                                        role="menu"
                                        className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-2xl py-2 flex flex-col z-[9999] animate-slide-up"
                                        onMouseLeave={() => setIsMenuOpen(false)}
                                    >
                                        <button
                                            type="button"
                                            role="menuitem"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setIsMenuOpen(false);
                                                onEdit(product);
                                            }}
                                            className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-950 transition-colors text-left group w-full cursor-pointer"
                                        >
                                            <i className="bi bi-pencil-fill text-blue-500" />
                                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-700 dark:text-slate-200">Editar Produto</span>
                                        </button>

                                        {onDuplicate && (
                                            <button
                                                type="button"
                                                role="menuitem"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setIsMenuOpen(false);
                                                    onDuplicate(product);
                                                }}
                                                className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-950 transition-colors text-left group cursor-pointer"
                                            >
                                                <i className="bi bi-copy text-blue-500" />
                                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-700 dark:text-slate-200">Duplicar Produto</span>
                                            </button>
                                        )}

                                        {!product.isParent && product.itemType !== 'service' && onLaunchStock && (
                                            <button
                                                type="button"
                                                role="menuitem"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setIsMenuOpen(false);
                                                    onLaunchStock(product);
                                                }}
                                                className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-950 transition-colors text-left group cursor-pointer"
                                            >
                                                <span className="flex items-center gap-0.5 text-emerald-500">
                                                    <i className="bi bi-box-seam-fill" />
                                                    <i className="bi bi-arrow-left-right text-[9px]" />
                                                </span>
                                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-700 dark:text-slate-200">Movimentações de Estoque</span>
                                            </button>
                                        )}

                                        {!product.isParent && (
                                            <>
                                                <button
                                                    type="button"
                                                    role="menuitem"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setIsMenuOpen(false);
                                                        onOpenSalesModal();
                                                    }}
                                                    className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-950 transition-colors text-left group cursor-pointer"
                                                >
                                                    <i className="bi bi-receipt text-indigo-500" />
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-700 dark:text-slate-200">Histórico de Vendas</span>
                                                </button>

                                                <button
                                                    type="button"
                                                    role="menuitem"
                                                    onClick={handleCopyAiInstructions}
                                                    className="flex items-center gap-3 px-4 py-2.5 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 transition-colors text-left group cursor-pointer"
                                                >
                                                    <i className="bi bi-robot text-indigo-500" />
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-300">Copiar Instruções IA</span>
                                                </button>

                                                <div className="border-t border-slate-50 dark:border-slate-800/50 my-1">
                                                    <button
                                                        type="button"
                                                        role="menuitem"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setIsMenuOpen(false);
                                                            onOpenLabelModal('identification');
                                                        }}
                                                        className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-950 transition-colors text-left group w-full cursor-pointer"
                                                    >
                                                        <i className="bi bi-qr-code text-blue-500" />
                                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-700 dark:text-slate-200">Etiq. de Identificação</span>
                                                    </button>
                                                    <button
                                                        type="button"
                                                        role="menuitem"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setIsMenuOpen(false);
                                                            onOpenLabelModal('price');
                                                        }}
                                                        className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-955 transition-colors text-left group w-full cursor-pointer"
                                                    >
                                                        <i className="bi bi-tag-fill text-emerald-500" />
                                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-700 dark:text-slate-200">Etiq. de Preço</span>
                                                    </button>
                                                </div>
                                            </>
                                        )}

                                        {isDraft && (
                                            <div className="border-t border-slate-50 dark:border-slate-800/50 my-1">
                                                <button
                                                    type="button"
                                                    role="menuitem"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setIsMenuOpen(false);
                                                        if (product.id) onDelete(product.id);
                                                    }}
                                                    className="flex items-center gap-3 px-4 py-2.5 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors text-left group w-full text-red-600 dark:text-red-400 cursor-pointer"
                                                    title="Descartar Rascunho"
                                                >
                                                    <i className="bi bi-trash3-fill text-red-500" />
                                                    <span className="text-[10px] font-black uppercase tracking-widest font-bold">Descartar Rascunho</span>
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </DropdownPortal>
                            )}
                        </div>
                    </>
                )}
            </div>
        </td>
    );
};

export default ProductRowActionsCell;
