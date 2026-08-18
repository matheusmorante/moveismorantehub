import React from "react";
import Product from "../../../types/product.type";
import { formatCurrency } from "../../../utils/formatters";
import { getCategoryBreadcrumb } from '@/pages/utils/categoryService';
import DropdownPortal from "../../../../components/shared/DropdownPortal";
import ProductSalesModal from "../components/ProductSalesModal";

interface ProductCardProps {
    product: Product;
    onEdit: (product: Product) => void;
    onLaunchStock?: (product: any) => void;
    onDelete: (id: string) => void;
    onRestore: (id: string) => void;
    onPermanentDelete: (id: string) => void;
    onToggleActive: (id: string, currentStatus: boolean) => void;
    onDeactivateCatalog: (id: string) => void;
    onShowHistory?: (product: Product) => void;
    showTrash?: boolean;
    isSelected?: boolean;
    onToggleSelection?: () => void;
    categoryTree?: any;
    onRefresh?: () => void;
    onDuplicate?: (product: Product) => void;
}

const ProductCard = ({
    product,
    onEdit,
    onLaunchStock,
    onDelete,
    onRestore,
    onPermanentDelete,
    onToggleActive,
    onDeactivateCatalog,
    onShowHistory,
    showTrash,
    isSelected,
    onToggleSelection,
    categoryTree,
    onRefresh,
    onDuplicate
}: ProductCardProps) => {
    const [isMenuOpen, setIsMenuOpen] = React.useState(false);
    const [isSalesModalOpen, setIsSalesModalOpen] = React.useState(false);
    const menuAnchorRef = React.useRef<HTMLButtonElement>(null);
    const isLowStock = (product.stock || 0) <= (product.minStock || 0);
    const isParent = product.isParent;
    const isVariation = product.isVariation || !!product.parentId;
    const isCatalogActive = product.status === 'published';

    return (
        <div
            className={`border rounded-xl p-3 shadow-sm active:scale-[0.98] transition-all relative
                ${isSelected ? 'border-blue-500 ring-1 ring-blue-500' : 
                  isParent ? 'border-blue-300 dark:border-blue-800 bg-blue-50/40 dark:bg-blue-900/10' :
                  isVariation ? 'border-l-4 border-l-blue-500 dark:border-l-blue-400 border-slate-200 dark:border-slate-800 ml-5 bg-slate-50/60 dark:bg-slate-900/40' :
                  'border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900'}`}
            onClick={() => onEdit(product)}
        >
            <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2">
                    {product.code ? (
                        <span className="font-mono text-[9px] text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-800/50 px-1.5 py-0.5 rounded border border-slate-100 dark:border-slate-800">
                            {product.code}
                        </span>
                    ) : null}
                    {/* Parent / Variation indicator */}
                    {isParent && (
                        <span className="text-[8px] px-2 py-0.5 rounded-full font-black uppercase tracking-widest bg-blue-600 text-white flex items-center gap-1">
                            <i className="bi bi-diagram-3-fill" />
                            Pai
                        </span>
                    )}
                    {isVariation && (
                        <span className="text-[8px] px-2 py-0.5 rounded-full font-black uppercase tracking-widest bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-800 flex items-center gap-1">
                            <i className="bi bi-arrow-return-right" />
                            Variação
                        </span>
                    )}
                </div>

                <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                    {!isVariation && (
                        <span className={`text-[8px] px-2 py-0.5 rounded-full font-black uppercase tracking-widest ${product.itemType === 'service' ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400' : 'bg-blue-100 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400'}`}>
                            {product.itemType === 'service' ? 'Serviço' : 'Produto'}
                        </span>
                    )}
                    {(product.opportunityName || product.opportunity?.name) && (
                        <span className="text-[8px] px-2 py-0.5 rounded-full font-black uppercase tracking-widest bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-800 flex items-center gap-1">
                            <i className="bi bi-fire text-amber-600" />
                            {product.opportunityName || product.opportunity?.name}
                        </span>
                    )}
                </div>
            </div>

            <div className="mb-3 flex items-center gap-3">
                {!isParent && (
                    <div className="w-12 h-12 rounded-lg bg-slate-100 dark:bg-slate-800 overflow-hidden flex-shrink-0 flex items-center justify-center border border-slate-200/60 dark:border-slate-800">
                        {product.images && product.images.length > 0 && product.images[0] ? (
                            <img 
                                src={product.images[0]} 
                                alt={product.name || product.title || ''} 
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                    (e.target as HTMLElement).style.display = 'none';
                                    if ((e.target as HTMLElement).parentElement) {
                                        (e.target as HTMLElement).parentElement!.innerHTML = '<i class="bi bi-image text-slate-400 text-lg"></i>';
                                    }
                                }}
                            />
                        ) : (
                            <i className="bi bi-image text-slate-400 text-lg" />
                        )}
                    </div>
                )}
                <div className="flex-1 min-w-0">
                    <h3 className={`leading-tight line-clamp-2 ${
                        isParent
                            ? 'text-sm font-black text-blue-700 dark:text-blue-400 uppercase tracking-tight'
                            : isVariation
                            ? 'text-xs font-bold text-slate-700 dark:text-slate-300 pl-3 border-l-2 border-indigo-200 dark:border-indigo-800'
                            : 'text-sm font-bold text-slate-800 dark:text-slate-100'
                    }`}>
                        {product.name || product.title || (product.description ? product.description.split('\n')[0].substring(0, 120) : "-")}
                    </h3>
                    {!isVariation && (
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wide mt-1 leading-relaxed">
                            {getCategoryBreadcrumb(product.categoryIds || [], categoryTree)}
                        </p>
                    )}
                    <div className="flex flex-wrap gap-1.5 mt-2">
                        {product.isDraft && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[8px] font-black uppercase tracking-wider border bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700">
                                <i className="bi bi-file-earmark-text" /> Rascunho
                            </span>
                        )}
                        <button disabled={!product.active} onClick={(e) => { e.stopPropagation(); if (product.active) onToggleActive(product.id!, true); }} title={product.active ? 'Clique para desativar no ERP' : 'ERP inativo'} className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[8px] font-black uppercase tracking-wider border ${product.active ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30 cursor-pointer hover:bg-emerald-100' : 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/20 dark:text-red-400 dark:border-red-900/30 cursor-default'}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${product.active ? 'bg-emerald-500' : 'bg-red-500'}`} />
                            ERP · {product.active ? 'Ativo' : 'Inativo'}
                        </button>
                        <button disabled={!isCatalogActive} onClick={(e) => { e.stopPropagation(); if (isCatalogActive) onDeactivateCatalog(product.id!); }} title={isCatalogActive ? 'Clique para ocultar no Catálogo Digital' : 'Produto ocultado no Catálogo Digital'} className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[8px] font-black uppercase tracking-wider border ${isCatalogActive ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30 cursor-pointer hover:bg-emerald-100' : 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/20 dark:text-red-400 dark:border-red-900/30 cursor-default'}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${isCatalogActive ? 'bg-emerald-500' : 'bg-red-500'}`} />
                            {isCatalogActive ? 'Publicado' : 'Ocultado'}
                        </button>
                    </div>
                </div>
            </div>

            {!isParent && (
            <div className="flex justify-between items-end border-t border-slate-50 dark:border-slate-800/50 pt-2.5">
                <div className="flex flex-col">
                    <span className="text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest mb-0.5">
                        Preço
                    </span>
                    <span className={`text-base font-black ${isParent ? 'text-slate-400 dark:text-slate-500' : 'text-blue-600 dark:text-blue-400'}`}>
                        {isParent ? '-' : formatCurrency(product.unitPrice || 0)}
                    </span>
                </div>

                {product.itemType !== 'service' && (
                    <div className="flex flex-col items-end">
                        <span className="text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest mb-0.5 text-right">
                            Estoque
                        </span>
                        <div className="flex items-baseline gap-1">
                            <span className={`text-sm font-black ${isParent ? 'text-slate-400 dark:text-slate-500' : isLowStock ? 'text-red-500 dark:text-red-400' : 'text-slate-700 dark:text-slate-200'}`}>
                                {isParent ? '-' : (product.stock ?? 0)}
                            </span>
                            {!isParent && (
                                <span className="text-[9px] text-slate-400 dark:text-slate-600 font-bold uppercase">
                                    {product.unit}
                                </span>
                            )}
                        </div>
                    </div>
                )}
            </div>
            )}

            <div className="grid grid-cols-3 gap-1.5 mt-3" onClick={(e) => e.stopPropagation()}>
                {showTrash ? (
                    <button
                        onClick={() => onRestore(product.id!)}
                        className="flex flex-col items-center justify-center gap-1 py-2 col-span-3 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-colors font-bold"
                    >
                        <i className="bi bi-check-circle-fill text-base" />
                        <span className="text-[9px] font-black uppercase">Ativar Produto</span>
                    </button>
                ) : (
                    <>
                        <button
                            onClick={() => onEdit(product)}
                            className="col-start-2 flex flex-col items-center justify-center gap-1 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                        >
                            <i className="bi bi-pencil-fill text-base" />
                            <span className="text-[8px] font-black uppercase">Editar</span>
                        </button>

                        <div className="relative">
                            <button
                                ref={menuAnchorRef}
                                onClick={(e) => { e.stopPropagation(); setIsMenuOpen(!isMenuOpen); }}
                                className={`flex flex-col items-center justify-center gap-1 py-2 w-full rounded-lg border transition-all ${isMenuOpen ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 text-indigo-600' : 'bg-slate-50 dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-400'}`}
                            >
                                <i className="bi bi-three-dots text-base" />
                            </button>

                            <DropdownPortal
                                isOpen={isMenuOpen}
                                onClose={() => setIsMenuOpen(false)}
                                anchorRef={menuAnchorRef}
                                className="min-w-[160px]"
                            >
                                <div 
                                    className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-2xl py-2 flex flex-col z-[9999] animate-slide-up"
                                    onMouseLeave={() => setIsMenuOpen(false)}
                                >
                                    {onShowHistory && !product.isParent && (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setIsMenuOpen(false); onShowHistory(product); }}
                                            className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-950 transition-colors text-left group"
                                        >
                                            <i className="bi bi-clock-history text-amber-500" />
                                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-700 dark:text-slate-200">Histórico de Preços</span>
                                        </button>
                                    )}

                                    {!product.isParent && (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setIsMenuOpen(false); setIsSalesModalOpen(true); }}
                                            className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-950 transition-colors text-left group"
                                        >
                                            <i className="bi bi-receipt text-blue-500" />
                                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-700 dark:text-slate-200">Ver Pedidos Vinculados</span>
                                        </button>
                                    )}

                                    {!product.isVariation && onDuplicate && (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setIsMenuOpen(false); onDuplicate(product); }}
                                            className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-950 transition-colors text-left group border-t border-slate-50 dark:border-slate-800/50 mt-1"
                                        >
                                            <i className="bi bi-copy text-indigo-500" />
                                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-700 dark:text-slate-200">Duplicar Produto</span>
                                        </button>
                                    )}

                                    {product.itemType !== 'service' && !product.isParent && (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setIsMenuOpen(false); onLaunchStock?.(product); }}
                                            className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-950 transition-colors text-left group"
                                        >
                                            <span className="flex items-center gap-0.5 text-emerald-500">
                                                <i className="bi bi-box-seam-fill" />
                                                <i className="bi bi-arrow-left-right text-[9px]" />
                                            </span>
                                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-700 dark:text-slate-200">Movimentações de Estoque</span>
                                        </button>
                                    )}

                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setIsMenuOpen(false);
                                            if (window.confirm(`Tem certeza que deseja excluir o produto "${product.name || product.title || product.description}" permanentemente? Esta ação só é permitida para produtos sem movimentações de estoque ou vendas.`)) {
                                                onPermanentDelete(product.id!);
                                            }
                                        }}
                                        className="flex items-center gap-3 px-4 py-2.5 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-left group border-t border-slate-50 dark:border-slate-800/50"
                                    >
                                        <i className="bi bi-trash3-fill text-red-500" />
                                        <span className="text-[10px] font-black uppercase tracking-widest text-red-600 dark:text-red-400">Excluir Produto</span>
                                    </button>
                                </div>
                            </DropdownPortal>
                        </div>
                    </>
                )}
            </div>

            {isSalesModalOpen && (
                <ProductSalesModal 
                    product={product}
                    onClose={() => setIsSalesModalOpen(false)}
                />
            )}
        </div>
    );
};

export default ProductCard;
