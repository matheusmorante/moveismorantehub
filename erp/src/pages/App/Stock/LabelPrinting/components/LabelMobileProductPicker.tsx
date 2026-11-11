import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import ProductAutocomplete from '@/components/ProductAutocomplete';
import type { Product, Variation } from '@/pages/types/product.type';
import ProductSearchInput from './ProductSearchInput';

interface Props {
  category: 'identificacao' | 'precos';
  productName?: string;
  selected: boolean;
  products: Product[];
  onSelectIdentification?: (product: Product, variation?: Variation) => void;
  onSelectPrice?: (product: Product) => void;
}

export function LabelMobileProductPicker({ category, productName, selected, products, onSelectIdentification, onSelectPrice }: Props) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`flex min-h-[44px] w-full items-center justify-between gap-2 border-b-2 px-2 py-2 text-left text-sm font-bold ${selected ? 'border-emerald-500 text-slate-900 dark:text-white' : 'border-slate-200 text-slate-500 dark:border-slate-700'}`}
      >
        <span className="min-w-0 break-words">{selected ? productName : 'Selecionar produto'}</span>
        <i className={`bi ${selected ? 'bi-check-lg text-emerald-600' : 'bi-search text-slate-400'} shrink-0`} aria-hidden="true" />
      </button>
      {open && createPortal(
        <div className="fixed inset-0 z-[9999999] flex items-stretch bg-slate-950/55 sm:items-center sm:justify-center" onClick={() => setOpen(false)}>
          <div role="dialog" aria-modal="true" aria-label="Buscar produto" className="h-[100dvh] max-h-[100dvh] w-full overflow-y-auto rounded-none bg-white p-4 shadow-2xl dark:bg-slate-900 sm:h-auto sm:max-h-[90vh] sm:max-w-lg sm:rounded-3xl" onClick={(event) => event.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Buscar produto</h2>
              <button type="button" aria-label="Fechar busca" onClick={() => setOpen(false)} className="p-2 text-slate-500"><i className="bi bi-x-lg" /></button>
            </div>
            <p className="mb-2 text-xs text-slate-500">Digite pelo menos três caracteres para pesquisar.</p>
            {category === 'identificacao' ? (
              <ProductAutocomplete
                autoFocus
                inputAriaLabel="Buscar produto"
                onSelect={(product, variation) => { onSelectIdentification?.(product, variation); setOpen(false); }}
                allowedProductKinds={['normal']}
                variationsOnly
                excludeCombos
                includeTrashEligibility={false}
                maxSuggestions={5}
                onlyName
                placeholder="Nome, código ou SKU"
              />
            ) : (
              <ProductSearchInput
                autoFocus
                products={products}
                onSelectProduct={(product) => { if (product) { onSelectPrice?.(product); setOpen(false); } }}
                placeholder="Nome, código ou SKU"
              />
            )}
            <div className="h-52" />
          </div>
        </div>, document.body
      )}
    </>
  );
}
