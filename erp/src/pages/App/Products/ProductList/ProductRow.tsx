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
    exitedVariationIds
}: ProductRowProps) => {
    const [isMenuOpen, setIsMenuOpen] = React.useState(false);
    const [labelModal, setLabelModal] = React.useState<{ open: boolean; type: LabelPrintType }>({ open: false, type: 'identification' });
    const [isSalesModalOpen, setIsSalesModalOpen] = React.useState(false);
    const [whatsAppModal, setWhatsAppModal] = React.useState<{ open: boolean; message: string }>({ open: false, message: '' });
    const menuAnchorRef = React.useRef<HTMLButtonElement>(null);
    const canManageCatalog = product.status !== 'draft' && !product.isDraft && product.active !== false;

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
            setOppName(null);
        }
        return () => { isMounted = false; };
    }, [product.opportunityId, product.opportunityName]);

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
                    <td key="sku" className={`px-3 py-3 text-left w-[1%] whitespace-nowrap ${isChildVar ? 'pl-10' : ''} ${firstCellBorder}`}>
                        <span className="font-bold text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-1 rounded-lg">
                            {normalizeVariationSku(product.sku || product.code) || "-"}
                        </span>
                    </td>
                );
            case 'code':
                return (
                    <td key="code" className={`px-3 py-3 text-left w-[1%] whitespace-nowrap ${isChildVar ? 'pl-10' : ''} ${firstCellBorder}`}>
                        <span className="font-mono text-xs text-blue-600 dark:text-blue-400 font-bold bg-blue-50 dark:bg-blue-900/30 px-2.5 py-1 rounded-lg inline-block font-mono">
                            {normalizeVariationSku(product.sku || product.code) || "-"}
                        </span>
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
                    <td key="description" className={`px-3 py-3 text-left ${firstCellBorder}`}>
                        <div className="flex items-center gap-4">
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
                                    <span className={`text-sm ${isChildVariation ? 'font-semibold text-blue-900 dark:text-blue-300' : product.isParent ? 'font-black text-blue-600 dark:text-blue-400 uppercase tracking-tighter' : 'font-bold text-slate-700 dark:text-slate-200'}`}>
                                        {displayName}
                                    </span>
                                    {(product.active === false || product.deleted) && !product.isDraft && (
                                        <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider text-rose-600 dark:text-rose-400 mt-0.5">
                                            <i className="bi bi-slash-circle text-rose-500"></i> Desativado
                                        </span>
                                    )}
                                    <div className="flex items-center gap-2 mt-1">
                                        {isChildVariation && (
                                            <span className="flex items-center gap-1 bg-blue-100 dark:bg-blue-955/60 text-blue-800 dark:text-blue-300 px-2 py-0.5 rounded font-black text-[9px] uppercase tracking-wider border border-blue-200 dark:border-blue-800/80 shadow-xs">
                                                <i className="bi bi-arrow-return-right"></i> VARIANTE
                                            </span>
                                        )}
                                        {/* Selo: Saída Lançada via Pedido */}
                                        {isChildVariation && exitedVariationIds?.has(String((product as any).variationId)) && (
                                            <span className="flex items-center gap-1 bg-orange-50 dark:bg-orange-950/20 text-orange-700 dark:text-orange-400 px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest border border-orange-200 dark:border-orange-900/30 select-none">
                                                <i className="bi bi-box-arrow-right"></i> Saída Lançada
                                            </span>
                                        )}
                                        {product.isDraft && (
                                            <span className="flex items-center gap-1 bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest border border-amber-200 dark:border-amber-800">
                                                <i className="bi bi-file-earmark-text"></i> Rascunho
                                            </span>
                                        )}
                                        {product.itemType === 'service' ? (
                                            <span className="flex items-center gap-1 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest border border-amber-100 dark:border-amber-900/30">
                                                <i className="bi bi-tools"></i> Serviço
                                            </span>
                                        ) : (
                                            <>
                                                {product.isCombo && (
                                                    <span className="flex items-center gap-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest border border-purple-200 dark:border-purple-900/40 shadow-sm animate-pulse-slow">
                                                        <i className="bi bi-layers-fill"></i> Combo/Jogo
                                                    </span>
                                                )}
                                                {!isChildVariation && (
                                                    <span className="flex items-center gap-1 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest border border-blue-100 dark:border-blue-900/30">
                                                        <i className="bi bi-box-seam"></i> Produto
                                                    </span>
                                                )}
                                                {oppName && (
                                                    <span className="flex items-center gap-1 bg-amber-100 dark:bg-amber-955/70 text-amber-800 dark:text-amber-300 px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest border border-amber-300 dark:border-amber-700/80 shadow-xs">
                                                        <i className="bi bi-fire text-amber-600 dark:text-amber-400"></i> {oppName}
                                                    </span>
                                                )}
                                            </>
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
                        {!product.isParent && canManageCatalog && (
                            <div className="flex items-center justify-center">
                                <button 
                                    onClick={(e) => { e.stopPropagation(); onDeactivateCatalog(targetCatalogId); }} 
                                    title="Clique para alternar status no Catálogo" 
                                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border cursor-pointer hover:opacity-90 ${product.status === 'published' ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-955/20 dark:text-emerald-400 dark:border-emerald-900/30' : 'bg-red-50 text-red-700 border-red-200 dark:bg-red-955/20 dark:text-red-400 dark:border-red-900/30'}`}
                                >
                                    <span className={`w-1.5 h-1.5 rounded-full ${product.status === 'published' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                                    Catálogo · {product.status === 'published' ? 'Publicado' : 'Ocultado'}
                                </button>
                            </div>
                        )}
                    </td>
                );
            case 'actions':
                return (
                    <td key="actions" className={`px-3 py-3 text-center ${firstCellBorder}`} onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-2">
                            {showTrash ? (
                                <button
                                    onClick={(e) => { e.stopPropagation(); onRestore(product.id!); }}
                                    className="p-2 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded-xl transition-all shadow-sm bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-800 flex items-center gap-1 text-xs font-bold"
                                    title="Reativar Produto"
                                >
                                    <i className="bi bi-check-circle-fill text-sm" />
                                    <span>Ativar</span>
                                </button>
                            ) : (
                                <>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); onEdit(product); }}
                                        className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-xl transition-all shadow-sm bg-white dark:bg-slate-955 border border-blue-100 dark:border-blue-900/30"
                                        title="Editar produto"
                                    >
                                        <i className="bi bi-pencil-fill text-sm" />
                                    </button>

                                    <div className="relative">
                                        <button
                                            ref={menuAnchorRef}
                                            onClick={(e) => { e.stopPropagation(); setIsMenuOpen(!isMenuOpen); }}
                                            className={`p-2 rounded-xl transition-all shadow-sm border bg-white dark:bg-slate-950 hover:bg-slate-50 dark:hover:bg-slate-900 ${isMenuOpen ? 'border-blue-200 text-blue-600 ring-4 ring-blue-50 dark:ring-blue-900/10' : 'text-slate-400 dark:text-slate-500 border-slate-100 dark:border-slate-800'}`}
                                            title="Mais Ações"
                                        >
                                            <i className="bi bi-three-dots-vertical text-sm" />
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
                                                {!product.isVariation && onDuplicate && (
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); setIsMenuOpen(false); onDuplicate(product); }}
                                                        className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-950 transition-colors text-left group"
                                                    >
                                                        <i className="bi bi-copy text-indigo-500" />
                                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-700 dark:text-slate-200">Duplicar Produto</span>
                                                    </button>
                                                )}

                                                {onShowHistory && !product.isParent && (
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); setIsMenuOpen(false); onShowHistory(product); }}
                                                        className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-955 transition-colors text-left group"
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
                                                        <i className="bi bi-cart-check text-blue-500" />
                                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-700 dark:text-slate-200">Ver Vendas Vinculadas</span>
                                                    </button>
                                                )}

                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setIsMenuOpen(false);
                                                        const pPrice = Number(product.promoPrice) > 0 && Number(product.promoPrice) < Number(product.unitPrice) ? product.promoPrice : product.unitPrice;
                                                        const msg = `*${product.name || product.title || product.description}*\n*Código/SKU:* ${product.sku || product.code || 'S/REF'}\n*Preço:* ${formatCurrency(pPrice || 0)}\n\nConfira mais detalhes em nosso catálogo oficial!`;
                                                        setWhatsAppModal({ open: true, message: msg });
                                                    }}
                                                    className="flex items-center gap-3 px-4 py-2.5 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors text-left group"
                                                >
                                                    <i className="bi bi-whatsapp text-emerald-600 dark:text-emerald-400" />
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-emerald-700 dark:text-emerald-300">Enviar por WhatsApp</span>
                                                </button>

                                                <Link
                                                    to={`/marketing/posts?product=${product.id}`}
                                                    onClick={(e) => { e.stopPropagation(); setIsMenuOpen(false); }}
                                                    className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-950 transition-colors text-left group"
                                                >
                                                    <i className="bi bi-instagram text-pink-500" />
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-700 dark:text-slate-200">Posts Redes Sociais</span>
                                                </Link>

                                                {product.itemType !== 'service' && !product.isParent && (
                                                    <>
                                                        <div className="h-px bg-slate-50 dark:bg-slate-800 my-1"></div>
                                                        <div className="px-4 py-1.5">
                                                            <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">Etiquetas</span>
                                                        </div>
                                                        <div className="flex flex-col w-full">
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

                                                {canManageCatalog && product.status === 'published' && !showTrash ? (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setIsMenuOpen(false);
                                                            onDelete(product.id!);
                                                        }}
                                                        className="flex items-center gap-3 px-4 py-2.5 hover:bg-amber-50 dark:hover:bg-amber-950/20 transition-colors text-left group border-t border-slate-50 dark:border-slate-800/50"
                                                        title="Desativa o produto e o oculta do Catálogo Meta e das pesquisas de venda"
                                                    >
                                                        <i className="bi bi-slash-circle text-amber-500" />
                                                        <span className="text-[10px] font-black uppercase tracking-widest text-amber-700 dark:text-amber-400">Desativar Produto</span>
                                                    </button>
                                                ) : (product.active === false || showTrash) ? (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setIsMenuOpen(false);
                                                            onRestore(product.id!);
                                                        }}
                                                        className="flex items-center gap-3 px-4 py-2.5 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 transition-colors text-left group border-t border-slate-50 dark:border-slate-800/50"
                                                        title="Reativa o produto no sistema e catálogo"
                                                    >
                                                        <i className="bi bi-check-circle-fill text-emerald-500" />
                                                        <span className="text-[10px] font-black uppercase tracking-widest text-emerald-700 dark:text-emerald-400">Reativar Produto</span>
                                                    </button>
                                                ) : null}
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
            className={`transition-colors group cursor-pointer ${
                isDeactivated
                    ? 'bg-slate-100/90 dark:bg-slate-800/70'
                    : product.isParent 
                    ? 'bg-blue-50/30 dark:bg-blue-900/10' 
                    : isChildVar 
                    ? 'bg-slate-50/40 dark:bg-slate-900/40' 
                    : 'bg-slate-50/50 dark:bg-slate-900/30'
            } hover:bg-blue-50/40 dark:hover:bg-slate-800/50`}
            onClick={() => onEdit(product)}
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
