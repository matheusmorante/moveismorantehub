import React from 'react';
import Product, { Variation } from '../pages/types/product.type';
import DropdownPortal from './shared/DropdownPortal';
import TruncatedProductTitle from './TruncatedProductTitle';
import { getVariationDisplayName } from './productAutocompleteUtils';
import { useProductAutocomplete } from './hooks/useProductAutocomplete';

interface ProductAutocompleteProps {
    onSelect: (product: Product, variation?: Variation) => void;
    onSelectDescription?: (description: string) => void;
    onChange?: (value: string) => void;
    onSearch?: () => void;
    onCreateNew?: () => void;
    isSelected?: boolean;
    isTemporary?: boolean;
    isAiSuggestion?: boolean;
    onAcceptSuggestion?: () => void;
    onRejectSuggestion?: () => void;
    value?: string;
    placeholder?: string;
    className?: string;
    inputClassName?: string;
    supplierId?: string;
    onlyName?: boolean;
    variationsOnly?: boolean;
    /** Limita a busca aos cadastros de produto, sem oferecer variações filhas. */
    parentsOnly?: boolean;
    /** Inclui produtos e variações desativados; variações fundidas continuam ocultas. */
    includeDeactivated?: boolean;
    products?: Product[];
    clearOnSelect?: boolean;
    disabled?: boolean;
    isLoadingSuggestions?: boolean;
    onEditClick?: (product: Product, variation?: Variation) => void;
}

