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
    <Link href="/" className="flex items-end gap-2 sm:gap-3 group h-full relative">
      <div className="relative h-full w-18 sm:w-24 flex items-end">
        <Image
          src="/images/avatar-morante.png"
          alt="Seu Lizandro - Móveis Morante"
          fill
          sizes="(max-width: 640px) 48px, 96px"
          className="object-contain object-bottom"
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

      <span className="text-base sm:text-xl font-bold text-primary italic uppercase tracking-tighter leading-none flex flex-col sm:flex-row sm:gap-1 self-center">
        <span>Móveis</span>
        <span className="text-accent">Morante</span>
      </span>
    </Link>
  )
}
