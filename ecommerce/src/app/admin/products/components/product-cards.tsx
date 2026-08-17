"use client"

import React from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Plus, Pencil, Trash2, Loader2, Package, Copy, RotateCcw, Image as ImageIcon, Megaphone } from "lucide-react"
import { formatCurrency } from "@/lib/utils"
import Image from "next/image"
import { WhatsAppIcon } from "@/components/icons/whatsapp-icon"
import { getProductShareText } from "@/services/whatsapp"

interface ProductCardsProps {
  products: any[]
  loading: boolean
  viewMode: 'active' | 'trash'
  duplicatingId: string | null
  onDuplicate: (id: string) => void
  onEdit: (productId: string, variationId?: string) => void
  onSoftDelete: (id: string) => void
  onRestore: (id: string) => void
  onHardDelete: (id: string) => void
  onToggleStatus: (product: any) => void
  onToggleVariationStatus: (productId: string, variationId: string, status: string) => void
}

export function ProductCards({
  products,
  loading,
  viewMode,
  duplicatingId,
  onDuplicate,
  onEdit,
  onSoftDelete,
  onRestore,
  onHardDelete,
  onToggleStatus,
  onToggleVariationStatus,
}: ProductCardsProps) {
  if (loading) {
    return (
      <div className="bg-white rounded-xl border p-10 text-center shadow-sm">
        <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
        <p className="text-sm text-muted-foreground mt-3">Carregando produtos...</p>
      </div>
    )
  }

  if (products.length === 0) {
    return (
      <div className="bg-white rounded-xl border p-10 text-center shadow-sm">
        <Package className="h-10 w-10 mx-auto text-gray-300 mb-3" />
        <p className="text-sm text-muted-foreground italic">
          Nenhum produto cadastrado nesta visualização.
        </p>
      </div>
    )
  }

  return (
    <>
      {products.map((product) => {
        const mainImg = product.product_images?.find((img: any) => img.is_main)?.image_url
        const hasVariations = product.product_variations && product.product_variations.length > 0

        return (
          <div key={product.id} className="rounded-2xl border shadow-sm overflow-hidden transition-all bg-white">
            <div className="flex gap-3 p-3">
              <button
                onClick={() => onEdit(product.id)}
                className="relative h-20 w-20 rounded-xl overflow-hidden border bg-gray-100 shrink-0 active:scale-95 transition-transform"
              >
                {!hasVariations && mainImg
                  ? <img src={mainImg} alt={product.name} className="object-cover w-full h-full" />
                  : <Package className="h-6 w-6 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-gray-400" />
                }
              </button>

              <div className="flex-1 min-w-0 flex flex-col justify-between">
                <div>
                  <button
                    onClick={() => onEdit(product.id)}
                    className="text-left w-full space-y-1"
                  >
                    <p className={`font-bold text-sm leading-tight line-clamp-2 ${hasVariations ? "text-gray-500 italic" : "text-gray-800"}`}>{product.name}</p>
                    
                    {/* Exibição das categorias nos cards */}
                    {product.product_categories && product.product_categories.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {product.product_categories.map((pc: any, idx: number) => {
                          const catName = pc.categories?.name
                          if (!catName) return null
                          return (
                            <span key={idx} className="text-[8px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider border">
                              {catName}
                            </span>
                          )
                        })}
                      </div>
                    )}
                  </button>

                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {viewMode === 'trash' && product.deleted_at && (
                      <span className="text-[10px] text-red-600 font-black uppercase tracking-wider">
                        Exclusão em: {(() => {
                          const delDate = new Date(product.deleted_at)
                          const expDate = new Date(delDate.getTime() + 30 * 24 * 60 * 60 * 1000)
                          const diffTime = expDate.getTime() - Date.now()
                          const diffDays = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)))
                          return `${diffDays} ${diffDays === 1 ? 'dia' : 'dias'}`
                        })()}
                      </span>
                    )}
                    {viewMode === 'active' && hasVariations && (
                      <Badge variant="outline" className="bg-slate-100 text-slate-600 border-slate-200 text-[10px] py-0 font-bold uppercase">
                        PAI - {product.product_variations.length} {product.product_variations.length === 1 ? "VARIAÇÃO" : "VARIAÇÕES"}
                      </Badge>
                    )}
                    {viewMode === 'active' && !hasVariations && (
                      <Button
                        type="button"
                        onClick={() => onToggleStatus(product)}
                        className={`text-[10px] font-bold h-6 px-2.5 rounded-full transition-all active:scale-95 shadow-sm border ${
                          product.status === 'published'
                            ? 'bg-green-100 text-green-700 hover:bg-green-200 border-green-200'
                            : product.status === 'hidden'
                              ? 'bg-orange-50 text-orange-700 hover:bg-orange-100 border-orange-200'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border-gray-200'
                        }`}
                      >
                        {product.status === 'published' ? 'Publicado' : product.status === 'hidden' ? 'Ocultado' : 'Rascunho'}
                      </Button>
                    )}
                    {viewMode === 'active' && (product.opportunities || product.is_salvado) && (
                      <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full text-white ${
                        product.opportunities?.badge_color || 'bg-red-600'
                      }`}>
                        {product.opportunities?.name || "SALVADO"}
                      </span>
                    )}

                    {/* Alerta de erro de imagem principal (ausente) */}
                    {(() => {
                      const noImg = !hasVariations 
                        ? !mainImg 
                        : !product.product_variations?.some((v: any) => v.image_url || mainImg)
                      if (noImg) {
                        return (
                          <span className="inline-flex items-center gap-1 text-[8px] bg-red-50 text-red-700 font-black uppercase tracking-wider px-2 py-0.5 rounded-md border border-red-200 animate-pulse">
                            ⚠️ Sem Foto
                          </span>
                        )
                      }
                      return null
                    })()}
                  </div>
                </div>

                <div className="flex items-end justify-between mt-2">
                  <div>
                    {!hasVariations && (
                      <>
                        <span className="font-black text-primary text-base leading-none">{formatCurrency(product.price)}</span>
                        {product.promo_price && (
                          <p className="text-[11px] text-green-600 font-bold mt-0.5">Promo: {formatCurrency(product.promo_price)}</p>
                        )}
                      </>
                    )}
                  </div>
                  <div className="flex gap-1">
                    {viewMode === 'trash' ? (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onRestore(product.id)}
                          className="h-8 px-2 text-green-600 border-green-200 hover:bg-green-50 font-bold text-xs gap-1"
                        >
                          <RotateCcw className="h-3 w-3" />
                          <span className="hidden sm:inline">Restaurar</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onHardDelete(product.id)}
                          className="h-8 w-8 text-red-500 hover:bg-red-50"
                          title="Excluir Permanentemente"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </>
                    ) : (
                      <>
                        {!hasVariations && (
                          <>
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => {
                                const url = `${window.location.origin}/produto/${product.slug}`
                                const oppName = product.opportunities?.name || (product.is_salvado ? "Salvados" : "")
                                const measuresText = product.width || product.depth || product.height
                                  ? `${product.width || '?'}L x ${product.depth || '?'}P x ${product.height || '?'}A`
                                  : ""
                                const text = getProductShareText(product.name, product.price, product.promo_price, url, oppName, measuresText)
                                window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, "_blank")
                              }}
                              className="h-8 w-8 text-green-600 border-green-200 hover:bg-green-50 shrink-0"
                              title="Compartilhar no WhatsApp"
                            >
                              <WhatsAppIcon className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => window.location.href = `/admin/marketing?productId=${product.id}`}
                              className="h-8 w-8 text-primary border-primary/20 hover:bg-primary/5 shrink-0"
                              title="Posts do Produto / Marketing"
                            >
                              <Megaphone className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={duplicatingId === product.id}
                          onClick={() => onDuplicate(product.id)}
                          className="h-8 px-2 sm:px-3 text-amber-600 border-amber-200 hover:bg-amber-50 font-bold text-xs gap-1"
                        >
                          {duplicatingId === product.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Copy className="h-3 w-3" />}
                          <span className="hidden sm:inline">Duplicar</span>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onEdit(product.id)}
                          className="h-8 px-2 sm:px-3 text-blue-600 border-blue-200 hover:bg-blue-50 font-bold text-xs gap-1"
                        >
                          <Pencil className="h-3 w-3" />
                          <span className="hidden sm:inline">Editar</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onSoftDelete(product.id)}
                          className="h-8 w-8 text-red-500 hover:bg-red-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {product.product_variations && product.product_variations.length > 0 && (
              <div className="bg-gray-50/50 border-t divide-y">
                {product.product_variations.map((variation: any) => {
                  const varImg = (variation.image_url && variation.image_url.includes(",") ? variation.image_url.split(",")[0] : variation.image_url) || mainImg
                  const varPrice = variation.use_parent_price === false && variation.price ? parseFloat(variation.price.toString()) : product.price
                  const varPromoPrice = variation.use_parent_promo_price === false && variation.promo_price ? parseFloat(variation.promo_price.toString()) : product.promo_price

                  return (
                    <div key={variation.id} className="flex gap-3 p-3 pl-6 border-l-4 border-l-blue-400 items-center">
                      <div className="relative h-10 w-10 rounded border bg-gray-100 overflow-hidden shrink-0">
                        {varImg ? <img src={varImg} alt={variation.name} className="object-cover h-full w-full" /> : <ImageIcon className="h-4 w-4 m-auto text-gray-400" />}
                      </div>
                      <div className="flex-1 min-w-0 flex flex-col justify-between">
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <p className="font-bold text-blue-900 text-xs truncate">{variation.name}</p>
                            <Button
                              type="button"
                              onClick={() => onToggleVariationStatus(product.id, variation.id, variation.status)}
                              className={`text-[8px] font-bold h-5 px-2 rounded-full transition-all active:scale-95 shadow-xs border ${
                                (variation.status || 'published') === 'published'
                                  ? 'bg-green-100 text-green-700 hover:bg-green-200 border-green-200'
                                  : (variation.status || 'published') === 'hidden'
                                    ? 'bg-orange-50 text-orange-700 hover:bg-orange-100 border-orange-200'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border-gray-200'
                              }`}
                            >
                              {(variation.status || 'published') === 'published' ? 'Publicado' : (variation.status || 'published') === 'hidden' ? 'Ocultado' : 'Rascunho'}
                            </Button>
                          </div>
                        </div>
                        <div className="flex justify-between items-end mt-1">
                          <div>
                            <span className="font-black text-gray-700 text-xs">{formatCurrency(varPrice)}</span>
                            {varPromoPrice && <span className="text-[9px] text-green-600 font-bold block">Promo: {formatCurrency(varPromoPrice)}</span>}
                          </div>
                        </div>
                      </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            const url = `${window.location.origin}/produto/${product.slug}?var=${variation.id}`
                            const oppName = product.opportunities?.name || (product.is_salvado ? "Salvados" : "")
                            
                            const vWidth = variation.use_parent_dimensions === false ? variation.width : product.width
                            const vDepth = variation.use_parent_dimensions === false ? variation.depth : product.depth
                            const vHeight = variation.use_parent_dimensions === false ? variation.height : product.height
                            
                            const measuresText = vWidth || vDepth || vHeight
                              ? `${vWidth || '?'}L x ${vDepth || '?'}P x ${vHeight || '?'}A`
                              : ""
                              
                            const text = getProductShareText(variation.name, varPrice, varPromoPrice, url, oppName, measuresText)
                            window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, "_blank")
                          }}
                          className="h-8 w-8 text-green-600 hover:bg-green-50 shrink-0"
                          title="Compartilhar no WhatsApp"
                        >
                          <WhatsAppIcon className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onEdit(product.id, variation.id)}
                          className="h-8 w-8 text-blue-600 hover:bg-blue-50 shrink-0"
                          title="Editar Variante"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </>
  )
}
