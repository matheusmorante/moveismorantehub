import React from 'react';
import Product from '../../../types/product.type';
import DropdownPortal from '../../../../components/shared/DropdownPortal';
import { LabelPrintType } from '../components/LabelPrintSelectionModal';

interface ProductRowActionsCellProps {
    product: Product;
    isChildVar: boolean;
    showTrash?: boolean;
    onEdit: (product: Product) => void;
    onRestore: (id: string) => void;
    onDelete: (id: string) => void;
    onDuplicate?: (product: Product) => void;
    onShowHistory?: (product: Product) => void;
    onLaunchStock?: (product: any) => void;
    onOpenSalesModal: () => void;
    onOpenLabelModal: (type: LabelPrintType) => void;
}

export const ProductRowActionsCell: React.FC<ProductRowActionsCellProps> = ({
    product,
    isChildVar,
    showTrash,
    onEdit,
    onRestore,
    onDelete,
    onDuplicate,
    onShowHistory,
    onLaunchStock,
    onOpenSalesModal,
    onOpenLabelModal,
}) => {
    const [isMenuOpen, setIsMenuOpen] = React.useState(false);
    const menuAnchorRef = React.useRef<HTMLButtonElement>(null);
    const isDraft = Boolean(product.isDraft) || Boolean((product as any).is_draft) || product.status === 'draft';

    if (isChildVar) {
        return <td key="actions" className="px-3 py-3 text-center" onClick={(e) => e.stopPropagation()} />;
    }

    return (
        <td key="actions" className="px-3 py-3 text-center" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-center gap-2">
                {showTrash ? (
                    <button
                        onClick={() => onRestore(product.id!)}
                        className="p-1 text-emerald-600 hover:text-emerald-700 cursor-pointer"
                        title="Restaurar"
                    >
                        <i className="bi bi-arrow-counterclockwise" />
                    </button>
                ) : (
                    <>
                        <button
                            onClick={(e) => { e.stopPropagation(); onEdit(product); }}
                            className="w-8 h-8 flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/40 rounded-xl transition-all border border-slate-200/80 dark:border-slate-700 shadow-2xs cursor-pointer active:scale-95"
                            title="Editar Produto"
                        >
                            <i className="bi bi-pencil text-xs font-bold" />
                        </button>

                        <div className="relative">
                            <button
                                ref={menuAnchorRef}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setIsMenuOpen(!isMenuOpen);
                                }}
                                className="w-8 h-8 flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/40 rounded-xl transition-all border border-slate-200/80 dark:border-slate-700 shadow-2xs cursor-pointer active:scale-95"
                                title="Mais opções"
                            >
                                <i className="bi bi-three-dots text-xs font-bold" />
                            </button>

                            <DropdownPortal
                                isOpen={isMenuOpen}
                                onClose={() => setIsMenuOpen(false)}
                                anchorRef={menuAnchorRef}
                                className="min-w-[180px]"
                            >
                                <div 
                                    className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-2xl py-2 flex flex-col z-[9999] animate-slide-up"
                                    onMouseLeave={() => setIsMenuOpen(false)}
                                >
                                    <button
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

                                    {onShowHistory && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setIsMenuOpen(false);
                                                onShowHistory(product);
                                            }}
                                            className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-950 transition-colors text-left group cursor-pointer"
                                        >
                                            <i className="bi bi-clock-history text-amber-500" />
                                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-700 dark:text-slate-200">Histórico de Preços</span>
                                        </button>
                                    )}

                                    {!product.isParent && product.itemType !== 'service' && onLaunchStock && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setIsMenuOpen(false);
                                                onLaunchStock?.(product);
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

                                            <div className="border-t border-slate-50 dark:border-slate-800/50 my-1">
                                                <button
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
                        </div>
                    </>
                )}
            </div>
        </td>
    );
};
