"use client"

import { Layers } from "lucide-react"

interface ProductSpecificationsProps {
  displayWidth: any
  displayDepth: any
  displayHeight: any
  product: any
  technicalSpecs: any[]
}

export function ProductSpecifications({
  displayWidth,
  displayDepth,
  displayHeight,
  product,
  technicalSpecs
}: ProductSpecificationsProps) {
  if (technicalSpecs.length === 0 && !displayWidth && !displayDepth && !displayHeight) {
    return null
  }

  return (
    <div className="lg:col-span-5 space-y-6">
      {/* TABELA DE DIMENSÕES COM ÍCONES */}
      {(displayWidth || displayDepth || displayHeight) && (
        <div className="space-y-3 bg-white p-4 rounded-xl border border-gray-100">
          <div className="flex items-center gap-2 text-gray-800 font-bold text-xs uppercase tracking-wider border-b pb-2">
            <svg className="h-3.5 w-3.5 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 3h18M3 21h18M3 3v18M21 3v18" />
            </svg>
            <h3>Dimensões do Produto</h3>
          </div>
          <div className="grid grid-cols-3 divide-x divide-gray-100">
            {displayWidth && (
              <div className="flex flex-col items-center gap-2 px-3 py-2">
                <svg viewBox="0 0 40 24" className="w-10 h-6 text-primary" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <line x1="2" y1="12" x2="38" y2="12" />
                  <polyline points="8,6 2,12 8,18" />
                  <polyline points="32,6 38,12 32,18" />
                </svg>
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Largura</span>
                <span className="text-sm font-black text-primary">{displayWidth} <span className="text-xs font-semibold text-gray-500">cm</span></span>
              </div>
            )}
            {displayDepth && (
              <div className="flex flex-col items-center gap-2 px-3 py-2">
                <svg viewBox="0 0 40 24" className="w-10 h-6 text-primary" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <line x1="4" y1="20" x2="36" y2="4" />
                  <polyline points="4,13 4,20 11,20" />
                  <polyline points="29,4 36,4 36,11" />
                </svg>
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  {product?.depth_use_length ? "Compr." : "Profund."}
                </span>
                <span className="text-sm font-black text-primary">{displayDepth} <span className="text-xs font-semibold text-gray-500">cm</span></span>
              </div>
            )}
            {displayHeight && (
              <div className="flex flex-col items-center gap-2 px-3 py-2">
                <svg viewBox="0 0 24 40" className="w-6 h-10 text-primary" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <line x1="12" y1="2" x2="12" y2="38" />
                  <polyline points="6,8 12,2 18,8" />
                  <polyline points="6,32 12,38 18,32" />
                </svg>
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Altura</span>
                <span className="text-sm font-black text-primary">{displayHeight} <span className="text-xs font-semibold text-gray-500">cm</span></span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* CARACTERÍSTICAS */}
      {technicalSpecs.length > 0 && (
        <div className="space-y-3 bg-white p-4 rounded-xl border border-gray-100">
          <div className="flex items-center gap-2 text-gray-800 font-bold text-xs uppercase tracking-wider">
            <Layers className="h-3.5 w-3.5 text-primary" />
            <h3>Características</h3>
          </div>
          <dl className="space-y-1.5 border-t pt-2 text-[11px] leading-relaxed">
            {technicalSpecs.map(([label, value]) => (
              <div key={label} className="flex justify-between gap-3">
                <dt className="text-muted-foreground">{label}</dt>
                <dd className="text-right font-medium text-gray-700">{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}
    </div>
  )
}
