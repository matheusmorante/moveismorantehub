import React, { useState, useRef } from 'react';
import Product from '@/pages/types/product.type';
import DropdownPortal from '@/components/shared/DropdownPortal';
import { LabelPrintType } from '../../modals/LabelPrintSelectionModal';
import { useProductAiActions } from '../../hooks/useProductAiActions';

export interface ParentProductActionsProps {
    readonly product: Product;
    readonly showTrash?: boolean;
    readonly isDraft: boolean;
    readonly onEdit: (product: Product) => void;
    readonly onRestore: (id: string) => void;
    readonly onDelete: (id: string) => void;
    readonly onDuplicate?: (product: Product) => void;
    readonly onLaunchStock?: (product: Product) => void;
    readonly onOpenSalesModal: () => void;
    readonly onOpenLabelModal: (type: LabelPrintType) => void;
}

export const ParentProductActions: React.FC<ParentProductActionsProps> = ({
    product,
    showTrash,
    isDraft,
    onEdit,
    onRestore,
    onDelete,
    onDuplicate,
    onLaunchStock,
    onOpenSalesModal,
    onOpenLabelModal,
}) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const menuAnchorRef = useRef<HTMLButtonElement>(null);
    const { handleCopyAiInstructions } = useProductAiActions(product.id || '');

    if (showTrash) {
        return (
            <button
                type="button"
                onClick={() => onRestore(product.id || '')}
                className="p-1 text-emerald-600 hover:text-emerald-700 cursor-pointer"
                title="Restaurar"
                aria-label="Restaurar produto"
            >
                <i className="bi bi-arrow-counterclockwise" />
            </button>
        );
    }

    return (
        <div className="flex items-center justify-center gap-2">
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
                                        onClick={(e) => handleCopyAiInstructions(e, () => setIsMenuOpen(false))}
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
        </div>
    );
};
