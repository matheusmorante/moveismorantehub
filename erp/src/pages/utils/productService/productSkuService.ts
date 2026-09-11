import { supabase } from '@/pages/utils/supabaseConfig';
import { normalizeVariationSku } from '../productVariationDefaults';
import { getLocalProducts } from './productLocalCache';

export const TABLE_NAME = "products";

/**
 * Gera um código (SKU) numérico único de 6 dígitos que não está em uso
 * por nenhum outro produto no cache local.
 * Estratégia: pega o maior valor numérico existente e incrementa.
 */
export const generateUniqueCode = (excludeProductId?: string): string => {
    const products = getLocalProducts().filter(p => !p.deleted);
    let maxNum = 0;
    const usedCodes = new Set<string>();

    products.forEach(p => {
        if (excludeProductId && String(p.id) === String(excludeProductId)) return;
        if (p.code) {
            usedCodes.add(p.code);
            const num = parseInt(p.code, 10);
            if (!isNaN(num) && num > maxNum) maxNum = num;
        }
        (p.variations || []).forEach((v: any) => {
            if (v.sku) {
                usedCodes.add(v.sku);
                const num = parseInt(v.sku, 10);
                if (!isNaN(num) && num > maxNum) maxNum = num;
            }
        });
    });

    let candidate = maxNum + 1;
    let candidateStr = String(candidate).padStart(6, '0');
    // Garante que não há colisão (por SKUs não-numéricos já presentes)
    while (usedCodes.has(candidateStr)) {
        candidate++;
        candidateStr = String(candidate).padStart(6, '0');
    }
    return candidateStr;
};

export const checkSkusUniquenessBatch = async (
    skus: string[], 
    excludeProductId?: string, 
    legacyId?: string
): Promise<{ [sku: string]: string }> => {
    const uniqueSkus = Array.from(new Set(skus.filter(s => s && s.trim() !== "")));
    if (uniqueSkus.length === 0) return {};

    const duplicates: { [sku: string]: string } = {};
    const products = getLocalProducts().filter(p => !p.deleted);

    const exId = excludeProductId ? String(excludeProductId).toLowerCase() : '';
    const legId = legacyId ? String(legacyId).toLowerCase() : '';

    products.forEach(p => {
        const pId = String(p.id || '').toLowerCase();
        if (exId && pId === exId) return;
        if (legId && pId === legId) return;

        if (p.code && uniqueSkus.includes(p.code)) {
            duplicates[p.code] = p.description;
        }

        const vrs = p.variations || [];
        uniqueSkus.forEach(s => {
            if (!duplicates[s] && vrs.some((v: any) => v.sku === s)) {
                duplicates[s] = p.description;
            }
        });
    });

    return duplicates;
};

/**
 * Calcula o próximo SKU sequencial para uma família de produto.
 * Lê o sufixo numérico de maior valor entre os SKUs existentes (ativos, desativados e históricos)
 * e retorna `{código-pai}-{MAX+1:02d}`.
 */
export const calculateNextVariationSku = (
    parentCode: string,
    existingSkus: string[]
): string => {
    const cleanParent = String(parentCode || '').trim();
    if (!cleanParent) return '';

    let maxSuffix = 0;
    const prefixPattern = new RegExp(`^${cleanParent.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}-(\\d+)$`, 'i');

    for (const rawSku of existingSkus) {
        const skuStr = String(rawSku || '').trim();
        if (!skuStr) continue;

        const matchPrefix = skuStr.match(prefixPattern);
        if (matchPrefix && matchPrefix[1]) {
            const num = parseInt(matchPrefix[1], 10);
            if (!isNaN(num) && num > maxSuffix) maxSuffix = num;
        }
    }

    const nextSuffix = String(maxSuffix + 1).padStart(2, '0');
    return `${cleanParent}-${nextSuffix}`;
};

/**
 * Gera o SKU da variação no formato {CodigoPai}-{01|02|03}
 * Analisa todas as variações (ativas e desativadas) para garantir o sequencial correto.
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

    const nextNumber = maxSuffix + 1 + offset;
    const suffix = String(nextNumber).padStart(2, '0');
    return `${cleanParent}-${suffix}`;
};

/**
 * Busca o próximo código sequencial de 6 dígitos no Supabase/localStorage
 * Padrão: 000001, 000002, 000003, ...
 */
export const getNextSequentialProductCode = async (): Promise<string> => {
    try {
        let maxNum = 0;

        // 1. Consulta códigos de produtos do Supabase
        const { data: productsData } = await supabase
            .from(TABLE_NAME)
            .select('code, sku');
        
        if (Array.isArray(productsData)) {
            productsData.forEach((p: any) => {
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

        // 2. Consulta SKUs de variações existentes para evitar colisão com prefixos de variações
        const { data: variationsData } = await supabase
            .from('product_variations')
            .select('sku');

        if (Array.isArray(variationsData)) {
            variationsData.forEach((v: any) => {
                const raw = String(v.sku || '').trim();
                const match = raw.match(/^(\d+)/);
                if (match) {
                    const num = parseInt(match[1], 10);
                    if (!isNaN(num) && num > maxNum) {
                        maxNum = num;
                    }
                }
            });
        }
        
        // 3. Consulta cache local
        const local = getLocalProducts();
        if (local && Array.isArray(local)) {
            local.forEach((p: any) => {
                const raw = String(p.code || p.sku || '').trim();
                const match = raw.match(/^(\d+)/);
                if (match) {
                    const num = parseInt(match[1], 10);
                    if (!isNaN(num) && num > maxNum) {
                        maxNum = num;
                    }
                }
                (p.variations || []).forEach((v: any) => {
                    const vRaw = String(v.sku || '').trim();
                    const vMatch = vRaw.match(/^(\d+)/);
                    if (vMatch) {
                        const vNum = parseInt(vMatch[1], 10);
                        if (!isNaN(vNum) && vNum > maxNum) {
                            maxNum = vNum;
                        }
                    }
                });
            });
        }

        return String(maxNum + 1).padStart(6, '0');
    } catch (err) {
        console.error("Erro ao calcular próximo SKU sequencial:", err);
        return '000001';
    }
};

