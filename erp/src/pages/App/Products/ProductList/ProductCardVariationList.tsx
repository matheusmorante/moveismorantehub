import React from 'react';
import Product from '../../../types/product.type';
import { formatCurrency } from '../../../utils/formatters';
import { normalizeVariationSku } from '@/pages/utils/productVariationDefaults';
import DropdownPortal from '../../../../components/shared/DropdownPortal';
import { ChannelStatusBadges } from './ChannelStatusBadges';
import { getVariationDisplayName } from './getVariationDisplayName';

interface ProductCardVariationListProps {
    product: Product;
    variations: any[];
    showVariations: boolean;
    canManageCatalog: boolean;
    isDraft: boolean;
    exitedVariationIds?: Set<string>;
    onEdit: (product: any) => void;
    onToggleActive: (id: string, currentStatus: boolean) => void;
    onDeactivateCatalog: (id: string) => void;
    onShowHistory?: (product: any) => void;
    onLaunchStock?: (product: any) => void;
}

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
}) => {
    const [activeVarMenuId, setActiveVarMenuId] = React.useState<string | null>(null);
    const varMenuRefs = React.useRef<Record<string, HTMLButtonElement | null>>({});

    if (!showVariations || !variations || variations.length === 0) {
        return null;
    }

    return (
        <div className="mt-3 -mx-2.5 -mb-2.5 sm:-mx-3.5 sm:-mb-3.5 px-3 py-2.5 bg-white dark:bg-slate-900 border-t border-slate-200/80 dark:border-slate-800 rounded-b-2xl flex flex-col gap-1">
            {variations.map((v: any, index: number) => {
                const varName = getVariationDisplayName(v, `Variação #${index + 1}`);
                const varSku = normalizeVariationSku(v.sku || `${product.sku || product.code}-${String(index + 1).padStart(2, '0')}`);
                const targetVarCatalogId = `${product.id}_${varSku}`;
                const hasPromo = v.promoPrice && Number(v.promoPrice) > 0 && Number(v.promoPrice) < Number(v.unitPrice);
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
                                            onToggleActive(v.id || v.variationId, v.active !== false);
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

                        <div className="flex items-center gap-4 shrink-0" onClick={(e) => e.stopPropagation()}>
                            <div className="flex flex-col items-end">
                                {hasPromo && (
                                    <span className="text-[9px] text-red-500 dark:text-red-400 line-through font-bold leading-tight">
                                        {formatCurrency(v.unitPrice || 0)}
                                    </span>
                                )}
                                <span className="text-xs font-black text-blue-600 dark:text-blue-400">
                                    {formatCurrency(displayPrice)}
                                </span>
                                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">
                                    Estoque: {v.stock ?? 0} {v.unit}
                                </span>
                            </div>

                            <div className="flex items-center gap-1">
                                <button
                                    onClick={(e) => { e.stopPropagation(); onEdit(v); }}
                                    className="w-8 h-8 flex items-center justify-center bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition-all border border-slate-100 dark:border-slate-700 shrink-0 cursor-pointer"
                                    title="Editar Variação"
                                >
                                    <i className="bi bi-pencil text-xs" />
                                </button>

                                <div className="relative flex items-center">
                                    <button
                                        ref={el => { varMenuRefs.current[v.id] = el; }}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setActiveVarMenuId(activeVarMenuId === v.id ? null : v.id);
                                        }}
                                        className="w-8 h-8 flex items-center justify-center bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all border border-slate-100 dark:border-slate-700 shrink-0 cursor-pointer"
                                        title="Opções da Variação"
                                    >
                                        <i className="bi bi-three-dots text-xs" />
                                    </button>

                                    <DropdownPortal
                                        isOpen={activeVarMenuId === v.id}
                                        onClose={() => setActiveVarMenuId(null)}
                                        anchorRef={{ current: varMenuRefs.current[v.id] }}
                                        className="min-w-[160px]"
                                    >
                                        <div 
                                            className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-2xl py-2 flex flex-col z-[9999] animate-slide-up"
                                            onMouseLeave={() => setActiveVarMenuId(null)}
                                        >
                                            <button
                                                onClick={(e) => { e.stopPropagation(); setActiveVarMenuId(null); onEdit(v); }}
                                                className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-950 transition-colors text-left group cursor-pointer"
                                            >
                                                <i className="bi bi-pencil-fill text-blue-500" />
                                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-700 dark:text-slate-200">Editar</span>
                                            </button>
                                            {onShowHistory && (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); setActiveVarMenuId(null); onShowHistory(v); }}
                                                    className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-950 transition-colors text-left group cursor-pointer"
                                                >
                                                    <i className="bi bi-clock-history text-amber-500" />
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-700 dark:text-slate-200">Histórico de Preços</span>
                                                </button>
                                            )}
                                            {product.itemType !== 'service' && onLaunchStock && (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); setActiveVarMenuId(null); onLaunchStock?.(v); }}
                                                    className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-950 transition-colors text-left group cursor-pointer"
                                                >
                                                    <span className="flex items-center gap-0.5 text-emerald-500">
                                                        <i className="bi bi-box-seam-fill" />
                                                        <i className="bi bi-arrow-left-right text-[9px]" />
                                                    </span>
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-700 dark:text-slate-200">Movimentações de Estoque</span>
                                                </button>
                                            )}
                                        </div>
                                    </DropdownPortal>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};
