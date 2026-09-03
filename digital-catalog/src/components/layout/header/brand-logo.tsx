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
    <Link href="/" className="flex items-center group h-full relative py-0.5 sm:py-1">
      <div className="relative h-full w-32 sm:w-44 md:w-56 max-h-14 sm:max-h-20 md:max-h-22 flex items-center justify-center transition-transform duration-300 group-hover:scale-105">
        <Image
          src="/logo-morante.png"
          alt="Móveis Morante - Qualidade que cabe no seu bolso"
          fill
          sizes="(max-width: 640px) 140px, (max-width: 768px) 180px, 230px"
          className="object-contain object-left sm:object-center"
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
    </Link>
  )
}
