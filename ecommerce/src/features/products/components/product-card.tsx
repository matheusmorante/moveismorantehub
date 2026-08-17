"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { ShoppingCart, Pencil, Flame } from "lucide-react"
import { WhatsAppIcon } from "@/components/icons/whatsapp-icon"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useCart } from "@/hooks/use-cart"
import { useAuth } from "@/hooks/use-auth"
import { useAdminMode } from "@/hooks/use-admin-mode"
import { cn, formatCurrency } from "@/lib/utils"
import { sendProductInterest } from "@/services/whatsapp"
import { toast } from "sonner"
import { AdminProductModal } from "@/features/products/components/admin-product-modal"
import { defaultProductCardStyle, ProductCardStyle, productCardStyleClasses } from "@/lib/product-card-style"

interface ProductCardProps {
  product: {
    id: string
    name: string
    slug: string
    price: number
    promo_price?: number
    image: string
    category: string
    promotion?: boolean
    opportunity?: {
      name: string
      badge_color: string
      border_color: string
      border_style?: string
      badge_animation?: string
    } | null
  }
  style?: ProductCardStyle
}

export function ProductCard({ product, style = defaultProductCardStyle }: ProductCardProps) {
  const { addItem } = useCart()
  const { user } = useAuth()
  const { isAdminMode } = useAdminMode()
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)

  const isAdmin = user?.email === "matheusmorante002@gmail.com"

  const displayPrice = product.promo_price || product.price
  const originalPrice = product.promo_price ? product.price : undefined

  const handleEditClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsEditModalOpen(true)
  }

  const discount = originalPrice 
    ? Math.round(((originalPrice - displayPrice) / originalPrice) * 100)
    : 0

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault()
    addItem({
      id: product.id,
      name: product.name,
      price: displayPrice,
      image: product.image,
      quantity: 1
    })
    toast.success(`${product.name} adicionado ao carrinho!`)
  }

  const handleWhatsApp = (e: React.MouseEvent) => {
    e.preventDefault()
    sendProductInterest(product.name)
  }

  // Mapeamento dinâmico de estilo de borda
  const getBorderStyleClass = (style?: string) => {
    switch (style) {
      case "dashed": return "border-dashed border-2"
      case "dotted": return "border-dotted border-2"
      case "double": return "border-double border-4"
      case "solid":
      default: return "border-solid border-2"
    }
  }

  // Mapeamento dinâmico de animação
  const getAnimationClass = (animation?: string) => {
    switch (animation) {
      case "none": return ""
      case "bounce": return "animate-bounce"
      case "subtle": return ""
      case "highlighted": return "animate-pulse"
      case "pulse":
      default: return "animate-pulse"
    }
  }

  const isSalvados = 
    product.opportunity?.slug === "salvado" || 
    product.opportunity?.name?.toLowerCase()?.includes("salvado");

  const borderClass = "border-none shadow-xs hover:shadow-md"

  return (
    <Card 
      className={cn(
        "group overflow-hidden bg-white text-left transition-all duration-300 relative h-full flex flex-col",
        borderClass,
        productCardStyleClasses.border_radius[style.border_radius],
      )}
    >
      <Link href={`/produto/${product.slug}`}>
        <div className="relative aspect-[4/3] overflow-hidden bg-gray-50/30 p-3 sm:p-4">
          <div className="relative w-full h-full">
            <Image
              src={product.image}
              alt={product.name}
              fill
              className="object-contain"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
          </div>
          {product.opportunity && (
            <Badge 
              className={cn(
                "absolute top-[2px] right-2 font-black px-2 py-0.5 rounded-lg shadow-lg z-10 text-[9px] uppercase tracking-tighter border border-white/20 flex items-center gap-0.5",
                isSalvados 
                  ? "bg-orange-500 text-white border-orange-600/20" 
                  : `${product.opportunity.badge_color} text-white`,
                getAnimationClass(product.opportunity.badge_animation || style.opportunity_emphasis)
              )}
            >
              {isSalvados && <Flame className="h-2.5 w-2.5 shrink-0 text-white fill-white" />}
              {product.opportunity.name}
            </Badge>
          )}

          {/* Botão de Edição Rápida para Admin */}
          {isAdmin && isAdminMode && (
            <button 
              onClick={handleEditClick}
              className="absolute top-2 right-2 bg-amber-500 text-white p-2 rounded-full shadow-lg hover:bg-amber-600 transition-all z-20 hover:scale-110 opacity-0 group-hover:opacity-100"
              title="Editar Produto"
            >
              <Pencil className="h-4 w-4" />
            </button>
          )}
        </div>
      </Link>
      
      {isAdmin && isAdminMode && (
        <AdminProductModal 
          productId={product.id}
          isOpen={isEditModalOpen}
          onOpenChange={setIsEditModalOpen}
          onSuccess={() => window.location.reload()} // Atualiza para ver mudanças
        />
      )}
      
      <CardContent className="p-2 pb-1 flex-1 flex flex-col justify-between">
        <Link href={`/produto/${product.slug}`}>
          <h3 
            className="font-bold text-[14px] sm:text-[15px] line-clamp-2 transition-colors h-10 leading-tight"
            style={{
              color: product.opportunity 
                ? (product.opportunity.title_color ? product.opportunity.title_color : (
                   product.opportunity.badge_color === 'bg-red-600' ? '#DC2626' : 
                   product.opportunity.badge_color === 'bg-amber-600' ? '#D97706' :
                   product.opportunity.badge_color === 'bg-purple-600' ? '#7C3AED' :
                   product.opportunity.badge_color === 'bg-blue-600' ? '#2563EB' :
                   product.opportunity.badge_color === 'bg-green-600' ? '#16A34A' :
                   product.opportunity.badge_color === 'bg-pink-600' ? '#DB2777' :
                   product.opportunity.badge_color === 'bg-orange-600' ? '#EA580C' :
                   product.opportunity.badge_color === 'bg-teal-600' ? '#0D9488' : 'inherit'))
                : 'inherit'
            }}
          >
            {product.name}
          </h3>
        </Link>
        <div className="mt-1 space-y-0.5">
          {product.promo_price && originalPrice ? (
            <div className="flex items-center gap-2 h-4">
              <span className="text-[10px] text-muted-foreground line-through">
                {formatCurrency(originalPrice)}
              </span>
              <span className="text-[9px] font-bold text-[#00A650] border border-[#00A650] px-1 rounded">
                {Math.floor(((originalPrice - displayPrice) / originalPrice) * 100)}% OFF
              </span>
            </div>
          ) : null}
          
          <div className="flex flex-col">
            <span className="text-xl sm:text-2xl font-bold text-[#00A650] leading-none">
              {formatCurrency(displayPrice)}
            </span>
          </div>
          <p className="text-[10px] text-muted-foreground font-semibold leading-none pt-1">
            10x de <span className="font-bold text-blue-600">{formatCurrency(displayPrice / 10)}</span> sem juros no cartão
          </p>
        </div>
      </CardContent>
      <CardFooter className="p-2 pt-0 flex flex-col gap-1 border-t-0 bg-transparent mt-auto">
        <Button 
          variant="outline" 
          size="sm" 
          className="w-full gap-2 text-[10px] border-primary text-primary hover:bg-primary hover:text-white h-8"
          onClick={handleAddToCart}
        >
          <ShoppingCart className="h-3.5 w-3.5" />
          Adicionar
        </Button>
        <Button 
          variant="default" 
          size="lg" 
          className={cn("w-full gap-2 text-xs bg-[#25D366] hover:bg-[#128C7E] text-white border-none font-bold h-10 shadow-md hover:shadow-lg transition-all", productCardStyleClasses.button_style[style.button_style])}
          onClick={handleWhatsApp}
        >
          <WhatsAppIcon className="h-4 w-4" />
          Fazer Pedido
        </Button>
      </CardFooter>
    </Card>
  )
}
