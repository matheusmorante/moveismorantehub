import React, { useState, useEffect, useRef } from 'react';
import Product from '@/pages/types/product.type';
import { supabase } from '@/pages/utils/supabaseConfig';
import { processProductData } from '../utils/processLabelProductData';
import { getSelectedProductDisplayName } from '@/pages/utils/productVariationDefaults';
import { buildPostgrestAccentInsensitiveOrFilter, matchesSearchText } from '../../../../../../../shared-utils/searchText';

const LABEL_PRODUCT_COLUMNS =
  'id, name, description, code, unit_price, cost_price, price, promo_price, stock, active, deleted_at, has_variations, category, unit, images, is_combo';
const LABEL_VARIATION_COLUMNS = `id, product_id, name, description, sku, price, promo_price, stock, image_url, active,
    products(${LABEL_PRODUCT_COLUMNS})`;

interface ProductSearchInputProps {
  products: Product[];
  selectedProduct?: Product | null;
  onSelectProduct: (product: Product | null) => void;
  placeholder?: string;
  className?: string;
  hideIcon?: boolean;
  autoFocus?: boolean;
}

export const ProductSearchInput: React.FC<ProductSearchInputProps> = ({
  products,
  selectedProduct = null,
  onSelectProduct,
  placeholder = 'Digite para buscar produto...',
  className = '',
  hideIcon = false,
  autoFocus = false,
}) => {
  const normalizeSearchText = (value: unknown) =>
    String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLocaleLowerCase('pt-BR');

  // A sintaxe do filtro `or` do PostgREST usa vírgulas e parênteses como
  // separadores. Removê-los do termo evita que uma busca comum quebre a consulta.
  const getSafeSearchTerm = (value: string) =>
    value.trim().replace(/[(),]/g, ' ').replace(/[%_]/g, '');

  const buildProductSearchFilter = (term: string) =>
    buildPostgrestAccentInsensitiveOrFilter(['name', 'description', 'code'], term);

  const buildVariationSearchFilter = (term: string) =>
    buildPostgrestAccentInsensitiveOrFilter(['name', 'description', 'sku'], term);

  // Retorna o Título/Nome do produto priorizando title, name e description
  const getProductTitle = (p?: Product | null) => {
    if (!p) return '';
    return p.title || p.name || p.description || '';
  };

  const [isOpen, setIsOpen] = useState(false);
  const [filterText, setFilterText] = useState(getProductTitle(selectedProduct));
  const [dbSearchResults, setDbSearchResults] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [dropdownMaxHeight, setDropdownMaxHeight] = useState(288);
  const containerRef = useRef<HTMLDivElement>(null);
  const selectedProductTitle = getProductTitle(selectedProduct);
  const isShowingSelectedProduct = Boolean(
    selectedProduct && filterText.trim() === selectedProductTitle.trim()
  );

  useEffect(() => {
    if (!selectedProduct) {
      setFilterText('');
    } else {
      setFilterText(getProductTitle(selectedProduct));
    }
  }, [selectedProduct]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // O painel de resultados ocupa todo o espaço livre abaixo da busca. Assim,
  // listas grandes rolam dentro dele sem ficar escondidas pela tela.
  useEffect(() => {
    if (!isOpen) return;

    const updateDropdownHeight = () => {
      const bottom = containerRef.current?.getBoundingClientRect().bottom;
      if (bottom === undefined) return;
      setDropdownMaxHeight(Math.max(0, window.innerHeight - bottom - 16));
    };

    updateDropdownHeight();
    window.addEventListener('resize', updateDropdownHeight);
    window.addEventListener('scroll', updateDropdownHeight, true);
    return () => {
      window.removeEventListener('resize', updateDropdownHeight);
      window.removeEventListener('scroll', updateDropdownHeight, true);
    };
  }, [isOpen]);

  // BUSCA AO VIVO NO SUPABASE POR TÍTULO, NOME, CÓDIGO, SKU OU DESCRIÇÃO
  useEffect(() => {
    const trimmedSearch = filterText.trim();
    if (trimmedSearch.length < 3 || (selectedProduct && trimmedSearch === selectedProductTitle.trim())) {
      setDbSearchResults([]);
      setIsLoading(false);
      return;
    }

    let active = true;
    setIsLoading(true);

    const searchTimeout = window.setTimeout(async () => {
      try {
        const term = getSafeSearchTerm(trimmedSearch);
        if (term.length < 3) {
          setDbSearchResults([]);
          return;
        }

        // A busca anterior incluía `variations::text` na tabela products.
        // Em instalações onde as variações ficam na tabela própria, esse
        // filtro invalida toda a pesquisa. Agora cada fonte é consultada
        // com os seus campos reais, inclusive o SKU da variação.
        const productsQuery = supabase
          .from('products')
          .select(LABEL_PRODUCT_COLUMNS)
          .is('deleted_at', null)
          .or('product_kind.eq.normal,product_kind.is.null')
          .or('has_variations.eq.false,has_variations.is.null')
          .or('is_combo.eq.false,is_combo.is.null')
          .or(buildProductSearchFilter(term))
          .limit(5);

        const variationsQuery = supabase
          .from('product_variations')
          .select(LABEL_VARIATION_COLUMNS.replace('products(', 'products!inner('))
          .is('merged_to_variation_id', null)
          .or('product_kind.eq.normal,product_kind.is.null', { foreignTable: 'products' })
          .or(buildVariationSearchFilter(term))
          .limit(5);

        const [productsResponse, variationsResponse] = await Promise.all([
          productsQuery,
          variationsQuery,
        ]);

        if (!active) return;
        if (productsResponse.error) {
          console.error('Erro no Supabase ao buscar produtos:', productsResponse.error);
        }
        if (variationsResponse.error) {
          console.error('Erro no Supabase ao buscar variações:', variationsResponse.error);
        }

        // Extrai as variações filhas do produto pai e descarta o próprio pai caso ele tenha variações
        const productResults = processProductData(productsResponse.data || []).filter(
          (p: any) => !p.isParent
        );
        const variationResults = (variationsResponse.data || []).flatMap((variation: any) => {
          const parent = variation.products;
          if (!parent) return [];
          const variationTitle = variation.name || variation.description || variation.sku || '';
          const title = getSelectedProductDisplayName(parent, variation) || variationTitle;

          return [
            {
              ...parent,
              id: variation.id,
              variationId: variation.id,
              sku: variation.sku || parent.sku || parent.code,
              title,
              description: title,
              variationName: variationTitle,
              unitPrice:
                variation.price ??
                variation.unit_price ??
                parent.unit_price ??
                parent.unitPrice ??
                0,
              promoPrice:
                variation.promo_price ??
                variation.promoPrice ??
                parent.promo_price ??
                parent.promoPrice,
              stock: variation.stock ?? parent.stock,
              images:
                variation.images || variation.image_url
                  ? variation.images || [variation.image_url]
                  : parent.images,
              parentImages: parent.images || [],
              isVariation: true,
              parentId: parent.id,
            } as Product,
          ];
        });

        const resultMap = new Map<string, Product>();
        [...productResults, ...variationResults].forEach((product) => {
          if (product.id) resultMap.set(String(product.id), product);
        });
        if (active) setDbSearchResults(Array.from(resultMap.values()).slice(0, 5));
      } catch (err) {
        if (active) console.error('Erro na busca de produtos:', err);
      } finally {
        if (active) setIsLoading(false);
      }
    }, 300);

    return () => {
      active = false;
      clearTimeout(searchTimeout);
    };
  }, [filterText, selectedProduct, selectedProductTitle]);

  // COMBINA OS PRODUTOS DA PROP LOCAL COM OS RESULTADOS AO VIVO DO BANCO DE DADOS
  const combinedProducts = React.useMemo(() => {
    const term = normalizeSearchText(filterText.trim());

    if (term.length < 3) {
      return [];
    }

    // 1. Filtrar lista local por título, nome, código ou SKU
    const localFiltered = (products || []).filter((p) => {
      const pTitle = normalizeSearchText(getProductTitle(p));
      const pCode = normalizeSearchText(p.code);
      const pSku = normalizeSearchText(p.sku);
      const pDesc = normalizeSearchText(p.description);
      const pCat = normalizeSearchText(p.category);
      return matchesSearchText(`${pTitle} ${pDesc} ${pCode} ${pSku} ${pCat}`, term);
    });

    // 2. Combinar com resultados remotos do Supabase evitando duplicatas por ID
    const map = new Map<string, Product>();
    localFiltered.forEach((p) => {
      if (p.id) map.set(String(p.id), p);
    });
    dbSearchResults.forEach((p) => {
      if (p.id) map.set(String(p.id), p);
    });

    return Array.from(map.values()).slice(0, 5);
  }, [products, dbSearchResults, filterText]);

  return (
    <div ref={containerRef} className={`relative flex-1 ${className}`}>
      <div className={`flex items-center gap-3 w-full px-2 py-2 bg-transparent border-b-2 transition-colors cursor-text min-w-[240px] ${isShowingSelectedProduct ? 'border-emerald-500 focus-within:border-emerald-600 dark:border-emerald-400' : 'border-slate-200 dark:border-slate-800 focus-within:border-blue-500'}`}>
        {!hideIcon && (
          <span className="w-6 h-6 rounded-xl flex items-center justify-center shrink-0">
            {isLoading ? (
              <i className="bi bi-arrow-repeat text-xs animate-spin text-blue-500" />
            ) : (
              <i className="bi bi-search text-xs text-slate-400" />
            )}
          </span>
        )}

        <div className="flex flex-col min-w-0 flex-1">
          <input
            type="text"
            autoFocus={autoFocus}
            aria-label="Buscar produto"
            value={filterText}
            onChange={(e) => {
              setFilterText(e.target.value);
              setIsOpen(true);
              setDbSearchResults([]);
              setIsLoading(e.target.value.trim().length >= 3);
            }}
            onFocus={() => setIsOpen(Boolean(filterText.trim()))}
            placeholder={placeholder}
            className="bg-transparent border-0 p-0 focus:ring-0 text-sm font-medium text-slate-800 dark:text-slate-100 placeholder:text-slate-400 outline-none w-full truncate"
          />
        </div>

        {filterText && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setFilterText('');
              onSelectProduct(null);
              setIsOpen(false);
            }}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 transition-colors"
            title="Limpar busca"
          >
            <i className="bi bi-x-circle-fill text-sm" />
          </button>
        )}
        {isShowingSelectedProduct && (
          <i className="bi bi-check-lg shrink-0 text-emerald-600 dark:text-emerald-400" aria-label="Produto selecionado" />
        )}
      </div>

      {/* Dropdown Popover Modal filtrado */}
      {isOpen && (
        <div
          className="absolute top-[calc(100%+6px)] left-0 right-0 z-[1000] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-y-auto custom-scrollbar p-1.5 animate-slide-up"
          style={{ maxHeight: dropdownMaxHeight }}
        >
          {filterText.trim().length > 0 && filterText.trim().length < 3 ? (
            <div className="p-4 text-center">
              <span className="text-xs font-medium text-slate-400 block">
                Digite pelo menos 3 caracteres para buscar...
              </span>
            </div>
          ) : isLoading && combinedProducts.length === 0 ? (
            <div className="p-4 text-center text-slate-400 text-xs font-bold flex items-center justify-center gap-2">
              <i className="bi bi-arrow-repeat animate-spin text-sm text-blue-500" />
              <span>Buscando produtos no banco de dados...</span>
            </div>
          ) : combinedProducts.length > 0 ? (
            <div className="flex flex-col gap-0.5">
              {combinedProducts.slice(0, 5).map((p) => {
                const isSelected = selectedProduct?.id === p.id;
                const title = getProductTitle(p);

                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      setFilterText('');
                      setDbSearchResults([]);
                      onSelectProduct(p);
                      setIsOpen(false);
                    }}
                    className={`flex items-center p-3 rounded-xl transition-all text-left w-full cursor-pointer ${
                      isSelected
                        ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-bold'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-200'
                    }`}
                  >
                    <span className="min-w-0 text-xs font-black uppercase truncate">{title}</span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="p-4 text-center">
              <span className="text-xs font-medium text-slate-400 block mb-1">
                Nenhum produto encontrado com "{filterText}"
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ProductSearchInput;
