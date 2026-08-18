import { Home, Info, Package, Star } from "lucide-react"

export const SEARCH_PLACEHOLDER = "Buscar móveis, ambientes..."

export const NAV_LINKS = [
  { href: "/",            label: "Início",    icon: Home    },
  { href: "/#produtos",   label: "Produtos",  icon: Package },
  { href: "/#avaliacoes", label: "Clientes",  icon: Star    },
  { href: "/sobre",       label: "Sobre Nós", icon: Info    },
] as const
