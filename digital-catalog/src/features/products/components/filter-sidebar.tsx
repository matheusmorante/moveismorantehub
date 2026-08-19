"use client"

import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetFooter } from "@/components/ui/sheet"
import { Filter, SlidersHorizontal, X, ChevronDown, ChevronUp } from "lucide-react"
import { Slider } from "@/components/ui/slider"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { useState, useEffect, useMemo } from "react"
import { formatCurrency } from "@/lib/utils"
import { ScrollArea } from "@/components/ui/scroll-area"
import { supabase } from "@/lib/supabase/client"

interface FilterContentProps {
  filters: any
  categories: any[]
  environments: any[]
  relationships: any[]
  onApply: (filters: any) => void
  onClose?: () => void
}

export function FilterContent({ filters, categories, environments, relationships, onApply, onClose }: FilterContentProps) {
  const [localPrice, setLocalPrice] = useState([filters.minPrice, filters.maxPrice])
  const [localType, setLocalType] = useState(filters.type)
  const [localEnvs, setLocalEnvs] = useState<string[]>(filters.envs || [])
  const [localCats, setLocalCats] = useState<string[]>(filters.cats || [])
  const [opportunityOptions, setOpportunityOptions] = useState<{id: string; name: string; color: string}[]>([])
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
        .select("id, name, badge_color")
        .eq("active", true)
        .order("name")
      setOpportunityOptions(
        (data || []).map(o => ({ id: o.id, name: o.name, color: o.badge_color.replace('bg-', '') }))
      )
    }
    fetchOpportunities()
  }, [])

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
    let nextEnvs: string[] = []
    if (id !== "all") {
      nextEnvs = localEnvs.includes(id) ? localEnvs.filter(e => e !== id) : [...localEnvs, id]
    }
    setLocalEnvs(nextEnvs)
    
    // Calcular as categorias correspondentes
    let nextCats: string[] = [...localCats]
    if (id === "all") {
      // Se selecionou "Todos os Ambientes", limpa a seleção de categorias
      nextCats = []
    } else {
      const isSelecting = nextEnvs.includes(id)
      // Buscar IDs das categorias filhas associadas a este ambiente
      const relatedCatIds = relationships
        .filter(r => r.parent_id === id)
        .map(r => r.child_id)
        
      if (isSelecting) {
        // Adiciona categorias relacionadas que ainda não estejam selecionadas
        relatedCatIds.forEach(catId => {
          if (!nextCats.includes(catId)) {
            nextCats.push(catId)
          }
        })
      } else {
        // Remove as categorias relacionadas do ambiente desmarcado
        nextCats = nextCats.filter(catId => !relatedCatIds.includes(catId))
      }
    }
    setLocalCats(nextCats)

    onApply({
      minPrice: localPrice[0],
      maxPrice: localPrice[1],
      type: localType,
      envs: nextEnvs,
      cats: nextCats
    })
  }

  const toggleCat = (id: string) => {
    let nextCats: string[] = []
    if (id !== "all") {
      nextCats = localCats.includes(id) ? localCats.filter(c => c !== id) : [...localCats, id]
    }
    setLocalCats(nextCats)
    onApply({
      minPrice: localPrice[0],
      maxPrice: localPrice[1],
      type: localType,
      envs: localEnvs,
      cats: nextCats
    })
  }

  return (
    <div className="flex flex-col h-full bg-white rounded-3xl border-none overflow-hidden shadow-xs">
      <div className="px-6 py-6 flex items-center justify-between">
        <h3 className="text-xl font-black flex items-center gap-2">
          <Filter className="h-5 w-5 text-primary" />
          Filtros
        </h3>
        <Button variant="ghost" size="sm" onClick={reset} className="hidden lg:inline-flex text-xs font-bold text-muted-foreground hover:text-primary">
          Limpar filtros
        </Button>
      </div>

      {/* ScrollArea apenas em telas mobile/drawer. No desktop lg+, usa o scroll da página geral */}
      <div className="flex-1 overflow-y-auto lg:overflow-visible lg:h-auto h-[calc(100vh-200px)]">
        <div className="p-6 space-y-10 pb-10">
          {/* Faixa de Preço */}
          <div className="space-y-6">
            <Label className="text-sm font-black uppercase tracking-widest text-muted-foreground">Faixa de Preço</Label>
            <div className="flex items-center gap-3">
              <div className="flex-1 space-y-1">
                <span className="text-[10px] font-bold text-muted-foreground uppercase">Mínimo</span>
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">R$</span>
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
              <div className="flex-1 space-y-1">
                <span className="text-[10px] font-bold text-muted-foreground uppercase">Máximo</span>
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">R$</span>
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

          {/* Ambientes e Categorias */}
          <div className="space-y-4">
            <Label className="text-sm font-black uppercase tracking-widest text-muted-foreground">Ambientes e Categorias</Label>
            <div className="pr-3 p-1">
              <div className="space-y-2">
                <div 
                  className={`flex items-center gap-3 p-2 rounded-xl transition-all cursor-pointer ${localEnvs.length === 0 && localCats.length === 0 ? 'bg-primary/5 text-primary' : 'hover:bg-gray-50'}`}
                  onClick={() => toggleEnv('all')}
                >
                  <Checkbox checked={localEnvs.length === 0 && localCats.length === 0} className="pointer-events-none" />
                  <span className={`text-sm font-bold ${localEnvs.length === 0 && localCats.length === 0 ? 'text-primary' : ''}`}>Todos os móveis</span>
                </div>

                {environments.map((env) => {
                  const envCats = categories.filter(cat => 
                    relationships.some(r => r.parent_id === env.id && r.child_id === cat.id)
                  )

                  return (
                    <div key={env.id} className="space-y-1">
                      <div 
                        className={`flex items-center justify-between p-2 rounded-xl transition-all cursor-pointer ${localEnvs.includes(env.id) ? 'bg-primary/5 text-primary font-bold' : 'hover:bg-gray-50'}`}
                        onClick={() => toggleEnv(env.id)}
                      >
                        <div className="flex items-center gap-3">
                          <Checkbox checked={localEnvs.includes(env.id)} className="pointer-events-none" />
                          <span className={`text-sm font-semibold capitalize ${localEnvs.includes(env.id) ? 'text-primary font-bold' : ''}`}>{env.name}</span>
                        </div>
                        {envCats.length > 0 && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              setExpandedEnvs(prev => ({ ...prev, [env.id]: !prev[env.id] }))
                            }}
                            className="p-1 text-gray-400 hover:text-gray-600 transition"
                          >
                            {expandedEnvs[env.id] ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </button>
                        )}
                      </div>

                      {envCats.length > 0 && expandedEnvs[env.id] && (
                        <div className="ml-6 border-l border-gray-100 pl-4 space-y-1 mt-1 mb-2">
                          {envCats.map((cat) => (
                            <div 
                              key={cat.id} 
                              className={`flex items-center gap-3 p-1.5 rounded-lg transition-all cursor-pointer ${localCats.includes(cat.id) ? 'bg-blue-50/50 text-blue-700 font-bold' : 'hover:bg-gray-50'}`}
                              onClick={(e) => {
                                  e.stopPropagation()
                                  toggleCat(cat.id)
                              }}
                            >
                              <Checkbox 
                                checked={localCats.includes(cat.id)} 
                                className="h-4 w-4 border-blue-400 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600 pointer-events-none"
                              />
                              <span className="text-xs font-bold text-blue-600 capitalize">{cat.name}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}

                {/* Categorias sem ambiente */}
                {categories.filter(cat => !relationships.some(r => r.child_id === cat.id)).map((cat) => (
                  <div 
                    key={cat.id} 
                    className={`flex items-center gap-3 p-1.5 rounded-lg transition-all cursor-pointer ${localCats.includes(cat.id) ? 'bg-blue-50/50 text-blue-700 font-bold' : 'hover:bg-gray-50'}`}
                    onClick={() => toggleCat(cat.id)}
                  >
                    <Checkbox 
                      checked={localCats.includes(cat.id)} 
                      className="h-4 w-4 border-blue-400 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600 pointer-events-none"
                    />
                    <span className="text-xs font-bold text-blue-600 capitalize">{cat.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Tipo de Oferta */}
          <div className="space-y-4 pt-4 border-t">
            <Label className="text-sm font-black uppercase tracking-widest text-muted-foreground">Oportunidades</Label>
            <div className="grid grid-cols-1 gap-2">
              <div 
                className={`flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-all ${localType === 'all' ? 'border-primary bg-primary/5' : 'border-gray-100 hover:border-gray-200'}`}
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
                <span className={`text-sm font-bold ${localType === 'all' ? 'text-primary' : ''}`}>Ver Tudo</span>
                <Checkbox checked={localType === 'all'} />
              </div>

              {opportunityOptions.map((opp) => (
                <div 
                  key={opp.id}
                  className={`flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-all ${localType === opp.id ? 'border-primary bg-primary/5' : 'border-gray-100 hover:border-gray-200'}`}
                  onClick={() => {
                    setLocalType(opp.id)
                    onApply({
                      minPrice: localPrice[0],
                      maxPrice: localPrice[1],
                      type: opp.id,
                      envs: localEnvs,
                      cats: localCats
                    })
                  }}
                >
                  <span className={`text-sm font-bold ${localType === opp.id ? 'text-primary' : ''}`}>{opp.name}</span>
                  <Checkbox checked={localType === opp.id} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      {/* Rodapé fixado embaixo - Apenas em telas menores que lg (mobile/tablet) */}
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
          <SheetContent side="left" className="w-full sm:max-w-md p-0 border-none bg-transparent">
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
