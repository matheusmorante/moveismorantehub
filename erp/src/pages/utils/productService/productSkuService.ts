import { supabase } from '@/pages/utils/supabaseConfig';
import { normalizeVariationSku } from '../productVariationDefaults';
import { getLocalProducts } from './productLocalCache';
import { getNextSequentialProductCodeFromValues } from '../../../../../shared-utils/productSequentialCode';

export const TABLE_NAME = 'products';

/**
 * Gera um código (SKU) numérico único de 6 dígitos que não está em uso
 * por nenhum outro produto no cache local.
 * Estratégia: pega o maior valor numérico existente e incrementa.
 */
export const generateUniqueCode = (excludeProductId?: string, itemType?: string): string => {
  const isComp = itemType === 'composition';
  const products = getLocalProducts().filter((p) => !p.deleted);
  let maxNum = 0;
  const usedCodes = new Set<string>();

  products.forEach((p) => {
    if (excludeProductId && String(p.id) === String(excludeProductId)) return;
    if (p.code) {
      usedCodes.add(p.code);
      if (isComp) {
        if (p.code.endsWith('-COMP')) {
          const num = parseInt(p.code.replace('-COMP', ''), 10);
          if (!isNaN(num) && num > maxNum) maxNum = num;
        }
      } else {
        const num = parseInt(p.code, 10);
        if (!isNaN(num) && num > maxNum) maxNum = num;
      }
    }
    (p.variations || []).forEach((v: any) => {
      if (v.sku) {
        usedCodes.add(v.sku);
        if (isComp) {
          // Variations for compositions might be like 000001-COMP-01, we want the base number
          if (v.sku.includes('-COMP')) {
            const num = parseInt(v.sku.split('-COMP')[0], 10);
            if (!isNaN(num) && num > maxNum) maxNum = num;
          }
        } else {
          const num = parseInt(v.sku, 10);
          if (!isNaN(num) && num > maxNum) maxNum = num;
        }
      }
    });
  });

  let candidate = maxNum + 1;
  let candidateStr = String(candidate).padStart(6, '0') + (isComp ? '-COMP' : '');
  // Garante que não há colisão (por SKUs não-numéricos já presentes)
  while (usedCodes.has(candidateStr)) {
    candidate++;
    candidateStr = String(candidate).padStart(6, '0') + (isComp ? '-COMP' : '');
  }
  return candidateStr;
};

export const checkSkusUniquenessBatch = async (
  skus: string[],
  excludeProductId?: string,
  legacyId?: string
): Promise<{ [sku: string]: string }> => {
  const uniqueSkus = Array.from(new Set(skus.filter((s) => s && s.trim() !== '')));
  if (uniqueSkus.length === 0) return {};

  const duplicates: { [sku: string]: string } = {};
  const products = getLocalProducts().filter((p) => !p.deleted);

  const exId = excludeProductId ? String(excludeProductId).toLowerCase() : '';
  const legId = legacyId ? String(legacyId).toLowerCase() : '';

  products.forEach((p) => {
    const pId = String(p.id || '').toLowerCase();
    if (exId && pId === exId) return;
    if (legId && pId === legId) return;

    if (p.code && uniqueSkus.includes(p.code)) {
      duplicates[p.code] = p.description;
    }

    const vrs = p.variations || [];
    uniqueSkus.forEach((s) => {
      if (!duplicates[s] && vrs.some((v: any) => v.sku === s)) {
        duplicates[s] = p.description;
      }
    });
  });

  return duplicates;
};

/**
 * Calcula o próximo SKU sequencial para uma família de produto.
 * Preenche o menor sufixo numérico disponível entre as variações existentes
 * (reutiliza lacunas como -01, -02 quando disponíveis) e retorna `{código-pai}-{menor_disponível:02d}`.
 */
