import { supabase } from '@/pages/utils/supabaseConfig';
import { normalizeSearchTerm, buildAccentInsensitiveRegex } from '@/pages/utils/textUtils';
import { getLocalProducts } from '@/pages/utils/productService/productLocalCache';

export interface PriceLabelCatalogProduct {
  id: string;
  name: string;
  description: string;
  code: string;
  unit_price: number;
  promo_price: number;
  images: string[];
}

export function extractProductName(prod: any): string {
  const candidate = prod.name || prod.title || prod.marketplaceTitle || prod.description || 'PRODUTO SEM NOME';
  return String(candidate).split('\n')[0].trim().toUpperCase();
}

/**
 * Serviço de domínio/infraestrutura para busca de produtos do catálogo
 * combinando cache local instantâneo com busca remota do Supabase.
 */
export async function searchProductsForLabel(searchTerm: string): Promise<PriceLabelCatalogProduct[]> {
  try {
    // 1. Coleta do cache local oficial do ERP
    const localItems = getLocalProducts();
    const term = normalizeSearchTerm(searchTerm);

    let filteredLocal = localItems;
    if (term) {
      filteredLocal = localItems.filter((p: any) => {
        const desc = normalizeSearchTerm(p.name || p.title || p.marketplaceTitle || p.description || '');
        const code = normalizeSearchTerm(p.code || p.sku || '');
        return desc.includes(term) || code.includes(term);
      });
    }

    // 2. Consulta remota no Supabase para garantir produtos recém-criados ou não cacheados
    let dbData: any[] = [];
    try {
      let query = supabase
        .from('products')
        .select('*, product_images(*)')
        .eq('deleted', false)
        .order('created_at', { ascending: false })
        .limit(40);

      if (term) {
        const regexPattern = `.*${buildAccentInsensitiveRegex(term)}.*`;
        query = query.or(`name.imatch.${regexPattern},description.imatch.${regexPattern},name.ilike.%${term}%,description.ilike.%${term}%,code.ilike.%${term}%`);
      }

      const res = await query;
      if (res.data) dbData = res.data;
    } catch (dbErr) {
      console.warn('[PriceLabelCatalog] Aviso ao consultar Supabase:', dbErr);
    }

    const combinedMap = new Map<string, PriceLabelCatalogProduct>();

    // Adiciona do cache local
    filteredLocal.forEach((p: any) => {
      if (p && p.id) {
        combinedMap.set(String(p.id), {
          id: String(p.id),
          name: extractProductName(p),
          description: extractProductName(p),
          code: p.code || p.sku || '',
          unit_price: p.unitPrice ?? p.price ?? p.unit_price ?? 0,
          promo_price: p.promoPrice ?? p.promo_price ?? 0,
          images: Array.isArray(p.images) ? p.images : (p.image_url ? [p.image_url] : [])
        });
      }
    });

    // Complementa com do banco
    if (Array.isArray(dbData)) {
      dbData.forEach((p: any) => {
        let imgs: string[] = [];
        if (Array.isArray(p.product_images) && p.product_images.length > 0) {
          imgs = p.product_images.map((imgObj: any) => imgObj.image_url).filter(Boolean);
        } else if (Array.isArray(p.images)) {
          imgs = p.images;
        } else if (p.image_url) {
          imgs = [p.image_url];
        }

        const resolvedName = extractProductName(p);
        combinedMap.set(String(p.id), {
          id: String(p.id),
          name: resolvedName,
          description: resolvedName,
          code: p.code || p.sku || '',
          unit_price: p.price ?? p.unit_price ?? 0,
          promo_price: p.promo_price ?? 0,
          images: imgs
        });
      });
    }

    return Array.from(combinedMap.values());
  } catch (error) {
    console.error('[PriceLabelCatalog] Erro ao buscar produtos para etiqueta:', error);
    return [];
  }
}
