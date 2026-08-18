"use client"

import { useAdminMode } from "@/hooks/use-admin-mode"
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel"

import { BANNERS } from "./constants"
import { SalvadosBanner } from "./salvados-banner"
import { DefaultBanner } from "./default-banner"
import type { Banner } from "./types"

interface HeroBannerProps {
  onAction?: (type: string) => void
}

function BannerItem({ banner, isAdminMode, onAction }: { banner: Banner; isAdminMode: boolean; onAction?: (type: string) => void }) {
  if (banner.type === "salvados") {
    return <SalvadosBanner onAction={onAction} />
  }
  return <DefaultBanner banner={banner} isAdminMode={isAdminMode} />
}

function CarouselControls() {
  return (
    <div className="hidden md:block">
      <CarouselPrevious className="left-4 md:left-8 bg-white/10 hover:bg-white/20 text-white border-white/20 h-10 w-10 md:h-12 md:w-12" />
      <CarouselNext className="right-4 md:right-8 bg-white/10 hover:bg-white/20 text-white border-white/20 h-10 w-10 md:h-12 md:w-12" />
    </div>
  )
}

export function HeroBanner({ onAction }: HeroBannerProps) {
  const { isAdminMode } = useAdminMode()

  return (
    <section className="w-full relative group/hero overflow-hidden">
      <Carousel className="w-full" opts={{ loop: true }}>
        <CarouselContent>
          {BANNERS.map((banner) => (
            <CarouselItem key={banner.id}>
              <BannerItem banner={banner} isAdminMode={isAdminMode} onAction={onAction} />
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselControls />
      </Carousel>
    </section>
  )
}
