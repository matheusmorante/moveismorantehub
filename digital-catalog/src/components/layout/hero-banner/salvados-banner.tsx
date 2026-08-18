import Image from "next/image"
import { Flame } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

interface SalvadosBannerProps {
  onAction?: (type: string) => void
}

function BackgroundEffects() {
  return (
    <>
      <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]" />
      <div className="absolute top-0 right-0 w-32 h-32 md:w-96 md:h-96 bg-yellow-400/20 rounded-full blur-[40px] md:blur-[100px] -mr-10 -mt-10 animate-pulse" />
    </>
  )
}

function DesktopImage() {
  return (
    <div className="absolute bottom-0 right-0 md:right-[5%] h-[120%] w-[38%] md:w-[42%] flex items-end justify-center select-none pointer-events-none z-20">
      <div className="absolute bottom-0 right-4 w-32 h-32 md:w-80 md:h-80 bg-yellow-400/25 rounded-full blur-[40px] md:blur-[80px]" />
      <div className="absolute top-[15%] right-[12%] text-yellow-300 text-sm md:text-3xl animate-spin" style={{ animationDuration: "6s" }}>✦</div>
      <div className="absolute top-[30%] right-[4%] text-white/60 text-xs md:text-xl animate-bounce" style={{ animationDelay: "0.5s" }}>✦</div>
      <div className="absolute top-[20%] left-[8%] text-yellow-400 text-sm md:text-2xl animate-pulse">★</div>
      <div className="h-full w-auto flex items-end justify-center overflow-visible">
        <Image 
          src="/images/mulheruau.png" 
          alt="Promoção Salvados" 
          width={600} 
          height={720} 
          priority
          className="object-contain h-[100%] w-auto max-w-none object-bottom" 
        />
      </div>
    </div>
  )
}

function SalvadosContent({ onAction }: SalvadosBannerProps) {
  return (
    <div className="w-[62%] xs:w-[78%] sm:w-[62%] md:w-[55%] flex-none space-y-2 md:space-y-3 text-left py-0.5 md:py-1 z-10">
      <div className="flex justify-start">
        <Badge className="bg-yellow-400 text-black font-black px-1.5 py-0.5 md:px-5 md:py-2 rounded-full animate-bounce text-[7px] xs:text-[12px] md:text-sm lg:text-base">
          <Flame className="h-2 w-2 md:h-5 md:w-5 mr-0.5 md:mr-2 fill-current" />
          PEÇAS ÚNICAS
        </Badge>
      </div>

      <h1 className="text-[12px] xs:text-[10px] sm:text-2xl md:text-3xl lg:text-3xl xl:text-3xl font-black text-white leading-[0.95] tracking-tighter uppercase drop-shadow-2xl">
        Mega Queima <br className="hidden xs:inline" />
        <span className="text-yellow-400">dos Salvados</span>
      </h1>

      <div className="space-y-0.5 md:space-y-1 max-w-xl lg:max-w-2xl">
        <p className="text-white text-[8px] xs:text-[13px] sm:text-base md:text-lg lg:text-2xl xl:text-5xl font-black leading-tight uppercase">
          Móveis com avarias e até{" "}
          <span className="text-yellow-400 bg-black/20 px-1 py-0.5 rounded text-[8px] xs:text-[13px] sm:text-base md:text-2xl lg:text-2xl xl:text-3xl font-black">50% OFF!</span>
        </p>
        <p className="text-white/85 text-[7px] xs:text-[10px] sm:text-xs lg:text-base xl:text-2xl font-medium border-l border-yellow-400 pl-1.5 md:pl-4 italic text-left max-w-xs sm:max-w-md lg:max-w-lg">
          &quot;Produtos funcionais com descontos agressivos por detalhes estéticos.&quot;
        </p>
      </div>

      <div className="pt-0.5 md:pt-2">
        <Button
          onClick={(e) => {
            e.stopPropagation()
            onAction?.("salvados")
          }}
          size="lg"
          className="w-fit bg-yellow-400 text-black px-2 py-0.5 sm:px-8 h-6 xs:h-8 sm:h-10 md:h-14 rounded-full font-black text-[7px] xs:text-[11px] sm:text-xs md:text-lg hover:bg-white transition-all shadow-2xl shadow-yellow-400/20 hover:-translate-y-0.5 flex items-center justify-center gap-0.5 sm:gap-2"
        >
          <Flame className="h-2 w-2 sm:h-4 sm:w-4 md:h-5 md:w-5" />
          CONFIRA
        </Button>
      </div>
    </div>
  )
}

export function SalvadosBanner({ onAction }: SalvadosBannerProps) {
  return (
    <div
      onClick={() => onAction?.("salvados")}
      className="relative w-full overflow-hidden bg-gradient-to-br from-orange-600 via-red-700 to-black flex items-center aspect-[16/7] sm:aspect-[1920/620] min-h-[160px] sm:min-h-[300px] cursor-pointer hover:brightness-[1.03] transition-all duration-300 group/banner"
    >
      <BackgroundEffects />
      <div className="container mx-auto px-3 sm:px-8 md:px-12 lg:px-16 relative z-10 flex flex-row items-center h-full py-1">
        <SalvadosContent onAction={onAction} />
        <DesktopImage />
      </div>
    </div>
  )
}
