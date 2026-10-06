import { supabase } from '@/pages/utils/supabaseConfig';

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
  productIds: string[]
): Promise<Map<string, ProductFiscalData>> => {
  const result = new Map<string, ProductFiscalData>();
  const isUUID = (id: string) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

  const uniqueIds = Array.from(new Set(productIds.filter(Boolean)));
  const idsToFetch: string[] = [];

  for (const id of uniqueIds) {
    const cached = fiscalMemoryCache.get(id);
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
        .select('id, fiscal, product_variations(id, fiscal)')
        .in('id', idsToFetch);

      if (!error && Array.isArray(data)) {
        for (const row of data) {
          const fiscalObj = (row.fiscal || {}) as Record<string, unknown>;
          const variationsRecord: Record<string, Partial<ProductFiscalData>> = {};

          if (Array.isArray(row.product_variations)) {
            for (const v of row.product_variations) {
              const vFiscal = (v.fiscal || {}) as Record<string, unknown>;
              variationsRecord[String(v.id)] = {
                ncm: typeof vFiscal.ncm === 'string' ? vFiscal.ncm : undefined,
                cest: typeof vFiscal.cest === 'string' ? vFiscal.cest : undefined,
                cfop: typeof vFiscal.cfop === 'string' ? vFiscal.cfop : undefined,
                cst: typeof vFiscal.cst === 'string' ? vFiscal.cst : undefined,
                origem: typeof vFiscal.origem === 'string' ? vFiscal.origem : undefined,
                pisCst: typeof vFiscal.pisCst === 'string' ? vFiscal.pisCst : undefined,
                cofinsCst: typeof vFiscal.cofinsCst === 'string' ? vFiscal.cofinsCst : undefined,
              };
            }
          }

          const fiscalItem: ProductFiscalData = {
            id: String(row.id),
            ncm: typeof fiscalObj.ncm === 'string' ? fiscalObj.ncm : undefined,
            cest: typeof fiscalObj.cest === 'string' ? fiscalObj.cest : undefined,
            cfop: typeof fiscalObj.cfop === 'string' ? fiscalObj.cfop : undefined,
            cst: typeof fiscalObj.cst === 'string' ? fiscalObj.cst : undefined,
            origem: typeof fiscalObj.origem === 'string' ? fiscalObj.origem : undefined,
            pisCst: typeof fiscalObj.pisCst === 'string' ? fiscalObj.pisCst : undefined,
            cofinsCst: typeof fiscalObj.cofinsCst === 'string' ? fiscalObj.cofinsCst : undefined,
            variations: variationsRecord,
          };
          fiscalMemoryCache.set(fiscalItem.id, fiscalItem);
          result.set(fiscalItem.id, fiscalItem);
        }
      }
    } catch (err) {
      console.warn('[productFiscalDataService] Falha ao consultar catálogo fiscal em lote:', err);
    }
  }

  return result;
};
