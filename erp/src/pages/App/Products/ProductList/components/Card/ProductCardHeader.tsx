import React from 'react';
import Product from '../../../../../types/product.type';
import { ChannelStatusBadges } from '../Shared/ChannelStatusBadges';
import { ProductCardActions } from './ProductCardActions';

interface ProductCardHeaderProps {
    product: Product;
    isParent: boolean;
    isVariation: boolean;
    isDraft: boolean;
    canManageCatalog: boolean;
    hasParentVariations: boolean;
    showVariations: boolean;
    setShowVariations: React.Dispatch<React.SetStateAction<boolean>>;
    oppName: string | undefined;
    showTrash: boolean | undefined;
    onEdit: (product: Product) => void;
    onLaunchStock?: (product: any) => void;
    onDelete: (id: string) => void;
    onToggleActive: (id: string, currentStatus: boolean) => void;
    onDeactivateCatalog: (id: string) => void;
    onShowHistory?: (product: Product) => void;
    onDuplicate?: (product: Product) => void;
    onOpenSalesModal: () => void;
    onOpenWhatsApp: (msg: string) => void;
}

export const ProductCardHeader: React.FC<ProductCardHeaderProps> = ({
    product,
    isParent,
    isVariation,
    isDraft,
    canManageCatalog,
    hasParentVariations,
    showVariations,
    setShowVariations,
    oppName,
    showTrash,
    onEdit,
    onLaunchStock,
    onDelete,
    onToggleActive,
    onDeactivateCatalog,
    onShowHistory,
    onDuplicate,
    onOpenSalesModal,
    onOpenWhatsApp
}) => {
    return (
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
                    activeVariationsCount={(product as any).activeVariationsCount ?? (product.variations?.filter((v: any) => v.active !== false).length)}
                    totalVariationsCount={(product as any).totalVariationsCount ?? product.variations?.length}
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
                        onOpenSalesModal={onOpenSalesModal}
                        onOpenWhatsApp={onOpenWhatsApp}
                    />
                )}
            </div>
        </div>
    );
};
