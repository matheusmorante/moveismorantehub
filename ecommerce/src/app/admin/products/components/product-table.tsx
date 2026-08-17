"use client"

import React from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Pencil, Trash2, Copy, RotateCcw, Loader2, Package, Image as ImageIcon, Megaphone } from "lucide-react"
import { formatCurrency } from "@/lib/utils"
import Image from "next/image"
import { WhatsAppIcon } from "@/components/icons/whatsapp-icon"
import { getProductShareText } from "@/services/whatsapp"

interface ProductTableProps {
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

export function ProductTable({
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
}: ProductTableProps) {
  if (loading) {
    return (
      <div className="w-full flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (products.length === 0) {
    return (
      <div className="text-center py-20 text-muted-foreground italic">
        Nenhum produto cadastrado nesta visualização.
      </div>
    )
  }

  return (
    <Table className="min-w-[800px]">
      <TableHeader className="bg-gray-50 sticky top-0 z-10 shadow-xs">
        <TableRow>
          <TableHead className="w-[80px] bg-gray-50">Imagem</TableHead>
          <TableHead className="font-bold bg-gray-50">Nome</TableHead>
          <TableHead className="hidden bg-gray-50 w-0" aria-hidden="true">Atributo</TableHead>
          <TableHead className="font-bold bg-gray-50">Status</TableHead>
          <TableHead className="font-bold bg-gray-50">Preço</TableHead>
          <TableHead className="text-right font-bold bg-gray-50">Ações</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {products.map((product) => {
          const mainImg = product.product_images?.find((img: any) => img.is_main)?.image_url
          const hasVariations = product.product_variations && product.product_variations.length > 0

          return (
            <React.Fragment key={product.id}>
              <TableRow className="transition-colors hover:bg-gray-50/50">
                <TableCell>
                  <div className="relative h-10 w-10 md:h-12 md:w-12 rounded-lg overflow-hidden border bg-gray-100 flex items-center justify-center">
                    {!hasVariations && mainImg ? (
                      <img src={mainImg} alt={product.name} className="object-cover w-full h-full" />
                    ) : (
                      <Package className="h-5 w-5 text-gray-400" />
                    )}
                  </div>
                </TableCell>
                <TableCell className={`font-semibold text-sm md:text-base ${hasVariations ? "text-gray-500 italic" : "text-gray-800"}`}>
                  <div className="space-y-1">
                    <p>{product.name}</p>
                    
                    {/* Exibição das categorias */}
                    {product.product_categories && product.product_categories.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {product.product_categories.map((pc: any, idx: number) => {
                          const catName = pc.categories?.name
                          if (!catName) return null
                          return (
                            <span key={idx} className="text-[9px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider border">
                              {catName}
                            </span>
                          )
                        })}
                      </div>
                    )}

                    {viewMode === 'trash' && product.deleted_at && (
                      <p className="text-[10px] text-red-600 font-black uppercase tracking-wider mt-0.5">
                        Exclusão em: {(() => {
                          const delDate = new Date(product.deleted_at)
                          const expDate = new Date(delDate.getTime() + 30 * 24 * 60 * 60 * 1000)
                          const diffTime = expDate.getTime() - Date.now()
                          const diffDays = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)))
                          return `${diffDays} ${diffDays === 1 ? 'dia' : 'dias'}`
                        })()}
                      </p>
                    )}
                    {viewMode === 'active' && (product.opportunities || product.is_salvado) && (
                      <span className={`inline-block text-[10px] font-black uppercase px-1.5 py-0.5 rounded text-white ${
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
                          <div className="mt-1 flex items-center gap-1">
                            <span className="inline-flex items-center gap-1 text-[9px] bg-red-50 text-red-700 font-black uppercase tracking-wider px-2 py-0.5 rounded-md border border-red-200 animate-pulse">
                              ⚠️ Sem Foto Principal
                            </span>
                          </div>
                        )
                      }
                      return null
                    })()}
                  </div>
                </TableCell>
                <TableCell className="hidden w-0" aria-hidden="true">
                  {/* Atributo invisível */}
                </TableCell>
                <TableCell>
                  {hasVariations ? (
                    <Badge variant="outline" className="bg-slate-100 text-slate-600 border-slate-200 text-[10px] py-0 font-bold uppercase whitespace-nowrap">
                      PAI - {product.product_variations.length} {product.product_variations.length === 1 ? "VARIAÇÃO" : "VARIAÇÕES"}
                    </Badge>
                  ) : (
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
                </TableCell>
                <TableCell>
                  {!hasVariations && (
                    <div className="flex flex-col">
                      {product.promo_price ? (
                        <>
                          <span className="text-[10px] text-red-500 line-through font-bold">{formatCurrency(product.price)}</span>
                          <span className="font-bold text-sm md:text-base text-gray-800">{formatCurrency(product.promo_price)}</span>
                        </>
                      ) : (
                        <span className="font-bold text-sm md:text-base text-gray-800">{formatCurrency(product.price)}</span>
                      )}
                    </div>
                  )}
                </TableCell>
                <TableCell className="text-right space-x-1">
                  {viewMode === 'trash' ? (
                    <>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onRestore(product.id)}
                        className="h-8 w-8 md:h-9 md:w-9 text-green-600 hover:bg-green-50"
                        title="Restaurar"
                      >
                        <RotateCcw className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onHardDelete(product.id)}
                        className="h-8 w-8 md:h-9 md:w-9 text-red-600 hover:bg-red-50"
                        title="Excluir Permanentemente"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  ) : (
                    <>
                      {!hasVariations && (
                        <>
                          <Button
                            variant="ghost"
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
                            className="h-8 w-8 md:h-9 md:w-9 text-green-600 hover:bg-green-50"
                            title="Compartilhar no WhatsApp"
                          >
                            <WhatsAppIcon className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => window.location.href = `/admin/marketing?productId=${product.id}`}
                            className="h-8 w-8 md:h-9 md:w-9 text-primary hover:bg-primary/5 shrink-0"
                            title="Posts do Produto / Marketing"
                          >
                            <Megaphone className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        disabled={duplicatingId === product.id} 
                        onClick={() => onDuplicate(product.id)} 
                        className="h-8 w-8 md:h-9 md:w-9 text-amber-600 hover:bg-amber-50" 
                        title="Duplicar"
                      >
                        {duplicatingId === product.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Copy className="h-4 w-4" />}
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => onEdit(product.id)} className="h-8 w-8 md:h-9 md:w-9 text-blue-600 hover:bg-blue-50" title="Editar"><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => onSoftDelete(product.id)} className="h-8 w-8 md:h-9 md:w-9 text-red-600 hover:bg-red-50" title="Excluir"><Trash2 className="h-4 w-4" /></Button>
                    </>
                  )}
                </TableCell>
              </TableRow>

              {product.product_variations?.map((variation: any) => {
                const varImg = (variation.image_url && variation.image_url.includes(",") ? variation.image_url.split(",")[0] : variation.image_url) || mainImg
                const varPrice = variation.use_parent_price === false && variation.price ? parseFloat(variation.price.toString()) : product.price
                const varPromoPrice = variation.use_parent_promo_price === false && variation.promo_price ? parseFloat(variation.promo_price.toString()) : product.promo_price

                return (
                  <TableRow key={variation.id} className="bg-gray-50/20 hover:bg-gray-50 transition-colors border-l-4 border-l-blue-400">
                    <TableCell className="pl-6">
                      <div className="relative h-8 w-8 rounded overflow-hidden border bg-gray-100">
                        {varImg ? <img src={varImg} alt={variation.name} className="object-cover h-full w-full" /> : <ImageIcon className="h-3 w-3 m-auto text-gray-400" />}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-gray-600 pl-4 py-2 font-medium">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[9px] bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded font-black">VARIANTE</span>
                        <p className="font-semibold text-blue-900">{variation.name}</p>
                      </div>
                    </TableCell>
                    <TableCell className="hidden w-0" aria-hidden="true">
                      {/* Atributo invisível da variante filha */}
                    </TableCell>
                    <TableCell>
                      <Button
                        type="button"
                        onClick={() => onToggleVariationStatus(product.id, variation.id, variation.status)}
                        className={`text-[10px] font-bold h-6 px-2.5 rounded-full transition-all active:scale-95 shadow-sm border ${
                          (variation.status || 'published') === 'published'
                            ? 'bg-green-100 text-green-700 hover:bg-green-200 border-green-200'
                            : (variation.status || 'published') === 'hidden'
                              ? 'bg-orange-50 text-orange-700 hover:bg-orange-100 border-orange-200'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border-gray-200'
                        }`}
                      >
                        {(variation.status || 'published') === 'published' ? 'Publicado' : (variation.status || 'published') === 'hidden' ? 'Ocultado' : 'Rascunho'}
                      </Button>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        {varPromoPrice ? (
                          <>
                            <span className="text-[10px] text-red-500 line-through font-bold">{formatCurrency(varPrice)}</span>
                            <span className="font-bold text-xs text-gray-800">{formatCurrency(varPromoPrice)}</span>
                          </>
                        ) : (
                          <span className="font-bold text-xs text-gray-800">{formatCurrency(varPrice)}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right py-1 space-x-1">
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
                        className="h-8 w-8 text-green-600 hover:bg-green-50"
                        title="Compartilhar no WhatsApp"
                      >
                        <WhatsAppIcon className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onEdit(product.id, variation.id)}
                        className="h-8 w-8 text-blue-600 hover:bg-blue-50"
                        title="Editar Variante"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })}
            </React.Fragment>
          )
        })}
      </TableBody>
    </Table>
  )
}
