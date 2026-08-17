"use client"

import { use } from "react"
import { ProductGrid } from "@/features/products/components/product-grid"
import { ProductFilter } from "@/features/products/components/product-filter"
import { useState, useCallback, useEffect, useRef } from "react"
import { ChevronRight, Home, X } from "lucide-react"
import Link from "next/link"
import { supabase } from "@/lib/supabase/client"
import { FilterContent } from "@/features/products/components/filter-sidebar"

export default function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params)
  const [categories, setCategories] = useState<any[]>([])
  const [relationships, setRelationships] = useState<any[]>([])
  const [loadingData, setLoadingData] = useState(true)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const sidebarRef = useRef<HTMLDivElement>(null)

  // Bloqueia scroll do body quando sidebar aberta em mobile/tablet
  useEffect(() => {
    if (isSidebarOpen) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = ""
    }
    return () => { document.body.style.overflow = "" }
  }, [isSidebarOpen])

  const [filters, setFilters] = useState({ 
    envs: [] as string[], 
    cats: [] as string[], 
    search: "",
    minPrice: 0,
    maxPrice: 10000,
    type: "all",
    sortBy: "newest"
  })

  const handleFilterChange = useCallback((newFilters: any) => {
    setFilters(prev => ({ ...prev, ...newFilters }))
  }, [])

  useEffect(() => {
    async function loadData() {
      const [catRes, relRes] = await Promise.all([
        supabase.from("categories").select("*").order("name"),
        supabase.from("category_relationships").select("*")
      ])
      
      const loadedCats = catRes.data || []
      setCategories(loadedCats)
      setRelationships(relRes.data || [])
      
      // Encontrar a categoria pelo slug com normalização inteligente (plural/singular/sinônimos)
      const SLUG_MAPPINGS: Record<string, string> = {
        "cozinhas": "cozinha",
        "quartos": "quarto",
        "mesas": "mesas-de-jantar",
        "cadeiras": "cadeiras-para-sala-de-jantar",
        "aparadores": "aparadores-buffets"
      }
      
      const targetSlug = SLUG_MAPPINGS[slug] || slug
      let currentCat = loadedCats.find(c => c.slug === targetSlug)
      
      // Fallback sutil para plural/singular
      if (!currentCat && targetSlug.endsWith("s")) {
        currentCat = loadedCats.find(c => c.slug === targetSlug.slice(0, -1))
      }
      if (!currentCat) {
        currentCat = loadedCats.find(c => c.slug === targetSlug + "s")
      }

      if (currentCat) {
        if (currentCat.type === 'environment') {
          setFilters(prev => ({ ...prev, envs: [currentCat.id] }))
        } else {
          setFilters(prev => ({ ...prev, cats: [currentCat.id] }))
        }
      }
      
      setLoadingData(false)
    }
    loadData()
  }, [slug])

  return (
    <div className="container mx-auto px-6 md:px-12 py-8 md:py-12 flex flex-col items-center">
      <nav className="flex items-center justify-center gap-2 text-sm text-muted-foreground mb-8">
        <Link href="/" className="hover:text-primary flex items-center gap-1">
          <Home className="h-4 w-4" /> Início
        </Link>
        <ChevronRight className="h-4 w-4" />
        <Link href="/categorias" className="hover:text-primary">Categorias</Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-foreground font-medium capitalize">{slug.replace("-", " ")}</span>
      </nav>

      <div className="flex flex-col gap-8 w-full items-center">
        <header className="space-y-2 text-center">
          <h1 className="text-3xl md:text-5xl font-bold text-primary capitalize">
            {slug.replace("-", " ")}
          </h1>
          <p className="text-muted-foreground text-lg">
            Confira nossa seleção completa para sua casa.
          </p>
        </header>

        <ProductFilter 
          filters={filters}
          categories={categories}
          relationships={relationships}
          onFilterChange={handleFilterChange} 
          isSidebarOpen={isSidebarOpen}
          onToggleSidebar={() => setIsSidebarOpen(v => !v)}
        />

        <div className="pt-8 w-full">
          {/* Layout: sidebar inline em lg+, drawer em md/sm */}
          <div className="flex gap-8 items-start relative">
            {/* Sidebar Desktop — apenas lg+ */}
            <aside className="hidden lg:block w-80 shrink-0 sticky top-24 self-start">
              <FilterContent
                filters={filters}
                categories={categories.filter(c => c.type === "category")}
                environments={categories.filter(c => c.type === "environment")}
                relationships={relationships}
                onApply={handleFilterChange}
              />
            </aside>

            {/* Conteúdo */}
            <div className="flex-1 min-w-0">
              <ProductGrid filters={filters} />
            </div>
          </div>
        </div>
      </div>

      {/* Overlay — apenas em md/sm */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden animate-in fade-in duration-200"
          onClick={() => setIsSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar drawer — md/sm */}
      <div
        ref={sidebarRef}
        className={`fixed top-0 left-0 z-50 h-full w-full shadow-2xl transition-transform duration-300 ease-in-out lg:hidden ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        aria-label="Painel de filtros"
      >
        <div className="relative h-full w-full bg-white flex flex-col">
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="absolute top-5 right-5 z-50 p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>

          <FilterContent
            filters={filters}
            categories={categories.filter(c => c.type === "category")}
            environments={categories.filter(c => c.type === "environment")}
            relationships={relationships}
            onApply={handleFilterChange}
            onClose={() => setIsSidebarOpen(false)}
          />
        </div>
      </div>
    </div>
  )
}
