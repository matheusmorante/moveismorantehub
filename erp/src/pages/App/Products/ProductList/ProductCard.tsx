import React from 'react';
import Product from '../../../types/product.type';
import { formatCurrency } from '../../../utils/formatters';
import { getCategoryBreadcrumb } from '@/pages/utils/categoryService';
import ProductSalesModal from '../components/ProductSalesModal';
import { SendWhatsAppModal } from '@/components/shared/SendWhatsAppModal';
import { ChannelStatusBadges } from './ChannelStatusBadges';
import { useProductMetadata } from './useProductMetadata';
import { getVariationDisplayName } from './getVariationDisplayName';
import { ProductCardActions } from './ProductCardActions';
import { ProductCardVariationList } from './ProductCardVariationList';

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

const ProductCard: React.FC<ProductCardProps> = ({
    product,
    onEdit,
    onLaunchStock,
    onDelete,
    onRestore,
    onToggleActive,
    onDeactivateCatalog,
    onShowHistory,
    showTrash,
    isSelected,
    categoryTree,
    onDuplicate,
    exitedVariationIds
}) => {
    const [isSalesModalOpen, setIsSalesModalOpen] = React.useState(false);
    const [showVariations, setShowVariations] = React.useState(false);
    const [whatsAppModal, setWhatsAppModal] = React.useState<{ open: boolean; message: string }>({ open: false, message: '' });

    const isLowStock = (product.stock || 0) <= (product.minStock || 0);
    const isParent = product.isParent;
    const isVariation = product.isVariation || !!product.parentId;
    const isDraft = Boolean(product.isDraft) || Boolean((product as any).is_draft) || product.status === 'draft';
    const canManageCatalog = !isDraft && product.active !== false;

    const { oppName, supplierNames } = useProductMetadata(product);
    const variationName = isVariation ? getVariationDisplayName(product) : '';
    const hasParentVariations = isParent && Boolean((product as any).allVariations && (product as any).allVariations.length > 0);

    const displayTitle = isVariation 
        ? (variationName || product.name || product.title || "-")
        : (product.name || product.title || (product.description ? product.description.split('\n')[0].substring(0, 120) : "-"));

    const hasPromo = product.promoPrice && Number(product.promoPrice) > 0 && Number(product.promoPrice) < Number(product.unitPrice);
    const currentPrice = hasPromo ? product.promoPrice : (product.unitPrice || 0);

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
                    {hasParentVariations && (
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
                        <ProductCardActions
                            product={product}
                            onEdit={onEdit}
                            onDuplicate={onDuplicate}
                            onShowHistory={onShowHistory}
                            onLaunchStock={onLaunchStock}
                            onDelete={onDelete}
                            onOpenSalesModal={() => setIsSalesModalOpen(true)}
                            onOpenWhatsApp={(msg) => setWhatsAppModal({ open: true, message: msg })}
                        />
                    )}
                </div>
            </div>

            {/* Corpo do Card: Imagem e Título */}
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
                        {displayTitle}
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

            {/* Rodapé do Card: Preço e Estoque */}
            {!isParent && (
                <div className="flex justify-between items-end border-t border-slate-50 dark:border-slate-800/50 pt-2.5">
                    <div className="flex flex-col">
                        {hasPromo && (
                            <span className="text-[10px] text-red-500 dark:text-red-400 line-through font-bold leading-tight">
                                {formatCurrency(product.unitPrice || 0)}
                            </span>
                        )}
                        <span className="text-base font-black text-blue-600 dark:text-blue-400">
                            {formatCurrency(currentPrice)}
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
            )}

            {/* Botão de Reativar em Trash */}
            {showTrash && (
                <div className="mt-3" onClick={(e) => e.stopPropagation()}>
                    <button
                        onClick={() => onRestore(product.id!)}
                        className="flex flex-col items-center justify-center gap-1 py-2 w-full bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-colors font-bold cursor-pointer"
                    >
                        <i className="bi bi-check-circle-fill text-base" />
                        <span className="text-[9px] font-black uppercase">Reativar Produto</span>
                    </button>
                </div>
            )}

            {/* Modal de Vendas */}
            {isSalesModalOpen && (
                <ProductSalesModal 
                    product={product}
                    onClose={() => setIsSalesModalOpen(false)}
                />
            )}

            {/* Variações Filhas Expandidas (Apenas para Pai) */}
            {isParent && (
                <ProductCardVariationList
                    product={product}
                    variations={(product as any).allVariations || []}
                    showVariations={showVariations}
                    canManageCatalog={canManageCatalog}
                    isDraft={isDraft}
                    exitedVariationIds={exitedVariationIds}
                    onEdit={onEdit}
                    onToggleActive={onToggleActive}
                    onDeactivateCatalog={onDeactivateCatalog}
                    onShowHistory={onShowHistory}
                    onLaunchStock={onLaunchStock}
                />
            )}

            {/* Modal de Envio via WhatsApp */}
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
