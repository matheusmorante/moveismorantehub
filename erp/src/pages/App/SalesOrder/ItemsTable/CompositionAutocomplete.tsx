import React, { useCallback, useRef, useState } from 'react';
import Product, { Variation } from '../../../types/product.type';
import { getSelectedProductDisplayName } from '../../../utils/productVariationDefaults';
import { useProductSearch_new } from '../hooks/useProductSearch_new';
import { fetchSelectableDeep, SelectableCatalogItem } from '../hooks/productSearchDeepFetch';
import DropdownPortal from '../../../../components/shared/DropdownPortal';
import { toast } from 'react-toastify';

interface CompositionAutocompleteProps {
  autoFocus?: boolean;
  onBlur?: () => void;
  onSelect: (product: Product, variation?: Variation) => void;
}

const CompositionAutocomplete: React.FC<CompositionAutocompleteProps> = ({
  autoFocus = false,
  onBlur,
  onSelect,
}) => {
  const { search, setSearch, loading, filtered } = useProductSearch_new('unit', {
    matchTermsIndividually: true,
    resolveProductItemTypes: true,
  });
  const [showResults, setShowResults] = useState(false);
  const [selectingKey, setSelectingKey] = useState<string | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const closeResults = useCallback(() => setShowResults(false), []);
  const searchTerms = search
    .trim()
    .split(/\s+/)
    .filter((word) => word.length >= 3)
    .map((word) => word.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR'));
  const getMatchScore = (item: SelectableCatalogItem) => {
    const searchableText = [
      getSelectedProductDisplayName(item.p, item.v),
      item.p.code,
      item.p.sku,
      item.v?.sku,
    ]
      .filter(Boolean)
      .join(' ')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLocaleLowerCase('pt-BR');
    return searchTerms.reduce((score, word) => score + Number(searchableText.includes(word)), 0);
  };
  const compositionResults = filtered
    .filter((item) => item.isComposition || item.p.itemType === 'composition')
    .sort((a, b) => getMatchScore(b) - getMatchScore(a))
    .slice(0, 5);

  const handleSelect = async (item: SelectableCatalogItem) => {
    if (selectingKey) return;
    setSelectingKey(item.key);
    try {
      const selected = await fetchSelectableDeep(item);
      const components =
        (selected.variation as any)?.items ||
        (selected.product as any).items ||
        (selected.product.variations?.[0] as any)?.items;
      if (!components?.length) {
        throw new Error('A composição selecionada não possui produtos vinculados.');
      }
      onSelect(selected.product, selected.variation);
    } catch (error) {
      const productName = getSelectedProductDisplayName(item.p, item.v);
      if (error instanceof Error && error.message.includes('não possui componentes cadastrados')) {
        console.warn('[CompositionAutocomplete] Produto composto sem componentes cadastrados:', productName);
        toast.error(
          `“${productName}” está sem componentes vinculados. Complete a composição no cadastro do produto antes de adicioná-la ao pedido.`
        );
        return;
      }
      console.error('[CompositionAutocomplete] Falha ao carregar produto composto:', error);
      toast.error('Não foi possível carregar os produtos componentes. Confira a composição e tente novamente.');
    } finally {
      setSelectingKey(null);
    }
  };

  const formatPrice = (price: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(price);

  return (
    <div ref={wrapperRef} className="relative min-w-0 flex-1">
      <input
        type="text"
        aria-label="Busque por um produto composto existente"
        aria-autocomplete="list"
        aria-controls="sales-order-composition-results"
        aria-expanded={showResults}
        autoComplete="off"
        autoFocus={autoFocus}
        value={search}
        onChange={(event) => {
          setSearch(event.target.value);
          setShowResults(true);
        }}
        onFocus={() => setShowResults(true)}
        onBlur={onBlur}
        placeholder="Busque por um produto composto existente... (mínimo de 3 caracteres para buscar)"
        className="w-full border-x-0 border-t-0 border-b-2 border-b-slate-200 bg-transparent px-1 py-1 text-xs font-semibold text-slate-800 outline-none transition-colors placeholder:font-normal placeholder:text-slate-400 focus:border-b-blue-500 dark:border-b-slate-700 dark:text-slate-100 dark:focus:border-b-blue-500"
      />

      <DropdownPortal
        anchorRef={wrapperRef}
        isOpen={showResults && search.trim().length > 0}
        onClose={closeResults}
      >
        <div
          id="sales-order-composition-results"
          role="listbox"
          aria-label="Produtos compostos existentes"
          className="max-h-72 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-xl dark:border-slate-700 dark:bg-slate-900"
        >
          {search.trim().length < 3 ? (
            <p className="px-3 py-3 text-xs font-medium text-slate-500 dark:text-slate-400">
              Digite pelo menos 3 caracteres para buscar.
            </p>
          ) : loading ? (
            <p className="flex items-center gap-2 px-3 py-3 text-xs font-medium text-slate-500 dark:text-slate-400">
              <i className="bi bi-arrow-repeat animate-spin" aria-hidden="true" />
              Buscando produtos compostos...
            </p>
          ) : compositionResults.length === 0 ? (
            <p className="px-3 py-3 text-xs font-medium text-slate-500 dark:text-slate-400">
              Nenhum produto composto encontrado.
            </p>
          ) : (
            compositionResults.map((item) => {
              const price = item.v?.unitPrice || item.p.unitPrice || 0;
              const code = item.v?.sku || item.p.code || item.p.sku || '';
              return (
                <button
                  key={item.key}
                  type="button"
                  role="option"
                  aria-selected={false}
                  disabled={Boolean(selectingKey)}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => handleSelect(item)}
                  className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left transition-colors hover:bg-blue-50 disabled:opacity-60 dark:hover:bg-blue-950/40"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <i className="bi bi-boxes shrink-0 text-blue-600 dark:text-blue-400" aria-hidden="true" />
                    <span className="min-w-0">
                      <span className="block truncate text-xs font-semibold text-slate-800 dark:text-slate-100">
                        {getSelectedProductDisplayName(item.p, item.v)}
                      </span>
                      {code && (
                        <span className="block truncate text-[10px] text-slate-500 dark:text-slate-400">
                          Código: {code}
                        </span>
                      )}
                    </span>
                  </span>
                  <span className="shrink-0 text-xs font-bold text-blue-600 dark:text-blue-400">
                    {formatPrice(price)}
                  </span>
                </button>
              );
            })
          )}
        </div>
      </DropdownPortal>
    </div>
  );
};

export default CompositionAutocomplete;