const ProductAutocomplete: React.FC<ProductAutocompleteProps> = ({
    onSelect,
    onChange,
    onSearch,
    onCreateNew,
    isSelected = false,
    isTemporary = false,
    isAiSuggestion = false,
    onAcceptSuggestion,
    onRejectSuggestion,
    value = "",
    placeholder = "Digite o nome ou código do produto...",
    className = "",
    inputClassName,
    supplierId,
    onlyName = false,
    variationsOnly = false,
    parentsOnly = false,
    includeDeactivated = false,
    products: localProducts,
    clearOnSelect = false,
    disabled = false,
    isLoadingSuggestions = false,
    onEditClick,
}) => {
    const {
        query,
        setQuery,
        handleQueryChange,
        suggestions,
        isLoading,
        showSuggestions,
        setShowSuggestions,
        wrapperRef,
    } = useProductAutocomplete({
        value,
        supplierId,
        parentsOnly,
        variationsOnly,
        includeDeactivated,
        localProducts,
        onChange,
    });

    return (
        <div ref={wrapperRef} className={`relative ${className}`}>
            <div className="flex gap-1.5">
                <div className="relative flex-1">
                    <input
                        type="text"
                        autoComplete="off"
                        aria-busy={isLoadingSuggestions}
                        disabled={disabled}
                        value={query || ''}
                        onChange={(e) => {
                            handleQueryChange(e.target.value);
                        }}
                        onFocus={() => setShowSuggestions(query.trim().length >= 2)}
                        placeholder={placeholder}
                        className={inputClassName || `w-full border-b-2 bg-transparent px-3 py-2 text-sm font-medium outline-none transition-colors ${
                            isAiSuggestion
                                ? 'border-amber-400 text-amber-950 dark:text-amber-100 focus:border-amber-500 bg-amber-50/20 dark:bg-amber-950/20 rounded-t-lg'
                                : isTemporary 
                                    ? 'border-amber-400 text-amber-950 dark:text-amber-100 focus:border-amber-500'
                                    : isSelected 
                                        ? 'border-emerald-500 text-emerald-950 dark:text-emerald-100 font-semibold focus:border-emerald-600 pr-9'
                                        : 'border-slate-200 dark:border-slate-800 focus:border-blue-600 dark:focus:border-blue-500'
                        } ${disabled ? 'opacity-60 cursor-not-allowed' : ''} ${className}`}
                    />

                    {/* Faixa amarela animada passando no input durante o processamento */}
                    {isLoadingSuggestions && (
                        <div className="absolute inset-x-0 bottom-0 h-[2px] overflow-hidden rounded-b-lg pointer-events-none">
                            <div className="ncm-input-shimmer absolute inset-0 w-1/2" />
                        </div>
                    )}

                    {isLoadingSuggestions ? (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-amber-600 dark:text-amber-400">
                            <i className="bi bi-arrow-repeat animate-spin text-sm" />
                        </div>
                    ) : isLoading ? (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                            <i className="bi bi-arrow-repeat animate-spin text-slate-400"></i>
                        </div>
                    ) : isSelected ? (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" title="Produto vinculado ao catálogo">
                            <i className="bi bi-check-circle-fill text-emerald-500 text-sm"></i>
                        </div>
                    ) : isAiSuggestion ? (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" title="Sugestão de IA">
                            <i className="bi bi-stars text-amber-500 text-sm animate-pulse"></i>
                        </div>
                    ) : null}
                </div>
                
                {onSearch && (
                    <button
                        type="button"
                        onClick={onSearch}
                        className="p-2 bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 border border-slate-100 dark:border-slate-700 rounded-xl hover:bg-slate-100 transition-all shadow-sm"
                        title="Busca Avançada (Lupa)"
                    >
                        <i className="bi bi-search"></i>
                    </button>
                )}

                {onCreateNew && (
                    <button
                        type="button"
                        onClick={onCreateNew}
                        className="p-2 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800 rounded-xl hover:bg-emerald-600 hover:text-white transition-all shadow-sm"
                        title="Criar Novo Produto"
                    >
                        <i className="bi bi-plus-lg"></i>
                    </button>
                )}
            </div>

            {isAiSuggestion && (
                <div className="flex items-center justify-between mt-1.5 px-1">
                    <span className="flex items-center gap-1.5 text-[11px] font-bold text-amber-700 dark:text-amber-400">
                        <i className="bi bi-stars text-amber-500 text-xs" />
                        Sugestão de IA
                    </span>
                    <div className="flex items-center gap-1.5">
                        {onAcceptSuggestion && (
                            <button
                                type="button"
                                aria-label="Aceitar sugestão da IA"
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    onAcceptSuggestion();
                                }}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-colors"
                                title="Aceitar sugestão da IA"
                            >
                                <i className="bi bi-check-lg" />
                                Aceitar
                            </button>
                        )}
                        {onRejectSuggestion && (
                            <button
                                type="button"
                                aria-label="Recusar sugestão da IA"
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    onRejectSuggestion();
                                }}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30 dark:hover:text-red-300 transition-colors"
                                title="Recusar sugestão da IA"
                            >
                                <i className="bi bi-x-lg text-[10px]" />
                                Recusar
                            </button>
                        )}
                    </div>
                </div>
            )}

            <DropdownPortal anchorRef={wrapperRef} isOpen={showSuggestions && query.trim().length >= 2}>
                <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-2xl max-h-72 overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-200 divide-y divide-slate-100 dark:divide-slate-800/50">
                    {isLoading ? (
                        <div className="flex items-center justify-center gap-2 px-4 py-5 text-xs font-bold text-slate-400">
                            <i className="bi bi-arrow-repeat animate-spin" />
                            Buscando produtos...
                        </div>
                    ) : suggestions.length === 0 ? (
                        <div className="px-4 py-5 text-center text-xs font-bold text-slate-400">
                            Nenhum produto encontrado para esta busca.
                        </div>
                    ) : suggestions.map((item, index) => {
                        const { product: p, variation: v } = item;
                        const fullName = getVariationDisplayName(p, v);
                        const displayName = v?.name?.trim() || fullName;

                        const displayCode = v?.sku || p.code || '';
                        const displayPrice = v 
                            ? (v.promoPrice || v.unitPrice || p.promoPrice || p.unitPrice || 0) 
                            : (p.promoPrice || p.unitPrice || 0);
                        const displayStock = v ? (v.stock ?? 0) : (p.stock ?? 0);

                        return (
                            <button
                                key={`${p.id}-${v?.id || 'base'}-${index}`}
                                type="button"
                                onClick={() => {
                                    onSelect(p, v);
                                    if (clearOnSelect) {
                                        setQuery('');
                                        onChange?.('');
                                    } else {
                                        setQuery(fullName);
                                    }
                                    setShowSuggestions(false);
                                }}
                                className="w-full px-4 py-2.5 text-left hover:bg-emerald-50/70 dark:hover:bg-slate-800/60 transition-all flex items-center justify-between gap-3 group"
                            >
                                <div className="flex flex-col min-w-0 flex-1">
                                    <TruncatedProductTitle
                                        fullName={fullName}
                                        displayName={displayName}
                                        query={query}
                                    />
                                    {!onlyName && displayCode && (
                                        <span className="text-[10px] font-mono text-slate-400">
                                            Cód: {displayCode}
                                        </span>
                                    )}
                                </div>

                                {!onlyName && (
                                    <div className="flex items-center gap-3 shrink-0">
                                        <span className="text-xs font-black text-blue-600 dark:text-blue-400 font-sans">
                                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(displayPrice)}
                                        </span>
                                        {onEditClick ? (
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onEditClick(p, v);
                                                }}
                                                className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-md transition-colors"
                                                title="Editar produto/variação"
                                            >
                                                <i className="bi bi-pencil-square text-sm" />
                                            </button>
                                        ) : (
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${displayStock > 0 ? 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400' : 'bg-red-50 dark:bg-red-900/30 text-red-500'}`}>
                                                {displayStock > 0 ? `${displayStock} un` : 'Sem estoque'}
                                            </span>
                                        )}
                                    </div>
                                )}
                            </button>
                        );
                    })}
                </div>
            </DropdownPortal>
        </div>
    );
};

export default ProductAutocomplete;
