import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { ChevronRight, Menu, Flame } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { NAV_LINKS } from "./constants"
import { useSubHeaderData } from "../sub-header/use-sub-header-data"

function NavItem({ href, label, icon: Icon, onClick }: (typeof NAV_LINKS)[number] & { onClick?: () => void }) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="flex items-center justify-between p-3 rounded-2xl border border-transparent hover:border-primary/10 hover:bg-primary/5 hover:shadow-sm transition-all group"
    >
      <div className="flex items-center gap-4">
        <div className="flex items-center justify-center h-10 w-10 rounded-xl bg-gray-100 group-hover:bg-primary group-hover:text-white transition-colors text-gray-500">
          <Icon className="h-5 w-5" />
        </div>
        <span className="text-base font-bold text-gray-700 group-hover:text-primary transition-colors">
          {label}
        </span>
      </div>
      <ChevronRight className="h-5 w-5 text-gray-300 group-hover:text-primary group-hover:translate-x-1 transition-all" />
    </Link>
  )
}

function DrawerHeader() {
  return (
    <div className="p-6 border-b bg-gray-50/50 flex items-center gap-3">
      <div className="h-10 w-10 bg-primary/10 rounded-xl flex items-center justify-center">
        <Image
          src="/images/avatar-morante.png"
          alt="Morante"
          width={32}
          height={32}
          sizes="32px"
          className="object-contain"
        />
      </div>
      <div>
        <p className="font-black text-primary leading-none uppercase tracking-tighter">Móveis</p>
        <span className="text-xs font-bold text-accent uppercase tracking-widest">Morante</span>
      </div>
    </div>
  )
}

function DrawerFooter() {
  return (
    <div className="p-6 border-t bg-gray-50/30 text-center">
      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
        Móveis Morante © 2024
      </p>
    </div>
  )
}

export function MobileMenu() {
  const [open, setOpen] = useState(false)
  const { environments } = useSubHeaderData()

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="lg:hidden hover:bg-primary/5 rounded-full w-12 h-12 sm:w-14 sm:h-14 shrink-0 flex items-center justify-center">
          <Menu className="h-7 w-7 sm:h-8 sm:w-8 text-primary" />
          <span className="sr-only">Menu</span>
        </Button>
      </SheetTrigger>

      <SheetContent side="left" className="w-[300px] border-r-0 shadow-2xl p-0">
        <div className="flex flex-col h-full bg-white">
          <DrawerHeader />
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Links Institucionais */}
            <nav className="space-y-2">
              {NAV_LINKS.map((link) => (
                <NavItem key={link.href} {...link} onClick={() => setOpen(false)} />
              ))}
            </nav>

            {/* Ambientes / Categorias */}
            {environments.length > 0 && (
              <div className="pt-4 border-t border-gray-100">
                <p className="px-3 text-xs font-black text-muted-foreground uppercase tracking-widest mb-3">
                  Navegar por Ambientes
                </p>
                <div className="space-y-1.5">
                  {/* Atalho especial de Salvados */}
                  <Link
                    href="/?type=salvados"
                    onClick={() => setOpen(false)}
                    className="flex items-center justify-between p-2 px-3 rounded-xl bg-orange-50 hover:bg-orange-100 text-orange-600 transition-all text-sm font-black group"
                  >
                    <div className="flex items-center gap-2">
                      <Flame className="h-4 w-4 fill-current text-orange-500 animate-pulse" />
                      <span>QUEIMA DOS SALVADOS</span>
                    </div>
                    <ChevronRight className="h-4 w-4 text-orange-400 group-hover:translate-x-0.5 transition-transform" />
                  </Link>

                  {/* Ambientes Dinâmicos */}
                  {environments.map((env) => (
                    <Link
                      key={env.id}
                      href={`/?envs=${env.id}`}
                      onClick={() => setOpen(false)}
                      className="flex items-center justify-between p-2 px-3 rounded-xl hover:bg-primary/5 text-gray-700 hover:text-primary transition-all text-sm font-bold group"
                    >
                      <span>{env.name}</span>
                      <ChevronRight className="h-4 w-4 text-gray-300 group-hover:translate-x-0.5 transition-transform" />
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
          <DrawerFooter />
        </div>
      </SheetContent>
    </Sheet>
  )
}
