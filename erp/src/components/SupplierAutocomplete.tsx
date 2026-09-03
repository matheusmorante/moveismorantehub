import React from 'react';
import Person from '../pages/types/person.type';
import { useSupplierAutocomplete } from './supplier-autocomplete/useSupplierAutocomplete';
import { SupplierSuggestionsList } from './supplier-autocomplete/SupplierSuggestionsList';

export interface SupplierAutocompleteProps {
    suppliers: Person[];
    selectedSupplierId: string;
    onSelect: (supplierId: string) => void;
    placeholder?: string;
    className?: string;
    inputClassName?: string;
    disabled?: boolean;
    disabledReason?: string;
    hideLabel?: boolean;
}

const SupplierAutocomplete: React.FC<SupplierAutocompleteProps> = ({
    suppliers,
    selectedSupplierId,
    onSelect,
    placeholder = "Buscar fornecedor...",
    className = "",
    inputClassName = "w-full bg-transparent border-0 border-b border-slate-200 dark:border-slate-800 p-2 focus:border-blue-600 dark:focus:border-blue-500 outline-none text-sm font-bold text-slate-700 dark:text-slate-300 transition-all focus:ring-0 focus:shadow-sm",
    disabled = false,
    disabledReason = "",
    hideLabel = false
}) => {
    const {
        query,
        wrapperRef,
        showSuggestions,
        setShowSuggestions,
        filteredSuggestions,
        isSelected,
        handleClear,
        handleInputChange,
        handleSelectOption
    } = useSupplierAutocomplete({
        suppliers,
        selectedSupplierId,
        onSelect,
        disabled
    });

    return (
        <div ref={wrapperRef} className={`relative flex flex-col gap-2 ${className}`}>
            {!hideLabel && (
                <div className="flex items-center justify-between">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                        Fornecedor
                        {isSelected && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 text-[9px] font-bold tracking-wider">
                                <i className="bi bi-check2-circle text-[10px]" /> Selecionado
                            </span>
                        )}
                    </label>
                    {disabled && (
                        <span className="text-[9px] font-bold uppercase tracking-wider text-amber-500 flex items-center gap-1">
                            <i className="bi bi-lock-fill text-[10px]" /> Bloqueado
                        </span>
                    )}
                </div>
            )}
            <div className="relative">
                <input
                    type="text"
                    autoComplete="off"
                    value={query}
                    disabled={disabled}
                    onChange={(e) => handleInputChange(e.target.value)}
                    onFocus={() => {
                        if (!disabled) setShowSuggestions(true);
                    }}
                    placeholder={disabled ? "Fornecedor fixado para os itens atuais" : placeholder}
                    className={`${inputClassName} ${
                        disabled 
                            ? 'opacity-70 cursor-not-allowed bg-slate-50/50 dark:bg-slate-800/30' 
                            : isSelected 
                            ? 'border-emerald-500 dark:border-emerald-500 bg-emerald-50/30 dark:bg-emerald-950/20 text-emerald-900 dark:text-emerald-100 focus:border-emerald-600 focus:ring-emerald-500/20' 
                            : ''
                    }`}
                    title={disabled ? (disabledReason || "Para trocar de fornecedor, remova todos os itens do pedido.") : undefined}
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                    {isSelected && !disabled && (
                        <button
                            type="button"
                            onClick={handleClear}
                            className="p-1 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                            title="Limpar seleção de fornecedor"
                        >
                            <i className="bi bi-x-lg text-xs" />
                        </button>
                    )}
                    <i className={`bi ${disabled ? 'bi-lock-fill text-amber-500' : isSelected ? 'bi-check-circle-fill text-emerald-600 dark:text-emerald-400' : 'bi-truck text-slate-400'} text-base`} />
                </div>
            </div>
            {disabled && disabledReason && (
                <p className="text-[10px] font-medium text-amber-600 dark:text-amber-400 flex items-center gap-1">
                    <i className="bi bi-info-circle text-[10px]" />
                    {disabledReason}
                </p>
            )}

            <SupplierSuggestionsList
                anchorRef={wrapperRef}
                isOpen={!disabled && showSuggestions && suppliers.length > 0}
                suggestions={filteredSuggestions}
                onSelect={handleSelectOption}
            />
        </div>
    );
};

export default SupplierAutocomplete;
