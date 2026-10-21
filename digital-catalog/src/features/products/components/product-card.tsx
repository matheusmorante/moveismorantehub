'use client';

import { useState } from 'react';
import Link from 'next/link';
import { CatalogProductImage } from '@/components/ui/CatalogProductImage';
import { ShoppingCart, Pencil, Flame, Zap } from 'lucide-react';
import { WhatsAppIcon } from '@/components/icons/whatsapp-icon';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useCart } from '@/hooks/use-cart';
import { useAuth } from '@/hooks/use-auth';
import { useAdminMode } from '@/hooks/use-admin-mode';
import { cn, formatCurrency } from '@/lib/utils';
import { sendProductInterest } from '@/services/whatsapp';
import { toast } from 'sonner';
import { AdminProductModal } from '@/features/products/components/admin-product-modal';
import {
  defaultProductCardStyle,
  ProductCardStyle,
  productCardStyleClasses,
  getOpportunityTitleColor,
} from '@/lib/product-card-style';

interface ProductCardProps {
  product: {
    id: string;
    name: string;
    slug: string;
    price: number;
    promo_price?: number;
    image: string;
    category: string;
    promotion?: boolean;
    opportunity?: {
      name: string;
      slug?: string;
      badge_color: string;
      border_color: string;
      border_style?: string;
      badge_animation?: string;
      title_color?: string;
    } | null;
  };
  style?: ProductCardStyle;
}

