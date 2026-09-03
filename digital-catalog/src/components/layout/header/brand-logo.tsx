import Link from "next/link"
import Image from "next/image"
import { Pencil } from "lucide-react"
import { toast } from "sonner"

interface BrandLogoProps {
  isAdminMode: boolean
}

export function BrandLogo({ isAdminMode }: BrandLogoProps) {
  function handleAdminClick(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    toast.info("Em breve: Upload de imagem direto aqui!")
  }

  return (
    <Link href="/" className="flex items-center gap-2 sm:gap-3 group h-full relative py-1">
      <div className="relative h-10 sm:h-12 w-12 sm:w-14 bg-white rounded-xl shadow-xs border border-slate-100 p-0.5 overflow-hidden flex items-center justify-center group-hover:scale-105 transition-transform duration-300">
        <Image
          src="/logo-morante.png"
          alt="Móveis Morante"
          fill
          sizes="(max-width: 640px) 48px, 64px"
          className="object-contain p-0.5"
          priority
        />
      </div>

      {isAdminMode && (
        <button
          onClick={handleAdminClick}
          title="Editar imagem"
          className="absolute top-1 left-0 bg-amber-500 text-white p-1 rounded-full shadow-lg z-30 hover:scale-110 transition-all opacity-0 group-hover:opacity-100"
        >
          <Pencil className="h-3 w-3" />
        </button>
      )}

      <div className="flex flex-col self-center">
        <span className="text-base sm:text-lg font-black text-primary uppercase tracking-tight leading-none">
          Móveis <span className="text-accent">Morante</span>
        </span>
        <span className="text-[8px] sm:text-[9px] font-bold text-muted-foreground uppercase tracking-widest leading-none mt-1">
          Qualidade que cabe no seu bolso
        </span>
      </div>
    </Link>
  )
}
