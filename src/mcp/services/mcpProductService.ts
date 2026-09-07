import { createClient } from '@supabase/supabase-js';
import {
  McpProductImage,
  McpProductSummary,
  McpProductVariation,
} from '../types/mcp.js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || 'https://wzpdfmihnwcrgkyagwkd.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || 'public-anon-key';

export const mcpSupabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false },
});

const DEFAULT_BASE_URL = 'https://www.moveismorante.com.br';

export function toAbsoluteHttpsUrl(rawUrl: string): string {
  if (!rawUrl || typeof rawUrl !== 'string') return '';
  const trimmed = rawUrl.trim();
  if (!trimmed) return '';

  if (trimmed.startsWith('https://')) return trimmed;
  if (trimmed.startsWith('http://')) return trimmed.replace(/^http:\/\//, 'https://');
  if (trimmed.startsWith('//')) return `https:${trimmed}`;

  const cleanPath = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return `${DEFAULT_BASE_URL}${cleanPath}`;
}

export function parseImagesList(rawImages: any, rawImageUrl?: any): string[] {
  const candidates: any[] = [];
  if (rawImages) {
    if (Array.isArray(rawImages)) candidates.push(...rawImages);
    else candidates.push(rawImages);
  }
  if (rawImageUrl) {
    if (Array.isArray(rawImageUrl)) candidates.push(...rawImageUrl);
    else candidates.push(rawImageUrl);
  }

  const result: string[] = [];
  candidates.forEach(item => {
    if (!item) return;
    if (typeof item === 'string') {
      const trimmed = item.trim();
      if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
        try {
          const parsed = JSON.parse(trimmed);
          if (Array.isArray(parsed)) {
            parsed.forEach(p => {
              const clean = toAbsoluteHttpsUrl(String(p).trim().replace(/^["']|["']$/g, ''));
              if (clean && !result.includes(clean)) result.push(clean);
            });
            return;
          }
        } catch {}
      }
      trimmed.split(',').forEach(s => {
        const clean = toAbsoluteHttpsUrl(s.trim().replace(/^["']|["']$/g, ''));
        if (clean && !result.includes(clean)) result.push(clean);
      });
    } else if (typeof item === 'object') {
      const clean = toAbsoluteHttpsUrl(String(item.url || item.image_url || '').trim());
      if (clean && !result.includes(clean)) result.push(clean);
    }
  });

  return result;
}

export class McpProductService {
  /**
   * Busca produtos reais no ERP por termo aproximado, nome, slug, código ou ID.
   */
  async searchProducts(query: string, limit = 10): Promise<McpProductSummary[]> {
    const cleanQuery = query.trim();
    if (!cleanQuery) return [];

    const effectiveLimit = Math.min(Math.max(limit, 1), 20);

    const { data, error } = await mcpSupabase
      .from('products')
      .select('id, name, slug, code, sale_price, price, promo_price, original_price, is_draft, active, deleted, deleted_at, category, opportunities(id, name)')
      .or(`name.ilike.%${cleanQuery}%,slug.ilike.%${cleanQuery}%,code.ilike.%${cleanQuery}%,id.eq.${cleanQuery}`)
      .is('deleted_at', null)
      .eq('deleted', false)
      .limit(effectiveLimit);

    if (error || !data) {
      return [];
    }

    return data.map((row: any) => {
      const price = Number(row.sale_price ?? row.price ?? row.promo_price ?? 0);
      const oldPrice = row.original_price ? Number(row.original_price) : null;
      const opp = Array.isArray(row.opportunities) ? row.opportunities[0] : row.opportunities;

      return {
        id: String(row.id),
        name: row.name || 'Produto sem título',
        slug: row.slug || '',
        sku: row.code || undefined,
        category: row.category || undefined,
        price,
        oldPrice: oldPrice && oldPrice > price ? oldPrice : null,
        active: row.active !== false && !row.is_draft,
        opportunityName: opp?.name || null,
      };
    });
  }

  /**
   * Obtém os dados completos de um produto específico.
   */
  async getProductById(productId: string) {
    const { data: product, error: prodErr } = await mcpSupabase
      .from('products')
      .select('*, product_variations(*), opportunities(*)')
      .eq('id', productId)
      .maybeSingle();

    if (prodErr || !product) {
      throw new Error(`PRODUCT_NOT_FOUND: Produto com ID "${productId}" não encontrado no MoranteHub.`);
    }

    const price = Number(product.sale_price ?? product.price ?? product.promo_price ?? 0);
    const oldPrice = product.original_price ? Number(product.original_price) : null;
    const opp = Array.isArray(product.opportunities) ? product.opportunities[0] : product.opportunities;

    const rawVariations = Array.isArray(product.product_variations) ? product.product_variations : [];
    const variations: McpProductVariation[] = rawVariations.map((v: any, index: number) => {
      const varImages = parseImagesList(v.images, v.image_url);
      const varPrice = v.price ? Number(v.price) : price;
      const varOldPrice = v.old_price ? Number(v.old_price) : oldPrice;

      return {
        id: String(v.id || `${product.id}-var-${index + 1}`),
        name: v.name || v.title || v.color || `Variação ${index + 1}`,
        title: v.title || v.name || undefined,
        sku: v.sku || v.code || undefined,
        color: v.color || undefined,
        price: varPrice,
        oldPrice: varOldPrice && varOldPrice > varPrice ? varOldPrice : null,
        active: v.active !== false,
        attributes: typeof v.attributes === 'object' && v.attributes ? v.attributes : {},
        images: varImages,
      };
    });

    // Se o produto for simples (sem variações filhas cadastradas), gera a variação única principal
    if (variations.length === 0) {
      const parentImages = parseImagesList(product.images, product.image_url);
      variations.push({
        id: String(product.id),
        name: product.name || 'Padrão',
        title: product.name,
        sku: product.code || undefined,
        price,
        oldPrice,
        active: product.active !== false,
        attributes: {},
        images: parentImages,
      });
    }

    return {
      product: {
        id: String(product.id),
        name: product.name || 'Produto sem título',
        slug: product.slug || '',
        sku: product.code || undefined,
        category: product.category || undefined,
        description: product.description || '',
        specifications: product.specifications || {},
        materials: product.material || product.materials || undefined,
        measurements: {
          width: product.width ? Number(product.width) : undefined,
          height: product.height ? Number(product.height) : undefined,
          depth: product.depth ? Number(product.depth) : undefined,
          weight: product.weight ? Number(product.weight) : undefined,
        },
        brand: product.brand || 'Móveis Morante',
        status: product.is_draft ? 'draft' : product.active ? 'active' : 'inactive',
      },
      commercialData: {
        price,
        oldPrice: oldPrice && oldPrice > price ? oldPrice : null,
        discountPercent: oldPrice && oldPrice > price ? Math.round(((oldPrice - price) / oldPrice) * 100) : null,
        installment: product.installment_rule || '10x sem juros no cartão',
        opportunity: opp?.name || null,
        opportunityId: opp?.id || null,
      },
      variations,
    };
  }

  /**
   * Obtém e categoriza imagens oficiais de produtos com metadados claros.
   */
  async getProductImages(productId: string, selectedVariationId?: string): Promise<McpProductImage[]> {
    const details = await this.getProductById(productId);
    const { variations } = details;

    const activeVar = selectedVariationId
      ? variations.find(v => v.id === selectedVariationId) || variations[0]
      : variations[0];

    const images: McpProductImage[] = [];

    // Imagens da variação principal em foco
    if (activeVar && activeVar.images.length > 0) {
      activeVar.images.forEach((url, idx) => {
        images.push({
          id: `img-${activeVar.id}-${idx + 1}`,
          kind: 'product',
          productId: details.product.id,
          variationId: activeVar.id,
          variationName: activeVar.name,
          position: idx + 1,
          isPrimary: idx === 0,
          isSecondary: idx === 1,
          isOpenView: idx === 1,
          url,
          mimeType: url.endsWith('.png') ? 'image/png' : 'image/webp',
          description: idx === 0 ? 'Foto Principal (Destaque da Variação)' : 'Foto Secundária / Visão Interna',
        });
      });
    }

    // Imagens das outras variações (para a galeria de cores)
    variations
      .filter(v => v.id !== activeVar?.id)
      .forEach((otherVar, vIdx) => {
        if (otherVar.images.length > 0) {
          const firstImg = otherVar.images[0];
          images.push({
            id: `img-var-${otherVar.id}-1`,
            kind: 'product',
            productId: details.product.id,
            variationId: otherVar.id,
            variationName: otherVar.name,
            position: 1,
            isPrimary: false,
            url: firstImg,
            mimeType: firstImg.endsWith('.png') ? 'image/png' : 'image/webp',
            description: `Miniatura da Variação: ${otherVar.name}`,
          });
        }
      });

    return images;
  }
}

export const mcpProductService = new McpProductService();
