import React, { useState, useRef } from 'react';
import Product from '@/pages/types/product.type';
import { formatCurrency } from '@/pages/utils/formatters';
import { normalizeVariationSku } from '@/pages/utils/productVariationDefaults';
import DropdownPortal from '@/components/shared/DropdownPortal';
import { ChannelStatusBadges } from './ChannelStatusBadges';
import { getVariationDisplayName } from '../utils/getVariationDisplayName';

export interface CardVariationItem {
    id?: string;
    variationId?: string;
    sku?: string | null;
    name?: string;
    displayName?: string;
    unitPrice?: number;
    promoPrice?: number;
    stock?: number;
    active?: boolean;
    status?: Product['status'];
    images?: string[];
    attributes?: unknown[];
}

export interface ProductCardVariationListProps {
    readonly product: Product;
    readonly variations: readonly CardVariationItem[];
    readonly showVariations: boolean;
    readonly canManageCatalog: boolean;
    readonly isDraft: boolean;
    readonly exitedVariationIds?: ReadonlySet<string>;
    readonly onEdit: (product: Product) => void;
    readonly onToggleActive: (id: string, currentStatus: boolean) => void;
    readonly onDeactivateCatalog: (id: string) => void;
    readonly onShowHistory?: (product: Product) => void;
    readonly onLaunchStock?: (product: Product) => void;
    readonly onMoveToAnotherFamily?: (variation: CardVariationItem) => void;
    readonly onMergeWithAnotherVariation?: (variation: CardVariationItem) => void;
}

/**
 * Lista expansível de variações filhas exibida no rodapé do Card de Produto.
 */
