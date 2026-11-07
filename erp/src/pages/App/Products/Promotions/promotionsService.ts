import { supabase } from '@/pages/utils/supabaseConfig';

export type PromotionStatus = 'draft' | 'scheduled' | 'active' | 'interrupted' | 'ended';
export type PromotionDiscountMode = 'general' | 'per_variation';

export interface PromotionListRow {
  id: string;
  name: string;
  description: string | null;
  conditions: string | null;
  discount_mode: PromotionDiscountMode;
  general_discount_percent: number | null;
  starts_on: string | null;
  ends_on: string | null;
  timezone_name: string;
  status: 'draft' | 'scheduled' | 'interrupted';
  computed_status: PromotionStatus;
  item_count: number;
  minimum_discount: number | null;
  maximum_discount: number | null;
  total_count: number;
}

export interface PromotionParticipant {
  productId: string;
  variationId: string | null;
  productName: string;
  variationName: string | null;
  code: string | null;
  sku: string | null;
  categoryId: string | null;
  categoryName: string | null;
  regularPrice: number;
  currentPrice: number;
  discountPercent: string;
}

export interface PromotionFilters {
  search: string;
  status: string;
  periodStart: string;
  periodEnd: string;
  productSearch: string;
  page: number;
}

export const PAGE_SIZE = 15;

export async function fetchPromotions(filters: PromotionFilters) {
  const { data, error } = await supabase.rpc('search_promotions', {
    p_search: filters.search.trim() || null,
    p_status: filters.status === 'all' ? null : filters.status,
    p_period_start: filters.periodStart || null,
    p_period_end: filters.periodEnd || null,
    p_product_search: filters.productSearch.trim() || null,
    p_limit: PAGE_SIZE,
    p_offset: (filters.page - 1) * PAGE_SIZE,
  });

  if (error) throw error;
  const rows = (data || []) as PromotionListRow[];
  return { rows, total: Number(rows[0]?.total_count || 0) };
}

export async function fetchPromotion(id: string) {
  const { data, error } = await supabase
    .from('promotions')
    .select(
      'id, name, description, conditions, discount_mode, general_discount_percent, starts_on, ends_on, timezone_name, status, promotion_items(id, product_id, variation_id, discount_percent, products(id, name, code, category_id, unit_price, price, promo_price), product_variations(id, name, sku, price, promo_price, use_parent_price, use_parent_promo_price))'
    )
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error('A campanha não foi encontrada.');

  return {
    ...data,
    items: (data.promotion_items || []).map((item: any) => {
      const product = Array.isArray(item.products) ? item.products[0] : item.products;
      const variation = Array.isArray(item.product_variations)
        ? item.product_variations[0]
        : item.product_variations;
      const regularPrice = Number(
        variation && variation.use_parent_price === false
          ? variation.price ?? product?.unit_price ?? product?.price ?? 0
          : product?.unit_price ?? product?.price ?? variation?.price ?? 0
      );
      const rawPromoPrice = Number(
        variation && variation.use_parent_promo_price === false
          ? variation.promo_price ?? product?.promo_price ?? 0
          : product?.promo_price ?? 0
      );
      return {
        productId: String(item.product_id),
        variationId: item.variation_id ? String(item.variation_id) : null,
        productName: product?.name || 'Produto indisponível',
        variationName: variation?.name || null,
        code: product?.code ? String(product.code) : null,
        sku: variation?.sku ? String(variation.sku) : null,
        categoryId: product?.category_id ? String(product.category_id) : null,
        categoryName: null,
        regularPrice,
        currentPrice: rawPromoPrice > 0 && rawPromoPrice < regularPrice ? rawPromoPrice : regularPrice,
        discountPercent: item.discount_percent == null ? '' : String(item.discount_percent),
      } satisfies PromotionParticipant;
    }),
  };
}

