"use client"

import { useEffect } from "react"
import { supabase } from "@/lib/supabase/client"

const fallback = {
  primary_color: "#173f7a",
  accent_color: "#f4c430",
  background_color: "#ffffff",
  hero_overlay: "dark",
}

export function StoreDesignProvider() {
  useEffect(() => {
    async function applyStoreDesign() {
      const { data } = await supabase
        .from("store_style_settings")
        .select("primary_color, accent_color, background_color, hero_overlay")
        .eq("id", true)
        .maybeSingle()

      const design = { ...fallback, ...data }
      const root = document.documentElement
      const heroOverlays = {
        soft: "rgb(15 23 42 / 0.55)",
        dark: "rgb(0 0 0 / 0.80)",
        vibrant: "rgb(79 18 0 / 0.72)",
      } as const
      root.style.setProperty("--primary", design.primary_color)
      root.style.setProperty("--accent", design.accent_color)
      root.style.setProperty("--background", design.background_color)
      root.style.setProperty("--hero-overlay", heroOverlays[design.hero_overlay as keyof typeof heroOverlays])
    }

    applyStoreDesign()
  }, [])

  return null
}
