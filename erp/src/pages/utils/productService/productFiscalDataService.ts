import { supabase } from '@/pages/utils/supabaseConfig';
import type { FiscalInfo } from '@/pages/types/product.type';
import { getLocalProducts } from './productLocalCache';

export interface ProductFiscalData extends Partial<FiscalInfo> {
  id: string;
  unit?: string;
  variations?: Record<string, Partial<FiscalInfo>>;
}

// Cache em memória para dados fiscais já consultados durante a sessão do usuário.
// Garante resolução em 0-20ms quando o usuário reabre o modal de emissão.
const fiscalMemoryCache = new Map<string, ProductFiscalData>();
const fiscalMemoryCacheUpdatedAt = new Map<string, number>();

export const clearFiscalDataMemoryCache = () => {
  fiscalMemoryCache.clear();
  fiscalMemoryCacheUpdatedAt.clear();
};

/**
 * Consulta leve e em lote (Batch) exclusivamente dos dados fiscais dos produtos.
 * Substitui o N+1 de getFullProduct(), eliminando download de imagens, categorias
 * e gravações síncronas de localStorage na thread principal.
 */
export const getProductsFiscalData = async (
  productIds: string[],
  options: { useCache?: boolean; maxAgeMs?: number; cacheResult?: boolean } = {}
): Promise<Map<string, ProductFiscalData>> => {
  const result = new Map<string, ProductFiscalData>();
  const useCache = options.useCache !== false;
  const isUUID = (id: string) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

  const uniqueIds = Array.from(new Set(productIds.filter(Boolean)));
  const idsToFetch: string[] = [];

  for (const id of uniqueIds) {
    const cached = useCache ? fiscalMemoryCache.get(id) : undefined;
    const cacheIsFresh =
      options.maxAgeMs === undefined ||
      Date.now() - (fiscalMemoryCacheUpdatedAt.get(id) || 0) <= options.maxAgeMs;
    if (cached && cacheIsFresh) {
      result.set(id, cached);
    } else if (isUUID(id)) {
      idsToFetch.push(id);
    }
  }

  if (idsToFetch.length > 0) {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('id, unit, fiscal, variation_details:technical_specs->variationDetails')
        .in('id', idsToFetch);

      if (error && !useCache) {
        throw new Error('Não foi possível consultar os dados fiscais atuais do catálogo.');
      }
      if (!error && Array.isArray(data)) {
        for (const row of data) {
          const variationDetails = row.variation_details as
            | Array<{ id?: string; fiscal?: unknown }>
            | null;
          const variationsRecord: Record<string, Partial<FiscalInfo>> = {};

          if (Array.isArray(variationDetails)) {
            for (const variation of variationDetails) {
              if (variation.id) {
                variationsRecord[String(variation.id)] = mapFiscalFields(variation.fiscal);
              }
            }
          }

          const fiscalItem: ProductFiscalData = {
            id: String(row.id),
            unit: typeof row.unit === 'string' && row.unit.trim() ? row.unit.trim() : 'UN',
            ...mapFiscalFields(row.fiscal),
            variations: variationsRecord,
          };
          if (useCache || options.cacheResult) {
            fiscalMemoryCache.set(fiscalItem.id, fiscalItem);
            fiscalMemoryCacheUpdatedAt.set(fiscalItem.id, Date.now());
          }
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

  // Offline fallback is for cache-enabled callers; fiscal transmission revalidates on the server.
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
        unit: typeof product.unit === 'string' && product.unit.trim() ? product.unit.trim() : 'UN',
        ...mapFiscalFields(product.fiscal),
        variations,
      });
    }
  }

  return result;
};

function mapFiscalFields(value: unknown): Partial<FiscalInfo> {
  const fiscal = (value || {}) as Record<string, unknown>;
  const merchandiseOrigin = fiscal.merchandiseOrigin;
  const fields: (keyof FiscalInfo)[] = [
    'ncm',
    'ncmDescription',
    'material',
    'condition',
    'commercialUnit',
    'taxableUnit',
    'cest',
    'origem',
    'cst',
    'cfop',
    'isOwnProduction',
    'hasSt',
    'isSt',
    'pisCst',
    'cofinsCst',
    'icmsPercent',
    'codigoServico',
    'issPercent',
    'merchandiseOrigin',
  ];
  const result: Partial<FiscalInfo> = {};
  for (const field of fields) {
    const fieldValue = fiscal[field];
    if (fieldValue !== undefined && fieldValue !== null) {
      (result as Record<string, unknown>)[field] = fieldValue;
    }
  }
  if (
    merchandiseOrigin !== 'third_party' &&
    merchandiseOrigin !== 'own_production' &&
    merchandiseOrigin !== 'not_applicable'
  ) {
    delete result.merchandiseOrigin;
  }
  return result;
}