export const ProductCardVariationList: React.FC<ProductCardVariationListProps> = ({
    product,
    variations,
    showVariations,
    canManageCatalog,
    isDraft,
    exitedVariationIds,
    onEdit,
    onToggleActive,
    onDeactivateCatalog,
    onShowHistory,
    onLaunchStock,
    onMoveToAnotherFamily,
    onMergeWithAnotherVariation,
}) => {
    const [activeVarMenuId, setActiveVarMenuId] = useState<string | null>(null);
    const varMenuRefs = useRef<Record<string, HTMLButtonElement | null>>({});

    if (!showVariations || !variations || variations.length === 0) {
        return null;
    }

    return (
        <div className="mt-3 -mx-2.5 -mb-2.5 sm:-mx-3.5 sm:-mb-3.5 px-3 py-2.5 bg-white dark:bg-slate-900 border-t border-slate-200/80 dark:border-slate-800 rounded-b-2xl flex flex-col gap-1">
            {variations.map((v, index) => {
                const varName = getVariationDisplayName(v, `Variação #${index + 1}`);
                const targetVarCatalogId = v.id || '';
                const hasPromo = Boolean(v.promoPrice && Number(v.promoPrice) > 0 && Number(v.promoPrice) < Number(v.unitPrice));
                const displayPrice = hasPromo ? v.promoPrice : (v.unitPrice || 0);

                return (
                    <div 
                        key={v.id || index} 
                        className="flex items-center justify-between py-2 px-1 border-b border-slate-100 dark:border-slate-800/60 last:border-b-0 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 rounded-lg transition-colors group/var"
                    >
                        <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 overflow-hidden flex-shrink-0 flex items-center justify-center border border-slate-200/40">
                                {v.images && v.images.length > 0 && v.images[0] ? (
                                    <img src={v.images[0]} alt={varName} className="w-full h-full object-cover" />
                                ) : (
                                    <i className="bi bi-image text-slate-400 text-xs" />
                                )}
                            </div>
                            <div className="flex flex-col min-w-0">
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate">
                                        {varName}
                                    </span>
                                    {/* Selo: Saída Lançada via Pedido */}
                                    {exitedVariationIds?.has(String(v.variationId || v.id)) && (
                                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[7px] font-black uppercase tracking-wider bg-orange-50 text-orange-700 border border-orange-200 dark:bg-orange-950/20 dark:text-orange-400 dark:border-orange-900/30 select-none shrink-0">
                                            <i className="bi bi-box-arrow-right text-orange-500 dark:text-orange-400" />
                                            Saída Lançada
                                        </span>
                                    )}
                                    <ChannelStatusBadges
                                        active={v.active !== false && product.active !== false}
                                        catalogStatus={v.status}
                                        isParent={false}
                                        canManageCatalog={canManageCatalog}
                                        isDraft={isDraft}
                                        onToggleActive={(e) => {
                                            e.stopPropagation();
                                            onToggleActive(v.id || v.variationId || '', v.active !== false);
                                        }}
                                        onToggleCatalog={(e) => {
                                            e.stopPropagation();
                                            onDeactivateCatalog(targetVarCatalogId);
                                        }}
                                        size="xs"
                                    />
                                </div>
                                <span className="text-[9px] font-mono text-slate-400">
                                    {normalizeVariationSku(v.sku)}
                                </span>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                            <div className="flex flex-col items-end">
                                <span className="text-xs font-black text-slate-700 dark:text-slate-200">
                                    {formatCurrency(displayPrice)}
                                </span>
                                <span className="text-[9px] font-bold text-slate-400">
                                    Estoque: {v.stock ?? 0}
                                </span>
                            </div>

                            <div className="relative">
                                <button
                                    ref={(el) => { varMenuRefs.current[v.id || String(index)] = el; }}
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        const id = v.id || String(index);
                                        setActiveVarMenuId(activeVarMenuId === id ? null : id);
                                    }}
                                    className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                                    aria-label="Ações da variação"
                                >
                                    <i className="bi bi-three-dots-vertical text-xs" />
                                </button>

                                {activeVarMenuId === (v.id || String(index)) && (
                                    <DropdownPortal
                                        isOpen={true}
                                        anchorRef={{ current: varMenuRefs.current[v.id || String(index)] }}
                                        onClose={() => setActiveVarMenuId(null)}
                                        className="w-48 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-100 dark:border-slate-700 py-1.5 z-50 text-xs font-bold text-slate-700 dark:text-slate-200"
                                    >
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setActiveVarMenuId(null);
                                                onEdit(product);
                                            }}
                                            className="w-full px-3.5 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2 cursor-pointer"
                                        >
                                            <i className="bi bi-pencil text-slate-400" />
                                            Editar Produto
                                        </button>
                                        {onShowHistory && (
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setActiveVarMenuId(null);
                                                    onShowHistory({ ...product, selectedVariationId: v.id });
                                                }}
                                                className="w-full px-3.5 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2 cursor-pointer"
                                            >
                                                <i className="bi bi-clock-history text-slate-400" />
                                                Histórico de Preços
                                            </button>
                                        )}
                                        {onLaunchStock && (
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setActiveVarMenuId(null);
                                                    onLaunchStock({ ...product, selectedVariationId: v.id });
                                                }}
                                                className="w-full px-3.5 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2 cursor-pointer"
                                            >
                                                <i className="bi bi-box-seam text-slate-400" />
                                                Lançar Estoque
                                            </button>
                                        )}
                                        {onMoveToAnotherFamily && (
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setActiveVarMenuId(null);
                                                    onMoveToAnotherFamily(v);
                                                }}
                                                className="w-full px-3.5 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2 cursor-pointer text-indigo-600 dark:text-indigo-400"
                                            >
                                                <i className="bi bi-arrow-left-right" />
                                                Mover para Outro Pai
                                            </button>
                                        )}
                                        {onMergeWithAnotherVariation && (
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setActiveVarMenuId(null);
                                                    onMergeWithAnotherVariation(v);
                                                }}
                                                className="w-full px-3.5 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2 cursor-pointer text-violet-600 dark:text-violet-400"
                                            >
                                                <i className="bi bi-intersect" />
                                                Fundir Variação
                                            </button>
                                        )}
                                    </DropdownPortal>
                                )}
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default ProductCardVariationList;