export function ProductCard({ product, style = defaultProductCardStyle }: ProductCardProps) {
  const { addItem } = useCart();
  const { user } = useAuth();
  const { isAdminMode } = useAdminMode();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const isAdmin = user?.email === 'matheusmorante002@gmail.com';

  const displayPrice = product.promo_price || product.price;
  const originalPrice = product.promo_price ? product.price : undefined;
  const handleEditClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsEditModalOpen(true);
  };

  const discount = originalPrice
    ? Math.round(((originalPrice - displayPrice) / originalPrice) * 100)
    : 0;

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    addItem({
      id: product.id,
      name: product.name,
      price: displayPrice,
      image: product.image,
      quantity: 1,
    });
    toast.success(`${product.name} adicionado ao carrinho!`);
  };

  const handleWhatsApp = (e: React.MouseEvent) => {
    e.preventDefault();
    sendProductInterest(product.name);
  };

  // Mapeamento dinâmico de estilo de borda
  const getBorderStyleClass = (style?: string) => {
    switch (style) {
      case 'dashed':
        return 'border-dashed border-2';
      case 'dotted':
        return 'border-dotted border-2';
      case 'double':
        return 'border-double border-4';
      case 'solid':
      default:
        return 'border-solid border-2';
    }
  };

  // Mapeamento dinâmico de animação
  const getAnimationClass = (animation?: string) => {
    switch (animation) {
      case 'none':
        return '';
      case 'bounce':
        return 'animate-bounce';
      case 'subtle':
        return '';
      case 'highlighted':
        return 'animate-pulse';
      case 'pulse':
      default:
        return 'animate-pulse';
    }
  };

  const isSalvados =
    product.opportunity?.slug === 'salvado' ||
    product.opportunity?.name?.toLowerCase()?.includes('salvado');
  const isMegaLiquidacaoLastUnit =
    /últimas?\s+unidades?/i.test(product.opportunity?.name || '') &&
    !/mostru[aá]rio/i.test(product.opportunity?.name || '');
  const isMegaLiquidacao =
    isMegaLiquidacaoLastUnit ||
    product.opportunity?.slug === 'liquidacao' ||
    product.opportunity?.name?.toLowerCase()?.includes('liquida');
  const opportunityBadgeBackground = product.opportunity
    ? getOpportunityTitleColor({
        name: product.opportunity.name,
        badge_color: product.opportunity.badge_color,
      })
    : 'inherit';

  const borderClass = 'border-none shadow-xs hover:shadow-md';

  return (
    <Card
      className={cn(
        'group min-w-0 overflow-hidden bg-white text-left transition-all duration-300 relative h-full flex flex-col',
        borderClass,
        productCardStyleClasses.border_radius[style.border_radius]
      )}
    >
      <Link href={`/produto/${product.slug}`} className="block w-full min-w-0">
        <div className="relative aspect-[4/3] overflow-hidden bg-gray-50/30 p-3 sm:p-4">
          <div className="relative w-full h-full">
            <CatalogProductImage
              src={product.image}
              alt={product.name}
              size="medium"
              fill
              className="object-contain"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
          </div>
          {/* Botão de Edição Rápida para Admin */}
          {isAdmin && isAdminMode && (
            <button
              onClick={handleEditClick}
              className={cn(
                'absolute right-2 bg-amber-500 text-white p-2 rounded-full shadow-lg hover:bg-amber-600 transition-all z-20 hover:scale-110 opacity-0 group-hover:opacity-100',
                product.opportunity ? 'top-9' : 'top-2'
              )}
              title="Editar Produto"
            >
              <Pencil className="h-4 w-4" />
            </button>
          )}
        </div>
      </Link>

      {product.opportunity && (
        <Badge
          className={cn(
            'pointer-events-none absolute top-0 inset-x-0 w-full font-black px-3 py-2 h-auto min-h-[30px] rounded-none shadow-xs z-10 text-[11px] uppercase tracking-normal border-0 border-b flex items-center justify-center gap-1.5 [&>svg]:size-3.5! [&>svg]:shrink-0',
            isSalvados
              ? 'bg-orange-500 text-white border-orange-600/30'
              : isMegaLiquidacao
                ? isMegaLiquidacaoLastUnit
                  ? 'bg-amber-400 text-black border-red-600'
                  : 'bg-amber-400 text-black border-amber-500/30'
                : 'text-white border-white/20',
            getAnimationClass(product.opportunity.badge_animation || style.opportunity_emphasis)
          )}
          style={
            isSalvados || isMegaLiquidacao || opportunityBadgeBackground === 'inherit'
              ? undefined
              : { backgroundColor: opportunityBadgeBackground }
          }
        >
          {isSalvados && <Flame className="size-3.5 shrink-0 text-white fill-white" />}
          {isMegaLiquidacao && <Zap className="size-3.5 shrink-0 fill-current text-black" />}
          {isMegaLiquidacaoLastUnit ? (
            <span className="flex flex-col items-center justify-center text-center normal-case tracking-normal leading-[1.05]">
              <span
                className="text-black font-black uppercase text-[11px] leading-none [text-box:trim-both_cap_alphabetic]"
                style={{ textBox: 'trim-both cap alphabetic' }}
              >
                Mega Liquidação
              </span>
              <span
                className="text-red-600 font-black uppercase text-[10px] leading-none mt-0.5 [text-box:trim-both_cap_alphabetic]"
                style={{ textBox: 'trim-both cap alphabetic' }}
              >
                Última Unidade
              </span>
            </span>
          ) : (
            <span
              className="inline-flex items-center leading-none tracking-normal [text-box:trim-both_cap_alphabetic]"
              style={{ textBox: 'trim-both cap alphabetic' }}
            >
              {product.opportunity.name}
            </span>
          )}
        </Badge>
      )}

      {isAdmin && isAdminMode && (
        <AdminProductModal
          productId={product.id}
          isOpen={isEditModalOpen}
          onOpenChange={setIsEditModalOpen}
          onSuccess={() => window.location.reload()} // Atualiza para ver mudanças
        />
      )}

      <CardContent className="min-w-0 p-2 pb-1 flex-1 flex flex-col justify-between">
        <Link href={`/produto/${product.slug}`} className="block min-w-0">
          <h3
            className="w-full line-clamp-2 break-words font-bold text-[14px] leading-snug transition-colors sm:text-[15px] lg:text-base [overflow-wrap:anywhere]"
            aria-label={product.name}
            title={product.name}
            style={{
              color: getOpportunityTitleColor(product.opportunity),
            }}
          >
            {product.name}
          </h3>
        </Link>
        <div className="mt-1 space-y-0.5">
          {product.promo_price && originalPrice ? (
            <div className="flex min-h-4 flex-wrap items-center gap-x-2 gap-y-1">
              <span className="shrink-0 whitespace-nowrap text-[10px] text-muted-foreground line-through">
                {formatCurrency(originalPrice)}
              </span>
              <span
                className={cn(
                  'shrink-0 whitespace-nowrap rounded border px-1 text-[9px] font-bold',
                  isSalvados
                    ? 'border-orange-500 text-orange-500'
                    : 'border-[#00A650] text-[#00A650]'
                )}
              >
                {Math.floor(((originalPrice - displayPrice) / originalPrice) * 100)}% OFF
              </span>
            </div>
          ) : null}

          <div className="flex flex-col">
            <span className="whitespace-nowrap text-lg font-bold leading-none text-[#00A650] sm:text-xl lg:text-2xl">
              {formatCurrency(displayPrice)}
            </span>
          </div>
          <p className="break-words pt-1 text-[10px] font-semibold leading-snug text-muted-foreground">
            10x de{' '}
            <span className="font-bold text-blue-600">{formatCurrency(displayPrice / 10)}</span> sem
            juros no cartão
          </p>
        </div>
      </CardContent>
      <CardFooter className="min-w-0 p-2 pt-0 flex flex-col gap-1 border-t-0 bg-transparent mt-auto">
        <Button
          variant="outline"
          size="sm"
          className="h-auto min-h-8 w-full justify-center gap-1 whitespace-normal px-1 py-2 text-center text-[10px] leading-tight border-primary text-primary hover:bg-primary hover:text-white sm:gap-2"
          onClick={handleAddToCart}
        >
          <ShoppingCart className="h-3.5 w-3.5 shrink-0" />
          Adicionar
        </Button>
        <Button
          variant="default"
          size="lg"
          className={cn(
            'h-auto min-h-10 w-full justify-center gap-1 whitespace-normal px-1 py-2 text-center text-[10px] leading-tight bg-[#25D366] hover:bg-[#128C7E] text-white border-none font-bold shadow-md hover:shadow-lg transition-all sm:gap-2 sm:text-xs',
            productCardStyleClasses.button_style[style.button_style]
          )}
          onClick={handleWhatsApp}
        >
          <WhatsAppIcon className="h-4 w-4 shrink-0" />
          Fazer Pedido
        </Button>
      </CardFooter>
    </Card>
  );
}
