import { supabase } from '@/pages/utils/supabaseConfig';
import { getLocalProducts } from './productLocalCache';

export interface ProductFiscalData {
  id: string;
  ncm?: string;
  cest?: string;
  cfop?: string;
  cst?: string;
  origem?: string;
  pisCst?: string;
  cofinsCst?: string;
  variations?: Record<string, Partial<ProductFiscalData>>;
}

// Cache em memória para dados fiscais já consultados durante a sessão do usuário.
// Garante resolução em 0-20ms quando o usuário reabre o modal de emissão.
const fiscalMemoryCache = new Map<string, ProductFiscalData>();

export const clearFiscalDataMemoryCache = () => {
  fiscalMemoryCache.clear();
};

/**
 * Consulta leve e em lote (Batch) exclusivamente dos dados fiscais dos produtos.
 * Substitui o N+1 de getFullProduct(), eliminando download de imagens, categorias
 * e gravações síncronas de localStorage na thread principal.
 */
export const getProductsFiscalData = async (
  productIds: string[],
  options: { useCache?: boolean } = {}
): Promise<Map<string, ProductFiscalData>> => {
  const result = new Map<string, ProductFiscalData>();
  const useCache = options.useCache !== false;
  const isUUID = (id: string) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

  const uniqueIds = Array.from(new Set(productIds.filter(Boolean)));
  const idsToFetch: string[] = [];

  for (const id of uniqueIds) {
    const cached = useCache ? fiscalMemoryCache.get(id) : undefined;
    if (cached) {
      result.set(id, cached);
    } else if (isUUID(id)) {
      idsToFetch.push(id);
    }
  }

  if (idsToFetch.length > 0) {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('id, fiscal, variation_details:technical_specs->variationDetails')
        .in('id', idsToFetch);

      if (error && !useCache) {
        throw new Error('Não foi possível consultar os dados fiscais atuais do catálogo.');
      }
      if (!error && Array.isArray(data)) {
        for (const row of data) {
          const variationDetails = row.variation_details as
            | Array<{ id?: string; fiscal?: unknown }>
            | null;
          const variationsRecord: Record<string, Partial<ProductFiscalData>> = {};

          if (Array.isArray(variationDetails)) {
            for (const variation of variationDetails) {
              if (variation.id) {
                variationsRecord[String(variation.id)] = mapFiscalFields(variation.fiscal);
              }
            }
          }

          const fiscalItem: ProductFiscalData = {
            id: String(row.id),
            ...mapFiscalFields(row.fiscal),
            variations: variationsRecord,
          };
          if (useCache) fiscalMemoryCache.set(fiscalItem.id, fiscalItem);
          result.set(fiscalItem.id, fiscalItem);
        }
      }
    } catch (err) {
      if (!useCache) {
        throw new Error('Não foi possível consultar os dados fiscais atuais do catálogo.', {
          cause: err,
        });
      }
      console.warn('[productFiscalDataService] Falha ao consultar catálogo fiscal em lote:', err);
    }
  }

  // Callers that allow caching retain the offline fallback; emission reads stay database-only.
  const missingIds = uniqueIds.filter((id) => !result.has(id));
  if (useCache && typeof localStorage !== 'undefined' && missingIds.length > 0) {
    const localProducts = getLocalProducts();
    for (const id of missingIds) {
      const product = localProducts.find((candidate) => String(candidate.id) === id);
      if (!product) continue;
      const variations: Record<string, Partial<ProductFiscalData>> = {};
      for (const variation of product.variations || []) {
        variations[String(variation.id)] = mapFiscalFields(variation.fiscal);
      }
      result.set(id, {
        id,
        ...mapFiscalFields(product.fiscal),
        variations,
      });
    }
  }

  return result;
};

function mapFiscalFields(value: unknown): Omit<ProductFiscalData, 'id' | 'variations'> {
  const fiscal = (value || {}) as Record<string, unknown>;
  return {
    ncm: typeof fiscal.ncm === 'string' ? fiscal.ncm : undefined,
    cest: typeof fiscal.cest === 'string' ? fiscal.cest : undefined,
    cfop: typeof fiscal.cfop === 'string' ? fiscal.cfop : undefined,
    cst: typeof fiscal.cst === 'string' ? fiscal.cst : undefined,
    origem: typeof fiscal.origem === 'string' ? fiscal.origem : undefined,
    pisCst: typeof fiscal.pisCst === 'string' ? fiscal.pisCst : undefined,
    cofinsCst: typeof fiscal.cofinsCst === 'string' ? fiscal.cofinsCst : undefined,
  };
}
