import { supabase } from "@/lib/supabase/client"

let cachedStyleSettings: any = null
let fetchPromise: Promise<any> | null = null

export async function getCachedStoreStyleSettings() {
  if (cachedStyleSettings) {
    return { data: cachedStyleSettings, error: null }
  }

  if (fetchPromise) {
    return fetchPromise
  }

  fetchPromise = supabase
    .from("store_style_settings")
    .select("*")
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
