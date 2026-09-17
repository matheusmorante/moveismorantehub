import React, { useRef, useState, useEffect } from 'react';
import { supabase } from '@/pages/utils/supabaseConfig';
import Product from '@/pages/types/product.type';
import { formatCurrency } from '@/pages/utils/formatters';
import { normalizeVariationSku } from '@/pages/utils/productVariationDefaults';
import DropdownPortal from '@/components/shared/DropdownPortal';
import { ChannelStatusBadges } from '../Shared/ChannelStatusBadges';
import { getVariationDisplayName } from '../../utils/getVariationDisplayName';
import type { CardVariationItem } from './ProductCardVariationList';
import { VariationItemActions } from './VariationItemActions';

interface ProductCardVariationItemProps {
    readonly product: Product;
    readonly variation: CardVariationItem;
    readonly index: number;
    readonly canManageCatalog: boolean;
    readonly isDraft: boolean;
    readonly exitedVariationIds?: ReadonlySet<string>;
    readonly activeVarMenuId: string | null;
    readonly checkingUsageId: string | null;
    readonly usageCache: Record<string, boolean>;
    readonly onSetActiveVarMenuId: (id: string | null) => void;
    readonly onEdit: (product: Product) => void;
    readonly onToggleActive: (id: string, currentStatus: boolean) => void;
    readonly onDeactivateCatalog: (id: string) => void;
    readonly onShowHistory?: (product: Product) => void;
    readonly onLaunchStock?: (product: Product) => void;
    readonly onMoveToAnotherFamily?: (variation: CardVariationItem) => void;
    readonly onMergeWithAnotherVariation?: (variation: CardVariationItem) => void;
    readonly onCheckAndAskDelete: (variationId: string) => void;
}

export const ProductCardVariationItem: React.FC<ProductCardVariationItemProps> = ({
    product,
    variation: v,
    index,
    canManageCatalog,
    isDraft,
    exitedVariationIds,
    activeVarMenuId,
    checkingUsageId,
    usageCache,
    onSetActiveVarMenuId,
    onEdit,
    onToggleActive,
    onDeactivateCatalog,
    onShowHistory,
    onLaunchStock,
    onMoveToAnotherFamily,
    onMergeWithAnotherVariation,
    onCheckAndAskDelete,
}) => {
    const varMenuRef = useRef<HTMLButtonElement | null>(null);
    const varName = getVariationDisplayName(v, `Variação #${index + 1}`);
    const targetVarCatalogId = v.id || '';
    
    const effectiveUnitPrice = (v.syncUnitPrice !== false && !v.unitPrice && product.unitPrice) ? product.unitPrice : (v.unitPrice || product.unitPrice || 0);
    const effectivePromoPrice = (v.syncPromoPrice !== false && !v.promoPrice && product.promoPrice) ? product.promoPrice : (v.promoPrice || 0);

    const hasPromo = Boolean(effectivePromoPrice && Number(effectivePromoPrice) > 0 && Number(effectivePromoPrice) < Number(effectiveUnitPrice));
    const displayPrice = hasPromo ? effectivePromoPrice : effectiveUnitPrice;

    const primaryImage = (v.images && v.images.length > 0 && v.images[0]) || (product.images && product.images.length > 0 && product.images[0]);
    const isMenuOpen = activeVarMenuId === (v.id || String(index));
    const isUsageChecking = checkingUsageId === v.id;
    const isUsed = usageCache[v.id || ''] === true;

    return (
        <div className="flex items-center justify-between py-2 px-1 border-b border-slate-100 dark:border-slate-800/60 last:border-b-0 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 rounded-lg transition-colors group/var">
            <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 overflow-hidden flex-shrink-0 flex items-center justify-center border border-slate-200/40">
                    {primaryImage ? (
                        <img src={primaryImage as string} alt={varName} className="w-full h-full object-cover" />
                    ) : (
                        <i className="bi bi-image text-slate-400 text-xs" />
                    )}
                </div>
                <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate">
                            {varName}
                        </span>
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
                            disabled={!!v.mergedToVariationId}
                            disabledReason={v.mergedToVariationId ? "Esta variação foi mesclada e seu status não pode ser alterado diretamente." : undefined}
                        />

                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[9px] font-mono text-slate-400">
                            {normalizeVariationSku(v.sku)}
                        </span>
                        {v.mergedToVariationId && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[7px] font-black uppercase tracking-wider bg-red-50 text-red-700 border border-red-200 dark:bg-red-950/20 dark:text-red-400 dark:border-red-900/30 select-none shrink-0" title="Esta variação foi mesclada e seu estoque transferido.">
                                <i className="bi bi-bezier2 text-red-500 dark:text-red-400" />
                                Mesclado em
                                <i className="bi bi-arrow-right ml-0.5 text-red-400 dark:text-red-500" />
                                <MergedVariationSku variationId={v.mergedToVariationId} />
                            </span>
                        )}
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-3 shrink-0">
                <div className="flex flex-col items-end">
                    {hasPromo && (
                        <span className="text-[9px] font-bold text-red-500 line-through decoration-red-500/50 -mb-0.5">
                            {formatCurrency(effectiveUnitPrice)}
                        </span>
                    )}
                    <span className="text-xs font-black text-slate-700 dark:text-slate-200">
                        {formatCurrency(displayPrice)}
                    </span>
                    <span className="text-[9px] font-bold text-slate-400 mt-0.5">
                        Estoque: {v.stock ?? 0}
                    </span>
                </div>

                <div className="relative">
                    <button
                        ref={varMenuRef}
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            const id = v.id || String(index);
                            onSetActiveVarMenuId(isMenuOpen ? null : id);
                        }}
                        className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                        aria-label="Ações da variação"
                    >
                        <i className="bi bi-three-dots-vertical text-xs" />
                    </button>

                    {isMenuOpen && (
                        <VariationItemActions
                            product={product}
                            variation={v}
                            anchorRef={{ current: varMenuRef.current }}
                            isMenuOpen={isMenuOpen}
                            isUsageChecking={isUsageChecking}
                            isUsed={isUsed}
                            onSetActiveVarMenuId={onSetActiveVarMenuId}
                            onEdit={onEdit}
                            onShowHistory={onShowHistory}
                            onLaunchStock={onLaunchStock}
                            onMoveToAnotherFamily={onMoveToAnotherFamily}
                            onMergeWithAnotherVariation={onMergeWithAnotherVariation}
                            onCheckAndAskDelete={onCheckAndAskDelete}
                        />
                    )}
                </div>
            </div>
        </div>
    );
};

const MergedVariationSku: React.FC<{ variationId: string }> = ({ variationId }) => {
    const [sku, setSku] = useState<string | null>(null);

    useEffect(() => {
        let active = true;
        supabase
            .from('product_variations')
            .select('sku')
            .eq('id', variationId)
            .single()
            .then(({ data }) => {
                if (active && data?.sku) {
                    setSku(data.sku);
                }
            });
        return () => {
            active = false;
        };
    }, [variationId]);

    if (!sku) return <span className="font-bold">...</span>;
    return <span className="font-bold text-[8px] tracking-widest">{normalizeVariationSku(sku)}</span>;
};
