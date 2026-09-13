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
    onMoveToAnotherFamily?: (product: Product) => void;
    onMergeWithAnotherVariation?: (product: Product) => void;
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
    onMoveToAnotherFamily,
    onMergeWithAnotherVariation,
}) => {
    const [isMenuOpen, setIsMenuOpen] = React.useState(false);
    const menuAnchorRef = React.useRef<HTMLButtonElement>(null);
    const isDraft = Boolean(product.isDraft) || Boolean((product as any).is_draft) || product.status === 'draft';

    if (isChildVar) {
        return (
            <td key="actions" className="px-3 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                {onMoveToAnotherFamily && (product as any).variationId && (
                    <div className="relative inline-flex">
                        <button
                            ref={menuAnchorRef}
                            type="button"
                            onClick={(event) => { event.stopPropagation(); setIsMenuOpen(value => !value); }}
                            className="w-8 h-8 inline-flex items-center justify-center rounded-xl border border-slate-200/80 bg-slate-100 text-slate-700 transition-all hover:bg-blue-50 hover:text-blue-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                            title="Mais opções do produto"
                        >
                            <i className="bi bi-three-dots text-xs font-bold" />
                        </button>
                        <DropdownPortal isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} anchorRef={menuAnchorRef} className="min-w-[220px]">
                            <div className="rounded-2xl border border-slate-100 bg-white py-2 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
                                <button
                                    type="button"
                                    onClick={(event) => { event.stopPropagation(); setIsMenuOpen(false); onMoveToAnotherFamily(product); }}
                                    className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-950"
                                >
                                    <i className="bi bi-arrow-left-right text-indigo-500" />
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-700 dark:text-slate-200">Mover para outro produto pai</span>
                                </button>
                                {onMergeWithAnotherVariation && !(product as any).mergedToVariationId && (
                                    <button type="button" onClick={(event) => { event.stopPropagation(); setIsMenuOpen(false); onMergeWithAnotherVariation(product); }} className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-950">
                                        <i className="bi bi-intersect text-violet-500" />
                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-700 dark:text-slate-200">Fundir com outra variação</span>
                                    </button>
                                )}
                            </div>
                        </DropdownPortal>
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

                            {isMenuOpen && (
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

                                            <button
                                                onClick={async (e) => {
                                                    e.stopPropagation();
                                                    setIsMenuOpen(false);
                                                    try {
                                                        const { postShareService } = await import('../../Marketing/Posts/services/postShareService');
                                                        const url = await postShareService.getOrCreateShareUrl(product.id!);
                                                        await navigator.clipboard.writeText(url);
                                                        const { toast } = await import('react-toastify');
                                                        toast.success('Link de instruções para IA copiado com sucesso!');
                                                    } catch (err: any) {
                                                        const { toast } = await import('react-toastify');
                                                        toast.error('Não foi possível gerar o link para IA.');
                                                    }
                                                }}
                                                className="flex items-center gap-3 px-4 py-2.5 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 transition-colors text-left group cursor-pointer"
                                            >
                                                <i className="bi bi-robot text-indigo-500" />
                                                <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-300">Copiar Instruções IA</span>
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
                            )}
                        </div>
                    </>
                )}
            </div>
        </td>
    );
};
