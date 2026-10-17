import { useState, useEffect } from 'react';
import { fetchMobileProductsPage } from '../../products/services/mobileProductFetchService';
import { submittedSearchFormSchema } from '../../../../../shared-utils/lookupFormSchemas';
import { useZodForm } from '../../../hooks/useZodForm';

/**
 * Hook de busca debounced de produtos e variações para seleção na composição móvel.
 */
export function useCompositionProductSearch(visible: boolean) {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState(false);

  const { validateValues: validateSearch } = useZodForm(submittedSearchFormSchema, {
    search: searchTerm,
  });

  useEffect(() => {
    if (!visible || searchTerm.trim().length < 2) {
      setResults([]);
      setSearching(false);
      setSearchError(false);
      return;
    }
    let current = true;
    setSearching(true);
    setSearchError(false);
    const timer = setTimeout(async () => {
      try {
        const values = await validateSearch({ search: searchTerm });
        if (!values || !current) return;
        const result = await fetchMobileProductsPage(1, 5, {
          search: values.search,
          itemType: 'standard',
          statusFilter: 'active',
          includeDeactivated: false,
          throwOnError: true,
        });
        if (!current) return;
        setResults(
          result.data.flatMap((product) => {
            const variations = (product.allVariations || product.variations || []).filter(
              (variation: any) => variation.active !== false && !variation.merged_to_variation_id
            );
            return variations.length
              ? variations.map((variation: any) => ({
                  ...product,
                  variation,
                  variationName: variation.name,
                  variationSku: variation.sku,
                  variationPrice: variation.unitPrice ?? variation.price,
                  variationStock: variation.stock,
                }))
              : [product];
          })
        );
      } catch {
        if (current) {
          setResults([]);
          setSearchError(true);
        }
      } finally {
        if (current) setSearching(false);
      }
    }, 300);
    return () => {
      current = false;
      clearTimeout(timer);
    };
  }, [visible, searchTerm, validateSearch]);

  const clearSearch = () => {
    setSearchTerm('');
    setResults([]);
    setSearching(false);
    setSearchError(false);
  };

  return {
    searchTerm,
    setSearchTerm,
    results,
    searching,
    searchError,
    clearSearch,
  };
}
