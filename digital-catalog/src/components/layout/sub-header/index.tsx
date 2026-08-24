"use client"
import { useState, useEffect } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"

import { Flame } from "lucide-react"
import { useSubHeaderData } from "./use-sub-header-data"

export function SubHeader() {
  const { environments } = useSubHeaderData()
  const searchParams = useSearchParams()
  const activeEnvId = searchParams.get("envs")
  const activeType = searchParams.get("type")
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted || environments.length === 0) return null

  return (
    <div className="hidden lg:block w-full bg-primary border-b border-primary/80 shadow-md">
      <div className="container mx-auto px-4 sm:px-8 md:px-12 lg:px-16 xl:px-24">
        <nav className="flex items-center overflow-x-auto scrollbar-none min-w-0">
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
            const activeEnvsList = activeEnvId ? activeEnvId.split(",") : []
            const isActive = activeEnvsList.includes(env.id) && !isSalvadosActive
            const buttonClass = [
              "flex items-center gap-1.5 px-3 sm:px-4 py-3 sm:py-3.5",
              "text-xs sm:text-sm font-bold uppercase tracking-wide whitespace-nowrap",
              "text-white/90 hover:text-white border-b-2 transition-all",
              isActive
                ? "border-accent text-white bg-white/10"
                : "border-transparent hover:border-white/40 hover:bg-white/5",
            ].join(" ")

            return (
              <Link key={env.id} href={`/?envs=${env.id}#produtos`} className={buttonClass}>
                {env.name}
              </Link>
            )
          })}
        </nav>
      </div>
    </div>
  )
}
