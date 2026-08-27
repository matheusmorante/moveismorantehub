"use client"

import { useEffect, useState } from "react"
import { Search, Loader2, Compass, Tag, ChevronRight, Package } from "lucide-react"
import Link from "next/link"
import Image from "next/image"

import { Button } from "@/components/ui/button"
import { useAdminMode } from "@/hooks/use-admin-mode"
import { useCart } from "@/hooks/use-cart"
import { slugifyCategory } from "@/lib/slug-utils"

import { BrandLogo } from "./brand-logo"
import { MobileMenu } from "./mobile-menu"
import { DesktopSearchBar, SearchInput } from "./search-bar"
import { CartButton } from "./cart-button"
import { useSearch } from "./use-search"
import { UserNav } from "../user-nav"

export function Header() {
  const { totalItems } = useCart()
  const { isAdminMode } = useAdminMode()
  const [mounted, setMounted] = useState(false)
  const search = useSearch()

  useEffect(() => { setMounted(true) }, [])

  return (
    <header className="w-full border-b border-gray-100 bg-white shrink-0">
      <div className="container mx-auto flex h-16 sm:h-24 items-center justify-between px-4 sm:px-8 md:px-12 lg:px-16 xl:px-24 gap-4">

        <div className="flex items-center gap-3 h-full shrink-0">
          <MobileMenu />
          <BrandLogo isAdminMode={isAdminMode} />
        </div>

        <DesktopSearchBar
          query={search.query}
          setQuery={search.setQuery}
          onSubmit={search.submit}
          searchContainerRef={search.searchContainerRef}
          showSuggestions={search.showSuggestions}
          setShowSuggestions={search.setShowSuggestions}
          loadingSuggestions={search.loadingSuggestions}
          suggestions={search.suggestions}
        />

        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          <UserNav />
          <CartButton mounted={mounted} itemCount={totalItems()} />
        </div>
      </div>

      {/* Linha de Busca no Mobile - Sempre Visível */}
      <div ref={search.searchContainerRef as any} className="lg:hidden px-6 pb-4 pt-2 border-t border-gray-100/50 bg-white flex flex-col justify-center items-center relative">
        <form onSubmit={search.submit} className="flex w-full max-w-md items-center">
          <SearchInput
            value={search.query}
            onChange={search.setQuery}
            inputRef={search.inputRef}
            onFocus={() => {
              if (search.query.trim().length >= 2) {
                search.setShowSuggestions(true)
              }
            }}
          />
        </form>

        {/* Sugestões no Mobile */}
        {search.showSuggestions && (
          <div className="w-full max-w-md mt-2 bg-white border border-gray-100 rounded-2xl overflow-hidden max-h-[300px] flex flex-col shadow-lg z-50 absolute top-full left-1/2 -translate-x-1/2">
            {search.loadingSuggestions ? (
              <div className="p-4 flex items-center justify-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                <span className="text-xs font-semibold">Buscando...</span>
              </div>
            ) : (
              <div className="overflow-y-auto divide-y divide-gray-100">
                {search.query.trim().length >= 2 && (
                  <Link
                    href={`/?search=${encodeURIComponent(search.query.trim())}#produtos`}
                    onClick={() => search.setShowSuggestions(false)}
                    className="w-full text-left px-4 py-2.5 flex items-center justify-start gap-2 text-xs font-black text-red-600 border-b border-gray-100 bg-red-50/40"
                  >
                    <Search className="h-4 w-4 text-red-600 shrink-0" />
                    <span>Buscar por &quot;{search.query.trim()}&quot; em todo o catálogo</span>
                  </Link>
                )}

                {search.suggestions.environments.map(env => (
                  <Link
                    key={env.id}
                    href={`/?envs=${env.slug || slugifyCategory(env) || env.id}#produtos`}
                    onClick={() => search.setShowSuggestions(false)}
                    className="w-full text-left px-4 py-2 flex items-center justify-start gap-2 text-xs font-bold text-gray-700 capitalize hover:bg-primary/5"
                  >
                    <Compass className="h-4 w-4 text-primary shrink-0" />
                    <span>{env.name}</span>
                  </Link>
                ))}

                {search.suggestions.categories.map(cat => (
                  <Link
                    key={cat.id}
                    href={`/?cats=${cat.slug || slugifyCategory(cat) || cat.id}#produtos`}
                    onClick={() => search.setShowSuggestions(false)}
                    className="w-full text-left px-4 py-2 flex items-center justify-start gap-2 text-xs font-bold text-gray-700 capitalize hover:bg-red-50/60"
                  >
                    <Tag className="h-4 w-4 text-red-600 shrink-0" />
                    <span>{cat.name}</span>
                  </Link>
                ))}

                {search.suggestions.products.map(prod => (
                  <Link
                    key={prod.id}
                    href={`/produto/${prod.slug}`}
                    onClick={() => search.setShowSuggestions(false)}
                    className="flex items-center gap-3 p-2 hover:bg-gray-50 text-left transition"
                  >
                    <div className="relative h-8 w-8 rounded overflow-hidden border shrink-0 bg-gray-50">
                      {prod.image ? (
                        <Image src={prod.image} alt={prod.name} fill className="object-cover" />
                      ) : (
                        <Package className="h-3 w-3 m-auto text-gray-300" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs font-bold text-gray-800 truncate">{prod.name}</h4>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {prod.promo_price ? (
                          <>
                            <span className="text-xs font-black text-red-600">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(prod.promo_price)}</span>
                            <span className="text-[9px] text-muted-foreground line-through">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(prod.price)}</span>
                          </>
                        ) : (
                          <span className="text-xs font-black text-red-600">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(prod.price)}</span>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  )
}
