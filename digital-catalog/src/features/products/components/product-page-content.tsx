"use client"

import { useCart } from "@/hooks/use-cart"
import { formatCurrency, cn } from "@/lib/utils"
import { sendProductInterest, getProductShareText } from "@/services/whatsapp"
import { Button } from "@/components/ui/button"
import { ShoppingCart, ChevronLeft, ChevronRight, X, Loader2, Package, Info, Layers, Flame, Share2, Link as LinkIcon } from "lucide-react"
import { WhatsAppIcon } from "@/components/icons/whatsapp-icon"
import Image from "next/image"
import Link from "next/link"
import { useParams, useSearchParams, useRouter } from "next/navigation"
import { toast } from "sonner"
import { useState, useEffect, useCallback, useMemo } from "react"
import { Badge } from "@/components/ui/badge"
import { DeliveryPickupInfo } from "@/features/products/components/delivery-pickup-info"
import { AdvantagesSection } from "@/components/sections/advantages-section"
import { PaymentInfo } from "@/features/products/components/payment-info"
import { useAuth } from "@/hooks/use-auth"
import { useAdminMode } from "@/hooks/use-admin-mode"
import { Pencil } from "lucide-react"
import { AdminProductModal } from "@/features/products/components/admin-product-modal"
import { productCardStyleClasses, getOpportunityTitleColor } from "@/lib/product-card-style"
import { ProductGallery } from "./ProductGallery"
import { ProductVariantSelector } from "./ProductVariantSelector"
import { ProductSpecifications } from "../sections/ProductSpecifications"

type TechnicalSpecification = { name: string; slug: string }

interface ProductPageContentProps {
  initialProduct: any
  technicalSpecifications: TechnicalSpecification[]
  buttonStyleSetting: "standard" | "rounded"
}

