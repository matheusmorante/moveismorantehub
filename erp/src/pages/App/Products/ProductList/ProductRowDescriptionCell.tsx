import React from 'react';
import Product from '../../../types/product.type';

interface ProductRowDescriptionCellProps {
    product: Product;
    displayName: string;
    hasVariations?: boolean;
    isExpanded?: boolean;
    onToggleExpand?: () => void;
    isChildVar: boolean;
    isChildVariation: boolean;
    variationsCount?: number;
    oppName: string | null;
    supplierNames: string[];
    exitedVariationIds?: Set<string>;
}

export const ProductRowDescriptionCell: React.FC<ProductRowDescriptionCellProps> = ({
    product,
    displayName,
    hasVariations,
    isExpanded,
    onToggleExpand,
    isChildVar,
    isChildVariation,
    variationsCount,
    oppName,
    supplierNames,
    exitedVariationIds,
}) => {
    const isDraft = Boolean(product.isDraft) || Boolean((product as any).is_draft) || product.status === 'draft';
    const isDeactivated = (product.active === false || product.deleted) && !isDraft;

    return (
        <td key="description" className="px-3 py-3 text-left min-w-[520px]">
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
                        <span className={`text-sm ${
                            isChildVariation 
                                ? 'font-semibold text-slate-800 dark:text-slate-200' 
                                : product.isParent 
                                ? 'font-bold text-slate-900 dark:text-slate-100' 
                                : 'font-bold text-slate-700 dark:text-slate-200'
                        }`}>
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
                                        <i className="bi bi-fire text-amber-600 dark:text-amber-400" /> {oppName}
                                    </span>
                                )}

                                {!isChildVariation && supplierNames.map((supName, sIdx) => (
                                    <span key={sIdx} className="inline-flex items-center gap-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider border border-slate-200 dark:border-slate-700">
                                        <i className="bi bi-truck text-slate-400 dark:text-slate-500" /> {supName}
                                    </span>
                                ))}
                            </div>
                        )}

                        {/* Status Desativado */}
                        {isDeactivated && (
                            <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider text-rose-600 dark:text-rose-400 mt-0.5">
                                <i className="bi bi-slash-circle text-rose-500" /> Desativado
                            </span>
                        )}

                        {/* Selos de Triagem e Tipo */}
                        <div className="flex items-center gap-2 mt-1">
                            {isChildVariation && exitedVariationIds?.has(String((product as any).variationId)) && (
                                <span className="flex items-center gap-1 bg-orange-50 dark:bg-orange-950/20 text-orange-700 dark:text-orange-400 px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest border border-orange-200 dark:border-orange-900/30 select-none">
                                    <i className="bi bi-box-arrow-right" /> Saída Lançada
                                </span>
                            )}

                            {isDraft && (
                                <span className="flex items-center gap-1 bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest border border-amber-200 dark:border-amber-800">
                                    <i className="bi bi-file-earmark-text" /> Rascunho
                                </span>
                            )}

                            {product.itemType === 'service' ? (
                                <span className="flex items-center gap-1 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest border border-amber-100 dark:border-amber-900/30">
                                    <i className="bi bi-tools" /> Serviço
                                </span>
                            ) : (
                                product.isCombo && (
                                    <span className="flex items-center gap-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest border border-purple-200 dark:border-purple-900/40 shadow-sm animate-pulse-slow">
                                        <i className="bi bi-layers-fill" /> Combo/Jogo
                                    </span>
                                )
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </td>
    );
};
