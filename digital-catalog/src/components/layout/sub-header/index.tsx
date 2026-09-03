"use client"
import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"

import { Flame, ChevronDown } from "lucide-react"
import { useSubHeaderData } from "./use-sub-header-data"
import { slugifyCategory } from "@/lib/slug-utils"

export function SubHeader() {
  const { environments, getCategoriesForEnv } = useSubHeaderData()
  const searchParams = useSearchParams()
  const activeEnvId = searchParams.get("envs")
  const activeCatId = searchParams.get("cats")
  const activeType = searchParams.get("type")
  const [mounted, setMounted] = useState(false)
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted || environments.length === 0) return null

  const handleMouseEnter = (envId: string) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    setActiveDropdown(envId)
  }

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setActiveDropdown(null)
    }, 150)
  }

  return (
    <div className="hidden lg:block w-full bg-primary border-b border-primary/80 shadow-md relative z-40">
      <div className="container mx-auto px-4 sm:px-8 md:px-12 lg:px-16 xl:px-24">
        <nav className="flex items-center overflow-visible min-w-0">
          {/* Oportunidade de Salvados */}
          {(() => {
            const SALVADOS_OPP_ID = "9d8bedae-b366-4f8c-ac49-74b85b882bde"
            const isSalvadosActive = activeType === "salvados" || activeType === SALVADOS_OPP_ID
            const salvadosClass = [
              "flex items-center gap-1.5 px-3 sm:px-4 py-3 sm:py-3.5",
              "text-xs sm:text-sm font-black uppercase tracking-wide whitespace-nowrap transition-all border-b-2",
              isSalvadosActive
                ? "border-orange-500 text-orange-400 bg-white/10"
                : "border-transparent text-orange-400 hover:text-orange-300 hover:border-orange-400/45 hover:bg-white/5",
            ].join(" ")

            return (
              <Link href="/?type=salvados#produtos" className={salvadosClass}>
                <Flame className="h-3.5 w-3.5 fill-current" />
                QUEIMA DOS SALVADOS
              </Link>
            )
          })()}

          {environments.map((env) => {
            const SALVADOS_OPP_ID = "9d8bedae-b366-4f8c-ac49-74b85b882bde"
            const isSalvadosActive = activeType === "salvados" || activeType === SALVADOS_OPP_ID
            const envSlug = env.slug || slugifyCategory(env) || env.id
            const activeEnvsList = activeEnvId ? activeEnvId.split(",") : []
            const isActive = (activeEnvsList.includes(env.id) || activeEnvsList.includes(envSlug)) && !isSalvadosActive
            const envCats = getCategoriesForEnv(env.id)
            const isOpen = activeDropdown === env.id

            const buttonClass = [
              "flex items-center gap-1.5 px-3 sm:px-4 py-3 sm:py-3.5",
              "text-xs sm:text-sm font-bold uppercase tracking-wide whitespace-nowrap cursor-pointer",
              "text-white/90 hover:text-white border-b-2 transition-all group",
              isActive || isOpen
                ? "border-accent text-white bg-white/10"
                : "border-transparent hover:border-white/40 hover:bg-white/5",
            ].join(" ")

            return (
              <div 
                key={env.id} 
                className="relative h-full flex items-center"
                onMouseEnter={() => handleMouseEnter(env.id)}
                onMouseLeave={handleMouseLeave}
              >
                <Link href={`/?envs=${envSlug}#produtos`} className={buttonClass}>
                  <span>{env.name}</span>
                  {envCats.length > 0 && (
                    <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 opacity-70 group-hover:opacity-100 ${isOpen ? 'rotate-180' : ''}`} />
                  )}
                </Link>

                {/* Dropdown Modal com Categorias do Ambiente */}
                {isOpen && (
                  <div 
                    className="absolute top-full left-0 mt-0.5 min-w-[220px] max-w-xs bg-white text-slate-800 rounded-2xl shadow-2xl border border-slate-100 p-2 flex flex-col gap-1 animate-in fade-in-0 zoom-in-95 duration-150 z-50"
                  >
                    {/* Opção Todos os Móveis do Ambiente */}
                    <Link
                      href={`/?envs=${envSlug}#produtos`}
                      onClick={() => setActiveDropdown(null)}
                      className={`p-2.5 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-between transition-all ${isActive && !activeCatId ? 'bg-primary text-white' : 'text-primary hover:bg-primary/5'}`}
                    >
                      <span>Todos os móveis de {env.name.toLowerCase()}</span>
                      <span className="text-[10px] font-bold opacity-60">Ver todos</span>
                    </Link>

                    {envCats.length > 0 && <div className="h-px bg-slate-100 my-1" />}

                    {/* Categorias específicas do ambiente */}
                    {envCats.map((cat) => {
                      const catSlug = cat.slug || slugifyCategory(cat) || cat.id
                      const isCatActive = activeCatId === cat.id || activeCatId === catSlug

                      return (
                        <Link
                          key={cat.id}
                          href={`/?cats=${catSlug}#produtos`}
                          onClick={() => setActiveDropdown(null)}
                          className={`p-2.5 rounded-xl text-xs font-bold capitalize flex items-center justify-between transition-all ${isCatActive ? 'bg-primary/10 text-primary font-black' : 'text-slate-600 hover:text-primary hover:bg-slate-50'}`}
                        >
                          <span>{cat.name}</span>
                        </Link>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </nav>
      </div>
    </div>
  )
}
