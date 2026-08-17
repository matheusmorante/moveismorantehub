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
import { useState, useRef, useEffect, useCallback, useMemo } from "react"
import { Badge } from "@/components/ui/badge"
import { DeliveryPickupInfo } from "@/features/products/components/delivery-pickup-info"
import { AdvantagesSection } from "@/components/sections/advantages-section"
import { PaymentInfo } from "@/features/products/components/payment-info"
import { useAuth } from "@/hooks/use-auth"
import { useAdminMode } from "@/hooks/use-admin-mode"
import { Pencil } from "lucide-react"
import { AdminProductModal } from "@/features/products/components/admin-product-modal"
import { productCardStyleClasses } from "@/lib/product-card-style"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"

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
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState(0)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

  const thumbsRef = useRef<HTMLDivElement>(null)
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

  const updateScrollBtns = useCallback(() => {
    const el = thumbsRef.current
    if (!el) return
    setCanScrollLeft(el.scrollLeft > 4)
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4)
  }, [])

  useEffect(() => {
    const el = thumbsRef.current
    if (!el) return
    updateScrollBtns()
    el.addEventListener("scroll", updateScrollBtns)
    const ro = new ResizeObserver(updateScrollBtns)
    ro.observe(el)
    return () => {
      el.removeEventListener("scroll", updateScrollBtns)
      ro.disconnect()
    }
  }, [updateScrollBtns, product])

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
  const varImages = activeVariation?.image_url ? activeVariation.image_url.split(",").filter(Boolean) : []
  const displayImages = varImages.length > 0 ? varImages : (product?.images || [])

  const totalImages = displayImages.length

  // Sincroniza activeImage e activeIndex quando a variação ativa muda. Se for uma variação com imagem própria, limita a exibição a ela.
  useEffect(() => {
    if (displayImages.length > 0) {
      setActiveImage(displayImages[0])
      setActiveIndex(0)
    }
  }, [activeVarId, product, displayImages, varImages.length])

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

  const scrollThumbs = (dir: "left" | "right") => {
    const el = thumbsRef.current
    if (!el) return
    const scrollAmount = el.clientWidth * 0.8
    el.scrollBy({ left: dir === "left" ? -scrollAmount : scrollAmount, behavior: "smooth" })
  }

  const selectImage = (img: string, idx: number) => {
    setActiveImage(img)
    setActiveIndex(idx)
  }

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
            <div className="space-y-4">
              <button
                className="relative w-full aspect-[4/5] sm:aspect-square lg:aspect-[4/5] max-h-[500px] md:max-h-[600px] overflow-hidden rounded-2xl border bg-gray-50 shadow-sm block cursor-zoom-in group/main"
                onClick={() => setLightboxOpen(true)}
                aria-label="Ampliar imagem"
              >
                {activeImage && (
                  <Image
                    src={activeImage}
                    alt={displayTitle}
                    fill
                    className="object-contain p-4 md:p-8 transition-transform duration-500 group-hover/main:scale-105"
                    priority
                  />
                )}
                {product.opportunities && (
                  <Badge className={`absolute top-4 left-4 ${product.opportunities.badge_color || 'bg-accent'} text-white font-bold px-4 py-1 text-[10px] sm:text-xs shadow-lg pointer-events-none flex items-center gap-1`}>
                    {(product.opportunities.slug === "salvado" || product.opportunities.name?.toLowerCase()?.includes("salvado")) && (
                      <Flame className="h-3 w-3 shrink-0" />
                    )}
                    {product.opportunities.name}
                  </Badge>
                )}
              </button>

              {totalImages > 1 && (
                <div className="relative group/thumbs flex items-center px-1">
                  <button
                    onClick={() => scrollThumbs("left")}
                    className={`absolute -left-2 z-10 flex items-center justify-center h-8 w-8 rounded-full border border-gray-100 bg-white shadow-md hover:text-primary transition-all md:-left-4 ${
                    canScrollLeft ? "opacity-100 visible scale-100" : "opacity-0 invisible scale-90"
                    }`}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>

                  <div ref={thumbsRef} className="flex gap-2 overflow-x-auto no-scrollbar flex-1 scroll-smooth py-1">
                    {displayImages.map((image: string, index: number) => (
                      <button
                        key={index}
                        onClick={() => selectImage(image, index)}
                        className={`relative flex-shrink-0 w-16 sm:w-20 aspect-square overflow-hidden rounded-lg border-2 transition-all ${
                          activeIndex === index
                            ? "border-primary shadow-md"
                            : "border-transparent opacity-60 hover:opacity-100 hover:scale-105"
                        }`}
                      >
                        <Image src={image} alt={`${displayTitle} thumb ${index + 1}`} fill className="object-cover" />
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={() => scrollThumbs("right")}
                    className={`absolute -right-2 z-10 flex items-center justify-center h-8 w-8 rounded-full border border-gray-100 bg-white shadow-md hover:text-primary transition-all md:-right-4 ${
                      canScrollRight ? "opacity-100 visible scale-100" : "opacity-0 invisible scale-90"
                    }`}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* ── COLUNA DIREITA: INFOS + COMPRA (6 COLUNAS NO PC) ── */}
          <div className="lg:col-span-6 flex flex-col gap-6 lg:gap-8">
            <div className="space-y-3 relative">
              <h1 
                className="text-2xl sm:text-3xl font-extrabold leading-[1.1] tracking-tight pr-12 capitalize"
                style={{
                  color: product.opportunities 
                    ? (product.opportunities.title_color ? product.opportunities.title_color : (
                       product.opportunities.badge_color === 'bg-red-600' ? '#DC2626' : 
                       product.opportunities.badge_color === 'bg-amber-600' ? '#D97706' :
                       product.opportunities.badge_color === 'bg-purple-600' ? '#7C3AED' :
                       product.opportunities.badge_color === 'bg-blue-600' ? '#2563EB' :
                       product.opportunities.badge_color === 'bg-green-600' ? '#16A34A' :
                       product.opportunities.badge_color === 'bg-pink-600' ? '#DB2777' :
                       product.opportunities.badge_color === 'bg-orange-600' ? '#EA580C' :
                       product.opportunities.badge_color === 'bg-teal-600' ? '#0D9488' : 'var(--primary)'))
                    : 'var(--primary)'
                }}
              >
                {displayTitle}
              </h1>
              
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
              {product?.variations && product.variations.length > 0 && (
                <div className="pt-3 space-y-2 border-t border-gray-200/60">
                  <div className="flex flex-col gap-0.5">
                    <label className="text-xs font-bold text-gray-600 uppercase tracking-wide flex items-center gap-1.5">
                      <Layers className="h-3.5 w-3.5 text-primary" />
                      Opções Disponíveis
                    </label>
                    <span className="text-sm font-extrabold text-primary min-h-[20px] capitalize">
                      {activeVariation 
                        ? Object.entries(activeVariation.attributes || {}).map(([_, val]) => val).join(" / ")
                        : "Padrão"
                      }
                    </span>
                  </div>
                  <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
                    {product.variations
                      .filter((v: any) => v.status !== "hidden")
                      .map((v: any) => {
                        const comboLabel = Object.entries(v.attributes || {})
                          .map(([_, val]) => val)
                          .join(" / ")
                        
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
                            title={comboLabel || v.name}
                          >
                            {varImg && (
                              <Image 
                                src={varImg} 
                                alt={comboLabel || v.name} 
                                fill 
                                className="object-cover" 
                              />
                            )}
                          </button>
                        )
                      })}
                  </div>
                </div>
              )}

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
            {(technicalSpecs.length > 0 || (displayWidth || displayDepth || displayHeight)) && (
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
                            {(product as any)?.depth_use_length ? "Compr." : "Profund."}
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

                {/* ESPECIFICAÇÕES TÉCNICAS */}
                {technicalSpecs.length > 0 && (
                  <div className="space-y-3 bg-white p-4 rounded-xl border border-gray-100">
                    <div className="flex items-center gap-2 text-gray-800 font-bold text-xs uppercase tracking-wider">
                      <Layers className="h-3.5 w-3.5 text-primary" />
                      <h3>Especificações</h3>
                    </div>
                    <dl className="space-y-1.5 border-t pt-2 text-[11px] leading-relaxed">
                      {technicalSpecs.map(([label, value]) => <div key={label} className="flex justify-between gap-3"><dt className="text-muted-foreground">{label}</dt><dd className="text-right font-medium text-gray-700">{value}</dd></div>)}
                    </dl>
                  </div>
                )}
              </div>
            )}
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

      {/* ── LIGHTBOX (SEM ALTERAÇÃO) ── */}
      {lightboxOpen && (
        <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center" onClick={() => setLightboxOpen(false)}>
          <button className="absolute top-6 right-6 text-white hover:text-gray-300 transition-colors z-10" onClick={() => setLightboxOpen(false)} aria-label="Fechar">
            <X className="h-10 w-10" />
          </button>
          <span className="absolute top-8 left-1/2 -translate-x-1/2 text-white/70 text-sm font-medium select-none">
            {lightboxIndex + 1} / {totalImages}
          </span>
          {totalImages > 1 && (
            <button className="absolute left-6 text-white hover:text-gray-300 transition-colors p-3 z-10" onClick={e => { e.stopPropagation(); setLightboxIndex(i => (i - 1 + totalImages) % totalImages) }} aria-label="Anterior">
              <ChevronLeft className="h-12 w-12" />
            </button>
          )}
          <div className="relative w-[95vw] max-w-4xl aspect-square" onClick={e => e.stopPropagation()}>
            {displayImages[lightboxIndex] && (
              <Image src={displayImages[lightboxIndex]} alt={`${displayTitle} full`} fill className="object-contain" />
            )}
          </div>
          {totalImages > 1 && (
            <button className="absolute right-6 text-white hover:text-gray-300 transition-colors p-3 z-10" onClick={e => { e.stopPropagation(); setLightboxIndex(i => (i + 1) % totalImages) }} aria-label="Próxima">
              <ChevronRight className="h-12 w-12" />
            </button>
          )}
        </div>
      )}
    </div>
  )
}
