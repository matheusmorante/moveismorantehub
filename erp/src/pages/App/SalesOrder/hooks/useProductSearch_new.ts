import { useState, useEffect } from 'react';
import { supabase } from '@/pages/utils/supabaseConfig';
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
