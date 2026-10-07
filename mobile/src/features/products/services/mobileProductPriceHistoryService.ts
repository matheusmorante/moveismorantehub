import { supabase } from '../../../services/supabaseClient';

export interface MobileProductPriceHistoryEntry {
  id: string;
  changed_at: string | null;
  reason: string | null;
  change_reason: string | null;
  new_price: number | null;
  price: number | null;
}

export const fetchMobileProductPriceHistory = async (
  productId: string
): Promise<{ rows: MobileProductPriceHistoryEntry[]; hasError: boolean }> => {
  const { data, error } = await supabase
    .from('product_price_history')
    .select('*')
    .eq('product_id', productId)
    .order('changed_at', { ascending: false });

  return {
    rows: (data || []) as MobileProductPriceHistoryEntry[],
    hasError: Boolean(error),
  };
};