export async function searchPromotionParticipants(input: {
  search: string;
  categoryId: string;
  supplierId: string;
  selectedKeys: string[];
  page: number;
}) {
  const { data, error } = await supabase.rpc('search_available_promotion_items', {
    p_search: input.search.trim() || null,
    p_category_id: input.categoryId || null,
    p_supplier_id: input.supplierId || null,
    p_selected_keys: input.selectedKeys,
    p_limit: PAGE_SIZE,
    p_offset: (input.page - 1) * PAGE_SIZE,
  });

  if (error) throw error;
  return (data || []).map((row: any) => ({
    productId: String(row.product_id),
    variationId: row.variation_id ? String(row.variation_id) : null,
    productName: String(row.product_name || ''),
    variationName: row.variation_name ? String(row.variation_name) : null,
    code: row.code ? String(row.code) : null,
    sku: row.sku ? String(row.sku) : null,
    categoryId: row.category_id ? String(row.category_id) : null,
    categoryName: row.category_name ? String(row.category_name) : null,
    regularPrice: Number(row.regular_price || 0),
    currentPrice: Number(row.product_price || 0),
    discountPercent: '',
  })) as PromotionParticipant[];
}

export async function fetchPromotionFilterOptions() {
  const [categories, suppliers] = await Promise.all([
    supabase.from('categories').select('id, name, parent_id').eq('type', 'category').order('name'),
    supabase
      .from('people')
      .select('id, full_name, social_name')
      .or('person_type.ilike.suppliers,person_type.ilike.supplier')
      .eq('active', true)
      .eq('deleted', false)
      .order('full_name')
      .limit(250),
  ]);
  if (categories.error) throw categories.error;
  if (suppliers.error) throw suppliers.error;
  return {
    categories: categories.data || [],
    suppliers: (suppliers.data || []).filter((supplier) => /^[0-9a-f-]{36}$/i.test(supplier.id)),
  };
}

export async function mutatePromotion(
  action: 'save' | 'duplicate' | 'interrupt' | 'resume' | 'delete',
  promotionId: string | null,
  payload?: Record<string, unknown>
) {
  const { data, error } = await supabase.rpc('mutate_promotion', {
    p_action: action,
    p_promotion_id: promotionId,
    p_payload: payload || {},
  });
  if (error) throw error;
  return String(data);
}

export function getPromotionErrorMessage(error: unknown) {
  const message = error instanceof Error
    ? error.message
    : error && typeof error === 'object' && 'message' in error
      ? String(error.message || '')
      : String(error || '');
  if (
    message.includes('PROMOTION_PERIOD_OVERLAP') ||
    message.includes('promotions_no_overlapping_scheduled_periods')
  ) {
    return 'Esse período se sobrepõe a outra campanha programada. Escolha datas sem conflito.';
  }
  if (message.includes('PROMOTION_PERMISSION_REQUIRED')) {
    return 'Seu perfil não tem permissão para gerenciar campanhas.';
  }
  if (message.includes('PROMOTION_SCHEDULE_INCOMPLETE')) {
    return 'Informe o período, os produtos participantes e o desconto antes de programar.';
  }
  if (message.includes('PROMOTION_CANNOT_RESUME_OUTSIDE_PERIOD')) {
    return 'O período da campanha já terminou ou ainda não começou. Ajuste as datas antes de retomar.';
  }
  if (message.includes('PROMOTION_MUST_BE_INTERRUPTED_BEFORE_DELETE')) {
    return 'Interrompa a campanha antes de excluí-la.';
  }
  if (message.includes('PROMOTION_VARIATION')) {
    return 'Uma das variações escolhidas não está mais ativa. Atualize os participantes.';
  }
  if (message.includes('PROMOTION_PRODUCT_NOT_ACTIVE')) {
    return 'Um dos produtos escolhidos deixou de estar ativo. Atualize os participantes.';
  }
  if (message.includes('PROMOTION_PRODUCT_TYPE_NOT_SUPPORTED')) {
    return 'Serviços e produtos compostos não podem participar de campanhas.';
  }
  return message || 'Não foi possível salvar a campanha.';
}

export function formatPromotionDate(value: string | null, timezone = 'America/Sao_Paulo') {
  if (!value) return '—';
  const date = new Date(`${value}T12:00:00`);
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: timezone }).format(date);
}
