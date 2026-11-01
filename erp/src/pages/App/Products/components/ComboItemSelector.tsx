import React, { useState, useEffect } from 'react';
import { supabase } from '@/pages/utils/supabaseConfig';
import Product, { ComboItem, Variation } from '../../../types/product.type';
import { toast } from 'react-toastify';
import DropdownPortal from '@/components/shared/DropdownPortal';
import { useRef } from 'react';
import { getSelectedProductDisplayName } from '../../../utils/productVariationDefaults';
import { buildPostgrestAccentInsensitivePattern } from '../../../../../../shared-utils/searchText';

interface ProductSearchResult {
  id: string;
  description?: string;
  unitPrice?: number;
  stock?: number;
  hasVariations?: boolean;
  variations?: Variation[];
}

interface ProductSearchSuggestion {
  product: ProductSearchResult;
  variation?: Variation;
}

interface ComboItemSelectorProps {
  readonly currentItems: readonly ComboItem[];
  readonly onAdd: (item: ComboItem) => void;
  readonly onRemove: (index: number) => void;
  readonly onUpdateQuantity: (index: number, quantity: number) => void;
}

export const ComboItemSelector: React.FC<ComboItemSelectorProps> = ({
  currentItems,
  onAdd,
  onRemove,
  onUpdateQuantity,
}) => {
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<ProductSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const inputContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const trimmedSearch = search.trim();
    if (trimmedSearch.length < 3) {
      setResults([]);
      setLoading(false);
      return;
    }

    let active = true;
    const delayDebounceFn = setTimeout(async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('products')
          .select('id, description, unitPrice, stock, hasVariations, variations')
          .filter('description', 'imatch', buildPostgrestAccentInsensitivePattern(trimmedSearch))
          .eq('is_combo', false) // Evitar combos recursivos
          .limit(5);

        if (error) throw error;
        if (active) setResults((data as ProductSearchResult[]) || []);
      } catch {
        if (active) setResults([]);
      } finally {
        if (active) setLoading(false);
      }
    }, 300);

    return () => {
      active = false;
      clearTimeout(delayDebounceFn);
    };
  }, [search]);

  const suggestions: ProductSearchSuggestion[] = results
    .flatMap((product) =>
      product.hasVariations && product.variations?.length
        ? product.variations.map((variation) => ({ product, variation }))
        : [{ product }],
    )
    .slice(0, 5);

  const handleAddItem = (prod: ProductSearchResult, variation?: Variation) => {
    const item: ComboItem = {
      productId: prod.id,
      variationId: variation?.id,
      description: getSelectedProductDisplayName(prod as unknown as Partial<Product>, variation),
      unitPrice: Number(variation ? variation.unitPrice : prod.unitPrice) || 0,
      stock: Number(variation ? variation.stock : prod.stock) || 0,
      quantity: 1,
    };

    // Verificar se já existe
    const exists = currentItems.some(
      (i) => i.productId === item.productId && i.variationId === item.variationId
    );
    if (exists) {
      toast.warning('Este item já foi adicionado ao combo.');
      return;
    }

    onAdd(item);
    setSearch('');
    setResults([]);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Search Input */}
      <div className="relative">
        <div className="relative" ref={inputContainerRef}>
          <i
            className="bi bi-search absolute left-4 top-1/2 -translate-y-1/2 text-purple-400"
            aria-hidden="true"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setResults([]);
            }}
            placeholder="Buscar produto para adicionar ao combo..."
            className="w-full pl-12 pr-4 py-3 bg-white dark:bg-slate-900 border border-purple-100 dark:border-purple-900/30 rounded-2xl outline-none text-sm focus:ring-2 focus:ring-purple-500 transition-all"
          />
          {loading && (
            <div className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
          )}
        </div>

        <DropdownPortal anchorRef={inputContainerRef} isOpen={search.trim().length >= 3 && results.length > 0}>
          <div className="mt-2 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-xl rounded-2xl overflow-hidden animate-in fade-in slide-in-from-top-2">
            {suggestions.map(({ product, variation }) => (
              <div key={`${product.id}-${variation?.id || 'produto'}`}>
                {variation ? (
                    <button
                      type="button"
                      onClick={() => handleAddItem(product, variation)}
                      className="w-full px-4 py-3 flex items-center justify-between hover:bg-purple-50 dark:hover:bg-purple-900/10 transition-colors border-b border-slate-50 dark:border-slate-800 last:border-0 cursor-pointer"
                    >
                      <div className="text-left">
                        <p className="text-xs font-bold text-slate-700 dark:text-slate-200">
                          {product.description}
                        </p>
                        <p className="text-[10px] text-purple-600 font-black uppercase tracking-widest">
                          {variation.name}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-black text-slate-800 dark:text-slate-100">
                          R$ {Number(variation.unitPrice || 0).toFixed(2)}
                        </p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase">
                          {Number(variation.stock || 0)} em estoque
                        </p>
                      </div>
                    </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleAddItem(product)}
                    className="w-full px-4 py-3 flex items-center justify-between hover:bg-purple-50 dark:hover:bg-purple-900/10 transition-colors border-b border-slate-50 dark:border-slate-800 last:border-0 cursor-pointer"
                  >
                    <div className="text-left">
                      <p className="text-xs font-bold text-slate-700 dark:text-slate-200">
                        {product.description}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-black text-slate-800 dark:text-slate-100">
                        R$ {Number(product.unitPrice || 0).toFixed(2)}
                      </p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase">
                        {Number(product.stock || 0)} em estoque
                      </p>
                    </div>
                  </button>
                )}
              </div>
            ))}
          </div>
        </DropdownPortal>
      </div>

      {/* Selected Items List */}
      <div className="flex flex-col gap-2">
        {currentItems.map((item, idx) => (
          <div
            key={`${item.productId}-${item.variationId}-${idx}`}
            className="flex items-center gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 group transition-all hover:shadow-md"
          >
            <div className="flex-1">
              <p className="text-xs font-black text-slate-800 dark:text-slate-200">
                {item.description}
              </p>
              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
                Unit: R$ {item.unitPrice.toFixed(2)} | Est: {item.stock}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-100 dark:border-slate-800 p-1">
                <button
                  type="button"
                  onClick={() => onUpdateQuantity(idx, Math.max(1, item.quantity - 1))}
                  className="w-6 h-6 flex items-center justify-center text-slate-400 hover:text-purple-600 transition-colors"
                >
                  <i className="bi bi-dash"></i>
                </button>
                <span className="w-8 text-center text-xs font-black text-slate-700 dark:text-slate-200">
                  {item.quantity}
                </span>
                <button
                  type="button"
                  onClick={() => onUpdateQuantity(idx, item.quantity + 1)}
                  className="w-6 h-6 flex items-center justify-center text-slate-400 hover:text-purple-600 transition-colors"
                >
                  <i className="bi bi-plus"></i>
                </button>
              </div>

              <button
                type="button"
                onClick={() => onRemove(idx)}
                className="w-8 h-8 flex items-center justify-center text-slate-300 hover:text-red-500 transition-colors"
              >
                <i className="bi bi-trash-fill"></i>
              </button>
            </div>
          </div>
        ))}

        {currentItems.length === 0 && (
          <div className="text-center py-8 opacity-40">
            <i className="bi bi-inbox text-4xl mb-2 block"></i>
            <p className="text-[10px] font-black uppercase tracking-widest">
              Nenhum item adicionado ainda
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ComboItemSelector;
