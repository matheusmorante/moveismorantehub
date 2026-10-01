import { supabase } from '@/lib/supabase/client';

let cachedStyleSettings: any = null;
let fetchPromise: Promise<any> | null = null;
const STYLE_COLUMNS =
  'id, border_width, border_radius, shadow, opportunity_emphasis, button_style, primary_color, accent_color, background_color, hero_overlay, product_image_fit, product_grid_columns, product_grid_gap';

export async function getCachedStoreStyleSettings() {
  if (cachedStyleSettings) {
    return { data: cachedStyleSettings, error: null };
  }

  if (fetchPromise) {
    return fetchPromise;
  }

  fetchPromise = supabase
    .from('store_style_settings')
    .select(STYLE_COLUMNS)
    .eq('id', true)
    .maybeSingle()
    .then(({ data, error }) => {
      if (!error && data) {
        cachedStyleSettings = data;
      }
      fetchPromise = null;
      return { data, error };
    });

  return fetchPromise;
}
