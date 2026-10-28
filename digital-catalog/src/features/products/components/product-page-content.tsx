'use client';

import { useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { ShoppingCart, ChevronRight, Pencil, Info } from 'lucide-react';

import { useCart } from '@/hooks/use-cart';
import { useAuth } from '@/hooks/use-auth';
import { useAdminMode } from '@/hooks/use-admin-mode';
import { cn } from '@/lib/utils';
import { productCardStyleClasses, getOpportunityTitleColor } from '@/lib/product-card-style';
import { Button } from '@/components/ui/button';
import { WhatsAppIcon } from '@/components/icons/whatsapp-icon';
import { Link as LinkIcon } from 'lucide-react';
import { DeliveryPickupInfo } from '@/features/products/components/delivery-pickup-info';
import { AdvantagesSection } from '@/components/sections/advantages-section';
import { PaymentInfo } from '@/features/products/components/payment-info';
import { AdminProductModal } from '@/features/products/components/admin-product-modal';
import { ProductGallery } from './ProductGallery';
import { ProductVariantSelector } from './ProductVariantSelector';
import { ProductSpecifications } from '../sections/ProductSpecifications';

import { useProductViewTracking } from '../hooks/useProductViewTracking';
import {
  useProductPageDisplayState,
  type TechnicalSpecification,
} from '../hooks/useProductPageDisplayState';
import { useProductShare } from '../hooks/useProductShare';

interface ProductPageContentProps {
  initialProduct: any;
  technicalSpecifications: TechnicalSpecification[];
  buttonStyleSetting: 'standard' | 'rounded';
}

export default function ProductPageContent({
  initialProduct,
  technicalSpecifications,
  buttonStyleSetting,
}: ProductPageContentProps) {
  const [product] = useState<any>(initialProduct);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [buttonStyle] = useState<'standard' | 'rounded'>(buttonStyleSetting);

  const { user } = useAuth();
  const { isAdminMode } = useAdminMode();
  const isAdmin = user?.email === 'matheusmorante002@gmail.com';
  const { addItem } = useCart();

  // 1. Rastreamento analítico do visitante
  useProductViewTracking(product?.id);

  // 2. Estado de exibição e cálculo de variações/medidas
  const {
    activeVarId,
    activeVariation,
    displayTitle,
    displayPrice,
    displayPromoPrice,
    displayDescription,
    displayWidth,
    displayDepth,
    displayHeight,
    displayThickness,
    displayImages,
    activeImage,
    activeIndex,
    setActiveImage,
    setActiveIndex,
    technicalSpecs,
  } = useProductPageDisplayState({
    product,
    technicalSpecifications,
  });

  // 3. Compartilhamento e WhatsApp
  const { handleWhatsApp, handleShareWhatsApp, handleCopyLink } = useProductShare({
    product,
    displayTitle,
    displayPrice,
    displayPromoPrice,
    displayWidth,
    displayDepth,
    displayHeight,
    displayThickness,
  });

  const handleAddToCart = () => {
    addItem({
      id: activeVariation ? `${product.id}-${activeVariation.id}` : product.id,
      name: displayTitle,
      price: displayPromoPrice || displayPrice,
      image: displayImages[0],
      quantity: 1,
    });
    toast.success(`${displayTitle} adicionado ao carrinho!`);
  };

  const currentOpportunity =
    product?.opportunities ||
    (product?.is_salvado ? { name: 'Salvados', slug: 'salvado' } : null);
  const oppTitleColor = getOpportunityTitleColor(currentOpportunity);
  const titleColor = oppTitleColor === 'inherit' ? 'var(--primary)' : oppTitleColor;

  return (
    <div className="bg-white min-h-screen">
      <div className="container mx-auto px-4 sm:px-8 md:px-12 lg:px-16 xl:px-24 py-6 md:py-10">
        {/* Navegação Breadcrumb */}
        <nav className="flex items-center gap-2 text-[10px] sm:text-xs text-muted-foreground mb-6 font-bold uppercase tracking-widest">
          <Link href="/" className="hover:text-primary transition-colors">
            Início
          </Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-gray-400">Produtos</span>
          <ChevronRight className="h-3 w-3" />
          <span className="text-primary truncate max-w-[150px]">{displayTitle}</span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          {/* Coluna Esquerda: Galeria de Fotos */}
          <div className="lg:col-span-6 space-y-4">
            <ProductGallery
              displayImages={displayImages}
              displayTitle={displayTitle}
              activeImage={activeImage}
              activeIndex={activeIndex}
              setActiveImage={setActiveImage}
              setActiveIndex={setActiveIndex}
            />
          </div>

          {/* Coluna Direita: Informações e Compra */}
          <div className="lg:col-span-6 flex flex-col gap-6 lg:gap-8">
            <div className="space-y-3 relative">
              <h1
                className="text-2xl sm:text-3xl font-extrabold leading-[1.1] tracking-tight pr-12 capitalize"
                style={{ color: titleColor }}
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
              <div className="h-1 w-12 bg-accent rounded-full" />

              {/* Ações de Compartilhamento Direto */}
              <div className="flex flex-wrap gap-2 pt-1 pb-2">
                <Button
                  onClick={handleShareWhatsApp}
                  variant="outline"
                  size="sm"
                  className={cn(
                    'rounded-full border-gray-200 hover:border-emerald-500/40 hover:bg-emerald-50 text-[#25D366] font-bold text-[11px] py-4 px-4 transition-all flex items-center gap-1.5',
                    productCardStyleClasses.button_style[buttonStyle]
                  )}
                >
                  <WhatsAppIcon className="h-3.5 w-3.5 shrink-0" />
                  Compartilhar no WhatsApp
                </Button>
                <Button
                  onClick={handleCopyLink}
                  variant="outline"
                  size="sm"
                  className={cn(
                    'rounded-full border-gray-200 hover:border-primary/40 hover:bg-primary/5 text-gray-700 font-bold text-[11px] py-4 px-4 transition-all flex items-center gap-1.5',
                    productCardStyleClasses.button_style[buttonStyle]
                  )}
                >
                  <LinkIcon className="h-3.5 w-3.5 shrink-0 text-primary" />
                  Copiar Link
                </Button>
              </div>

              <AdminProductModal
                productId={product?.id}
                isOpen={isEditModalOpen}
                onOpenChange={setIsEditModalOpen}
                onSuccess={() => window.location.reload()}
              />
            </div>

            <div className="bg-gray-50/50 p-4 sm:p-6 rounded-2xl border border-gray-100 space-y-5">
              <PaymentInfo
                price={displayPromoPrice || displayPrice}
                originalPrice={displayPromoPrice ? displayPrice : undefined}
              />

              <ProductVariantSelector
                product={product}
                activeVariation={activeVariation}
                activeVarId={activeVarId}
              />

              {/* Botões de Ação (Desktop) */}
              <div className="hidden lg:flex flex-col xl:flex-row gap-3 pt-2">
                <Button
                  onClick={handleAddToCart}
                  size="lg"
                  className={cn(
                    'flex-1 !h-14 py-4 bg-primary hover:bg-primary/90 text-white font-extrabold gap-2 text-sm sm:text-base transition-all shadow-md active:scale-[0.98]',
                    productCardStyleClasses.button_style[buttonStyle]
                  )}
                >
                  <ShoppingCart className="h-5 w-5 shrink-0" />
                  Adicionar ao Carrinho
                </Button>
                <Button
                  onClick={handleWhatsApp}
                  size="lg"
                  className={cn(
                    'flex-1 !h-14 py-4 bg-[#25D366] hover:bg-[#25D366]/90 text-white font-extrabold gap-2 text-sm sm:text-base shadow-md shadow-green-600/20 transition-all active:scale-[0.98]',
                    productCardStyleClasses.button_style[buttonStyle]
                  )}
                >
                  <WhatsAppIcon className="h-5 w-5 shrink-0" />
                  Fazer Pedido pelo WhatsApp
                </Button>
              </div>

              <div className="hidden lg:block h-px bg-gray-200/70 my-2" />
              <DeliveryPickupInfo />
            </div>
          </div>
        </div>

        {/* Descrição, Medidas e Especificações Técnicas */}
        <div className="mt-10 lg:mt-16 space-y-8 border-t pt-8">
          {product?.opportunities?.observations && (
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
            <div
              className={cn(
                'space-y-3',
                technicalSpecs.length > 0 ||
                  displayWidth ||
                  displayDepth ||
                  displayHeight ||
                  displayThickness
                  ? 'lg:col-span-7'
                  : 'lg:col-span-12'
              )}
            >
              <div className="flex items-center gap-2 text-primary font-bold text-sm uppercase tracking-widest border-b pb-2">
                <Info className="h-4 w-4" />
                <h2>Descrição do Produto</h2>
              </div>
              <p className="text-gray-600 leading-relaxed whitespace-pre-line text-sm">
                {displayDescription}
              </p>
            </div>

            <ProductSpecifications
              displayWidth={displayWidth}
              displayDepth={displayDepth}
              displayHeight={displayHeight}
              displayThickness={displayThickness}
              product={product}
              technicalSpecs={technicalSpecs}
            />
          </div>
        </div>

        {/* Vantagens */}
        <div className="mt-12 -mx-6 sm:-mx-10 md:-mx-16 lg:-mx-24 xl:-mx-48 pb-16 lg:pb-0">
          <AdvantagesSection />
        </div>
      </div>

      {/* Barra Fixa de Compra no Mobile */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-gray-200 p-3.5 flex gap-2.5 lg:hidden shadow-[0_-4px_25px_rgba(0,0,0,0.12)]">
        <Button
          onClick={handleAddToCart}
          size="lg"
          className={cn(
            'flex-1 !h-14 py-4 bg-primary hover:bg-primary/90 text-white font-extrabold gap-2 text-xs sm:text-sm shadow-sm active:scale-[0.98]',
            productCardStyleClasses.button_style[buttonStyle]
          )}
        >
          <ShoppingCart className="h-4.5 w-4.5 shrink-0" />
          Adicionar ao Carrinho
        </Button>
        <Button
          onClick={handleWhatsApp}
          size="lg"
          className={cn(
            'flex-1 !h-14 py-4 bg-[#25D366] hover:bg-[#25D366]/90 text-white font-extrabold gap-2 text-xs sm:text-sm shadow-md shadow-green-600/20 active:scale-[0.98]',
            productCardStyleClasses.button_style[buttonStyle]
          )}
        >
          <WhatsAppIcon className="h-4.5 w-4.5 shrink-0" />
          Fazer Pedido
        </Button>
      </div>
    </div>
  );
}
