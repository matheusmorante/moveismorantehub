import React, { useState } from 'react';
import type { SupplierOption } from './useReconciliationSupplierSearch';

interface SupplierSearchFieldProps {
  disabled: boolean;
  suppliers: SupplierOption[];
  selectedSupplierId: string;
  onSelect: (id: string) => void;
  onQueryChange: (term: string) => void;
  isSearching: boolean;
}

export const SupplierSearchField: React.FC<SupplierSearchFieldProps> = ({
  disabled,
  suppliers,
  selectedSupplierId,
  onSelect,
  onQueryChange,
  isSearching,
}) => {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);

  const selectedSupplier = suppliers.find((s) => s.id === selectedSupplierId);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    onSelect(''); // limpa seleção ao digitar

    onQueryChange(val); setOpen(val.trim().length >= 2);
  };

  const handleClear = () => {
    setQuery('');
    onSelect(''); onQueryChange('');
    setOpen(false);
  };

  const handleSelectItem = (supplier: SupplierOption) => {
    setQuery(supplier.fullName);
    onSelect(supplier.id!);
    setOpen(false);
  };

  // Se tiver selecionado externamente, sincroniza o texto
  React.useEffect(() => {
    if (selectedSupplier && query !== selectedSupplier.fullName) {
      setQuery(selectedSupplier.fullName);
    }
  }, [selectedSupplier]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="relative">
      <div className="relative">
        <i className="bi bi-search absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm pointer-events-none"></i>
        <input
          type="text" disabled={disabled} aria-label="Buscar fornecedor"
          autoComplete="off"
          value={query}
          onChange={handleChange}
          onFocus={() => {
            if (query.trim().length >= 2 && suppliers.length > 0) setOpen(true);
          }}
          onBlur={() => setOpen(false)}
          placeholder="Digite o nome do fornecedor..."
          className="w-full h-11 pl-10 pr-9 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-semibold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:font-normal placeholder:text-slate-400"
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {isSearching && (
            <i className="bi bi-arrow-repeat animate-spin text-slate-400 text-sm"></i>
          )}
          {selectedSupplierId && !isSearching && (
            <>
              <i className="bi bi-check-circle-fill text-emerald-500 text-sm"></i>
              <button
                type="button"
                disabled={disabled} onClick={handleClear}
                className="text-slate-400 hover:text-red-500 transition-colors ml-1"
              >
                <i className="bi bi-x-lg text-xs"></i>
              </button>
            </>
          )}
          {!selectedSupplierId && !isSearching && (
            <i className="bi bi-truck text-slate-400 text-sm"></i>
          )}
        </div>
      </div>

      {/* Dropdown de resultados */}
      {open && (
        <div className="absolute z-[99999] top-full left-0 right-0 mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-h-56 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/50">
          {suppliers.length === 0 ? (
            <div className="px-4 py-4 text-center text-xs font-bold text-slate-400">
              {isSearching ? 'Buscando...' : 'Nenhum fornecedor encontrado.'}
            </div>
          ) : (
            suppliers.map((s) => (
              <button
                key={s.id}
                type="button"
                disabled={disabled}
                onMouseDown={(event) => event.preventDefault()} onClick={() => handleSelectItem(s)}
                className="w-full px-4 py-3 text-left hover:bg-blue-50 dark:hover:bg-slate-800 transition-all flex flex-col gap-0.5"
              >
                <span className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                  {s.fullName}
                </span>
                {s.tradeName && s.tradeName !== s.fullName && (
                  <span className="text-[10px] text-slate-400 truncate">
                    Fantasia: {s.tradeName}
                  </span>
                )}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
};
