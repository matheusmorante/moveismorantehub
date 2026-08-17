"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase/client"
import type { Category, Relationship } from "./types"

export function useSubHeaderData() {
  const [environments, setEnvironments] = useState<Category[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [relationships, setRelationships] = useState<Relationship[]>([])

  useEffect(() => {
    async function load() {
      const [catRes, relRes] = await Promise.all([
        supabase.from("categories").select("*").order("name"),
        supabase.from("category_relationships").select("*"),
      ])
      if (catRes.data) {
        setEnvironments(catRes.data.filter((c: Category) => c.type === "environment"))
        setCategories(catRes.data.filter((c: Category) => c.type === "category"))
      }
      if (relRes.data) setRelationships(relRes.data)
    }
    load()
  }, [])

  function getCategoriesForEnv(envId: string): Category[] {
    const linkedIds = relationships
      .filter((r) => r.parent_id === envId)
      .map((r) => r.child_id)
    return categories.filter((c) => linkedIds.includes(c.id))
  }

  return { environments, getCategoriesForEnv }
}
