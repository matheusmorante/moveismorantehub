'use client';

import { useState } from 'react';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';

import { ResponsiveBanner } from './responsive-banner';
import type { StorefrontCarouselBanner } from '@/features/carousel-banners';

interface HeroBannerProps {
  responsiveBanners?: StorefrontCarouselBanner[];
}

function CarouselControls() {
  return (
    <div className="hidden md:block">
      <CarouselPrevious className="left-4 md:left-8 bg-white/10 hover:bg-white/20 text-white border-white/20 h-10 w-10 md:h-12 md:w-12" />
      <CarouselNext className="right-4 md:right-8 bg-white/10 hover:bg-white/20 text-white border-white/20 h-10 w-10 md:h-12 md:w-12" />
    </div>
  );
}

export function HeroBanner({ responsiveBanners = [] }: HeroBannerProps) {
  const [unavailable, setUnavailable] = useState<string[]>([]);
  const banners = responsiveBanners
    .map((banner) => ({ banner, version: Object.values(banner.images).join(' ') }))
    .filter(({ version }) => !unavailable.includes(version));
  if (banners.length === 0) return null;

  return (
    <section aria-label="Banners do catálogo" className="w-full relative group/hero overflow-hidden">
      <Carousel className="w-full" opts={{ loop: banners.length > 1 }}>
        <CarouselContent>
          {banners.map(({ banner, version }, index) => (
            <CarouselItem key={banner.id}>
              <ResponsiveBanner banner={banner} first={index === 0} onError={() => {
                setUnavailable((previous) => previous.includes(version) ? previous : [...previous, version]);
              }} />
            </CarouselItem>
          ))}
        </CarouselContent>
        {banners.length > 1 && <CarouselControls />}
      </Carousel>
    </section>
  );
}
