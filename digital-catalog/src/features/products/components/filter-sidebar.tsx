"use client"

import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetFooter } from "@/components/ui/sheet"
import { Filter, SlidersHorizontal, X, ChevronDown, ChevronUp } from "lucide-react"
import { Slider } from "@/components/ui/slider"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { useState, useEffect, useMemo } from "react"
import { formatCurrency, cn } from "@/lib/utils"
import { ScrollArea } from "@/components/ui/scroll-area"
import { supabase } from "@/lib/supabase/client"
import { slugifyText } from "@/lib/slug-utils"

interface FilterContentProps {
  filters: any
  categories: any[]
  environments: any[]
  relationships: any[]
  onApply: (filters: any) => void
  onClose?: () => void
}

function RadioIndicator({ checked, variant = "primary" }: { checked: boolean; variant?: "primary" | "blue" }) {
  if (variant === "blue") {
    return (
      <div className={cn(
        "h-4 w-4 rounded-full border-2 transition-all flex items-center justify-center shrink-0 pointer-events-none",
        checked ? "border-blue-600 bg-blue-600" : "border-blue-300 bg-white"
      )}>
        {checked && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
      </div>
    )
  }

  return (
    <div className={cn(
      "h-4.5 w-4.5 rounded-full border-2 transition-all flex items-center justify-center shrink-0 pointer-events-none",
      checked ? "border-primary bg-primary" : "border-gray-300 bg-white"
    )}>
      {checked && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
    </div>
  )
}

export function FilterContent({ filters, categories, environments, relationships, onApply, onClose }: FilterContentProps) {
  const [localPrice, setLocalPrice] = useState([filters.minPrice, filters.maxPrice])
  const [localType, setLocalType] = useState(filters.type)
  const [localEnvs, setLocalEnvs] = useState<string[]>(filters.envs || [])
  const [localCats, setLocalCats] = useState<string[]>(filters.cats || [])
  const [opportunityOptions, setOpportunityOptions] = useState<{id: string; name: string; slug?: string; color: string}[]>([])
  const [expandedEnvs, setExpandedEnvs] = useState<Record<string, boolean>>({})

  useEffect(() => {
    setLocalPrice([filters.minPrice, filters.maxPrice])
    setLocalType(filters.type)
    setLocalEnvs(filters.envs || [])
    setLocalCats(filters.cats || [])
  }, [filters])

  useEffect(() => {
    async function fetchOpportunities() {
      const { data } = await supabase
        .from("opportunities")
        .select("id, name, slug, badge_color")
        .eq("active", true)
        .order("name")
      setOpportunityOptions(
        (data || []).map(o => ({ id: o.id, name: o.name, slug: o.slug, color: (o.badge_color || '').replace('bg-', '') }))
      )
    }
    fetchOpportunities()
  }, [])

  const isOppSelected = (opp: { id: string; name: string; slug?: string }) => {
    if (!localType || localType === "all") return false
    const cleanType = String(localType).toLowerCase().trim()
    return (
      opp.id.toLowerCase() === cleanType ||
      (opp.slug && opp.slug.toLowerCase().trim() === cleanType) ||
      slugifyText(opp.name) === cleanType
    )
  }

  const reset = () => {
    const defaultFilters = { 
      minPrice: 0, 
      maxPrice: 10000, 
      type: "all", 
      envs: [], 
      cats: [] 
    }
    setLocalPrice([0, 10000])
    setLocalType("all")
    setLocalEnvs([])
    setLocalCats([])
    onApply(defaultFilters)
  }

  const toggleEnv = (id: string) => {
    if (id === "all") {
      setLocalEnvs([])
      setLocalCats([])
      onApply({
        minPrice: localPrice[0],
        maxPrice: localPrice[1],
        type: localType,
        envs: [],
        cats: []
      })
      return
    }

    const isCurrentlySelected = localEnvs.includes(id)
    const nextEnvs = isCurrentlySelected ? [] : [id]

    setLocalEnvs(nextEnvs)
    setLocalCats([])
    if (!isCurrentlySelected) {
      setExpandedEnvs(prev => ({ ...prev, [id]: true }))
    }

    onApply({
      minPrice: localPrice[0],
      maxPrice: localPrice[1],
      type: localType,
      envs: nextEnvs,
      cats: []
    })
  }

  const toggleCat = (id: string) => {
    if (id === "all") {
      setLocalEnvs([])
      setLocalCats([])
      onApply({
        minPrice: localPrice[0],
        maxPrice: localPrice[1],
        type: localType,
        envs: [],
        cats: []
      })
      return
    }

    const isCurrentlySelected = localCats.includes(id)
    const nextCats = isCurrentlySelected ? [] : [id]

    // Ao selecionar uma categoria específica, desmarca o ambiente pai para que apenas a categoria fique ativa no radio
    setLocalEnvs([])
    setLocalCats(nextCats)

    onApply({
      minPrice: localPrice[0],
      maxPrice: localPrice[1],
      type: localType,
      envs: [],
      cats: nextCats
    })
  }

  return (
    <div className="bg-white rounded-3xl sm:rounded-3xl border border-gray-100 shadow-sm flex flex-col h-full max-h-[100dvh] overflow-hidden">
      {/* Título e Botão Reset Fixo no Topo */}
      <div className="flex items-center justify-between border-b border-gray-100 p-6 pb-4 shrink-0 bg-white z-10">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-5 w-5 text-primary" />
          <h3 className="font-black text-lg text-primary">Filtros</h3>
        </div>
        <div className="flex items-center gap-2">
          {(localEnvs.length > 0 || localCats.length > 0 || (localType && localType !== 'all') || localPrice[0] > 0 || localPrice[1] < 10000) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={reset}
              className="text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/5 font-bold h-8 px-2 rounded-lg"
            >
              Limpar
            </Button>
          )}
          {onClose && (
            <Button variant="ghost" size="icon" onClick={onClose} className="lg:hidden h-8 w-8 rounded-full">
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Conteúdo Rolável */}
      <div className="flex-1 overflow-y-auto p-6 pt-2 space-y-6 overscroll-contain">
          {/* Faixa de Preço */}
          <div className="space-y-4">
            <Label className="text-sm font-black uppercase tracking-widest text-muted-foreground">Faixa de Preço</Label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="text-[10px] font-bold text-muted-foreground uppercase">Mínimo</span>
                <div className="relative mt-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">R$</span>
                  <Input 
                    type="number"
                    min={0}
                    max={10000}
                    value={localPrice[0]}
                    onChange={(e) => {
                      const val = Math.min(10000, Math.max(0, parseInt(e.target.value) || 0))
                      const next = [val, Math.max(val, localPrice[1])]
                      setLocalPrice(next)
                      onApply({
                        minPrice: next[0],
                        maxPrice: next[1],
                        type: localType,
                        envs: localEnvs,
                        cats: localCats
                      })
                    }}
                    className="pl-8 h-9 text-xs font-bold"
                  />
                </div>
              </div>
              <div>
                <span className="text-[10px] font-bold text-muted-foreground uppercase">Máximo</span>
                <div className="relative mt-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">R$</span>
                  <Input 
                    type="number"
                    min={0}
                    max={10000}
                    value={localPrice[1]}
                    onChange={(e) => {
                      const val = Math.min(10000, Math.max(0, parseInt(e.target.value) || 0))
                      const next = [Math.min(val, localPrice[0]), val]
                      setLocalPrice(next)
                      onApply({
                        minPrice: next[0],
                        maxPrice: next[1],
                        type: localType,
                        envs: localEnvs,
                        cats: localCats
                      })
                    }}
                    className="pl-8 h-9 text-xs font-bold"
                  />
                </div>
              </div>
            </div>
            <Slider
              min={0}
              max={10000}
              step={100}
              value={localPrice}
              onValueChange={setLocalPrice}
              onValueCommit={(val) => {
                onApply({
                  minPrice: val[0],
                  maxPrice: val[1],
                  type: localType,
                  envs: localEnvs,
                  cats: localCats
                })
              }}
              className="py-4"
            />
          </div>

          {/* Tipo de Oferta / Oportunidades */}
          <div className="space-y-4 pt-4 border-t border-gray-100">
            <Label className="text-sm font-black uppercase tracking-widest text-muted-foreground">Oportunidades</Label>
            <div className="grid grid-cols-1 gap-2">
              <div 
                className={`flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-all ${(!localType || localType === 'all') ? 'border-primary bg-primary/5' : 'border-gray-100 hover:border-gray-200'}`}
                onClick={() => {
                  setLocalType('all')
                  onApply({
                    minPrice: localPrice[0],
                    maxPrice: localPrice[1],
                    type: 'all',
                    envs: localEnvs,
                    cats: localCats
                  })
                }}
              >
                <span className={`text-sm font-bold ${(!localType || localType === 'all') ? 'text-primary' : ''}`}>Ver Tudo</span>
                <RadioIndicator checked={!localType || localType === 'all'} />
              </div>

              {opportunityOptions.map((opp) => {
                const selected = isOppSelected(opp)
                return (
                  <div 
                    key={opp.id}
                    className={`flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-all ${selected ? 'border-primary bg-primary/5' : 'border-gray-100 hover:border-gray-200'}`}
                    onClick={() => {
                      const nextType = selected ? 'all' : opp.id
                      setLocalType(nextType)
                      onApply({
                        minPrice: localPrice[0],
                        maxPrice: localPrice[1],
                        type: nextType,
                        envs: localEnvs,
                        cats: localCats
                      })
                    }}
                  >
                    <span className={`text-sm font-bold ${selected ? 'text-primary' : ''}`}>{opp.name}</span>
                    <RadioIndicator checked={selected} />
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        <div className="lg:hidden border-t border-gray-100 p-4 bg-white flex items-center justify-between gap-4 shrink-0">
          <Button 
            variant="outline" 
            onClick={reset} 
            className="flex-1 h-12 rounded-xl text-sm font-bold text-gray-700 border-gray-200 hover:bg-gray-50"
          >
            Limpar filtros
          </Button>
          <Button 
            onClick={onClose} 
            className="flex-1 h-12 rounded-xl text-sm font-bold bg-primary hover:bg-primary/90 text-white"
          >
            Ver resultados
          </Button>
        </div>
      </div>
  )
}

interface FilterSidebarProps {
  filters: any
  categories: any[]
  environments: any[]
  relationships: any[]
  onApply: (filters: any) => void
}

export function FilterSidebar({ filters, categories, environments, relationships, onApply }: FilterSidebarProps) {
  const [open, setOpen] = useState(false)
  return (
    <div>
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" className="gap-2 h-14 px-6 rounded-full border-2 hover:bg-gray-50 shrink-0 shadow-sm">
              <SlidersHorizontal className="h-5 w-5" />
              <span>Filtros</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-full sm:max-w-md p-0 border-none bg-transparent h-full max-h-[100dvh] flex flex-col">
            <FilterContent 
              filters={filters} 
              categories={categories} 
              environments={environments} 
              relationships={relationships}
              onApply={onApply} 
              onClose={() => setOpen(false)}
            />
          </SheetContent>
        </Sheet>
      </div>
  )
}
