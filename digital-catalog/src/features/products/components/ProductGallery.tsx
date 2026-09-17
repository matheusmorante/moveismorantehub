"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import Image from "next/image"
import { ChevronLeft, ChevronRight, X, Flame } from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface ProductGalleryProps {
  displayImages: string[]
  displayTitle: string
  productOpportunities?: any
  activeImage: string
  activeIndex: number
  setActiveImage: (img: string) => void
  setActiveIndex: (idx: number) => void
}

export function ProductGallery({
  displayImages,
  displayTitle,
  productOpportunities,
  activeImage,
  activeIndex,
  setActiveImage,
  setActiveIndex
}: ProductGalleryProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState(0)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)
  
  const thumbsRef = useRef<HTMLDivElement>(null)
  const totalImages = displayImages.length

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
  }, [updateScrollBtns, displayImages])

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

  return (
    <>
      <div className="space-y-4">
        <button
          className="relative w-full aspect-[4/5] sm:aspect-square lg:aspect-[4/5] max-h-[500px] md:max-h-[600px] overflow-hidden rounded-2xl border bg-gray-50 shadow-sm block cursor-zoom-in group/main"
          onClick={() => {
            setLightboxIndex(activeIndex)
            setLightboxOpen(true)
          }}
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
          {productOpportunities && (
            <Badge className={`absolute top-4 left-4 ${productOpportunities.badge_color || 'bg-accent'} text-white font-bold px-4 py-1 text-[10px] sm:text-xs shadow-lg pointer-events-none flex items-center gap-1`}>
              {(productOpportunities.slug === "salvado" || productOpportunities.name?.toLowerCase()?.includes("salvado")) && (
                <Flame className="h-3 w-3 shrink-0" />
              )}
              {productOpportunities.name}
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
    </>
  )
}
