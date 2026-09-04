import React from "react";
import { Link } from "react-router-dom";
import Product from "../../../types/product.type";
import { formatCurrency } from "../../../utils/formatters";
import { getCategoryBreadcrumb } from '@/pages/utils/categoryService';
import DropdownPortal from "../../../../components/shared/DropdownPortal";
import ProductSalesModal from "../components/ProductSalesModal";
import { SendWhatsAppModal } from '@/components/shared/SendWhatsAppModal';
import { supabase } from '@/pages/utils/supabaseConfig';
import { normalizeVariationSku } from '@/pages/utils/productVariationDefaults';
import { ChannelStatusBadges } from './ChannelStatusBadges';

let oppCache: Record<string, string> | null = null;
let oppPromise: Promise<Record<string, string>> | null = null;

const fetchOppMap = async (): Promise<Record<string, string>> => {
    if (oppCache) return oppCache;
    if (!oppPromise) {
        oppPromise = (async () => {
            const { data } = await supabase.from('opportunities').select('id, name');
            const map: Record<string, string> = {};
            if (data) {
                data.forEach((item: any) => { map[item.id] = item.name; });
            }
            oppCache = map;
            return map;
        })();
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
    exitedVariationIds?: Set<string>;
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
    onDuplicate,
    exitedVariationIds
}: ProductCardProps) => {
    const [isMenuOpen, setIsMenuOpen] = React.useState(false);
    const [isSalesModalOpen, setIsSalesModalOpen] = React.useState(false);
    const [showVariations, setShowVariations] = React.useState(false);
    const [activeVarMenuId, setActiveVarMenuId] = React.useState<string | null>(null);
    const [whatsAppModal, setWhatsAppModal] = React.useState<{ open: boolean; message: string }>({ open: false, message: '' });
    const menuAnchorRef = React.useRef<HTMLButtonElement>(null);
    const varMenuRefs = React.useRef<Record<string, HTMLButtonElement | null>>({});
    const isLowStock = (product.stock || 0) <= (product.minStock || 0);
    const isParent = product.isParent;
    const isVariation = product.isVariation || !!product.parentId;
    const isDraft = Boolean(product.isDraft) || Boolean((product as any).is_draft) || product.status === 'draft';
    const canManageCatalog = !isDraft && product.active !== false;
    const isCatalogActive = product.status === 'published';

    const [oppName, setOppName] = React.useState<string | null>(
        product.opportunityName || product.opportunity?.name || null
    );
    const [supplierNames, setSupplierNames] = React.useState<string[]>([]);

    React.useEffect(() => {
        let isMounted = true;
        if (product.opportunityId) {
            fetchOppMap().then(map => {
                if (isMounted && map && product.opportunityId && map[product.opportunityId]) {
                    setOppName(map[product.opportunityId]);
                }
            });
        } else {
            setOppName(product.opportunityName || product.opportunity?.name || null);
        }
        return () => { isMounted = false; };
    }, [product.opportunityId, product.opportunityName, product.opportunity]);

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
                    const fallback = (product as any).supplierName || (product as any).supplier?.name || (product as any).supplier || null;
                    if (fallback) resolvedNames.push(fallback);
                }
                setSupplierNames(Array.from(new Set(resolvedNames)));
            });
        } else {
            const fallback = (product as any).supplierName || (product as any).supplier?.name || (product as any).supplier || null;
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

    // Process attributes text if variation
    let variationName = '';
    if (isVariation) {
        const attrs = (product as any).attributes;
        if (attrs && Array.isArray(attrs)) {
            variationName = attrs.map((attr: any) => attr.value).filter(Boolean).join(' ');
        } else if (attrs && typeof attrs === 'object') {
            variationName = Object.values(attrs).filter(Boolean).join(' ');
        }
        if (!variationName) {
            variationName = (product as any).displayName || product.name || '';
        }
    }

    const hasParentVariations = isParent && Boolean((product as any).allVariations && (product as any).allVariations.length > 0);

    return (
        <div
            onClick={() => {
                if (hasParentVariations) {
                    setShowVariations(prev => !prev);
                }
            }}
            className={`border rounded-2xl p-2.5 sm:p-3.5 shadow-sm transition-all relative w-full
                ${hasParentVariations ? 'cursor-pointer' : ''}
                ${isSelected ? 'border-blue-500 ring-1 ring-blue-500' : 
                  isParent ? 'border-slate-300 dark:border-slate-700 bg-slate-200/70 dark:bg-slate-800/80 shadow-xs' :
                  isVariation ? 'border-slate-200 dark:border-slate-800 ml-2.5 sm:ml-5 bg-white dark:bg-slate-900 shadow-2xs' :
                  'border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900'}`}
        >
            <div className="flex justify-between items-center mb-2 gap-2 flex-wrap">
                {/* Lado Esquerdo: Botão Dropdown de Variações + Código do Produto */}
                <div className="flex items-center gap-1.5">
                    {isParent && (product as any).allVariations && (product as any).allVariations.length > 0 && (
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                setShowVariations(prev => !prev);
                            }}
                            className={`px-2 py-1 rounded-lg flex items-center gap-1 text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                                showVariations
                                    ? 'bg-slate-300 dark:bg-slate-700 text-slate-800 dark:text-slate-100 shadow-xs'
                                    : 'bg-slate-300/60 dark:bg-slate-700/60 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600'
                            }`}
                            title={showVariations ? "Ocultar Variações" : "Mostrar Variações"}
                        >
                            <i className={`bi bi-chevron-${showVariations ? 'down' : 'right'} text-xs font-black`} />
                            <span>Variações ({(product as any).allVariations.length})</span>
                        </button>
                    )}
                    {product.code ? (
                        <span className="font-mono text-[9px] text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200/80 dark:border-slate-700 font-bold">
                            {product.code}
                        </span>
                    ) : null}
                </div>

                {/* Canto Superior Direito: Todos os Selos + Botões de Ação */}
                <div className="flex items-center gap-2 flex-wrap justify-end ml-auto" onClick={(e) => e.stopPropagation()}>
                    {/* 1. Status de Canais (ERP e Catálogo) */}
                    <ChannelStatusBadges
                        active={product.active !== false}
                        catalogStatus={product.status}
                        isParent={isParent}
                        canManageCatalog={canManageCatalog}
                        isDraft={isDraft}
                        onToggleActive={(e) => {
                            e.stopPropagation();
                            onToggleActive(product.id!, product.active !== false);
                        }}
                        onToggleCatalog={(e) => {
                            e.stopPropagation();
                            onDeactivateCatalog(product.id!);
                        }}
                        size="xs"
                    />

                    {/* 2. Selo de Rascunho */}
                    {isDraft && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-300 dark:border-amber-800 select-none">
                            <i className="bi bi-file-earmark-text text-amber-600 text-[9px]" />
                            Rascunho
                        </span>
                    )}

                    {/* 3. Selo de Oportunidade */}
                    {!isVariation && oppName && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300/80 dark:border-amber-800/60 select-none shadow-2xs">
                            <i className="bi bi-fire text-amber-600 dark:text-amber-400 text-[9px]" />
                            {oppName}
                        </span>
                    )}

                    {/* 4. Selo de Tipo (Serviço) */}
                    {!isVariation && product.itemType === 'service' && (
                        <span className="text-[8px] px-2 py-0.5 rounded-full font-black uppercase tracking-widest bg-amber-100 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400">
                            Serviço
                        </span>
                    )}

                    {/* Botões de Ação */}
                    {!showTrash && !isVariation && (
                        <div className="relative flex items-center gap-1 ml-1">
                            <button
                                onClick={(e) => { e.stopPropagation(); onEdit(product); }}
                                className="w-7 h-7 flex items-center justify-center bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition-all border border-slate-100 dark:border-slate-700 shrink-0"
                                title="Editar Produto"
                            >
                                <i className="bi bi-pencil text-xs" />
                            </button>

                            <button
                                ref={menuAnchorRef}
                                onClick={(e) => { e.stopPropagation(); setIsMenuOpen(!isMenuOpen); }}
                                className={`w-7 h-7 flex items-center justify-center rounded-lg transition-all border shrink-0 ${isMenuOpen ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 text-indigo-600' : 'bg-slate-50 dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-400 hover:text-slate-600 hover:bg-slate-100'}`}
                                title="Opções"
                            >
                                <i className="bi bi-three-dots text-xs" />
                            </button>

                            <DropdownPortal
                                isOpen={isMenuOpen}
                                onClose={() => setIsMenuOpen(false)}
                                anchorRef={menuAnchorRef}
                                className="min-w-[170px]"
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
                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-700 dark:text-slate-200">Editar Produto</span>
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

                                    <Link
                                        to={`/marketing/posts?product=${product.id}`}
                                        onClick={(e) => { e.stopPropagation(); setIsMenuOpen(false); }}
                                        className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-950 transition-colors text-left group"
                                    >
                                        <i className="bi bi-instagram text-pink-500" />
                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-700 dark:text-slate-200">Posts Redes Sociais</span>
                                    </Link>

                                    {!product.isVariation && onDuplicate && (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setIsMenuOpen(false); onDuplicate(product); }}
                                            className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-950 transition-colors text-left group border-t border-slate-50 dark:border-slate-800/50 mt-1"
                                        >
                                            <i className="bi bi-copy text-indigo-500" />
                                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-700 dark:text-slate-200">Duplicar Produto</span>
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
                            ? 'text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-tight'
                            : isVariation
                            ? 'text-xs font-bold text-slate-800 dark:text-slate-200 pl-3 border-l-2 border-indigo-200 dark:border-indigo-800'
                            : 'text-sm font-bold text-slate-800 dark:text-slate-100'
                    }`}>
                        {isVariation 
                            ? (variationName || product.name || product.title || "-")
                            : (product.name || product.title || (product.description ? product.description.split('\n')[0].substring(0, 120) : "-"))}
                    </h3>
                    {!isVariation && (
                        <div className="flex items-center flex-wrap gap-x-2 gap-y-1 mt-1 leading-relaxed">
                            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wide">
                                {getCategoryBreadcrumb(product.categoryIds || [], categoryTree) || product.category || "-"}
                            </span>
                            {supplierNames.map((supName, sIdx) => (
                                <React.Fragment key={sIdx}>
                                    <span className="text-slate-300 dark:text-slate-700 text-[10px]">•</span>
                                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wide bg-slate-100 dark:bg-slate-800/80 px-1.5 py-0.5 rounded border border-slate-200/60 dark:border-slate-700/60">
                                        <i className="bi bi-truck text-[9px] text-slate-400 dark:text-slate-500" />
                                        {supName}
                                    </span>
                                </React.Fragment>
                            ))}
                        </div>
                    )}
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
                        <span className="text-[9px] font-black uppercase">Reativar Produto</span>
                    </button>
                </div>
            )}

            {isSalesModalOpen && (
                <ProductSalesModal 
                    product={product}
                    onClose={() => setIsSalesModalOpen(false)}
                />
            )}

            {/* Se for pai, renderiza a lista de filhos apenas quando o dropdown estiver expandido (padrão: recolhido) */}
            {isParent && showVariations && (product as any).allVariations && (product as any).allVariations.length > 0 && (
                <div className="mt-3 -mx-2.5 -mb-2.5 sm:-mx-3.5 sm:-mb-3.5 px-3 py-2.5 bg-white dark:bg-slate-900 border-t border-slate-200/80 dark:border-slate-800 rounded-b-2xl flex flex-col gap-1">
                    {(product as any).allVariations.map((v: any, index: number) => {
                        const varName = v.attributes && Array.isArray(v.attributes)
                            ? v.attributes.map((attr: any) => attr.value).filter(Boolean).join(' ')
                            : v.attributes && typeof v.attributes === 'object'
                            ? Object.values(v.attributes).filter(Boolean).join(' ')
                            : v.displayName || v.name || '';

                        const varSku = normalizeVariationSku(v.sku || `${product.sku || product.code}-${String(index + 1).padStart(2, '0')}`);
                        const targetVarCatalogId = `${product.id}_${varSku}`;

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

            <SendWhatsAppModal
                isOpen={whatsAppModal.open}
                onClose={() => setWhatsAppModal(prev => ({ ...prev, open: false }))}
                initialMessage={whatsAppModal.message}
                title={`Enviar "${product.name || product.title || product.description}" via WhatsApp`}
            />
        </div>
    );
};

export default ProductCard;
