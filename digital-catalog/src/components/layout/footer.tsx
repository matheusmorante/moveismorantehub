import Link from "next/link"
import { Facebook, Instagram, Phone, MapPin } from "lucide-react"

export function Footer() {
  return (
    <footer className="bg-primary text-primary-foreground py-10 md:py-12">
      <div className="container mx-auto px-4 sm:px-8 md:px-12 lg:px-16 xl:px-24 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8">
        <div className="space-y-4">
          <h3 className="text-xl font-bold italic">MÓVEIS <span className="text-accent">MORANTE</span></h3>
          <p className="text-sm text-primary-foreground/70">
            Móveis de qualidade para transformar sua casa em um lar. Tradição e confiança em cada detalhe.
          </p>
          <div className="flex gap-4">
            <Link href="#" className="hover:text-accent transition-colors"><Facebook className="h-5 w-5" /></Link>
            <Link href="#" className="hover:text-accent transition-colors"><Instagram className="h-5 w-5" /></Link>
          </div>
        </div>

        <div className="space-y-4">
          <h4 className="font-bold">Navegação</h4>
          <ul className="space-y-2 text-sm text-primary-foreground/70">
            <li><Link href="/" className="hover:text-accent transition-colors">Início</Link></li>
            <li><Link href="/sobre" className="hover:text-accent transition-colors">Sobre Nós</Link></li>
            <li><Link href="/produtos" className="hover:text-accent transition-colors">Todos os Produtos</Link></li>
            <li><Link href="/contato" className="hover:text-accent transition-colors">Contato</Link></li>
          </ul>
        </div>

        <div className="space-y-4">
          <h4 className="font-bold">Categorias</h4>
          <ul className="space-y-2 text-sm text-primary-foreground/70">
            <li><Link href="/categorias/sofas" className="hover:text-accent transition-colors">Sofás</Link></li>
            <li><Link href="/categorias/colchoes" className="hover:text-accent transition-colors">Colchões</Link></li>
            <li><Link href="/categorias/cozinhas" className="hover:text-accent transition-colors">Cozinhas</Link></li>
            <li><Link href="/categorias/quartos" className="hover:text-accent transition-colors">Quartos</Link></li>
          </ul>
        </div>

        <div className="space-y-4">
          <h4 className="font-bold">Contato</h4>
          <ul className="space-y-2 text-sm text-primary-foreground/70">
            <li className="flex items-center gap-2"><Phone className="h-4 w-4" /> (41) 99749-3547</li>
            <li className="flex items-center gap-2"><MapPin className="h-4 w-4" /> Rua Cascavel, 306, Guaraituba, Colombo - PR</li>
          </ul>
        </div>
      </div>
      <div className="container mx-auto px-4 sm:px-8 md:px-12 lg:px-16 xl:px-24 mt-10 md:mt-12 pt-6 md:pt-8 border-t border-primary-foreground/10 text-center text-xs text-primary-foreground/50">
        &copy; {new Date().getFullYear()} Móveis Morante. Todos os direitos reservados.
      </div>
    </footer>
  )
}
