/**
 * Hook de busca de produtos no catálogo.
 * Refatorado para utilizar consulta server-side leve (search_catalog_shallow),
 * prevenindo transferência excessiva de dados (Egress) e eliminando subscrição realtime desnecessária.
 */
import { useProductSearch_new } from './useProductSearch_new';

export const useProductSearch = (priceType: 'unit' | 'cost' = 'unit') => {
  return useProductSearch_new(priceType);
};

export default useProductSearch;
