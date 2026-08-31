"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase/client"
import { ProductCard } from "./product-card"
import { ChevronLeft, ChevronRight, Loader2, Package } from "lucide-react"
import { useAdminMode } from "@/hooks/use-admin-mode"
import { defaultStoreDesignSettings, productGridStyleClasses, StoreDesignSettings } from "@/lib/product-card-style"
import { cn } from "@/lib/utils"

import { slugifyText } from "@/lib/slug-utils"

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

const ITEMS_PER_PAGE = 20

export function ProductGrid({ filters }: ProductGridProps) {
  const [allProducts, setAllProducts] = useState<any[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [cardStyle, setCardStyle] = useState<StoreDesignSettings>(defaultStoreDesignSettings)
  const { isAdminMode } = useAdminMode()
  const [refreshTrigger, setRefreshTrigger] = useState(0)

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

        // Se type for um slug legível de Oportunidade, resolve para o UUID real
        let resolvedOppId = filters?.type || "all"
        if (resolvedOppId && resolvedOppId !== "all" && resolvedOppId !== "salvados" && resolvedOppId !== "promotion") {
          const { data: dbOpps } = await supabase.from("opportunities").select("id, name, slug")
          if (dbOpps) {
            const matchedOpp = dbOpps.find((o: any) => 
              o.id === resolvedOppId || 
              (o.slug && o.slug.toLowerCase().trim() === resolvedOppId.toLowerCase().trim()) ||
              slugifyText(o.name) === slugifyText(resolvedOppId)
            )
            if (matchedOpp) resolvedOppId = matchedOpp.id
          }
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

          if (filters?.type === "salvados" || resolvedOppId === SALVADOS_OPP_ID) {
            q = q.eq("opportunity_id", SALVADOS_OPP_ID)
          } else if (filters?.type === "promotion" || resolvedOppId === "promotion" || resolvedOppId === "promocao") {
            q = q.not("promo_price", "is", null)
          } else if (resolvedOppId && resolvedOppId !== "all") {
            q = q.eq("opportunity_id", resolvedOppId)
          }

          const sort = filters?.sortBy || "newest"
          if (sort === "newest") q = q.order("created_at", { ascending: false })
          if (sort === "price-asc") q = q.order("price", { ascending: true })
          if (sort === "price-desc") q = q.order("price", { ascending: false })
          if (sort === "title-asc") q = q.order("name", { ascending: true })

          return q.limit(100)
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

        // Carrega a lista completa de categorias do banco para resolução de nomes em filtros por ID
        const { data: dbCategoriesList } = await supabase.from("categories").select("id, name, slug, type")

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

        const getSynonyms = (token: string): string[] => {
          const norm = token.toLowerCase().trim().replace(/s$/, "")
          if (norm === "roupa" || norm === "guarda" || norm === "roupeiro" || norm === "guardaroupa") {
            return ["roupa", "roupas", "guarda", "roupeiro", "roupeiros", "guarda-roupa", "guarda roupa"]
          }
          if (norm === "sofa" || norm === "estofado") {
            return ["sofa", "sofas", "estofado", "estofados"]
          }
          if (norm === "colchao" || norm === "espuma" || norm === "mola") {
            return ["colchao", "colchoes"]
          }
          if (norm === "cama" || norm === "box" || norm === "sommier") {
            return ["cama", "camas", "box"]
          }
          if (norm === "mesa") {
            return ["mesa", "mesas"]
          }
          if (norm === "painel") {
            return ["painel", "paineis"]
          }
          if (norm === "rack") {
            return ["rack", "racks"]
          }
          if (norm === "balcao") {
            return ["balcao", "balcoes"]
          }
          if (norm === "pia") {
            return ["pia", "pias"]
          }
          if (norm === "armario") {
            return ["armario", "armarios"]
          }
          if (norm === "multiuso") {
            return ["multiuso", "multiusos"]
          }
          if (norm === "cadeira") {
            return ["cadeira", "cadeiras"]
          }
          if (norm === "banqueta") {
            return ["banqueta", "banquetas"]
          }
          if (norm === "comoda") {
            return ["comoda", "comodas"]
          }
          if (norm === "cabeceira") {
            return ["cabeceira", "cabeceiras"]
          }
          if (norm === "sapateira") {
            return ["sapateira", "sapateiras"]
          }
          if (norm === "cristaleira") {
            return ["cristaleira", "cristaleiras"]
          }
          if (norm === "escrivaninha") {
            return ["escrivaninha", "escrivaninhas", "mesa"]
          }
          return [token, `${token}s`, norm]
        }

        if (filters?.envs && filters.envs.length > 0) {
          const envCategoryNames = (dbCategoriesList || [])
            .filter(c => filters.envs.includes(c.id))
            .map(c => normalizeSearch(c.name))

          results = results.filter(p => {
            const prodCatIds = [
              p.category_id,
              ...(p.product_categories?.map((pc: any) => pc.category_id) || [])
            ].filter(Boolean)
            if (prodCatIds.some((catId: string) => allowedCategoryIds.includes(catId))) {
              return true
            }

            const cleanName = normalizeSearch(p.name || "")
            const cleanDesc = normalizeSearch(p.description || "")
            const fullText = `${cleanName} ${cleanDesc}`

            return envCategoryNames.some(envName => {
              const tokens = envName.split(" ").filter(t => t.length >= 2 && !["de", "da", "do", "dos", "das", "para", "com", "em"].includes(t))
              if (tokens.length === 0) return true
              return tokens.some(token => {
                const syns = getSynonyms(token)
                return syns.some(syn => fullText.includes(syn))
              })
            })
          })
        }

        if (filters?.cats && filters.cats.length > 0) {
          const allCatTargetIds = new Set<string>()
          
          filters.cats.forEach((catItem: string) => {
            if (!catItem) return
            const itemClean = catItem.toLowerCase().trim()
            if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(catItem)) {
              allCatTargetIds.add(catItem)
            }

            // Tenta encontrar a categoria por ID, slug, nome ou versão sem 's' final
            const matchedCats = (dbCategoriesList || []).filter(c => {
              if (c.type !== "category") return false

              const cId = String(c.id).toLowerCase().trim()
              const cSlug = (c.slug || "").toLowerCase().trim()
              const genSlug = slugifyText(c.name)
              const normName = normalizeSearch(c.name)
              const normItem = normalizeSearch(catItem)

              return (
                cId === itemClean ||
                cSlug === itemClean ||
                genSlug === itemClean ||
                (cSlug && cSlug.replace(/s$/, "") === itemClean.replace(/s$/, "")) ||
                genSlug.replace(/s$/, "") === itemClean.replace(/s$/, "") ||
                normName === normItem ||
                normName.replace(/s$/, "") === normItem.replace(/s$/, "")
              )
            })

            matchedCats.forEach(matchedCat => {
              allCatTargetIds.add(matchedCat.id)
            })
          })

          // Categoria é um filtro exato. Produtos antigos podem ter somente
          // category_id, enquanto os novos usam também product_categories.
          if (allCatTargetIds.size === 0) {
            results = []
          } else {
            results = results.filter(product => {
              const productCategoryIds = [
                product.category_id,
                ...(product.product_categories?.map((link: any) => link.category_id) || [])
              ].filter(Boolean)
              return productCategoryIds.some(categoryId => allCatTargetIds.has(categoryId))
            })
          }
        }

        if (filters?.search) {
          const rawSearch = normalizeSearch(filters.search)
          const searchTokens = rawSearch.split(" ").filter(token => token.length >= 2)

          results = results.filter(p => {
            const cleanName = normalizeSearch(p.name || "")
            const cleanDesc = normalizeSearch(p.description || "")
            const cleanCats = (p.product_categories || [])
              .map((pc: any) => normalizeSearch(pc.categories?.name || ""))
              .join(" ")

            const fullSearchableText = `${cleanName} ${cleanDesc} ${cleanCats}`

            return searchTokens.every(token => {
              const synonyms = getSynonyms(token)
              return synonyms.some(syn => fullSearchableText.includes(syn))
            })
          })
        }

        setAllProducts(results)
        setCurrentPage(1)
      } catch (error) {
        console.error("Erro ao carregar produtos:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchProducts()
  }, [filters, refreshTrigger])

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

  const totalPages = Math.ceil(allProducts.length / ITEMS_PER_PAGE) || 1
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const paginatedProducts = allProducts.slice(startIndex, startIndex + ITEMS_PER_PAGE)

  const handlePageChange = (p: number) => {
    if (p < 1 || p > totalPages || p === currentPage) return
    setCurrentPage(p)
  }

  const columnsClass = productGridStyleClasses.columns[cardStyle.product_grid_columns] || productGridStyleClasses.columns["compact"]
  const gapClass = productGridStyleClasses.gap[cardStyle.product_grid_gap] || productGridStyleClasses.gap["tight"]

  return (
    <div className="space-y-8">
      <div className={cn("grid animate-in fade-in slide-in-from-bottom-4 duration-700", columnsClass, gapClass)}>
        {paginatedProducts.map((product) => {
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

      {/* Paginação Responsiva conforme a imagem */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-8 pb-4 border-t border-gray-100 mt-8">
          <span className="text-xs font-semibold text-muted-foreground order-2 sm:order-1 text-center sm:text-left">
            Mostrando <span className="font-bold text-gray-900">{startIndex + 1}</span> a <span className="font-bold text-gray-900">{Math.min(startIndex + ITEMS_PER_PAGE, allProducts.length)}</span> de <span className="font-bold text-gray-900">{allProducts.length}</span> produtos
          </span>

          <div className="flex items-center justify-center gap-1.5 md:gap-2.5 order-1 sm:order-2 select-none">
            {/* Botão Anterior (<) - Cápsula Cinza */}
            <button
              type="button"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className={cn(
                "h-10 px-3.5 md:px-4 rounded-full flex items-center justify-center transition-all text-xs font-bold gap-1",
                currentPage === 1
                  ? "bg-gray-200/80 text-gray-400 cursor-not-allowed"
                  : "bg-gray-100 hover:bg-gray-200 text-gray-800 cursor-pointer shadow-xs active:scale-95"
              )}
              title="Página Anterior"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            {/* Números das Páginas */}
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
              .reduce((acc: (number | string)[], pageNum, index, array) => {
                if (index > 0 && pageNum - (array[index - 1] as number) > 1) {
                  acc.push("...")
                }
                acc.push(pageNum)
                return acc
              }, [])
              .map((p, idx) => {
                if (p === "...") {
                  return (
                    <span key={`dots-${idx}`} className="w-8 h-8 flex items-center justify-center text-xs font-bold text-gray-400">
                      ...
                    </span>
                  )
                }

                const isCurrent = p === currentPage
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => handlePageChange(p as number)}
                    className={cn(
                      "w-9 h-9 md:w-10 md:h-10 rounded-full font-black text-sm flex items-center justify-center transition-all cursor-pointer",
                      isCurrent
                        ? "bg-[#004687] text-white shadow-md scale-105"
                        : "text-gray-700 hover:bg-gray-100 hover:text-primary font-bold"
                    )}
                  >
                    {p}
                  </button>
                )
              })}

            {/* Botão Próximo (>) */}
            <button
              type="button"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className={cn(
                "h-10 px-3.5 md:px-4 rounded-full flex items-center justify-center transition-all text-xs font-bold gap-1",
                currentPage === totalPages
                  ? "bg-gray-200/80 text-gray-400 cursor-not-allowed"
                  : "bg-gray-100 hover:bg-gray-200 text-gray-800 cursor-pointer shadow-xs active:scale-95"
              )}
              title="Próxima Página"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
