import { useState, useEffect } from 'react';
import { supabase } from '@/pages/utils/supabaseConfig';
import { parseVariationAttributes } from '@/pages/utils/productService/productVariationMapper';
import type { SelectableCatalogItem } from './productSearchDeepFetch';

export const useProductSearch_new = (priceType: 'unit' | 'cost' = 'unit') => {
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [filtered, setFiltered] = useState<SelectableCatalogItem[]>([]);

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
        const { data, error } = await supabase
          .rpc('search_catalog_shallow', { p_query: term, p_limit: 15 })
          .abortSignal(controller.signal);

        if (error) {
          if (error.code === 'DOMException' || error.message?.includes('AbortError')) return;
          console.error('[useProductSearch_new] Erro na busca remota:', error);
          if (isMounted) {
            setFiltered([]);
            setLoading(false);
          }
          return;
        }

        if (isMounted && data && !controller.signal.aborted) {
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
            const hasVar = row.entity_type.includes('variation');

            const p: any = {
              id: isComp ? row.composition_id : row.product_id,
              description: row.parent_name,
              name: row.parent_name,
              code: row.code,
              category: row.category,
              unitPrice: Number(row.unit_price || 0),
              costPrice: Number(row.cost_price || 0),
              isComposition: isComp,
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
              isComposition: isComp,
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
  }, [search]);

  return {
    search,
    setSearch,
    loading,
    filtered,
    priceType, // Preservado para segurança de compatibilidade
  };
};
