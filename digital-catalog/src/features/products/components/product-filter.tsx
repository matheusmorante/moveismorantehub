"use client"

import { useMemo, useState, useEffect, useRef } from "react"
import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { X, Search, Pencil, Package, ArrowUpDown, Filter, Compass, Tag, ChevronRight, Loader2, SlidersHorizontal } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { useAdminMode } from "@/hooks/use-admin-mode"
import { FilterContent } from "./filter-sidebar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { supabase } from "@/lib/supabase/client"
import { formatCurrency } from "@/lib/utils"

const DEFAULT_ENV_IMAGES: Record<string, string> = {
  "todos": "/images/environments/todos.png",
  "cozinha": "/images/environments/cozinha.png",
  "sala-de-estar": "/images/environments/sala-de-estar.png",
  "sala-de-jantar": "/images/environments/sala-de-jantar.png",
  "escritorio": "/images/environments/escritorio.png",
  "lavanderia": "/images/environments/lavanderia.png",
  "quarto": "/images/environments/quarto.png",
}

interface ProductFilterProps {
  filters: any
  categories: any[]
  relationships: any[]
  onFilterChange: (newFilters: any) => void
  isSidebarOpen?: boolean
  onToggleSidebar?: () => void
}

export function ProductFilter({ filters, categories, relationships, onFilterChange, isSidebarOpen, onToggleSidebar }: ProductFilterProps) {
  const { isAdminMode } = useAdminMode()
  const activeEnvs = filters.envs
  const activeCats = filters.cats
  const searchTerm = filters.search

  const [suggestions, setSuggestions] = useState<{
    environments: any[]
    categories: any[]
    products: any[]
  }>({ environments: [], categories: [], products: [] })
  const [loadingSuggestions, setLoadingSuggestions] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const searchContainerRef = useRef<HTMLDivElement>(null)

  // Efeito para fechar sugestões ao clicar fora do componente de busca
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  // Efeito de busca de sugestões com Debounce
  useEffect(() => {
    const trimmed = searchTerm.trim()
    if (trimmed.length < 2) {
      setSuggestions({ environments: [], categories: [], products: [] })
      setShowSuggestions(false)
      return
    }

    const delayDebounceFn = setTimeout(async () => {
      setLoadingSuggestions(true)
      setShowSuggestions(true)

      try {
        const normalizeText = (str: string) => str
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .toLowerCase()
          .replace(/[-_/]/g, " ")
          .replace(/\s+/g, " ")
          .trim();

        const cleanTerm = normalizeText(trimmed);
        const searchTokens = cleanTerm.split(" ").filter(t => t.length >= 2);

        const getSynonyms = (token: string): string[] => {
          if (/^(roupa|roupas|guarda|roupeiro|roupeiros)$/.test(token)) {
            return ["roupa", "roupas", "guarda", "roupeiro", "roupeiros"]
          }
          if (/^(sofa|sofas|estofado|estofados)$/.test(token)) {
            return ["sofa", "sofas", "estofado", "estofados"]
          }
          if (/^(colchao|colchoes|espuma|molas)$/.test(token)) {
            return ["colchao", "colchoes"]
          }
          if (/^(cama|camas|box|sommier)$/.test(token)) {
            return ["cama", "camas", "box"]
          }
          if (/^(mesa|mesas)$/.test(token)) {
            return ["mesa", "mesas"]
          }
          if (/^(painel|paineis|rack|racks)$/.test(token)) {
            return ["painel", "paineis", "rack", "racks"]
          }
          return [token]
        };

        // 1. Filtrar ambientes localmente
        const matchedEnvs = categories.filter(c => {
          if (c.type !== "environment") return false;
          const cleanName = normalizeText(c.name);
          return searchTokens.every(token => {
            const synonyms = getSynonyms(token);
            return synonyms.some(syn => cleanName.includes(syn));
          });
        });

        // 2. Filtrar categorias localmente
        const matchedCats = categories.filter(c => {
          if (c.type !== "category") return false;
          const cleanName = normalizeText(c.name);
          return searchTokens.every(token => {
            const synonyms = getSynonyms(token);
            return synonyms.some(syn => cleanName.includes(syn));
          });
        });

        // 3. Buscar produtos no Supabase
        const mainToken = searchTokens[0] || cleanTerm;
        const { data, error } = await supabase
          .from("products")
          .select(`
            id,
            name,
            slug,
            price,
            promo_price,
            product_images(image_url, is_main)
          `)
          .eq("status", "published")
          .or(`name.ilike.%${mainToken}%,description.ilike.%${mainToken}%`)
          .limit(10);

        if (error) throw error;

        const filtered = (data || []).filter((p: any) => {
          const cleanProdName = normalizeText(p.name);
          return searchTokens.every(token => {
            const synonyms = getSynonyms(token);
            return synonyms.some(syn => cleanProdName.includes(syn));
          });
        }).slice(0, 5);

        const formattedProducts = (data || []).map(p => {
          const mainImg = p.product_images?.find((img: any) => img.is_main)?.image_url || 
                          p.product_images?.[0]?.image_url || 
                          "https://images.unsplash.com/photo-1594462250122-b2d99d3d0f3c?q=80&w=800"
          return {
            id: p.id,
            name: p.name,
            slug: p.slug,
            price: p.price,
            promo_price: p.promo_price,
            image: mainImg
          }
        })

        setSuggestions({
          environments: matchedEnvs,
          categories: matchedCats,
          products: formattedProducts
        })
      } catch (err) {
        console.error("Erro ao buscar sugestões:", err)
      } finally {
        setLoadingSuggestions(false)
      }
    }, 300) // Debounce de 300ms

    return () => clearTimeout(delayDebounceFn)
  }, [searchTerm, categories])

  // Filtrar ambientes (Pai)
  const environments = useMemo(() => {
    const envs = categories.filter(c => c.type === "environment")
    return [
      { id: "all", name: "Todos", slug: "todos", image: DEFAULT_ENV_IMAGES["todos"] },
      ...envs.map(e => ({
        ...e,
        image: DEFAULT_ENV_IMAGES[e.slug] || "/images/environments/todos.png"
      }))
    ]
  }, [categories])

  const handleEnvChange = (value: string) => {
    if (value === "all") {
      onFilterChange({ envs: [], cats: [] })
    } else {
      onFilterChange({ envs: [value], cats: [] })
    }
  }

  const clearFilters = () => {
    onFilterChange({ 
      envs: [], 
      cats: [], 
      search: "",
      minPrice: 0,
      maxPrice: 10000,
      type: "all"
    })
  }

  return (
    <div className="w-full space-y-8">
      {/* BARRA SUPERIOR: BUSCA, ORDENAÇÃO E FILTRO MOBILE */}
      <div className="flex flex-col lg:flex-row gap-4 items-center">
        {/* Botão Filtros (Apenas visível em telas menores que desktop) */}
        <div className="w-full sm:w-auto lg:hidden">
          <Button
            variant={isSidebarOpen ? "default" : "outline"}
            className="gap-2 h-14 px-6 rounded-full border-2 hover:bg-gray-50 shrink-0 shadow-sm w-full"
            onClick={onToggleSidebar}
          >
            <SlidersHorizontal className="h-5 w-5" />
            <span>Filtros</span>
            {isSidebarOpen && <X className="h-4 w-4 ml-1" />}
          </Button>
        </div>



      </div>
    </div>
  )
}
