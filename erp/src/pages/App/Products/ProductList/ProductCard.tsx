import React from "react";
import Product from "../../../types/product.type";
import { formatCurrency } from "../../../utils/formatters";
import { getCategoryBreadcrumb } from '@/pages/utils/categoryService';
import DropdownPortal from "../../../../components/shared/DropdownPortal";
import ProductSalesModal from "../components/ProductSalesModal";
import { supabase } from '@/pages/utils/supabaseConfig';

let oppCache: Record<string, string> | null = null;
let oppPromise: Promise<Record<string, string>> | null = null;

const fetchOppMap = async () => {
    if (oppCache) return oppCache;
    if (!oppPromise) {
        oppPromise = supabase.from('opportunities').select('id, name').then(({ data }) => {
            const map: Record<string, string> = {};
            if (data) {
                data.forEach((item: any) => { map[item.id] = item.name; });
            }
            oppCache = map;
            return map;
        });
    }
    return oppPromise;
};

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
    const [showVariations, setShowVariations] = React.useState(false);
    const [activeVarMenuId, setActiveVarMenuId] = React.useState<string | null>(null);
    const menuAnchorRef = React.useRef<HTMLButtonElement>(null);
    const varMenuRefs = React.useRef<Record<string, HTMLButtonElement | null>>({});
    const isLowStock = (product.stock || 0) <= (product.minStock || 0);
    const isParent = product.isParent;
    const isVariation = product.isVariation || !!product.parentId;
    const isCatalogActive = product.status === 'published';

    const [oppName, setOppName] = React.useState<string | null>(
        product.opportunityName || product.opportunity?.name || null
    );

    React.useEffect(() => {
        let isMounted = true;
        if (product.opportunityId) {
            fetchOppMap().then(map => {
                if (isMounted && map[product.opportunityId!]) {
                    setOppName(map[product.opportunityId!]);
                }
            });
        } else {
            setOppName(product.opportunityName || product.opportunity?.name || null);
        }
        return () => { isMounted = false; };
    }, [product.opportunityId, product.opportunityName, product.opportunity]);

    // Process attributes text if variation
    let variationName = '';
    if (isVariation) {
        if (product.attributes && Array.isArray(product.attributes)) {
            variationName = product.attributes.map((attr: any) => attr.value).filter(Boolean).join(' ');
        } else if (product.attributes && typeof product.attributes === 'object') {
            variationName = Object.values(product.attributes).filter(Boolean).join(' ');
        }
        if (!variationName) {
            variationName = (product as any).displayName || product.name || '';
        }
    }

    return (
        <div
            className={`border rounded-xl p-3 shadow-sm transition-all relative
                ${isSelected ? 'border-blue-500 ring-1 ring-blue-500' : 
                  isParent ? 'border-slate-200 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/10' :
                  isVariation ? 'border-slate-200 dark:border-slate-800 ml-5 bg-slate-50/60 dark:bg-slate-900/40' :
                  'border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900'}`}
        >
            <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2">
                    {product.code ? (
                        <span className="font-mono text-[9px] text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-800/50 px-1.5 py-0.5 rounded border border-slate-100 dark:border-slate-800">
                            {product.code}
                        </span>
                    ) : null}
                    {!isVariation && (
                        <span className={`text-[8px] px-2 py-0.5 rounded-full font-black uppercase tracking-widest ${product.itemType === 'service' ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400' : 'bg-blue-100 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400'}`}>
                            {product.itemType === 'service' ? 'Serviço' : 'Produto'}
                        </span>
                    )}
                </div>

                <div className="flex gap-1.5 items-center" onClick={(e) => e.stopPropagation()}>
                    {!showTrash && (
                        <div className="relative flex items-center gap-1">
                            <button
                                onClick={(e) => { e.stopPropagation(); onEdit(product); }}
                                className="w-8 h-8 flex items-center justify-center bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition-all border border-slate-100 dark:border-slate-700 shrink-0"
                                title="Editar Produto"
                            >
                                <i className="bi bi-pencil text-xs" />
                            </button>

                            <button
                                ref={menuAnchorRef}
                                onClick={(e) => { e.stopPropagation(); setIsMenuOpen(!isMenuOpen); }}
                                className={`w-8 h-8 flex items-center justify-center rounded-lg transition-all border shrink-0 ${isMenuOpen ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 text-indigo-600' : 'bg-slate-50 dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-400 hover:text-slate-600 hover:bg-slate-100'}`}
                                title="Opções"
                            >
                                <i className="bi bi-three-dots text-xs" />
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
                                    <button
                                        onClick={(e) => { e.stopPropagation(); setIsMenuOpen(false); onEdit(product); }}
                                        className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-950 transition-colors text-left group"
                                    >
                                        <i className="bi bi-pencil-fill text-blue-500" />
                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-700 dark:text-slate-200">Editar</span>
                                    </button>

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
                        {isVariation 
                            ? (variationName || product.name || product.title || "-")
                            : (product.name || product.title || (product.description ? product.description.split('\n')[0].substring(0, 120) : "-"))}
                    </h3>
                    {!isVariation && (
                        <div className="flex items-center flex-wrap gap-2 mt-1 leading-relaxed">
                            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wide">
                                {getCategoryBreadcrumb(product.categoryIds || [], categoryTree)}
                            </span>
                        </div>
                    )}
                    <div className="flex justify-between items-center gap-2 mt-2 w-full">
                        <div className="flex flex-wrap gap-1.5 items-center">
                            {product.isDraft && (
                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[8px] font-black uppercase tracking-wider border bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700">
                                    <i className="bi bi-file-earmark-text" /> Rascunho
                                </span>
                            )}
                            {!isParent && (
                                <button onClick={(e) => { e.stopPropagation(); onDeactivateCatalog(product.id!); }} title="Clique para alternar status no Catálogo Digital" className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[8px] font-black uppercase tracking-wider border cursor-pointer hover:opacity-90 ${isCatalogActive ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30' : 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/20 dark:text-red-400 dark:border-red-900/30'}`}>
                                    <span className={`w-1.5 h-1.5 rounded-full ${isCatalogActive ? 'bg-emerald-500' : 'bg-red-500'}`} />
                                    Catálogo · {isCatalogActive ? 'Publicado' : 'Ocultado'}
                                </button>
                            )}
                            {oppName && (
                                <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[8px] font-black uppercase tracking-wider bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300/80 dark:border-amber-800/60 select-none shadow-2xs">
                                    <i className="bi bi-fire text-amber-600 dark:text-amber-400 text-[9px]" />
                                    {oppName}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {!isParent && (
            <div className="flex justify-between items-end border-t border-slate-50 dark:border-slate-800/50 pt-2.5">
                <div className="flex flex-col">
                    {product.promoPrice && Number(product.promoPrice) > 0 && Number(product.promoPrice) < Number(product.unitPrice) ? (
                        <span className="text-[10px] text-red-500 dark:text-red-400 line-through font-bold leading-tight">
                            {formatCurrency(product.unitPrice || 0)}
                        </span>
                    ) : null}
                    <span className={`text-base font-black ${isParent ? 'text-slate-400 dark:text-slate-500' : 'text-blue-600 dark:text-blue-400'}`}>
                        {isParent ? '-' : formatCurrency((product.promoPrice && Number(product.promoPrice) > 0 && Number(product.promoPrice) < Number(product.unitPrice)) ? product.promoPrice : (product.unitPrice || 0))}
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

            {showTrash && (
                <div className="mt-3" onClick={(e) => e.stopPropagation()}>
                    <button
                        onClick={() => onRestore(product.id!)}
                        className="flex flex-col items-center justify-center gap-1 py-2 w-full bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-colors font-bold"
                    >
                        <i className="bi bi-check-circle-fill text-base" />
                        <span className="text-[9px] font-black uppercase">Ativar Produto</span>
                    </button>
                </div>
            )}

            {isSalesModalOpen && (
                <ProductSalesModal 
                    product={product}
                    onClose={() => setIsSalesModalOpen(false)}
                />
            )}

            {/* Se for pai, renderiza a lista de filhos sempre abertas */}
            {isParent && (product as any).allVariations && (product as any).allVariations.length > 0 && (
                <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex flex-col gap-2">
                    {(product as any).allVariations.map((v: any) => {
                        const varName = v.attributes && Array.isArray(v.attributes)
                            ? v.attributes.map((attr: any) => attr.value).filter(Boolean).join(' ')
                            : v.attributes && typeof v.attributes === 'object'
                            ? Object.values(v.attributes).filter(Boolean).join(' ')
                            : v.displayName || v.name || '';

                        return (
                            <div 
                                key={v.id} 
                                className="flex items-center justify-between py-1.5 px-2 hover:bg-slate-50 dark:hover:bg-slate-800/40 rounded-xl transition-colors group/var"
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
                                            <div className="flex gap-1 shrink-0">
                                                <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[7px] font-black uppercase tracking-wider border ${v.status === 'published' ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30' : 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/20 dark:text-red-400 dark:border-red-900/30'}`}>
                                                    <span className={`w-1 h-1 rounded-full ${v.status === 'published' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                                                    Catálogo · {v.status === 'published' ? 'Publicado' : 'Ocultado'}
                                                </span>
                                            </div>
                                        </div>
                                        <span className="text-[9px] font-mono text-slate-400">
                                            {v.sku}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4 shrink-0" onClick={(e) => e.stopPropagation()}>
                                    <div className="flex flex-col items-end">
                                        {v.promoPrice && Number(v.promoPrice) > 0 && Number(v.promoPrice) < Number(v.unitPrice) ? (
                                            <span className="text-[9px] text-red-500 dark:text-red-400 line-through font-bold leading-tight">
                                                {formatCurrency(v.unitPrice || 0)}
                                            </span>
                                        ) : null}
                                        <span className="text-xs font-black text-blue-600 dark:text-blue-400">
                                            {formatCurrency((v.promoPrice && Number(v.promoPrice) > 0 && Number(v.promoPrice) < Number(v.unitPrice)) ? v.promoPrice : (v.unitPrice || 0))}
                                        </span>
                                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">
                                            Estoque: {v.stock ?? 0} {v.unit}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); onEdit(v); }}
                                            className="w-8 h-8 flex items-center justify-center bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition-all border border-slate-100 dark:border-slate-700 shrink-0"
                                            title="Editar Variação"
                                        >
                                            <i className="bi bi-pencil text-xs" />
                                        </button>

                                        <div className="relative flex items-center">
                                            <button
                                                ref={el => varMenuRefs.current[v.id] = el}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setActiveVarMenuId(activeVarMenuId === v.id ? null : v.id);
                                                }}
                                                className="w-8 h-8 flex items-center justify-center bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all border border-slate-100 dark:border-slate-700 shrink-0"
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
                                                        className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-950 transition-colors text-left group"
                                                    >
                                                        <i className="bi bi-pencil-fill text-blue-500" />
                                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-700 dark:text-slate-200">Editar</span>
                                                    </button>
                                                    {onShowHistory && (
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); setActiveVarMenuId(null); onShowHistory(v); }}
                                                            className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-950 transition-colors text-left group"
                                                        >
                                                            <i className="bi bi-clock-history text-amber-500" />
                                                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-700 dark:text-slate-200">Histórico de Preços</span>
                                                        </button>
                                                    )}
                                                    {product.itemType !== 'service' && onLaunchStock && (
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); setActiveVarMenuId(null); onLaunchStock?.(v); }}
                                                            className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-950 transition-colors text-left group"
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
            )}
        </div>
    );
};

export default ProductCard;
