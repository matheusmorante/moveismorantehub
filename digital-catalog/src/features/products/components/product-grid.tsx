"use client"

import { useState, useEffect, useRef } from "react"
import { supabase } from "@/lib/supabase/client"
import { ProductCard } from "./product-card"
import { Loader2, Package } from "lucide-react"
import { useAdminMode } from "@/hooks/use-admin-mode"
import { defaultStoreDesignSettings, productGridStyleClasses, StoreDesignSettings } from "@/lib/product-card-style"
import { cn } from "@/lib/utils"

interface ProductGridProps {
  filters?: {
    envs: string[]
    cats: string[]
    search: string
    minPrice: number
    maxPrice: number
    type: string
    sortBy: string
  }
}

const ITEMS_PER_PAGE = 12

export function ProductGrid({ filters }: ProductGridProps) {
  const [allProducts, setAllProducts] = useState<any[]>([])
  const [visibleProducts, setVisibleProducts] = useState<any[]>([])
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [cardStyle, setCardStyle] = useState<StoreDesignSettings>(defaultStoreDesignSettings)
  const { isAdminMode } = useAdminMode()
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  
  const observerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (typeof window === "undefined") return
    const channel = new BroadcastChannel("catalog-updates")
    const handleMessage = (event: MessageEvent) => {
      if (event.data === "catalog-updated") {
        setRefreshTrigger(prev => prev + 1)
      }
    }
    channel.addEventListener("message", handleMessage)
    return () => {
      channel.removeEventListener("message", handleMessage)
      channel.close()
    }
  }, [])

  useEffect(() => {
    async function fetchProducts() {
      setLoading(true)
      try {
        let allowedCategoryIds: string[] = []
        
        if (filters?.envs && filters.envs.length > 0) {
          const { data: rels } = await supabase
            .from("category_relationships")
            .select("child_id")
            .in("parent_id", filters.envs)
          
          allowedCategoryIds = [...filters.envs, ...(rels?.map(r => r.child_id) || [])]
        }

        function buildProductsQuery(hasDeletedAt: boolean, hasOpportunities: boolean) {
          let q = supabase.from("products")
          
          if (hasOpportunities) {
            q = q.select(`
              *,
              product_images(*),
              product_variations(*),
              product_categories(*, categories(name)),
              opportunities(*)
            `)
          } else {
            q = q.select(`
              *,
              product_images(*),
              product_variations(*),
              product_categories(*, categories(name))
            `)
          }

          q = q.eq("status", "published")

          if (hasDeletedAt) {
            q = q.is("deleted_at", null)
          }


          if (filters?.minPrice !== undefined) {
            q = q.gte("price", filters.minPrice)
          }
          if (filters?.maxPrice !== undefined) {
            q = q.lte("price", filters.maxPrice)
          }
          const SALVADOS_OPP_ID = "9d8bedae-b366-4f8c-ac49-74b85b882bde"

          if (filters?.type === "salvados" || filters?.type === SALVADOS_OPP_ID) {
            q = q.eq("opportunity_id", SALVADOS_OPP_ID)
          } else if (filters?.type === "promotion") {
            q = q.not("promo_price", "is", null)
          } else if (filters?.type && filters.type !== "all") {
            q = q.eq("opportunity_id", filters.type)
          }

          const sort = filters?.sortBy || "newest"
          if (sort === "newest") q = q.order("created_at", { ascending: false })
          if (sort === "price-asc") q = q.order("price", { ascending: true })
          if (sort === "price-desc") q = q.order("price", { ascending: false })
          if (sort === "title-asc") q = q.order("name", { ascending: true })

          return q
        }

        const stylePromise = supabase.from("store_style_settings").select("border_width, border_radius, shadow, opportunity_emphasis, button_style, product_image_fit, product_grid_columns, product_grid_gap").eq("id", true).maybeSingle()
        
        let hasDeletedAt = true
        let hasOpportunities = true
        let result = await buildProductsQuery(hasDeletedAt, hasOpportunities)
        let data = result.data
        let error = result.error

        if (error) {
          console.warn("Erro ao buscar produtos, tentando com fallback de compatibilidade de schema:", error)
          
          if (error.code === "42703" && error.message?.includes("deleted_at")) {
            hasDeletedAt = false
          }
          if (error.code === "42P01" && error.message?.includes("opportunities")) {
            hasOpportunities = false
          }

          const secondAttempt = await buildProductsQuery(hasDeletedAt, hasOpportunities)
          
          if (secondAttempt.error) {
            if (secondAttempt.error.code === "42703" || secondAttempt.error.code === "42P01") {
              const thirdAttempt = await buildProductsQuery(false, false)
              if (thirdAttempt.error) throw thirdAttempt.error
              data = thirdAttempt.data
              hasOpportunities = false
            } else {
              throw secondAttempt.error
            }
          } else {
            data = secondAttempt.data
          }
        }

        const rawProducts = data || []
        let results: any[] = []

        for (const p of rawProducts) {
          const variations = p.product_variations?.filter((v: any) => v.status === 'published') || []
          
          const finalOpportunities = p.opportunities || (p.is_salvado ? {
            name: "Salvados",
            badge_color: "bg-red-600",
            border_color: "border-orange-500",
            border_style: "solid",
            badge_animation: "pulse"
          } : null)

          const mappedProduct = {
            ...p,
            opportunities: finalOpportunities
          }

          if (variations.length > 0) {
            for (const v of variations) {
              const varPrice = v.use_parent_price === false && v.price ? parseFloat(v.price) : p.price
              const varPromoPrice = v.use_parent_promo_price === false && v.promo_price ? parseFloat(v.promo_price) : p.promo_price
              const varImg = (v.image_url && v.image_url.includes(",") ? v.image_url.split(",")[0] : v.image_url) || p.product_images?.find((img: any) => img.is_main)?.image_url || p.product_images?.[0]?.image_url

              const isParentName = v.use_parent_name !== false
              const comboName = Object.entries(v.attributes || {})
                .map(([_, valStr]) => valStr)
                .filter(Boolean)
                .join(" / ")
              
              const displayName = !isParentName && v.name 
                ? v.name 
                : (comboName ? `${p.name} - ${comboName}` : p.name)

              results.push({
                ...mappedProduct,
                id: `${p.id}-${v.id}`, 
                realProductId: p.id,
                name: displayName,
                price: varPrice,
                promo_price: varPromoPrice,
                image_url: varImg,
                slug: `${p.slug}?var=${v.id}`,
                is_variation: true
              })
            }
          } else {
            results.push(mappedProduct)
          }
        }

        const { data: styleData, error: styleError } = await stylePromise
        if (!styleError && styleData) setCardStyle({ ...defaultStoreDesignSettings, ...styleData } as StoreDesignSettings)

        if (filters?.envs && filters.envs.length > 0) {
          results = results.filter(p => {
            const prodCatIds = p.product_categories?.map((pc: any) => pc.category_id) || []
            return prodCatIds.some((catId: string) => allowedCategoryIds.includes(catId))
          })
        }

        if (filters?.cats && filters.cats.length > 0) {
          results = results.filter(p => {
            const prodCatIds = p.product_categories?.map((pc: any) => pc.category_id) || []
            return prodCatIds.some((catId: string) => filters.cats.includes(catId))
          })
        }

        if (filters?.search) {
          const normalizeSearch = (str: string) => {
            if (!str) return ""
            return str
              .normalize("NFD")
              .replace(/[\u0300-\u036f]/g, "")
              .toLowerCase()
              .replace(/[-_/]/g, " ")
              .replace(/\s+/g, " ")
              .trim()
          }

          const rawSearch = normalizeSearch(filters.search)
          const searchTokens = rawSearch.split(" ").filter(Boolean)

          // Expansão de sinônimos comuns do setor moveleiro
          const isWardrobeSearch = rawSearch.includes("guarda") || rawSearch.includes("roupa") || rawSearch.includes("roupeiro")

          results = results.filter(p => {
            const cleanName = normalizeSearch(p.name || "")
            const cleanDesc = normalizeSearch(p.description || "")
            const cleanCats = (p.product_categories || [])
              .map((pc: any) => normalizeSearch(pc.categories?.name || ""))
              .join(" ")

            const fullSearchableText = `${cleanName} ${cleanDesc} ${cleanCats}`

            // 1. Caso seja busca por guarda-roupa / roupeiro
            if (isWardrobeSearch) {
              const hasWardrobeKeyword = fullSearchableText.includes("guarda") || 
                                         fullSearchableText.includes("roupa") || 
                                         fullSearchableText.includes("roupeiro")
              if (hasWardrobeKeyword) {
                // Checa outros modificadores como "casal", "solteiro", "espelho", etc.
                const otherTokens = searchTokens.filter(t => t !== "guarda" && t !== "roupa" && t !== "roupeiro")
                if (otherTokens.length === 0 || otherTokens.every(t => fullSearchableText.includes(t))) {
                  return true
                }
              }
            }

            // 2. Busca padrão: todos os tokens digitados precisam estar no texto do produto
            return searchTokens.every(token => fullSearchableText.includes(token))
          })
        }

        setAllProducts(results)
        setVisibleProducts(results.slice(0, ITEMS_PER_PAGE))
        setPage(1)
      } catch (error) {
        console.error("Erro ao carregar produtos:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchProducts()
  }, [filters, refreshTrigger])

  useEffect(() => {
    if (visibleProducts.length >= allProducts.length) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loadingMore) {
          setLoadingMore(true)
          setTimeout(() => {
            const nextPage = page + 1
            const nextSlice = allProducts.slice(0, nextPage * ITEMS_PER_PAGE)
            setVisibleProducts(nextSlice)
            setPage(nextPage)
            setLoadingMore(false)
          }, 300)
        }
      },
      { threshold: 0.1 }
    )

    const currentObserverTarget = observerRef.current
    if (currentObserverTarget) {
      observer.observe(currentObserverTarget)
    }

    return () => {
      if (currentObserverTarget) {
        observer.unobserve(currentObserverTarget)
      }
    }
  }, [allProducts, visibleProducts, page, loadingMore])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] w-full gap-4 bg-transparent">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground animate-pulse font-medium text-sm">Atualizando produtos...</p>
      </div>
    )
  }

  if (allProducts.length === 0) {
    return (
      <div className="text-center py-20 border rounded-3xl bg-gray-50/50 border-dashed border-gray-200 animate-in fade-in zoom-in duration-500">
        <div className="bg-white h-20 w-20 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
          <Package className="h-10 w-10 text-gray-300" />
        </div>
        <p className="text-gray-600 font-bold text-lg">Nenhum produto encontrado</p>
        <p className="text-sm text-muted-foreground max-w-xs mx-auto">
          {isAdminMode ? (
            'Certifique-se de que os produtos foram marcados como "Concluir Cadastro" no painel administrativo.'
          ) : (
            'Estamos preparando novidades incríveis para você! Tente selecionar outro filtro ou volte em alguns instantes.'
          )}
        </p>
      </div>
    )
  }

  const columnsClass = productGridStyleClasses.columns[cardStyle.product_grid_columns] || productGridStyleClasses.columns["compact"]
  const gapClass = productGridStyleClasses.gap[cardStyle.product_grid_gap] || productGridStyleClasses.gap["tight"]

  return (
    <div className="space-y-6">
      <div className={cn("grid animate-in fade-in slide-in-from-bottom-4 duration-700", columnsClass, gapClass)}>
        {visibleProducts.map((product) => {
          const mainImg = product.image_url ||
                          product.product_images?.find((img: any) => img.is_main)?.image_url || 
                          product.product_images?.[0]?.image_url || 
                          "https://images.unsplash.com/photo-1594462250122-b2d99d3d0f3c?q=80&w=800"

          return (
            <ProductCard
              key={product.id}
              product={{
                id: product.id,
                name: product.name,
                slug: product.slug,
                price: product.price,
                promo_price: product.promo_price,
                category: product.product_categories?.[0]?.categories?.name || "Móvel",
                image: mainImg,
                promotion: !!product.promo_price,
                opportunity: product.opportunities ? {
                  name: product.opportunities.name,
                  badge_color: product.opportunities.badge_color,
                  border_color: product.opportunities.border_color,
                  border_style: product.opportunities.border_style,
                  badge_animation: product.opportunities.badge_animation,
                } : null,
              }}
              style={cardStyle}
            />
          )
        })}
      </div>

      {visibleProducts.length < allProducts.length && (
        <div ref={observerRef} className="w-full flex justify-center py-6">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      )}
    </div>
  )
}
