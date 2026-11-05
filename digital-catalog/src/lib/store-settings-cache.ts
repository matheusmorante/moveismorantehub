import { supabase } from '@/lib/supabase/client';

let cachedStyleSettings: any = null;
let fetchPromise: Promise<any> | null = null;
let fetchedAt = 0;
let generation = 0;
export function invalidateStoreStyleSettings() { generation++; cachedStyleSettings = null; fetchedAt = 0; fetchPromise = null; }
const STYLE_COLUMNS =
  'id, border_width, border_radius, shadow, opportunity_emphasis, button_style, primary_color, accent_color, background_color, hero_overlay, product_image_fit, product_grid_columns, product_grid_gap';

export async function getCachedStoreStyleSettings() {
  if (cachedStyleSettings && Date.now() - fetchedAt < 10 * 60 * 1000) {
    return { data: cachedStyleSettings, error: null };
  }

  if (fetchPromise) {
    return fetchPromise;
  }

  fetchPromise = (async () => {
    const currentGeneration = generation;
    try {
    const { data, error } = await supabase
      .from('store_style_settings')
      .select(STYLE_COLUMNS)
      .eq('id', true)
      .maybeSingle();

    if (!error && data && currentGeneration === generation) {
      cachedStyleSettings = data; fetchedAt = Date.now();
    }
    return { data, error };
    } finally { if (currentGeneration === generation) fetchPromise = null; }
  })();

  return fetchPromise;
}
