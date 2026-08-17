import Image from "next/image"
import { Pencil } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import type { Banner } from "./types"

interface DefaultBannerProps {
  banner: Banner
  isAdminMode: boolean
}

const OVERLAY_GRADIENT = "linear-gradient(to right, rgb(0 0 0 / .8), rgb(0 0 0 / .4), transparent)"

function AdminEditButton() {
  return (
    <button
      onClick={() => toast.info("Em breve: Edição de textos do banner direto aqui!")}
      className="absolute -top-4 -right-8 bg-amber-500 text-white p-1.5 rounded-full shadow-lg z-30 opacity-0 group-hover/hero:opacity-100 transition-all hover:scale-110"
    >
      <Pencil className="h-3 w-3" />
    </button>
  )
}

export function DefaultBanner({ banner, isAdminMode }: DefaultBannerProps) {
  const plainTitle = banner.title.replace(/<[^>]*>/g, "")

  return (
    <div className="relative w-full overflow-hidden aspect-[3/1] min-h-[160px]">
      <Image
        src={banner.image}
        alt={plainTitle}
        fill
        priority
        className="object-cover scale-105 group-hover/hero:scale-110 transition-transform duration-[10s] ease-out"
      />

      <div className="absolute inset-0 flex items-center" style={{ backgroundImage: OVERLAY_GRADIENT }}>
        <div className="container mx-auto px-4 sm:px-8 md:px-12 lg:px-16 xl:px-24 space-y-[1vw] md:space-y-8 pt-[1vw]">
          <div className="relative inline-block">
            {isAdminMode && <AdminEditButton />}
            <h1
              className="text-[3.2vw] sm:text-4xl md:text-7xl lg:text-8xl xl:text-9xl font-extrabold text-white max-w-4xl leading-[1.05] tracking-tighter"
              dangerouslySetInnerHTML={{ __html: banner.title }}
            />
          </div>

          <p className="text-[1.8vw] sm:text-base md:text-2xl lg:text-3xl text-white/90 max-w-2xl font-semibold leading-relaxed">
            {banner.subtitle}
          </p>

          <Button
            asChild
            size="lg"
            className="bg-accent text-accent-foreground hover:bg-accent/90 font-bold px-3 sm:px-12 h-[4.5vw] sm:h-16 rounded-full text-[1.6vw] sm:text-xl shadow-xl shadow-accent/20 transition-all hover:shadow-accent/40 flex items-center justify-center w-fit"
          >
            <a href={banner.link}>{banner.buttonText}</a>
          </Button>
        </div>
      </div>
    </div>
  )
}
