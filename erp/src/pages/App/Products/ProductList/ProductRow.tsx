import React from "react";
import { Link } from "react-router-dom";
import Product, { ProductVisibilitySettings } from "../../../types/product.type";
import { formatCurrency } from "../../../utils/formatters";
import { getCategoryBreadcrumb } from '@/pages/utils/categoryService';
import DropdownPortal from "../../../../components/shared/DropdownPortal";
import LabelPrintSelectionModal, { LabelPrintType } from "../components/LabelPrintSelectionModal";
import ProductSalesModal from "../components/ProductSalesModal";
import { supabase } from '@/pages/utils/supabaseConfig';
import { normalizeVariationSku } from '@/pages/utils/productVariationDefaults';
import { ChannelStatusBadges } from './ChannelStatusBadges';

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

let supplierCache: Record<string, string> | null = null;
let supplierPromise: Promise<Record<string, string>> | null = null;

const fetchSupplierMap = async (): Promise<Record<string, string>> => {
    if (supplierCache) return supplierCache;
    if (!supplierPromise) {
        supplierPromise = (async () => {
            const { data } = await supabase
                .from('people')
                .select('id, full_name, nickname, social_name')
                .or('person_type.ilike.suppliers,person_type.ilike.supplier');
            const map: Record<string, string> = {};
            if (data) {
                data.forEach((item: any) => {
                    map[item.id] = item.nickname || item.full_name || item.social_name || '';
                });
            }
            supplierCache = map;
            return map;
        })();
    }
    return supplierPromise;
};

interface ProductRowProps {
    product: Product;
    onEdit: (product: Product) => void;
    onDelete: (id: string) => void;
    onRestore: (id: string) => void;
    onPermanentDelete: (id: string) => void;
    onToggleActive: (id: string, currentStatus: boolean) => void;
    onDeactivateCatalog: (id: string) => void;
    onShowHistory?: (product: Product) => void;
    onLaunchStock?: (product: any) => void;
    visibilitySettings: ProductVisibilitySettings;
    showTrash?: boolean;
    orderedColumnKeys?: string[];
    isSelected?: boolean;
    onToggleSelection?: () => void;
    categoryTree?: any;
    onRefresh?: () => void;
    onDuplicate?: (product: Product) => void;
    exitedVariationIds?: Set<string>;
    hasVariations?: boolean;
    isExpanded?: boolean;
    onToggleExpand?: () => void;
    variationsCount?: number;
}

import { SendWhatsAppModal } from '@/components/shared/SendWhatsAppModal';

