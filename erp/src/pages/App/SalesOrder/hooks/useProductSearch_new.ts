import { useState, useEffect } from 'react';
import { supabase } from '@/pages/utils/supabaseConfig';
import { parseVariationAttributes } from '@/pages/utils/productService/productVariationMapper';
import type { SelectableCatalogItem } from './productSearchDeepFetch';

interface ProductSearchOptions {
  /** Busca cada palavra separadamente e une os resultados, para frases que não são contíguas no nome. */
  matchTermsIndividually?: boolean;
  /** A RPC não retorna products.item_type; consulta o tipo para classificar composições antigas do catálogo. */
  resolveProductItemTypes?: boolean;
}

export const useProductSearch_new = (
  priceType: 'unit' | 'cost' = 'unit',
  options?: ProductSearchOptions
) => {
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [filtered, setFiltered] = useState<SelectableCatalogItem[]>([]);
  const matchTermsIndividually = options?.matchTermsIndividually ?? false;
  const resolveProductItemTypes = options?.resolveProductItemTypes ?? false;

  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    const fetchCatalog = async () => {
      const term = search.trim();

      if (term.length === 0 || term.length < 3) {
        if (isMounted) {
          setFiltered([]);
          setLoading(false);
        }
        return;
      }

      setLoading(true);
      try {
        const queryTerms = matchTermsIndividually
          ? Array.from(new Set([term, ...term.split(/\s+/).filter((word) => word.length >= 3)]))
          : [term];
        const searchResults = await Promise.all(
          queryTerms.map((query) =>
            supabase
              .rpc('search_catalog_shallow', { p_query: query, p_limit: 15 })
              .abortSignal(controller.signal)
          )
        );

        const failedSearch = searchResults.find(({ error }) => error);
        if (failedSearch?.error) {
          if (failedSearch.error.code === 'DOMException' || failedSearch.error.message?.includes('AbortError')) return;
          console.error('[useProductSearch_new] Erro na busca remota:', failedSearch.error);
          if (isMounted) {
            setFiltered([]);
            setLoading(false);
          }
          return;
        }

        const rowsByQuery = searchResults.map(({ data }) => data ?? []);
        const data = Array.from(
          new Map(rowsByQuery.flat().map((row: any) => [row.key, row])).values()
        );

        if (isMounted && !controller.signal.aborted) {
          const productItemTypeById = new Map<string, string>();
          const productIds = resolveProductItemTypes
            ? Array.from(new Set(data.map((row: any) => row.product_id).filter(Boolean)))
            : [];

          if (productIds.length > 0) {
            try {
              const { data: products, error: productsError } = await supabase
                .from('products')
                .select('id, item_type')
                .in('id', productIds)
                .abortSignal(controller.signal);

              if (productsError) {
                console.error('[useProductSearch_new] Erro ao identificar tipos de produto:', productsError);
              } else {
                for (const product of products ?? []) {
                  productItemTypeById.set(product.id, product.item_type || 'product');
                }
              }
            } catch {
              if (controller.signal.aborted) return;
              // A classificação é complementar; resultados de composições próprias da RPC continuam válidos.
            }
          }

          const variationIds = Array.from(
            new Set(
              data
                .filter(
                  (row: any) =>
                    row.entity_type.includes('variation') &&
                    !row.entity_type.startsWith('composition') &&
                    row.variation_id
                )
                .map((row: any) => row.variation_id)
            )
          );
          const attributesByVariationId = new Map<string, any>();

          if (variationIds.length > 0) {
            try {
              const { data: variationRows, error: variationError } = await supabase
                .from('product_variations')
                .select('id, attributes')
                .in('id', variationIds)
                .abortSignal(controller.signal);

              if (!variationError) {
                for (const variationRow of variationRows ?? []) {
                  attributesByVariationId.set(variationRow.id, variationRow.attributes);
                }
              }
            } catch {
              if (controller.signal.aborted) return;
              // Os atributos enriquecem o rótulo; uma falha aqui não deve ocultar os resultados.
            }
          }

          if (!isMounted || controller.signal.aborted) return;

          const mapped: SelectableCatalogItem[] = data.map((row: any) => {
            const isComp = row.entity_type.startsWith('composition');
            const productItemType = row.item_type || productItemTypeById.get(row.product_id);
            const isProductComposition = isComp || productItemType === 'composition';
            const hasVar = row.entity_type.includes('variation');

            const p: any = {
              id: isComp ? row.composition_id : row.product_id,
              description: row.parent_name,
              name: row.parent_name,
              code: row.code,
              category: row.category,
              unitPrice: Number(row.unit_price || 0),
              costPrice: Number(row.cost_price || 0),
              isComposition: isProductComposition,
              itemType: isProductComposition ? 'composition' : productItemType || 'product',
            };

            let v: any = undefined;
            if (hasVar) {
              v = {
                id: isComp ? row.composition_variation_id : row.variation_id,
                name: row.variation_name,
                sku: row.sku,
                unitPrice: Number(row.unit_price || 0),
                costPrice: Number(row.cost_price || 0),
                attributes: isComp
                  ? []
                  : parseVariationAttributes(attributesByVariationId.get(row.variation_id)),
              };
            }

            return {
              p,
              v,
              key: row.key,
              isComposition: isProductComposition,
              shallowRow: row,
            };
          });

          setFiltered(mapped);
          setLoading(false);
        }
      } catch (err: any) {
        if (err.name === 'AbortError' || err.message?.includes('Abort')) return;
        if (isMounted) setLoading(false);
      }
    };

    const timeoutId = setTimeout(fetchCatalog, 300);

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [search, matchTermsIndividually, resolveProductItemTypes]);

  return {
    search,
    setSearch,
    loading,
    filtered,
    priceType, // Preservado para segurança de compatibilidade
  };
};
