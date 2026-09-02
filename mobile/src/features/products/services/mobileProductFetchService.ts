import { supabase } from '../../../services/supabaseClient';

export interface MobileProductFilterOptions {
  search?: string;
  category?: string;
  statusFilter?: 'all' | 'active' | 'disabled' | 'draft';
}

export const fetchMobileProductsPage = async (
  page: number,
  pageSize: number,
  options?: MobileProductFilterOptions
): Promise<{ data: any[]; total: number }> => {
  try {
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from('products')
      .select('*, product_variations(*)', { count: 'exact' })
      .eq('deleted', false);

    const status = options?.statusFilter || 'all';
    if (status === 'draft') {
      query = query.or('is_draft.eq.true,status.eq.draft');
    } else if (status === 'active') {
      query = query.not('is_draft', 'is', true).neq('status', 'draft').eq('active', true);
    } else if (status === 'disabled') {
      query = query.not('is_draft', 'is', true).neq('status', 'draft').eq('active', false);
    } else {
      query = query.not('is_draft', 'is', true).neq('status', 'draft');
    }

    if (options?.category) {
      query = query.eq('category', options.category);
    }

    const rawSearch = options?.search?.trim();
    if (rawSearch) {
      const term = `%${rawSearch}%`;
      let matchedParentIds: string[] = [];

      try {
        const { data: matchedVars } = await supabase
          .from('product_variations')
          .select('product_id')
          .or(`name.ilike.${term},sku.ilike.${term}`)
          .limit(100);

        if (matchedVars && matchedVars.length > 0) {
          matchedParentIds = Array.from(new Set(matchedVars.map((v: any) => v.product_id).filter(Boolean)));
        }
      } catch (e) {
        console.warn('[MobileProductService] Erro ao buscar variações filhas:', e);
      }

      const orConditions = [
        `name.ilike.${term}`,
        `description.ilike.${term}`,
        `code.ilike.${term}`,
      ];

      if (matchedParentIds.length > 0) {
        matchedParentIds.forEach(id => orConditions.push(`id.eq.${id}`));
      }

      query = query.or(orConditions.join(','));
    }

    query = query.order('created_at', { ascending: false }).range(from, to);

    const { data, count, error } = await query;
    if (error) {
      console.warn('[MobileProductService] Erro ao buscar produtos:', error);
      return { data: [], total: 0 };
    }

    const formatted = (data || []).map((p: any) => {
      const parentCode = p.code || p.sku || '000000';
      const productImages = Array.isArray(p.images)
        ? p.images
        : typeof p.images === 'string' && p.images
        ? [p.images]
        : [];

      let allVars: any[] = (p.product_variations || []).map((v: any, vIdx: number) => {
        const varImages = Array.isArray(v.images) && v.images.length > 0
          ? v.images
          : v.image_url
          ? String(v.image_url).split(',').map((s: string) => s.trim()).filter(Boolean)
          : productImages;

        const suffix = String(vIdx + 1).padStart(2, '0');
        const expectedPrefix = parentCode ? `${parentCode}-` : '';
        const isAlreadyFormatted = Boolean(
          expectedPrefix && v.sku && typeof v.sku === 'string' && v.sku.startsWith(expectedPrefix)
        );
        let resolvedSku = isAlreadyFormatted ? v.sku : (parentCode ? `${parentCode}-${suffix}` : (v.sku || ''));
        resolvedSku = String(resolvedSku || '').trim().replace(/^(.*-\d{2})-[a-z0-9_-]+$/i, '$1');

        return {
          ...v,
          sku: resolvedSku,
          name: v.name || p.name,
          stock: Number(v.stock ?? 0),
          price: Number(v.price ?? p.unit_price ?? p.price ?? 0),
          promo_price: v.promo_price !== undefined && v.promo_price !== null
            ? Number(v.promo_price)
            : p.promo_price ? Number(p.promo_price) : undefined,
          status: v.status || p.status || 'published',
          active: v.active !== false,
          images: varImages,
          attributes: v.attributes || {},
        };
      });

      // LÓGICA OFICIAL DO ERP (productService.ts):
      // Todo produto do tipo 'product' que não possui variações na tabela product_variations
      // gera a variação padrão filha com o código parentCode-01 e as fotos/preços do produto!
      const isProductItem = !p.item_type || p.item_type === 'product';
      if (allVars.length === 0 && isProductItem) {
        allVars = [
          {
            id: `${p.id}_${parentCode}-01`,
            sku: `${parentCode}-01`,
            name: p.name || 'Padrão',
            stock: Number(p.stock ?? 0),
            price: Number(p.unit_price ?? p.price ?? 0),
            promo_price: p.promo_price !== null && p.promo_price !== undefined ? Number(p.promo_price) : undefined,
            cost_price: Number(p.cost_price ?? 0),
            active: p.active !== false,
            status: p.status || 'published',
            attributes: {},
            images: productImages,
          },
        ];
      }

      const isParent = isProductItem || Boolean(p.has_variations || allVars.length > 0);

      return {
        ...p,
        allVariations: allVars,
        images: productImages,
        unitPrice: Number(p.unit_price ?? p.price ?? 0),
        promoPrice: Number(p.promo_price ?? 0),
        costPrice: Number(p.cost_price ?? 0),
        stock: Number(p.stock ?? 0),
        isParent,
        isDraft: Boolean(p.is_draft || p.status === 'draft'),
      };
    });

    return { data: formatted, total: count || 0 };
  } catch (err) {
    console.error('[MobileProductService] Exceção ao buscar produtos:', err);
    return { data: [], total: 0 };
  }
};