const ProductRow = ({
    product,
    onEdit,
    onDelete,
    onRestore,
    onPermanentDelete,
    onToggleActive,
    onDeactivateCatalog,
    onShowHistory,
    onLaunchStock,
    visibilitySettings,
    showTrash,
    orderedColumnKeys,
    categoryTree,
    onRefresh,
    onDuplicate,
    exitedVariationIds,
    hasVariations,
    isExpanded,
    onToggleExpand,
    variationsCount
}: ProductRowProps) => {
    const [isMenuOpen, setIsMenuOpen] = React.useState(false);
    const [labelModal, setLabelModal] = React.useState<{ open: boolean; type: LabelPrintType }>({ open: false, type: 'identification' });
    const [isSalesModalOpen, setIsSalesModalOpen] = React.useState(false);
    const [whatsAppModal, setWhatsAppModal] = React.useState<{ open: boolean; message: string }>({ open: false, message: '' });
    const menuAnchorRef = React.useRef<HTMLButtonElement>(null);
    const isDraft = Boolean(product.isDraft) || Boolean((product as any).is_draft) || product.status === 'draft';
    const canManageCatalog = !isDraft && product.active !== false;

    const [oppName, setOppName] = React.useState<string | null>(
        product.opportunityName || product.opportunity?.name || null
    );
    const [supplierNames, setSupplierNames] = React.useState<string[]>([]);

    React.useEffect(() => {
        let isMounted = true;
        if (product.opportunityId) {
            fetchOppMap().then(map => {
                if (isMounted && map[product.opportunityId!]) {
                    setOppName(map[product.opportunityId!]);
                }
            });
        } else {
            setOppName(null);
        }
        return () => { isMounted = false; };
    }, [product.opportunityId, product.opportunityName]);

    React.useEffect(() => {
        let isMounted = true;
        const rawIds = [
            product.mainSupplierId,
            product.supplierId,
            (product as any).main_supplier_id,
            (product as any).supplier_id,
            ...(product.supplierIds || (product as any).supplier_ids || [])
        ];
        const sIds = Array.from(new Set(rawIds.filter(Boolean))).map(String);

        if (sIds.length > 0) {
            fetchSupplierMap().then(map => {
                if (!isMounted) return;
                const resolvedNames: string[] = [];
                sIds.forEach(id => {
                    if (map && map[id]) resolvedNames.push(map[id]);
                });
                if (resolvedNames.length === 0) {
                    const fallback = (product as any).supplierName || (product as any).supplier?.name || null;
                    if (fallback) resolvedNames.push(fallback);
                }
                setSupplierNames(Array.from(new Set(resolvedNames)));
            });
        } else {
            const fallback = (product as any).supplierName || (product as any).supplier?.name || null;
            setSupplierNames(fallback ? [fallback] : []);
        }
        return () => { isMounted = false; };
    }, [
        product.mainSupplierId,
        product.supplierId,
        (product as any).main_supplier_id,
        (product as any).supplier_id,
        JSON.stringify(product.supplierIds || (product as any).supplier_ids || [])
    ]);

    let firstCellRendered = false;

    const renderCell = (key: string) => {
        if (!visibilitySettings[key as keyof ProductVisibilitySettings]) return null;

        const isFirst = !firstCellRendered;
        if (isFirst) firstCellRendered = true;
        const firstCellBorder = '';

        switch (key) {
            case 'id':
                return (
                    <td key="id" className={`px-3 py-3 text-left w-[1%] whitespace-nowrap ${firstCellBorder}`}>
                        <span className="font-mono text-xs text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-lg">
                            {product.id || "-"}
                        </span>
                    </td>
                );
            case 'sku':
                return (
                    <td key="sku" className={`px-3 py-3 text-left w-[1%] whitespace-nowrap ${isChildVar && !visibilitySettings.description ? 'pl-8' : ''} ${firstCellBorder}`}>
                        <div className="flex items-center gap-1.5">
                            {hasVariations && !visibilitySettings.description && (
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onToggleExpand?.();
                                    }}
                                    className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
                                        isExpanded
                                            ? 'bg-slate-300 dark:bg-slate-700 text-slate-800 dark:text-slate-100 shadow-xs'
                                            : 'bg-slate-200 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600'
                                    }`}
                                    title={isExpanded ? "Ocultar Variações" : "Mostrar Variações"}
                                >
                                    <i className={`bi bi-chevron-${isExpanded ? 'down' : 'right'} text-xs font-black`} />
                                </button>
                            )}
                            {isChildVar && !visibilitySettings.description && (
                                <span className="text-slate-400 dark:text-slate-500 font-mono text-[10px] select-none mr-0.5">↳</span>
                            )}
                            <span className="font-bold text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-1 rounded-lg">
                                {normalizeVariationSku(product.sku || product.code) || "-"}
                            </span>
                        </div>
                    </td>
                );
            case 'code':
                return (
                    <td key="code" className={`px-3 py-3 text-left w-[1%] whitespace-nowrap ${isChildVar && !visibilitySettings.description ? 'pl-8' : ''} ${firstCellBorder}`}>
                        <div className="flex items-center gap-1.5">
                            {hasVariations && !visibilitySettings.description && (
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onToggleExpand?.();
                                    }}
                                    className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
                                        isExpanded
                                            ? 'bg-slate-300 dark:bg-slate-700 text-slate-800 dark:text-slate-100 shadow-xs'
                                            : 'bg-slate-200 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600'
                                    }`}
                                    title={isExpanded ? "Ocultar Variações" : "Mostrar Variações"}
                                >
                                    <i className={`bi bi-chevron-${isExpanded ? 'down' : 'right'} text-xs font-black`} />
                                </button>
                            )}
                            {isChildVar && !visibilitySettings.description && (
                                <span className="text-slate-400 dark:text-slate-500 font-mono text-[10px] select-none mr-0.5">↳</span>
                            )}
                            <span className="font-mono text-xs text-blue-600 dark:text-blue-400 font-bold bg-blue-50 dark:bg-blue-900/30 px-2.5 py-1 rounded-lg inline-block font-mono">
                                {normalizeVariationSku(product.sku || product.code) || "-"}
                            </span>
                        </div>
                    </td>
                );
            case 'description':
                let displayName = product.name || product.title || (product.description ? product.description.split('\n')[0].substring(0, 120) : "-");
                const isChildVariation = product.isVariation || !!product.parentId;
                if (isChildVariation) {
                    let variationName = '';
                    if (product.attributes && Array.isArray(product.attributes)) {
                        variationName = product.attributes.map((attr: any) => attr.value).filter(Boolean).join(' ');
                    } else if (product.attributes && typeof product.attributes === 'object') {
                        variationName = Object.values(product.attributes).filter(Boolean).join(' ');
                    }
                    if (!variationName) {
                        variationName = (product as any).displayName || product.name || '';
                    }
                    if (variationName) {
                        displayName = variationName;
                    }
                }
                return (
                    <td key="description" className={`px-3 py-3 text-left min-w-[520px] ${firstCellBorder}`}>
                        <div className="flex items-center gap-2 sm:gap-3">
                            {hasVariations && (
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onToggleExpand?.();
                                    }}
                                    className={`w-6 h-6 rounded-lg shrink-0 flex items-center justify-center transition-all cursor-pointer ${
                                        isExpanded
                                            ? 'bg-slate-300 dark:bg-slate-700 text-slate-800 dark:text-slate-100 shadow-xs'
                                            : 'bg-slate-200 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600'
                                    }`}
                                    title={isExpanded ? "Ocultar Variações" : "Mostrar Variações"}
                                >
                                    <i className={`bi bi-chevron-${isExpanded ? 'down' : 'right'} text-xs font-black`} />
                                </button>
                            )}
                            {isChildVar && (
                                <span className="text-slate-400 dark:text-slate-500 font-mono text-[10px] select-none ml-4 mr-0.5">↳</span>
                            )}
                            <div className="flex items-center gap-3 transition-all duration-300">
                                {!product.isParent && (
                                    <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 overflow-hidden flex-shrink-0 flex items-center justify-center border border-slate-200/60 dark:border-slate-800">
                                        {product.images && product.images.length > 0 && product.images[0] ? (
                                            <img 
                                                src={product.images[0]}
                                                alt={displayName} 
                                                className="w-full h-full object-cover"
                                                onError={(e) => {
                                                    (e.target as HTMLElement).style.display = 'none';
                                                    if ((e.target as HTMLElement).parentElement) {
                                                        (e.target as HTMLElement).parentElement!.innerHTML = '<i class="bi bi-image text-slate-400 text-base"></i>';
                                                    }
                                                }}
                                            />
                                        ) : (
                                            <i className="bi bi-image text-slate-400 text-base" />
                                        )}
                                    </div>
                                )}

                                <div className="flex flex-col">
                                    {/* Linha 1: Título do produto */}
                                    <span className={`text-sm ${isChildVariation ? 'font-semibold text-slate-800 dark:text-slate-200' : product.isParent ? 'font-bold text-slate-900 dark:text-slate-100' : 'font-bold text-slate-700 dark:text-slate-200'}`}>
                                        {displayName}
                                    </span>
                                    {/* Linha 2 (abaixo do título): contagem de variações + oportunidade + fornecedores */}
                                    {(product.isParent || oppName || supplierNames.length > 0) && (
                                    <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                                        {product.isParent && Boolean(variationsCount || ((product as any).allVariations?.length)) && (
                                            <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60 select-none">
                                                <i className="bi bi-layers text-[9px]" />
                                                {(() => {
                                                    const count = variationsCount ?? ((product as any).allVariations?.length || 0);
                                                    return `${count} ${count === 1 ? 'variação' : 'variações'}`;
                                                })()}
                                            </span>
                                        )}
                                        {!isChildVariation && oppName && (
                                            <span className="inline-flex items-center gap-1 bg-amber-100 dark:bg-amber-955/70 text-amber-800 dark:text-amber-300 px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider border border-amber-300 dark:border-amber-700/80">
                                                <i className="bi bi-fire text-amber-600 dark:text-amber-400"></i> {oppName}
                                            </span>
                                        )}
                                        {!isChildVariation && supplierNames.map((supName, sIdx) => (
                                            <span key={sIdx} className="inline-flex items-center gap-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider border border-slate-200 dark:border-slate-700">
                                                <i className="bi bi-truck text-slate-400 dark:text-slate-500"></i> {supName}
                                            </span>
                                        ))}
                                    </div>
                                    )}
                                    {(product.active === false || product.deleted) && !(Boolean(product.isDraft) || product.status === 'draft') && (
                                        <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider text-rose-600 dark:text-rose-400 mt-0.5">
                                            <i className="bi bi-slash-circle text-rose-500"></i> Desativado
                                        </span>
                                    )}
                                    <div className="flex items-center gap-2 mt-1">
                                        {/* Selo: Saída Lançada via Pedido */}
                                        {isChildVariation && exitedVariationIds?.has(String((product as any).variationId)) && (
                                            <span className="flex items-center gap-1 bg-orange-50 dark:bg-orange-950/20 text-orange-700 dark:text-orange-400 px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest border border-orange-200 dark:border-orange-900/30 select-none">
                                                <i className="bi bi-box-arrow-right"></i> Saída Lançada
                                            </span>
                                        )}
                                        {(Boolean(product.isDraft) || product.status === 'draft') && (
                                            <span className="flex items-center gap-1 bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest border border-amber-200 dark:border-amber-800">
                                                <i className="bi bi-file-earmark-text"></i> Rascunho
                                            </span>
                                        )}
                                        {product.itemType === 'service' ? (
                                            <span className="flex items-center gap-1 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest border border-amber-100 dark:border-amber-900/30">
                                                <i className="bi bi-tools"></i> Serviço
                                            </span>
                                        ) : (
                                            product.isCombo && (
                                                <span className="flex items-center gap-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest border border-purple-200 dark:border-purple-900/40 shadow-sm animate-pulse-slow">
                                                    <i className="bi bi-layers-fill"></i> Combo/Jogo
                                                </span>
                                            )
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </td>
                );

            case 'costPrice':
                if (product.isParent) return <td key="costPrice" className={`px-3 py-3 ${firstCellBorder}`}></td>;
                return (
                    <td key="costPrice" className={`px-3 py-3 text-right ${firstCellBorder}`}>
                        <span className="text-sm font-bold text-slate-600 dark:text-slate-400">
                            {formatCurrency(product.costPrice || 0)}
                        </span>
                    </td>
                );
            case 'unitPrice':
                if (product.isParent) return <td key="unitPrice" className={`px-3 py-3 ${firstCellBorder}`}></td>;
                const unitP = Number(product.unitPrice) || 0;
                const promoP = Number(product.promoPrice) || 0;
                const hasPromo = promoP > 0 && promoP < unitP;
                const finalPrice = hasPromo ? promoP : (unitP || (
                    product.variations?.length 
                        ? Math.min(...product.variations.map(v => {
                            const vp = Number(v.promoPrice) > 0 && Number(v.promoPrice) < Number(v.unitPrice) ? Number(v.promoPrice) : Number(v.unitPrice);
                            return vp || 0;
                        }).filter(p => p > 0).concat(0))
                        : 0
                ));
                return (
                    <td key="unitPrice" className={`px-3 py-3 text-right ${firstCellBorder}`}>
                        <div className="flex flex-col items-end">
                            {hasPromo && (
                                <span className="text-[10px] text-red-500 dark:text-red-400 line-through font-bold leading-tight">
                                    {formatCurrency(unitP)}
                                </span>
                            )}
                            <span className="text-sm font-black text-blue-600 dark:text-blue-400">
                                {finalPrice > 0 ? formatCurrency(finalPrice) : '-'}
                            </span>
                        </div>
                    </td>
                );
            case 'weight':
                if (product.isParent) return <td key="weight" className={`px-3 py-3 ${firstCellBorder}`}></td>;
                return (
                    <td key="weight" className={`px-3 py-3 text-right ${firstCellBorder}`}>
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                            {product.weight ? `${Number(product.weight).toFixed(2)} kg` : '-'}
                        </span>
                    </td>
                );
            case 'stock':
                if (product.isParent) return <td key="stock" className={`px-3 py-3 ${firstCellBorder}`}></td>;
                const isLowStock = (product.stock || 0) <= (product.minStock || 0);
                return (
                    <td key="stock" className={`px-3 py-3 text-center ${firstCellBorder}`}>
                        <span className={`text-sm font-black ${isLowStock ? 'text-red-500 dark:text-red-400' : 'text-slate-700 dark:text-slate-300'}`}>
                            {product.itemType === 'service' ? '-' : (product.stock ?? 0)}
                        </span>
                    </td>
                );
            case 'category':
                if (isChildVar) return <td key="category" className={`px-3 py-3 ${firstCellBorder}`}></td>;
                const categoryDisplay = getCategoryBreadcrumb(product.categoryIds || [], categoryTree) || product.category || (product as any).category_name || (product as any).categoryName || "-";
                const leafCategories = categoryDisplay.split(' | ').map(path => {
                    const parts = path.split(' > ');
                    return parts[parts.length - 1];
                }).join(' | ');
                return (
                    <td key="category" className={`px-3 py-3 text-left ${firstCellBorder}`}>
                        <div className="flex flex-wrap gap-x-2 gap-y-1 max-w-[250px]">
                            {leafCategories.split(' | ').map((catName, idx) => (
                                <div key={idx} className="text-[10px] font-bold uppercase tracking-widest leading-relaxed">
                                    <span className="text-slate-600 dark:text-slate-300">{catName}</span>
                                    {idx < leafCategories.split(' | ').length - 1 && <span className="ml-2 text-blue-500 opacity-50">|</span>}
                                </div>
                            ))}
                        </div>
                    </td>
                );
            case 'createdAt':
                return (
                    <td key="createdAt" className={`px-3 py-3 text-left ${firstCellBorder}`}>
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-955 px-2 py-1 rounded-lg border border-slate-100 dark:border-slate-800">
                            {product.createdAt ? new Date(product.createdAt).toLocaleDateString('pt-BR') : '-'}
                        </span>
                    </td>
                );
            case 'status':
                const targetCatalogId = (product.isEmbeddedVariation || (product.isVariation && product.sku && product.parentId))
                    ? `${product.parentId || product.id}_${product.sku}`
                    : product.id!;

                return (
                    <td key="status" className={`px-3 py-3 text-center ${firstCellBorder}`} onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center">
                            <ChannelStatusBadges
                                active={product.active !== false}
                                catalogStatus={product.status}
                                isParent={product.isParent}
                                canManageCatalog={canManageCatalog}
                                isDraft={isDraft}
                                onToggleActive={(e) => {
                                    e.stopPropagation();
                                    onToggleActive(product.id!, product.active !== false);
                                }}
                                onToggleCatalog={(e) => {
                                    e.stopPropagation();
                                    onDeactivateCatalog(targetCatalogId);
                                }}
                                size="sm"
                            />
                        </div>
                    </td>
                );
            case 'actions':
                if (isChildVar) {
                    return <td key="actions" className={`px-3 py-3 text-center ${firstCellBorder}`} onClick={(e) => e.stopPropagation()} />;
                }
                return (
                    <td key="actions" className={`px-3 py-3 text-center ${firstCellBorder}`} onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-2">
                            {showTrash ? (
                                <button
                                    onClick={() => onRestore(product.id!)}
                                    className="p-1 text-emerald-600 hover:text-emerald-700"
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
                                                    className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-950 transition-colors text-left group w-full"
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
                                                        className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-950 transition-colors text-left group"
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
                                                        className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-950 transition-colors text-left group"
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
                                                        className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-950 transition-colors text-left group"
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
                                                                setIsSalesModalOpen(true);
                                                            }}
                                                            className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-950 transition-colors text-left group"
                                                        >
                                                            <i className="bi bi-receipt text-indigo-500" />
                                                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-700 dark:text-slate-200">Histórico de Vendas</span>
                                                        </button>
                                                        <div className="border-t border-slate-50 dark:border-slate-800/50 my-1">
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); setIsMenuOpen(false); setLabelModal({ open: true, type: 'identification' }); }}
                                                                className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-950 transition-colors text-left group w-full"
                                                            >
                                                                <i className="bi bi-qr-code text-blue-500" />
                                                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-700 dark:text-slate-200">Etiq. de Identificação</span>
                                                            </button>
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); setIsMenuOpen(false); setLabelModal({ open: true, type: 'price' }); }}
                                                                className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-955 transition-colors text-left group w-full"
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
            default:
                return null;
        }
    };

    const isChildVar = product.isVariation || !!product.parentId;
    const isDeactivated = product.active === false || product.status === 'hidden';

    return (
        <tr
            onClick={() => {
                if (hasVariations && onToggleExpand) {
                    onToggleExpand();
                }
            }}
            className={`transition-colors group ${
                hasVariations ? 'cursor-pointer' : ''
            } ${
                isDeactivated
                    ? 'bg-slate-100/90 dark:bg-slate-800/70'
                    : product.isParent 
                    ? 'bg-slate-200/70 dark:bg-slate-800/80 font-bold' 
                    : isChildVar 
                    ? 'bg-white dark:bg-slate-900' 
                    : 'bg-white dark:bg-slate-900'
            } hover:bg-slate-300/60 dark:hover:bg-slate-700/60`}
        >
            {orderedColumnKeys ? orderedColumnKeys.map(key => renderCell(key)) : (
                <>
                    {renderCell('code')}
                    {renderCell('description')}
                    {renderCell('unitPrice')}
                    {renderCell('stock')}
                    {renderCell('status')}
                    {renderCell('actions')}
                </>
            )}

            <LabelPrintSelectionModal
                isOpen={labelModal.open}
                onClose={() => setLabelModal(prev => ({ ...prev, open: false }))}
                labelType={labelModal.type}
                initialProduct={{
                    id: product.id!,
                    description: product.description,
                    code: product.code,
                    sku: product.sku,
                    unitPrice: product.unitPrice,
                    images: product.images,
                }}
            />

            {isSalesModalOpen && (
                <ProductSalesModal 
                    product={product}
                    onClose={() => setIsSalesModalOpen(false)}
                />
            )}

            <SendWhatsAppModal
                isOpen={whatsAppModal.open}
                onClose={() => setWhatsAppModal(prev => ({ ...prev, open: false }))}
                initialMessage={whatsAppModal.message}
                title={`Enviar "${product.name || product.title || product.description}" via WhatsApp`}
            />
        </tr>
    );
};

export default ProductRow;
