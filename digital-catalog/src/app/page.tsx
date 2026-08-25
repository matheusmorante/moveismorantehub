"use client"
import { useState, useCallback, useEffect, Suspense, useMemo, useRef } from "react"
import { SlidersHorizontal, X, ArrowUpDown } from "lucide-react"

import { HeroBanner } from "@/components/layout"
import { FeaturedProducts } from "@/features/products/components/featured-products"
import { ProductGrid } from "@/features/products/components/product-grid"
import { AdvantagesSection } from "@/components/sections/advantages-section"
import { FilterContent } from "@/features/products/components/filter-sidebar"
import { GoogleReviews } from "@/components/sections/google-reviews"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { supabase } from "@/lib/supabase/client"
import { ProductFilter } from "@/features/products/components/product-filter"

import { useSearchParams, useRouter } from "next/navigation"

const INITIAL_FILTERS = {
  envs: [] as string[],
  cats: [] as string[],
  search: "",
  minPrice: 0,
  maxPrice: 10000,
  type: "all",
  sortBy: "newest",
}

function HomeContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [categories, setCategories] = useState<any[]>([])
  const [relationships, setRelationships] = useState<any[]>([])
  const [opportunities, setOpportunities] = useState<any[]>([])
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [filters, setFilters] = useState(INITIAL_FILTERS)
  const sidebarRef = useRef<HTMLDivElement>(null)

  // Bloqueia scroll do body quando sidebar aberta
  useEffect(() => {
    if (isSidebarOpen) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = ""
    }
    return () => { document.body.style.overflow = "" }
  }, [isSidebarOpen])

  // Sincroniza a URL com o estado de filtros
  useEffect(() => {
    const envsParam = searchParams.get("envs")
    const catsParam = searchParams.get("cats")
    const searchParam = searchParams.get("search") || ""
    const typeParam = searchParams.get("type") || "all"
    const sortByParam = searchParams.get("sortBy") || "newest"
    const minPriceParam = searchParams.get("minPrice")
    const maxPriceParam = searchParams.get("maxPrice")

    const envs = envsParam ? envsParam.split(",") : []
    const cats = catsParam ? catsParam.split(",") : []

    setFilters({
      envs,
      cats,
      search: searchParam,
      type: typeParam,
      sortBy: sortByParam,
      minPrice: minPriceParam ? parseInt(minPriceParam) : 0,
      maxPrice: maxPriceParam ? parseInt(maxPriceParam) : 10000,
    })

    // Se houver filtro ativo ou âncora #produtos na URL, rola suavemente até a seção limpa de produtos
    const hasFilterParam = !!(envsParam || catsParam || searchParam || (typeParam && typeParam !== "all"))
    if (hasFilterParam || (typeof window !== "undefined" && window.location.hash === "#produtos")) {
      setTimeout(() => {
        const elem = document.getElementById("produtos")
        if (elem) elem.scrollIntoView({ behavior: "smooth" })
      }, 150)
    }
  }, [searchParams])

  const handleFilterChange = useCallback((newFilters: any) => {
    const params = new URLSearchParams(searchParams.toString())

    if (newFilters.envs !== undefined) {
      if (newFilters.envs.length > 0) params.set("envs", newFilters.envs.join(","))
      else params.delete("envs")
      if (newFilters.cats === undefined) params.delete("cats")
    }
    if (newFilters.cats !== undefined) {
      if (newFilters.cats.length > 0) params.set("cats", newFilters.cats.join(","))
      else params.delete("cats")
    }
    if (newFilters.search !== undefined) {
      if (newFilters.search) params.set("search", newFilters.search)
      else params.delete("search")
    }
    if (newFilters.type !== undefined) {
      if (newFilters.type && newFilters.type !== "all") params.set("type", newFilters.type)
      else params.delete("type")
    }
    if (newFilters.sortBy !== undefined) {
      if (newFilters.sortBy && newFilters.sortBy !== "newest") params.set("sortBy", newFilters.sortBy)
      else params.delete("sortBy")
    }
    if (newFilters.minPrice !== undefined) {
      if (newFilters.minPrice > 0) params.set("minPrice", String(newFilters.minPrice))
      else params.delete("minPrice")
    }
    if (newFilters.maxPrice !== undefined) {
      if (newFilters.maxPrice < 10000) params.set("maxPrice", String(newFilters.maxPrice))
      else params.delete("maxPrice")
    }

    router.push(`/?${params.toString()}`, { scroll: false })
  }, [searchParams, router])

  const clearFilters = useCallback(() => {
    setFilters(INITIAL_FILTERS)
    router.push("/", { scroll: false })
  }, [router])

  useEffect(() => {
    async function loadData() {
      const [catRes, relRes, oppRes] = await Promise.all([
        supabase.from("categories").select("*").order("name"),
        supabase.from("category_relationships").select("*"),
        supabase.from("opportunities").select("*").eq("active", true),
      ])
      if (catRes.data) setCategories(catRes.data)
      if (relRes.data) setRelationships(relRes.data)
      if (oppRes.data) setOpportunities(oppRes.data)
    }
    loadData()
  }, [])

  const environments = categories.filter(c => c.type === "environment")
  const hasActiveFilters = filters.envs.length > 0 || filters.cats.length > 0 || !!filters.search || filters.type !== "all"

  const filterBadges = useMemo(() => {
    const badges: Array<{ id: string; label: string; onRemove: () => void }> = []
    const processedCatIds = new Set<string>()
    const processedEnvIds = new Set<string>()
    const dbEnvs = categories.filter(c => c.type === "environment")

    dbEnvs.forEach(env => {
      const envCats = categories.filter(c =>
        c.type === "category" && relationships.some(r => r.parent_id === env.id && r.child_id === c.id)
      )
      const allCatsSelected = envCats.length > 0 && envCats.every(c => filters.cats.includes(c.id))
      if (allCatsSelected) {
        badges.push({
          id: `all-env-${env.id}`,
          label: `Todos de ${env.name}`,
          onRemove: () => handleFilterChange({
            envs: filters.envs.filter(id => id !== env.id),
            cats: filters.cats.filter(id => !envCats.some(c => c.id === id))
          })
        })
        processedEnvIds.add(env.id)
        envCats.forEach(c => processedCatIds.add(c.id))
      }
    })

    filters.envs.forEach(envId => {
      if (!processedEnvIds.has(envId)) {
        const envName = categories.find(c => c.id === envId)?.name
        if (envName) badges.push({
          id: `env-${envId}`,
          label: `Ambiente: ${envName}`,
          onRemove: () => handleFilterChange({ envs: filters.envs.filter(id => id !== envId) })
        })
      }
    })

    filters.cats.forEach(catId => {
      if (!processedCatIds.has(catId)) {
        const catName = categories.find(c => c.id === catId)?.name
        if (catName) badges.push({
          id: `cat-${catId}`,
          label: `Categoria: ${catName}`,
          onRemove: () => handleFilterChange({ cats: filters.cats.filter(id => id !== catId) })
        })
      }
    })

    if (filters.search) {
      badges.push({
        id: "search",
        label: `Busca: "${filters.search}"`,
        onRemove: () => handleFilterChange({ search: "" })
      })
    }

    if (filters.type !== "all") {
      let typeLabel = filters.type
      if (filters.type === "salvados") {
        typeLabel = "Queima dos Salvados"
      } else if (filters.type === "promotion") {
        typeLabel = "Promoções"
      } else {
        const opp = opportunities.find(o => o.id === filters.type)
        if (opp) typeLabel = opp.name
      }

      badges.push({
        id: "type",
        label: `Tipo: ${typeLabel}`,
        onRemove: () => handleFilterChange({ type: "all" })
      })
    }

    return badges
  }, [filters, categories, relationships, opportunities, handleFilterChange])

  const activeFilterCount = filterBadges.length
  const showHeroAndAdvantages = !filters.search

  return (
    <div className="flex flex-col gap-0">
      {showHeroAndAdvantages && (
        <>
          <HeroBanner onAction={type => handleFilterChange({ type })} />
          <AdvantagesSection />
        </>
      )}

      <div id="produtos" className={`w-full px-4 md:px-8 lg:px-12 scroll-mt-36 ${!showHeroAndAdvantages ? "pt-6" : ""}`}>
        <div className="space-y-6 pb-20">

          {/* Barra de filtros */}
          <div className="space-y-4 pb-6 mb-8 pt-4">
            <h2 className="text-2xl md:text-3xl font-black text-primary">Catálogo de Produtos</h2>

            {/* Busca + ambientes (ProductFilter sem o select de ordenação duplicado) */}
            <ProductFilter
              filters={filters}
              categories={categories}
              relationships={relationships}
              onFilterChange={handleFilterChange}
              isSidebarOpen={isSidebarOpen}
              onToggleSidebar={() => setIsSidebarOpen(v => !v)}
            />

            {/* Filtros ativos + ordenação */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              {/* Badges de filtros ativos */}
              <div className="flex-1 flex items-center gap-3 bg-white border-none p-3 rounded-2xl min-w-0 overflow-hidden shadow-xs">
                {/* Botão de abrir drawer apenas em telas menores que lg */}
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setIsSidebarOpen(v => !v)}
                  className={`lg:hidden h-8 w-8 rounded-full border-2 shrink-0 transition-all ${
                    isSidebarOpen
                      ? "bg-primary border-primary text-white hover:bg-primary/95"
                      : "border-primary/30 text-primary hover:border-primary hover:bg-primary/5"
                  }`}
                  title={isSidebarOpen ? "Fechar Filtros" : "Abrir Filtros"}
                >
                  <SlidersHorizontal className="h-4 w-4" />
                </Button>

                <div className="flex-1 overflow-x-auto overflow-y-hidden min-w-0">
                  <div className="flex flex-row flex-nowrap items-center gap-2 py-0.5">
                    {filterBadges.length === 0 && (
                      <span className="text-xs text-muted-foreground italic whitespace-nowrap">Nenhum filtro ativo</span>
                    )}
                    {filterBadges.map(badge => (
                      <Badge key={badge.id} variant="secondary" className="bg-white border text-gray-800 gap-1.5 py-1.5 px-3 rounded-xl font-bold text-xs shadow-sm hover:bg-gray-50 h-8 flex items-center shrink-0">
                        <span>{badge.label}</span>
                        <button onClick={badge.onRemove} className="hover:text-destructive transition-colors flex items-center">
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>

                {activeFilterCount > 0 && (
                  <button
                    onClick={clearFilters}
                    className="text-xs font-bold text-muted-foreground hover:text-destructive transition-colors shrink-0 pl-3 border-l border-gray-200 h-8 flex items-center whitespace-nowrap"
                  >
                    Limpar Tudo
                  </button>
                )}
              </div>

              {/* Ordenação */}
              <div className="w-full sm:w-44 shrink-0">
                <Select value={filters.sortBy} onValueChange={(val) => handleFilterChange({ sortBy: val })}>
                  <SelectTrigger className="h-12 rounded-2xl border-2 bg-white px-4 font-bold text-sm">
                    <div className="flex items-center gap-2">
                      <ArrowUpDown className="h-4 w-4 text-muted-foreground shrink-0" />
                      <SelectValue placeholder="Ordenar" />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">Novidades</SelectItem>
                    <SelectItem value="price-asc">Menor Preço</SelectItem>
                    <SelectItem value="price-desc">Maior Preço</SelectItem>
                    <SelectItem value="title-asc">A-Z (Título)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Layout: Sidebar fixa à esquerda em telas LG+ (estilo Magazine Luiza) + Grade de produtos */}
          <div className="flex gap-8 items-start relative">
            {/* Sidebar Fixa Desktop LG+ */}
            <aside className="hidden lg:block w-72 xl:w-80 shrink-0 sticky top-24 self-start">
              <FilterContent
                filters={filters}
                categories={categories.filter(c => c.type === "category")}
                environments={environments}
                relationships={relationships}
                onApply={handleFilterChange}
              />
            </aside>

            {/* Conteúdo do Catálogo */}
            <div className="flex-1 min-w-0">
              <ProductGrid filters={{ ...filters, sortBy: filters.sortBy }} />
            </div>
          </div>
        </div>
      </div>

      <GoogleReviews />

      {/* Overlay escuro — Apenas visível em telas menores que lg quando aberto */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden animate-in fade-in duration-200"
          onClick={() => setIsSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar drawer — Apenas ativo em telas menores que lg (mobile/tablet) */}
      <div
        ref={sidebarRef}
        className={`fixed top-0 left-0 z-50 h-full w-full sm:w-96 shadow-2xl transition-transform duration-300 ease-in-out lg:hidden ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        aria-label="Painel de filtros"
      >
        <div className="relative h-full w-full bg-white flex flex-col">
          {/* Botão de Fechar no topo do Drawer */}
          <button 
            onClick={() => setIsSidebarOpen(false)}
            className="absolute top-5 right-5 z-50 p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
          
          <FilterContent
            filters={filters}
            categories={categories.filter(c => c.type === "category")}
            environments={environments}
            relationships={relationships}
            onApply={handleFilterChange}
            onClose={() => setIsSidebarOpen(false)}
          />
        </div>
      </div>
    </div>
  )
}

export default function Home() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center font-bold text-primary animate-pulse">Carregando...</div>}>
      <HomeContent />
    </Suspense>
  )
}

