import React from "react";
import Product from "../../../types/product.type";
import { formatCurrency } from "../../../utils/formatters";
import { getCategoryBreadcrumb } from '@/pages/utils/categoryService';
import DropdownPortal from "../../../../components/shared/DropdownPortal";
import ProductMigrationModal from "../components/ProductMigrationModal";
import ProductSalesModal from "../components/ProductSalesModal";

interface ProductCardProps {
    product: Product;
    onEdit: (product: Product) => void;
    onLaunchStock?: (product: any) => void;
    onDelete: (id: string) => void;
    onRestore: (id: string) => void;
    onPermanentDelete: (id: string) => void;
    onToggleActive: (id: string, currentStatus: boolean) => void;
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
    onShowHistory,
    showTrash,
    isSelected,
    onToggleSelection,
    categoryTree,
    onRefresh,
    onDuplicate
}: ProductCardProps) => {
    const [isMenuOpen, setIsMenuOpen] = React.useState(false);
    const [isMigrationModalOpen, setIsMigrationModalOpen] = React.useState(false);
    const [isSalesModalOpen, setIsSalesModalOpen] = React.useState(false);
    const menuAnchorRef = React.useRef<HTMLButtonElement>(null);
    const isLowStock = (product.stock || 0) <= (product.minStock || 0);
    const isParent = product.isParent;
    const isVariation = product.isVariation;

    return (
        <div
            className={`border rounded-xl p-3 shadow-sm active:scale-[0.98] transition-all
                ${isSelected ? 'border-blue-500 ring-1 ring-blue-500' : 
                  isParent ? 'border-blue-300 dark:border-blue-800' :
                  isVariation ? 'border-indigo-100 dark:border-indigo-900 ml-4' :
                  'border-slate-100 dark:border-slate-800'}
                ${isParent ? 'bg-blue-50/50 dark:bg-blue-900/10' : 
                  isVariation ? 'bg-slate-50/50 dark:bg-slate-900/40 relative' :
                  'bg-white dark:bg-slate-900'}`}
            onClick={() => onEdit(product)}
        >
            {isVariation && (
                <div className="absolute left-[-1rem] top-1/2 -translate-y-1/2 w-4 h-0.5 bg-indigo-200 dark:bg-indigo-900/50" />
            )}
            <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2">
                    <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => {
                            e.stopPropagation();
                            onToggleSelection?.();
                        }}
                        className="w-5 h-5 text-blue-600 bg-white border-slate-300 rounded-md focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-slate-900 focus:ring-2 dark:bg-slate-800 dark:border-slate-700 cursor-pointer"
                    />
                    <span className="font-mono text-[9px] text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-800/50 px-1.5 py-0.5 rounded border border-slate-100 dark:border-slate-800">
                        {product.code || "S/C"}
                    </span>
                    {/* Parent / Variation indicator */}
                    {isParent && (
                        <span className="text-[8px] px-2 py-0.5 rounded-full font-black uppercase tracking-widest bg-blue-600 text-white flex items-center gap-1">
                            <i className="bi bi-diagram-3-fill" />
                            Pai
                        </span>
                    )}
                    {isVariation && (
                        <span className="text-[8px] px-2 py-0.5 rounded-full font-black uppercase tracking-widest bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 flex items-center gap-1">
                            <i className="bi bi-arrow-return-right" />
                            Variação
                        </span>
                    )}
                </div>

                <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                    <span className={`text-[8px] px-2 py-0.5 rounded-full font-black uppercase tracking-widest ${product.itemType === 'service' ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400' : 'bg-blue-100 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400'}`}>
                        {product.itemType === 'service' ? 'Serviço' : 'Produto'}
                    </span>
                    {product.itemType === 'product' && product.condition && (
                        <span className={`text-[8px] px-2 py-0.5 rounded-full font-black uppercase tracking-widest ${product.condition === 'salvado' ? 'bg-red-100 text-red-600 dark:bg-red-900/20 dark:text-red-400' :
                                product.condition === 'usado' ? 'bg-orange-100 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400' :
                                    'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400'
                            }`}>
                            {product.condition}
                        </span>
                    )}
                </div>
            </div>

            <div className="mb-3 flex gap-3">
                {!isVariation && (
                    <div className="relative shrink-0">
                        {product.images?.[0] ? (
                            <img
                                src={product.images[0]}
                                alt=""
                                className="w-16 h-16 rounded-2xl object-cover border border-slate-100 dark:border-slate-800 shadow-sm"
                            />
                        ) : (
                            <div className="w-16 h-16 rounded-2xl bg-slate-50 dark:bg-slate-900 flex items-center justify-center text-slate-300 border border-slate-100 dark:border-slate-800">
                                <i className="bi bi-image text-xl"></i>
                            </div>
                        )}
                        {product.hasVariations && (
                            <div
                                className="absolute -top-1.5 -right-1.5 w-6 h-6 bg-indigo-600 text-white rounded-lg flex items-center justify-center shadow-lg border-2 border-white dark:border-slate-900 animate-in zoom-in duration-300"
                                title="Possui variações"
                            >
                                <i className="bi bi-layers-fill text-xs"></i>
                            </div>
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
                        {product.description}
                    </h3>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wide mt-1 leading-relaxed">
                        {getCategoryBreadcrumb(product.categoryIds || [], categoryTree)}
                    </p>
                </div>
            </div>

            <div className="flex justify-between items-end border-t border-slate-50 dark:border-slate-800/50 pt-2.5">
                <div className="flex flex-col">
                    <span className="text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest mb-0.5">
                        Preço
                    </span>
                    <span className="text-base font-black text-blue-600 dark:text-blue-400">
                        {formatCurrency(product.unitPrice || 0)}
                    </span>
                </div>

                {product.itemType !== 'service' && (
                    <div className="flex flex-col items-end">
                        <span className="text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest mb-0.5 text-right">
                            Estoque
                        </span>
                        <div className="flex items-baseline gap-1">
                            <span className={`text-sm font-black ${isLowStock ? 'text-red-500 dark:text-red-400' : 'text-slate-700 dark:text-slate-200'}`}>
                                {product.stock ?? 0}
                            </span>
                            <span className="text-[9px] text-slate-400 dark:text-slate-600 font-bold uppercase">
                                {product.unit}
                            </span>
                        </div>
                    </div>
                )}
            </div>

            <div className={`grid ${(!showTrash && !product.isParent) ? 'grid-cols-4' : 'grid-cols-3'} gap-1.5 mt-3`} onClick={(e) => e.stopPropagation()}>
                {showTrash ? (
                    <>
                        <button
                            onClick={() => onRestore(product.id!)}
                            className="flex flex-col items-center justify-center gap-1 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                        >
                            <i className="bi bi-arrow-counterclockwise text-base" />
                            <span className="text-[8px] font-black uppercase">Restaurar</span>
                        </button>
                        <button
                            onClick={() => onPermanentDelete(product.id!)}
                            className="flex flex-col items-center justify-center gap-1 py-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg col-span-2 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                        >
                            <i className="bi bi-trash3-fill text-base" />
                            <span className="text-[8px] font-black uppercase tracking-tighter">Excluir Permanente</span>
                        </button>
                    </>
                ) : (
                    <>
                        <button
                            onClick={() => onToggleActive(product.id!, product.active)}
                            className={`flex flex-col items-center justify-center gap-1 py-2 rounded-lg border transition-all ${product.active
                                ? 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-900/20 text-emerald-600 dark:text-emerald-400'
                                : 'bg-slate-50 dark:bg-slate-800 border-slate-100 dark:border-slate-700 text-slate-400'}`}
                        >
                            <i className={`bi ${product.active ? 'bi-toggle-on' : 'bi-toggle-off'} text-base`} />
                            <span className="text-[8px] font-black uppercase">{product.active ? 'Ativo' : 'Inativo'}</span>
                        </button>

                        <button
                            onClick={() => onEdit(product)}
                            className="flex flex-col items-center justify-center gap-1 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                        >
                            <i className="bi bi-pencil-fill text-base" />
                            <span className="text-[8px] font-black uppercase">Editar</span>
                        </button>

                        {!product.isParent && (
                            <button
                                onClick={(e) => { e.stopPropagation(); setIsSalesModalOpen(true); }}
                                className="flex flex-col items-center justify-center gap-1 py-2 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors"
                            >
                                <i className="bi bi-cart-check text-base" />
                                <span className="text-[8px] font-black uppercase">Vendas</span>
                            </button>
                        )}

                        <div className="relative">
                            <button
                                ref={menuAnchorRef}
                                onClick={(e) => { e.stopPropagation(); setIsMenuOpen(!isMenuOpen); }}
                                className={`flex flex-col items-center justify-center gap-1 py-2 w-full rounded-lg border transition-all ${isMenuOpen ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 text-indigo-600' : 'bg-slate-50 dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-400'}`}
                            >
                                <i className="bi bi-three-dots text-base" />
                                <span className="text-[8px] font-black uppercase">Mais</span>
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
                                            <i className="bi bi-box-seam text-emerald-500" />
                                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-700 dark:text-slate-200">Lançar Estoque</span>
                                        </button>
                                    )}

                                    {/* Opção de Migração - Apenas para simples ou variações */}
                                    {(product.isVariation || !product.hasVariations) && !product.isParent && (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setIsMenuOpen(false); setIsMigrationModalOpen(true); }}
                                            className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-950 transition-colors text-left group border-t border-slate-50 dark:border-slate-800/50"
                                        >
                                            <i className="bi bi-shuffle text-blue-500" />
                                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-700 dark:text-slate-200">Migrar Referências</span>
                                        </button>
                                    )}

                                    <button
                                        onClick={(e) => { e.stopPropagation(); setIsMenuOpen(false); onDelete(product.id!); }}
                                        className="flex items-center gap-3 px-4 py-2.5 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-left group border-t border-slate-50 dark:border-slate-800/50 mt-1"
                                    >
                                        <i className="bi bi-trash-fill text-red-500" />
                                        <span className="text-[10px] font-black uppercase tracking-widest text-red-600 dark:text-red-400">Excluir</span>
                                    </button>
                                </div>
                            </DropdownPortal>
                        </div>
                    </>
                )}
            </div>
            
            {/* Modal de Migração */}
            {isMigrationModalOpen && (
                <ProductMigrationModal
                    sourceProduct={product}
                    onClose={() => setIsMigrationModalOpen(false)}
                    onSuccess={() => onRefresh?.()}
                />
            )}

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
