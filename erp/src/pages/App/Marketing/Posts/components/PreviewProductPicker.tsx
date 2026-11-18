import React, { useEffect, useRef, useState } from 'react';
import { Product } from '@/pages/types/product.type';
import type { ProductPreviewOption } from '@/pages/utils/productService';

type Props = {
  search: string;
  products: ProductPreviewOption[];
  selected: Product | null;
  loading: boolean;
  selectionLoading?: boolean;
  resultsSearch?: string;
  searchError?: string;
  onSearch: (value: string) => void;
  onSelect: (id: string) => void;
};

export function PreviewProductPicker({
  search,
  products,
  selected,
  loading,
  selectionLoading = false,
  resultsSearch,
  searchError,
  onSearch,
  onSelect,
}: Props) {
  const [open, setOpen] = useState(false);
  const container = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (!container.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);
  const clear = () => {
    onSearch('');
    onSelect('');
    setOpen(false);
  };
  const showSuggestions = open && !selected && search.trim().length >= 2;
  const resultsAreCurrent = resultsSearch === undefined || resultsSearch === search.trim();
  const searching = loading || !resultsAreCurrent;
  return (
    <div ref={container} className="relative text-xs font-semibold">
      Produto para preview padrão
      <div
        className={`mt-1 flex items-center border-0 border-b-2 rounded-none ${selected ? 'border-b-emerald-500 bg-white dark:bg-white' : 'border-b-slate-700 bg-slate-950'}`}
      >
        <i
          className="bi bi-search ml-2 text-slate-500"
        />
        <input
          value={selected ? selected.name || selected.title || '' : search}
          readOnly={Boolean(selected)}
          onFocus={() => { if (!selected) setOpen(true); }}
          onChange={(event) => {
            onSearch(event.target.value);
            setOpen(true);
          }}
          placeholder="Buscar produto"
          className={`min-w-0 flex-1 bg-transparent p-2 outline-none placeholder:text-slate-400 ${selected ? 'text-slate-900' : 'text-slate-800 dark:text-slate-100'}`}
        />
        {selected && (
          <button
            type="button"
            onClick={clear}
            aria-label="Limpar produto selecionado"
            className="px-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-900"
          >
            ✕
          </button>
        )}
        {selected && <i className="bi bi-check-lg mr-2 text-emerald-600" aria-label="Produto selecionado" />}
      </div>
      {selectionLoading && (
        <p role="status" aria-live="polite" className="mt-2 text-xs font-medium text-indigo-600 dark:text-indigo-300">
          Carregando prévia do produto…
        </p>
      )}
      {showSuggestions && (
        <div className="absolute z-40 mt-1 max-h-64 w-full overflow-auto rounded-lg border border-slate-700 bg-slate-950 p-1 shadow-xl">
          {searching && <p role="status" aria-live="polite" className="p-3 text-slate-400">Buscando produtos…</p>}
          {!searching && searchError && <p role="alert" className="p-3 text-rose-300">{searchError}</p>}
          {!searching && !searchError && products.map((product) => (
            <button
              key={product.id}
              type="button"
              onClick={() => {
                onSelect(product.id || '');
                setOpen(false);
              }}
              className="block w-full rounded px-3 py-2 text-left text-xs hover:bg-slate-800"
            >
              {product.name || product.title}
            </button>
          ))}
          {!searching && !searchError && !products.length && (
            <p className="p-3 text-slate-500">Nenhum produto encontrado.</p>
          )}
        </div>
      )}
    </div>
  );
}