export const calculateNextVariationSku = (parentCode: string, existingSkus: string[]): string => {
  const cleanParent = String(parentCode || '').trim();
  if (!cleanParent) return '';

  const usedSuffixes = new Set<number>();
  const prefixPattern = new RegExp(
    `^${cleanParent.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}-(\\d+)$`,
    'i'
  );

  for (const rawSku of existingSkus) {
    const skuStr = String(rawSku || '').trim();
    if (!skuStr) continue;

    const matchPrefix = skuStr.match(prefixPattern);
    if (matchPrefix?.[1]) {
      const num = Number.parseInt(matchPrefix[1], 10);
      if (!Number.isNaN(num) && num > 0) usedSuffixes.add(num);
    }
  }

  let candidate = 1;
  while (usedSuffixes.has(candidate)) {
    candidate++;
  }

  const nextSuffix = String(candidate).padStart(2, '0');
  return `${cleanParent}-${nextSuffix}`;
};

/**
 * Gera o SKU da variação no formato {CodigoPai}-{01|02|03}
 * Reutiliza o menor código sequencial disponível (ex: -01, -02) caso haja lacunas na sequência,
 * evitando sempre pular para códigos posteriores ao último utilizado.
 */
export const generateVariationSku = (
  parentCode: string,
  indexOrVariations: number | any[],
  offset: number = 0
): string => {
  const cleanParent = parentCode ? parentCode.trim() : '000000';

  if (typeof indexOrVariations === 'number') {
    const suffix = String(indexOrVariations + 1 + offset).padStart(2, '0');
    return `${cleanParent}-${suffix}`;
  }

  const variations = Array.isArray(indexOrVariations) ? indexOrVariations : [];
  const usedSuffixes = new Set<number>();
  const prefixPattern = cleanParent
    ? new RegExp(`^${cleanParent.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}-(\\d+)$`, 'i')
    : null;

  variations.forEach((v) => {
    if (!v?.sku) return;
    const skuStr = String(v.sku).trim();
    let num: number | null = null;
    if (prefixPattern) {
      const matchPrefix = skuStr.match(prefixPattern);
      if (matchPrefix?.[1]) {
        num = Number.parseInt(matchPrefix[1], 10);
      }
    }
    if (num === null) {
      const match = skuStr.match(/-(\d+)$/);
      if (match?.[1]) {
        num = Number.parseInt(match[1], 10);
      }
    }
    if (num !== null && !Number.isNaN(num) && num > 0) {
      usedSuffixes.add(num);
    }
  });

  const targetOffset = Math.max(0, offset || 0);
  let availableCount = 0;
  let candidate = 1;
  while (true) {
    if (!usedSuffixes.has(candidate)) {
      if (availableCount === targetOffset) {
        const suffix = String(candidate).padStart(2, '0');
        return `${cleanParent}-${suffix}`;
      }
      availableCount++;
    }
    candidate++;
  }
};

/**
 * Busca o próximo código sequencial de 6 dígitos no Supabase/localStorage
 * Padrão: 000001, 000002, 000003, ...
 */
export const getNextSequentialProductCode = async (): Promise<string> => {
  try {
    const codes: unknown[] = [];

    // 1. Consulta códigos de produtos do Supabase (ordenados decrescente com limite)
    const { data: productsData } = await supabase
      .from(TABLE_NAME)
      .select('code')
      .order('code', { ascending: false })
      .limit(50);

    if (Array.isArray(productsData)) {
      productsData.forEach((p: any) => {
        codes.push(p.code || p.sku);
      });
    }

    // 2. Consulta SKUs de variações existentes para evitar colisão com prefixos de variações
    const { data: variationsData } = await supabase
      .from('product_variations')
      .select('sku')
      .order('sku', { ascending: false })
      .limit(50);

    if (Array.isArray(variationsData)) {
      variationsData.forEach((v: any) => {
        codes.push(v.sku);
      });
    }

    // 3. Consulta cache local
    const local = getLocalProducts();
    if (local && Array.isArray(local)) {
      local.forEach((p: any) => {
        codes.push(p.code || p.sku);
        (p.variations || []).forEach((v: any) => {
          codes.push(v.sku);
        });
      });
    }

    return getNextSequentialProductCodeFromValues(codes);
  } catch (err) {
    console.error('Erro ao calcular próximo SKU sequencial:', err);
    return '000001';
  }
};
