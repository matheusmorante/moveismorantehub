import React, { useState } from 'react';
import Person from '../pages/types/person.type';
import { useSupplierAutocomplete } from './supplier-autocomplete/useSupplierAutocomplete';
import { SupplierSuggestionsList } from './supplier-autocomplete/SupplierSuggestionsList';

export interface SupplierAutocompleteProps {
  suppliers: Person[];
  selectedSupplierId: string;
  onSelect: (supplierId: string) => void;
  supplierFilter?: (supplier: Person) => boolean;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  disabled?: boolean;
  disabledReason?: string;
  showDisabledReasonOnClick?: boolean;
  hideLabel?: boolean;
  customLabel?: string;
  showSelectedBadge?: boolean;
  minChars?: number;
}

const SupplierAutocomplete: React.FC<SupplierAutocompleteProps> = ({
  suppliers,
  selectedSupplierId,
  onSelect,
  supplierFilter,
  placeholder = 'Digite pelo menos 3 caracteres para buscar fornecedor...',
  className = '',
  inputClassName = 'w-full bg-white dark:bg-slate-900 border-0 border-b-2 border-slate-200 dark:border-slate-700 p-2 focus:border-blue-600 dark:focus:border-blue-500 outline-none text-sm font-bold text-slate-700 dark:text-slate-200 transition-all focus:ring-0 rounded-none',
  disabled = false,
  disabledReason = '',
  showDisabledReasonOnClick = false,
  hideLabel = false,
  customLabel = 'Fornecedor',
  showSelectedBadge = true,
  minChars = 3,
}) => {
  const requiredMinChars = Math.max(3, minChars);
  const [showDisabledReason, setShowDisabledReason] = useState(false);
  const disabledReasonId = React.useId();
  const {
    query,
    wrapperRef,
    showSuggestions,
    setShowSuggestions,
    isSearchSettled,
    filteredSuggestions,
    isSelected,
    handleClear,
    handleFocus,
    handleInputChange,
    handleSelectOption,
  } = useSupplierAutocomplete({
    suppliers,
    selectedSupplierId,
    onSelect,
    supplierFilter,
    disabled,
    minChars: requiredMinChars,
  });

  React.useEffect(() => {
    if (!showDisabledReason) return;

    const closeOnOutsideClick = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowDisabledReason(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setShowDisabledReason(false);
    };

    document.addEventListener('mousedown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [showDisabledReason, wrapperRef]);

  return (
    <div ref={wrapperRef} className={`relative flex flex-col gap-2 ${className}`}>
      {!hideLabel && (
        <div className="flex items-center justify-between">
          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
            {customLabel}
            {showSelectedBadge && isSelected && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 text-[9px] font-bold tracking-wider">
                <i className="bi bi-check2-circle text-[10px] text-slate-400" /> Selecionado
              </span>
            )}
          </label>
          {disabled && !showDisabledReasonOnClick && (
            <span className="text-[9px] font-bold uppercase tracking-wider text-amber-500 flex items-center gap-1">
              <i className="bi bi-lock-fill text-[10px]" /> Bloqueado
            </span>
          )}
        </div>
      )}
      <div className="relative">
        {disabled && showDisabledReasonOnClick ? (
          <button
            type="button"
            className={`${inputClassName} block text-left pr-10 ${isSelected ? '!border-t-0 !border-x-0 !border-b-2 !rounded-none !text-slate-900 dark:!text-slate-100' : 'opacity-70'} cursor-pointer bg-slate-100 dark:bg-slate-800/60`}
            style={isSelected ? { borderTopWidth: 0, borderLeftWidth: 0, borderRightWidth: 0, borderBottomWidth: 2, borderBottomStyle: 'solid', borderBottomColor: '#10b981', borderRadius: 0, boxShadow: 'none' } : undefined}
            aria-label="Ver por que o fornecedor está bloqueado"
            aria-expanded={showDisabledReason}
            aria-controls={disabledReasonId}
            aria-describedby={showDisabledReason ? disabledReasonId : undefined}
            onClick={() => setShowDisabledReason((current) => !current)}
          >
            <span className="block truncate">{query || 'Fornecedor fixado para os itens atuais'}</span>
          </button>
        ) : (
          <input
            type="text"
            autoComplete="off"
            value={query}
            disabled={disabled}
            onChange={(e) => handleInputChange(e.target.value)}
            onFocus={handleFocus}
            placeholder={disabled ? 'Fornecedor fixado para os itens atuais' : placeholder}
            style={isSelected ? { borderTopWidth: 0, borderLeftWidth: 0, borderRightWidth: 0, borderBottomWidth: 2, borderBottomStyle: 'solid', borderBottomColor: '#10b981', borderRadius: 0, boxShadow: 'none' } : undefined}
            className={`${inputClassName} ${
              disabled
                ? 'opacity-70 cursor-not-allowed bg-slate-100 dark:bg-slate-800/60'
                : isSelected
                  ? 'border-b-2 border-emerald-500 dark:border-emerald-500 focus:border-blue-600'
                  : 'bg-white dark:bg-slate-900'
            }`}
            title={
              disabled
                ? disabledReason || 'Para trocar de fornecedor, remova todos os itens do pedido.'
                : undefined
            }
          />
        )}
        <div
          className={`absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 ${disabled && showDisabledReasonOnClick ? 'pointer-events-none' : ''}`}
        >
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
          {disabled ? (
            <i className="bi bi-lock-fill text-amber-500 text-base" />
          ) : !isSelected ? (
            <i className="bi bi-truck text-slate-400 text-base" />
          ) : null}
          {isSelected && (
            <i className="bi bi-check-lg text-emerald-600 dark:text-emerald-400 text-base" />
          )}
        </div>
        {disabled && showDisabledReasonOnClick && showDisabledReason && disabledReason && (
          <div
            id={disabledReasonId}
            role="tooltip"
            className="absolute left-0 right-0 top-full z-[100] mt-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs font-semibold text-amber-800 shadow-xl dark:border-amber-900/60 dark:bg-amber-950 dark:text-amber-200"
          >
            <i className="bi bi-lock-fill mr-1.5" />
            {disabledReason}
          </div>
        )}
      </div>
      {disabled && disabledReason && !showDisabledReasonOnClick && (
        <p className="text-[10px] font-medium text-amber-600 dark:text-amber-400 flex items-center gap-1">
          <i className="bi bi-info-circle text-[10px]" />
          {disabledReason}
        </p>
      )}

      <SupplierSuggestionsList
        anchorRef={wrapperRef}
        isOpen={
          !disabled &&
          showSuggestions &&
          query.trim().length >= requiredMinChars &&
          isSearchSettled &&
          suppliers.length > 0
        }
        suggestions={filteredSuggestions}
        onSelect={handleSelectOption}
      />
    </div>
  );
};

export default SupplierAutocomplete;
