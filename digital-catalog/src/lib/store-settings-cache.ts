import { supabase } from "@/lib/supabase/client"

let cachedStyleSettings: any = null
let fetchPromise: Promise<any> | null = null
const STYLE_COLUMNS = "id, button_style, primary_color, secondary_color, accent_color, background_color, text_color, product_list_design_set"

export async function getCachedStoreStyleSettings() {
  if (cachedStyleSettings) {
    return { data: cachedStyleSettings, error: null }
  }

  if (fetchPromise) {
    return fetchPromise
  }

  fetchPromise = supabase
    .from("store_style_settings")
    .select(STYLE_COLUMNS)
    .eq("id", true)
    .maybeSingle()
    .then(({ data, error }) => {
      if (!error && data) {
        cachedStyleSettings = data
      }
      fetchPromise = null
      return { data, error }
    })

  return fetchPromise
}
