import { supabase } from '../../../services/supabaseClient';

export interface MobileProductFilterOptions {
  search?: string;
  category?: string;
  statusFilter?: 'all' | 'active' | 'disabled' | 'draft';
  catalogStatus?: 'all' | 'published' | 'hidden';
  includeDeactivated?: boolean;
  includeMerged?: boolean;
  itemType?: 'standard' | 'composition';
  throwOnError?: boolean;
}

const removeAccents = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

const escapePostgrestValue = (value: string) => value.replace(/[%(),]/g, ' ').trim();

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
      .select('*, product_variations(*), product_categories(category_id), product_images(image_url, is_main)', { count: 'exact' })
      .eq('deleted', false);

    if (options?.itemType === 'composition') {
      query = query.eq('item_type', 'composition');
    } else if (options?.itemType === 'standard') {
      query = query.neq('item_type', 'composition');
    }

    const status = options?.statusFilter || 'all';
    if (status === 'draft') {
      query = query.or('is_draft.eq.true,status.eq.draft');
    } else if (status === 'active') {
      query = query.not('is_draft', 'is', true).neq('status', 'draft').eq('active', true);
    } else if (status === 'disabled') {
      query = query.not('is_draft', 'is', true).neq('status', 'draft').eq('active', false);
    } else if (options?.includeDeactivated === false) {
      // Rascunhos seguem acessíveis para conclusão do cadastro; somente os
      // produtos de fato desativados ficam ocultos na visão padrão.
      query = query.or('active.eq.true,is_draft.eq.true,status.eq.draft');
    }

    if (options?.catalogStatus && options.catalogStatus !== 'all') {
      query = query.eq('status', options.catalogStatus);
    }

    if (options?.category) {
      // O ERP ainda encontra registros antigos pelo campo products.category,
      // mas também considera a relação normalizada product_categories.
      const { data: categoryRow } = await supabase
        .from('categories')
        .select('name')
        .eq('id', options.category)
        .maybeSingle();
      const { data: categoryLinks } = await supabase
        .from('product_categories')
        .select('product_id')
        .eq('category_id', options.category);
      const linkedProductIds = (categoryLinks || []).map((row: any) => row.product_id).filter(Boolean);
      const conditions = [`category_id.eq.${options.category}`];
      if (categoryRow?.name) conditions.push(`category.eq."${escapePostgrestValue(categoryRow.name)}"`);
      if (linkedProductIds.length > 0) conditions.push(`id.in.(${linkedProductIds.join(',')})`);
      query = query.or(conditions.join(','));
    }

    const rawSearch = options?.search?.trim();
    if (rawSearch) {
      const safeSearch = escapePostgrestValue(rawSearch);
      const normalizedSearch = removeAccents(safeSearch);
      const terms = Array.from(new Set([safeSearch, normalizedSearch])).filter(Boolean);
      let matchedParentIds: string[] = [];

      try {
        const { data: matchedVars, error: variationsError } = await supabase
          .from('product_variations')
          .select('product_id')
          .or(terms.map(term => `name.ilike.%${term}%`).join(','))
          .limit(100);
        if (variationsError && options?.throwOnError) throw variationsError;
        if (variationsError) console.warn('[MobileProductService] Erro ao buscar variações filhas:', variationsError);

        if (matchedVars && matchedVars.length > 0) {
          matchedParentIds = Array.from(new Set(matchedVars.map((v: any) => v.product_id).filter(Boolean)));
        }
      } catch (e) {
        if (options?.throwOnError) throw e;
        console.warn('[MobileProductService] Erro ao buscar variações filhas:', e);
      }

      // Paridade com productFilterBuilder do ERP: a busca textual da lista
      // considera nome do produto e nome da variação, não descrição/código.
      const orConditions = terms.map(term => `name.ilike.%${term}%`);
      const words = normalizedSearch.split(/\s+/).filter(Boolean);
      if (words.length > 1) orConditions.push(`and(${words.map(word => `name.ilike.%${word}%`).join(',')})`);

      if (matchedParentIds.length > 0) {
        matchedParentIds.forEach(id => orConditions.push(`id.eq.${id}`));
      }

      query = query.or(orConditions.join(','));
    }

    query = query.order('created_at', { ascending: false }).range(from, to);

    const { data, count, error } = await query;
    if (error) {
      if (options?.throwOnError) throw error;
      console.warn('[MobileProductService] Erro ao buscar produtos:', error);
      return { data: [], total: 0 };
    }

    const categoryIds = Array.from(new Set((data || []).flatMap((product: any) =>
      (product.product_categories || []).map((relation: any) => relation.category_id).filter(Boolean)
    )));
    const categoryNames = new Map<string, string>();
    if (categoryIds.length > 0) {
      const { data: categoryRows, error: categoryError } = await supabase
        .from('categories')
        .select('id, name')
        .in('id', categoryIds);
      if (categoryError && options?.throwOnError) throw categoryError;
      (categoryRows || []).forEach((category: any) => categoryNames.set(String(category.id), category.name));
    }

    const formatted = (data || []).map((p: any) => {
      const parentCode = p.code || p.sku || '000000';
      const orderedImageRows = Array.isArray(p.product_images)
        ? [...p.product_images].sort((a: any, b: any) => Number(Boolean(b.is_main)) - Number(Boolean(a.is_main)))
        : [];
      const relationImages = orderedImageRows.map((image: any) => image.image_url).filter(Boolean);
      const productImages = relationImages.length > 0
        ? relationImages
        : Array.isArray(p.images)
        ? p.images
        : typeof p.images === 'string' && p.images
        ? [p.images]
        : [];

      const storedVariations = p.product_variations || [];
      let allVars: any[] = storedVariations
        .filter((v: any) => options?.includeMerged === true || !v.merged_to_variation_id)
        .map((v: any, vIdx: number) => {
        const varImages = Array.isArray(v.images) && v.images.length > 0
          ? v.images
          : v.image_url
          ? String(v.image_url).split(',').map((s: string) => s.trim()).filter(Boolean)
          : [];

        const suffix = String(vIdx + 1).padStart(2, '0');
        const expectedPrefix = parentCode ? `${parentCode}-` : '';
        const isAlreadyFormatted = Boolean(
          expectedPrefix && v.sku && typeof v.sku === 'string' && v.sku.startsWith(expectedPrefix)
        );
        let resolvedSku = isAlreadyFormatted ? v.sku : (parentCode ? `${parentCode}-${suffix}` : (v.sku || ''));
        resolvedSku = String(resolvedSku || '').trim().replace(/^(.*-\d{2})-[a-z0-9_-]+$/i, '$1');

        const syncUnitPrice = v.syncUnitPrice ?? (v.use_parent_price !== false);
        const syncPromoPrice = v.syncPromoPrice ?? (v.use_parent_promo_price !== false);
        const syncDescription = v.syncDescription ?? (v.use_parent_description !== false);
        const syncDimensions = v.syncWidth ?? (v.use_parent_dimensions !== false);
        const variationPrice = syncUnitPrice ? Number(p.unit_price ?? p.price ?? 0) : Number(v.price ?? 0);
        const variationPromoPrice = syncPromoPrice
          ? (p.promo_price === null || p.promo_price === undefined ? undefined : Number(p.promo_price))
          : (v.promo_price === null || v.promo_price === undefined ? undefined : Number(v.promo_price));

        return {
          ...v,
          sku: resolvedSku,
          name: v.name || p.name,
          stock: Number(v.stock ?? 0),
          price: variationPrice,
          promo_price: variationPromoPrice,
          unitPrice: variationPrice,
          promoPrice: variationPromoPrice,
          costPrice: Number(v.cost_price ?? p.cost_price ?? 0),
          syncUnitPrice,
          syncPromoPrice,
          syncDescription,
          syncWidth: syncDimensions,
          syncHeight: syncDimensions,
          syncDepth: syncDimensions,
          syncWeight: syncDimensions,
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
      if (storedVariations.length === 0 && allVars.length === 0 && isProductItem) {
        allVars = [
          {
            id: `${p.id}_${parentCode}-01`,
            sku: `${parentCode}-01`,
            name: p.name || 'Padrão',
            stock: Number(p.stock ?? 0),
            price: Number(p.unit_price ?? p.price ?? 0),
            promo_price: p.promo_price !== null && p.promo_price !== undefined ? Number(p.promo_price) : undefined,
            cost_price: Number(p.cost_price ?? 0),
            active: Boolean(p.active),
            status: p.status || 'published',
            attributes: {},
            images: [],
          },
        ];
      }

      const activeVariationsCount = allVars.filter((variation: any) => variation.active !== false).length;
      const totalVariationsCount = allVars.length || 1;
      const parentActive = allVars.length > 0 ? activeVariationsCount > 0 : Boolean(p.active);
      const isParent = isProductItem || Boolean(p.has_variations || allVars.length > 0);

      return {
        ...p,
        category: (p.product_categories || [])
          .map((relation: any) => categoryNames.get(String(relation.category_id)))
          .filter(Boolean)
          .join(' | ') || p.category || p.category_name || '',
        allVariations: allVars,
        images: productImages,
        unitPrice: Number(p.unit_price ?? p.price ?? 0),
        promoPrice: Number(p.promo_price ?? 0),
        costPrice: Number(p.cost_price ?? 0),
        stock: Number(p.stock ?? 0),
        active: parentActive,
        activeVariationsCount,
        totalVariationsCount,
        isParent,
        isDraft: Boolean(p.is_draft || p.status === 'draft'),
        mainSupplierId: p.main_supplier_id || p.supplier_id || null,
        supplierId: p.supplier_id || p.main_supplier_id || null,
        supplierIds: Array.isArray(p.supplier_ids) ? p.supplier_ids : (p.supplier_id ? [p.supplier_id] : (p.main_supplier_id ? [p.main_supplier_id] : [])),
      };
    });

    return { data: formatted, total: count || 0 };
  } catch (err) {
    if (options?.throwOnError) throw err;
    console.error('[MobileProductService] Exceção ao buscar produtos:', err);
    return { data: [], total: 0 };
  }
};