export default function ProductPageContent({
  initialProduct,
  technicalSpecifications,
  buttonStyleSetting
}: ProductPageContentProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [selectedAttributes, setSelectedAttributes] = useState<Record<string, string>>({})
  
  const { user } = useAuth()
  const { isAdminMode } = useAdminMode()
  const isAdmin = user?.email === "matheusmorante002@gmail.com"
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isShareModalOpen, setIsShareModalOpen] = useState(false)
  const [buttonStyle] = useState<"standard" | "rounded">(buttonStyleSetting)

  const [product] = useState<any>(initialProduct)
  const [activeImage, setActiveImage] = useState("")
  const [activeIndex, setActiveIndex] = useState(0)

  const { addItem } = useCart()

  // Rastreamento analítico do visitante real (IP, Geo e Origem)
  useEffect(() => {
    if (!product?.id) return

    // Obtém ou cria identificador único do visitante salvo no navegador
    let visitorId = localStorage.getItem("morante_visitor_id")
    if (!visitorId) {
      visitorId = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2) + Date.now().toString(36)
      localStorage.setItem("morante_visitor_id", visitorId)
    }

    // Envia o acesso de forma assíncrona ao servidor
    fetch("/api/analytics/track", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        product_id: product.id,
        visitor_id: visitorId,
        referer: document.referrer || "Tráfego Direto"
      })
    }).catch(err => console.error("Erro no track de visualização:", err))
  }, [product?.id])



  const activeVarId = searchParams.get("var")
  const activeVariation = product?.variations?.find((v: any) => v.id === activeVarId && v.status !== 'hidden')

  // Dynamic overrides
  const isParentName = activeVariation ? activeVariation.use_parent_name !== false : true
  const displayTitle = activeVariation && !isParentName && activeVariation.name ? activeVariation.name : product?.name
  
  const isParentPrice = activeVariation ? activeVariation.use_parent_price !== false : true
  const displayPrice = activeVariation && !isParentPrice && activeVariation.price ? parseFloat(activeVariation.price) : product?.price
  
  const isParentPromo = activeVariation ? activeVariation.use_parent_promo_price !== false : true
  const displayPromoPrice = activeVariation && !isParentPromo 
    ? (activeVariation.promo_price ? parseFloat(activeVariation.promo_price) : null)
    : product?.promo_price

  const isParentDesc = activeVariation ? activeVariation.use_parent_description !== false : true
  const rawDescription = activeVariation && !isParentDesc && activeVariation.description ? activeVariation.description : product?.description
  const displayDescription = rawDescription ? rawDescription.replace(/<br\s*\/?>/gi, '\n') : ""

  const isParentDims = activeVariation ? activeVariation.use_parent_dimensions !== false : true
  const displayWidth = activeVariation && !isParentDims && activeVariation.width ? activeVariation.width : product?.width
  const displayDepth = activeVariation && !isParentDims && activeVariation.depth ? activeVariation.depth : product?.depth
  const displayHeight = activeVariation && !isParentDims && activeVariation.height ? activeVariation.height : product?.height

  // Imagens
  const varImages = useMemo(() => {
    return activeVariation?.image_url ? activeVariation.image_url.split(",").filter(Boolean) : []
  }, [activeVariation?.image_url])

  const displayImages = useMemo(() => {
    return varImages.length > 0 ? varImages : (product?.images || [])
  }, [varImages, product?.images])

  const totalImages = displayImages.length

  // Sincroniza activeImage e activeIndex apenas quando a variação ativa muda ou o produto muda
  useEffect(() => {
    if (displayImages.length > 0) {
      setActiveImage(displayImages[0])
      setActiveIndex(0)
    }
  }, [activeVarId, product?.id, displayImages[0]])

  // Sincroniza selectedAttributes com a variação selecionada
  useEffect(() => {
    if (activeVariation) {
      setSelectedAttributes(activeVariation.attributes || {})
    } else if (product?.variations?.[0]) {
      setSelectedAttributes(product.variations[0].attributes || {})
    }
  }, [activeVariation, product])

  // Obter todos os atributos possíveis e seus valores correspondentes para os selects, filtrando para mostrar apenas opções disponíveis
  const allAttributes = useMemo(() => {
    const attrs: Record<string, Set<string>> = {}
    product?.variations?.forEach((v: any) => {
      if (v.status === 'hidden') return
      Object.entries(v.attributes || {}).forEach(([key, val]) => {
        if (!attrs[key]) attrs[key] = new Set()
        attrs[key].add(val as string)
      })
    })
    const result: Record<string, string[]> = {}
    Object.entries(attrs).forEach(([key, set]) => {
      result[key] = Array.from(set)
    })
    return result
  }, [product])

  // Medidas dinâmicas para a tabela de especificações
  const specsMap = product ? { ...product.technical_specs } : {}
  if (displayWidth) specsMap.largura = displayWidth
  if (displayDepth) {
    if ((product as any).depth_use_length) {
      specsMap.comprimento = displayDepth
    } else {
      specsMap.profundidade = displayDepth
    }
  }
  if (displayHeight) specsMap.altura = displayHeight

  const technicalSpecs = specsMap && typeof specsMap === "object"
    ? technicalSpecifications.map((specification) => [specification.name, specsMap[specification.slug]]).filter(([, value]) => value)
    : []



  const handleAddToCart = () => {
    addItem({ id: activeVariation ? `${product.id}-${activeVariation.id}` : product.id, name: displayTitle, price: displayPromoPrice || displayPrice, image: displayImages[0], quantity: 1 })
    toast.success(`${displayTitle} adicionado ao carrinho!`)
  }

  const handleWhatsApp = () => sendProductInterest(displayTitle)

  const handleShareWhatsApp = () => {
    const shareUrl = window.location.href
    const oppName = product.opportunities?.name || (product.is_salvado ? "Salvados" : "")
    const measuresText = displayWidth || displayDepth || displayHeight
      ? `${displayWidth || '?'}L x ${displayDepth || '?'}P x ${displayHeight || '?'}A`
      : ""
    const text = getProductShareText(displayTitle, displayPrice, displayPromoPrice, shareUrl, oppName, measuresText)
    const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`
    window.open(whatsappUrl, "_blank")
  }

  const handleCopyLink = () => {
    const shareUrl = window.location.href
    navigator.clipboard.writeText(shareUrl)
      .then(() => {
        toast.success("Link copiado para a área de transferência!")
      })
      .catch((err) => {
        console.error("Erro ao copiar link:", err)
        toast.error("Não foi possível copiar o link automaticamente.")
      })
  }

  return (
    <div className="bg-white min-h-screen">
      <div className="container mx-auto px-4 sm:px-8 md:px-12 lg:px-16 xl:px-24 py-6 md:py-10">
        <nav className="flex items-center gap-2 text-[10px] sm:text-xs text-muted-foreground mb-6 font-bold uppercase tracking-widest">
          <Link href="/" className="hover:text-primary transition-colors">Início</Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-gray-400">Produtos</span>
          <ChevronRight className="h-3 w-3" />
          <span className="text-primary truncate max-w-[150px]">{displayTitle}</span>
        </nav>
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          {/* ── COLUNA ESQUERDA: GALERIA (6 COLUNAS NO PC) ── */}
          <div className="lg:col-span-6 space-y-4">
            <ProductGallery 
              displayImages={displayImages} 
              displayTitle={displayTitle} 
              productOpportunities={product.opportunities} 
              activeImage={activeImage} 
              activeIndex={activeIndex} 
              setActiveImage={setActiveImage} 
              setActiveIndex={setActiveIndex} 
            />
          </div>

          {/* ── COLUNA DIREITA: INFOS + COMPRA (6 COLUNAS NO PC) ── */}
          <div className="lg:col-span-6 flex flex-col gap-6 lg:gap-8">
            <div className="space-y-3 relative">
              {(() => {
                const currentOpp = product.opportunities || (product.is_salvado ? { name: 'Salvados', slug: 'salvado' } : null)
                const oppTitleColor = getOpportunityTitleColor(currentOpp)
                const finalTitleColor = oppTitleColor === 'inherit' ? 'var(--primary)' : oppTitleColor

                return (
                  <h1 
                    className="text-2xl sm:text-3xl font-extrabold leading-[1.1] tracking-tight pr-12 capitalize"
                    style={{ color: finalTitleColor }}
                  >
                    {displayTitle}
                  </h1>
                )
              })()}
              
              {isAdmin && isAdminMode && (
                <Button 
                  onClick={() => setIsEditModalOpen(true)}
                  variant="outline" 
                  size="icon" 
                  className="absolute top-0 right-0 border-amber-500 text-amber-600 hover:bg-amber-50 rounded-full h-9 w-9 shadow-sm"
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              )}
              <div className="h-1 w-12 bg-accent rounded-full"></div>

              {/* Botões de compartilhamento direto abaixo do título */}
              <div className="flex flex-wrap gap-2 pt-1 pb-2">
                <Button 
                  onClick={handleShareWhatsApp}
                  variant="outline" 
                  size="sm"
                  className={cn("rounded-full border-gray-200 hover:border-emerald-500/40 hover:bg-emerald-50 text-[#25D366] font-bold text-[11px] py-4 px-4 transition-all flex items-center gap-1.5", productCardStyleClasses.button_style[buttonStyle])}
                >
                  <WhatsAppIcon className="h-3.5 w-3.5 shrink-0" />
                  Enviar no WhatsApp
                </Button>
                <Button 
                  onClick={handleCopyLink}
                  variant="outline" 
                  size="sm"
                  className={cn("rounded-full border-gray-200 hover:border-primary/40 hover:bg-primary/5 text-gray-700 font-bold text-[11px] py-4 px-4 transition-all flex items-center gap-1.5", productCardStyleClasses.button_style[buttonStyle])}
                >
                  <LinkIcon className="h-3.5 w-3.5 shrink-0 text-primary" />
                  Copiar Link
                </Button>
              </div>

              <AdminProductModal 
                productId={product.id}
                isOpen={isEditModalOpen}
                onOpenChange={setIsEditModalOpen}
                onSuccess={() => window.location.reload()}
              />
            </div>

            <div className="bg-gray-50/50 p-4 sm:p-6 rounded-2xl border border-gray-100 space-y-5">
              <PaymentInfo price={displayPromoPrice || displayPrice} originalPrice={displayPromoPrice ? displayPrice : undefined} />
              
              {/* Seletor de Opções (Variações em Grid de Imagens Quadradas) */}
              <ProductVariantSelector 
                product={product} 
                activeVariation={activeVariation} 
                activeVarId={activeVarId} 
              />

              {/* BOTÕES DE AÇÃO DESTACADOS (DESKTOP) */}
              <div className="hidden lg:flex flex-col xl:flex-row gap-3 pt-2">
                <Button onClick={handleAddToCart} size="lg" className={cn("flex-1 !h-14 py-4 bg-primary hover:bg-primary/90 text-white font-extrabold gap-2 text-sm sm:text-base transition-all shadow-md active:scale-[0.98]", productCardStyleClasses.button_style[buttonStyle])}>
                  <ShoppingCart className="h-5 w-5 shrink-0" />
                  Adicionar ao Carrinho
                </Button>
                <Button onClick={handleWhatsApp} size="lg" className={cn("flex-1 !h-14 py-4 bg-[#25D366] hover:bg-[#25D366]/90 text-white font-extrabold gap-2 text-sm sm:text-base shadow-md shadow-green-600/20 transition-all active:scale-[0.98]", productCardStyleClasses.button_style[buttonStyle])}>
                  <WhatsAppIcon className="h-5 w-5 shrink-0" />
                  Fazer Pedido pelo WhatsApp
                </Button>
              </div>

              <div className="hidden lg:block h-px bg-gray-200/70 my-2"></div>
              <DeliveryPickupInfo />
            </div>
          </div>
        </div>

        {/* DESCRIÇÃO E CARACTERÍSTICAS EM LARGURA TOTAL NO COMPUTADOR (ABAIXO DO GRID) */}
        <div className="mt-10 lg:mt-16 space-y-8 border-t pt-8">
          {product.opportunities?.observations && (
            <div className="bg-amber-50 border-2 border-dashed border-amber-300 rounded-2xl p-5 text-amber-900 shadow-sm space-y-1">
              <div className="flex items-center gap-2 text-amber-800 font-extrabold text-sm uppercase tracking-wider">
                <span className="text-base">⚠</span>
                <span>Aviso Importante ({product.opportunities.name})</span>
              </div>
              <p className="text-xs font-bold leading-relaxed whitespace-pre-line">
                {product.opportunities.observations}
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Descrição - Lado Esquerdo no PC (ou full se sem especificações) */}
            <div className={cn("space-y-3", technicalSpecs.length > 0 || (displayWidth || displayDepth || displayHeight) ? "lg:col-span-7" : "lg:col-span-12")}>
              <div className="flex items-center gap-2 text-primary font-bold text-sm uppercase tracking-widest border-b pb-2">
                <Info className="h-4 w-4" />
                <h2>Descrição do Produto</h2>
              </div>
              <p className="text-gray-600 leading-relaxed whitespace-pre-line text-sm">
                {displayDescription}
              </p>
            </div>

            {/* Medidas e Especificações - Lado Direito no PC */}
            <ProductSpecifications 
              displayWidth={displayWidth} 
              displayDepth={displayDepth} 
              displayHeight={displayHeight} 
              product={product} 
              technicalSpecs={technicalSpecs} 
            />
          </div>
        </div>

        {/* VANTAGENS OCUPANDO TODA A LARGURA (ABAIXO DO GRID PRINCIPAL) */}
        <div className="mt-12 -mx-6 sm:-mx-10 md:-mx-16 lg:-mx-24 xl:-mx-48 pb-16 lg:pb-0">
          <AdvantagesSection />
        </div>
      </div>

      {/* ── BARRA FIXA DE COMPRA NO MOBILE ── */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-gray-200 p-3.5 flex gap-2.5 lg:hidden shadow-[0_-4px_25px_rgba(0,0,0,0.12)]">
        <Button onClick={handleAddToCart} size="lg" className={cn("flex-1 !h-14 py-4 bg-primary hover:bg-primary/90 text-white font-extrabold gap-2 text-xs sm:text-sm shadow-sm active:scale-[0.98]", productCardStyleClasses.button_style[buttonStyle])}>
          <ShoppingCart className="h-4.5 w-4.5 shrink-0" />
          Adicionar ao Carrinho
        </Button>
        <Button onClick={handleWhatsApp} size="lg" className={cn("flex-1 !h-14 py-4 bg-[#25D366] hover:bg-[#25D366]/90 text-white font-extrabold gap-2 text-xs sm:text-sm shadow-md shadow-green-600/20 active:scale-[0.98]", productCardStyleClasses.button_style[buttonStyle])}>
          <WhatsAppIcon className="h-4.5 w-4.5 shrink-0" />
          Fazer Pedido
        </Button>
      </div>


    </div>
  )
}
