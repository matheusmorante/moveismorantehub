import { supabase } from '../../../services/supabaseClient';

let oppCache: Record<string, string> | null = null;
let oppPromise: Promise<Record<string, string>> | null = null;

export const fetchOppMap = async (): Promise<Record<string, string>> => {
  if (oppCache) return oppCache;
  if (!oppPromise) {
    oppPromise = (async () => {
      const { data } = await supabase.from('opportunities').select('id, name');
      const map: Record<string, string> = {};
      if (data) {
        data.forEach((item: any) => {
          map[item.id] = item.name;
        });
      }
      oppCache = map;
      return map;
    })();
  }
  return oppPromise;
};

let supplierCache: Record<string, string> | null = null;
let supplierPromise: Promise<Record<string, string>> | null = null;

export const fetchSupplierMap = async (): Promise<Record<string, string>> => {
  if (supplierCache) return supplierCache;
  if (!supplierPromise) {
    supplierPromise = (async () => {
      const { data } = await supabase
        .from('people')
        .select('id, full_name, nickname, social_name')
        .or('person_type.ilike.suppliers,person_type.ilike.supplier');
      const map: Record<string, string> = {};
      if (data) {
        data.forEach((item: any) => {
          map[item.id] = item.nickname || item.full_name || item.social_name || '';
        });
      }
      supplierCache = map;
      return map;
    })();
  }
  return supplierPromise;
};

/**
 * Busca o próximo código sequencial de 6 dígitos no Supabase (idêntico à regra do ERP)
 * Padrão: 000001, 000002, 000003, ...
 */
export const getNextSequentialProductCode = async (): Promise<string> => {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('id, code')
      .order('created_at', { ascending: false })
      .limit(500);

    let maxNum = 0;
    if (!error && Array.isArray(data)) {
      data.forEach((p: any) => {
        const raw = String(p.code || p.sku || '').trim();
        const match = raw.match(/^(\d+)/);
        if (match) {
          const num = parseInt(match[1], 10);
          if (!isNaN(num) && num > maxNum) {
            maxNum = num;
          }
        }
      });
    }

    return String(maxNum + 1).padStart(6, '0');
  } catch (err) {
    console.error('[mobileProductHelpers] Erro ao obter próximo código sequencial:', err);
    return '000001';
  }
};

/**
 * Gera o SKU da variação no formato {CodigoPai}-{01|02|03}
 * Analisa as variações para garantir o sequencial correto (idêntico ao ERP).
 */
export const generateVariationSku = (
  parentCode: string,
  indexOrVariations: number | any[]
): string => {
  const cleanParent = parentCode ? parentCode.trim() : '000000';

  if (typeof indexOrVariations === 'number') {
    const suffix = String(indexOrVariations + 1).padStart(2, '0');
    return `${cleanParent}-${suffix}`;
  }

  const variations = Array.isArray(indexOrVariations) ? indexOrVariations : [];
  let maxSuffix = variations.length;

  variations.forEach(v => {
    if (!v || !v.sku) return;
    const skuStr = String(v.sku).trim();
    const match = skuStr.match(/-(\d+)$/);
    if (match && match[1]) {
      const num = parseInt(match[1], 10);
      if (!isNaN(num) && num > maxSuffix) {
        maxSuffix = num;
      }
    }
  });

  const nextNumber = maxSuffix + 1;
  const suffix = String(nextNumber).padStart(2, '0');
  return `${cleanParent}-${suffix}`;
};
