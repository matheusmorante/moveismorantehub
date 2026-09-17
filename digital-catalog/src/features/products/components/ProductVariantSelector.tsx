"use client"

import { useRouter } from "next/navigation"
import Image from "next/image"
import { Layers } from "lucide-react"
import { cn } from "@/lib/utils"

interface ProductVariantSelectorProps {
  product: any
  activeVariation: any
  activeVarId: string | null
}

export function ProductVariantSelector({
  product,
  activeVariation,
  activeVarId
}: ProductVariantSelectorProps) {
  const router = useRouter()

  if (!product?.variations || product.variations.length === 0) {
    return null
  }

  return (
    <div className="pt-3 space-y-2 border-t border-gray-200/60">
      <div className="flex flex-col gap-0.5">
        <label className="text-xs font-bold text-gray-600 uppercase tracking-wide flex items-center gap-1.5">
          <Layers className="h-3.5 w-3.5 text-primary" />
          Opções Disponíveis
        </label>
        <span className="text-sm font-extrabold text-primary min-h-[20px] capitalize">
          {(() => {
            if (!activeVariation) return "Padrão"
            const attrs = activeVariation.attributes || {}
            const vals = Array.isArray(attrs) ? attrs : Object.values(attrs)
            const label = vals.map(a => typeof a === 'object' && a !== null ? (a as any).value || (a as any).name || (a as any).label || JSON.stringify(a) : String(a))
              .filter(s => s && s !== "[object Object]")
              .join(" / ")
            return label || (activeVariation.name !== "[object Object]" ? activeVariation.name : "Padrão")
          })()}
        </span>
      </div>
      <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
        {product.variations
          .filter((v: any) => v.status !== "hidden")
          .map((v: any) => {
            const attrs = v.attributes || {}
            const vals = Array.isArray(attrs) ? attrs : Object.values(attrs)
            let comboLabel = vals.map(a => typeof a === 'object' && a !== null ? (a as any).value || (a as any).name || (a as any).label || JSON.stringify(a) : String(a))
              .filter(s => s && s !== "[object Object]")
              .join(" / ")
            
            if (!comboLabel || comboLabel === "[object Object]") {
              comboLabel = (v.name && v.name !== "[object Object]") ? v.name : "Variação"
            }
            
            const varImg = v.image_url ? v.image_url.split(",")[0] : (product.images?.[0] || "")
            const isSelected = activeVarId === v.id

            return (
              <button
                key={v.id}
                type="button"
                onClick={() => {
                  router.push(`/produto/${product.slug}?var=${v.id}`, { scroll: false })
                }}
                className={cn(
                  "relative aspect-square rounded-xl overflow-hidden border-2 bg-gray-50 transition-all flex flex-col group/var shadow-sm hover:scale-[1.02] active:scale-95",
                  isSelected 
                    ? "border-primary ring-2 ring-primary/10 opacity-100 scale-[1.02]" 
                    : "border-gray-200 opacity-40 brightness-[0.75] hover:opacity-90 hover:brightness-100"
                )}
                title={comboLabel}
              >
                {varImg ? (
                  <Image 
                    src={varImg} 
                    alt={comboLabel} 
                    fill 
                    className="object-cover" 
                  />
                ) : (
                  <span className="m-auto text-[10px] font-bold text-gray-500 text-center px-1 break-words capitalize">
                    {comboLabel}
                  </span>
                )}
              </button>
            )
          })}
      </div>
    </div>
  )
}
