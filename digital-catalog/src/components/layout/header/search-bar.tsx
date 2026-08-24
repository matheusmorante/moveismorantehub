import { Search, X, Loader2, Compass, Tag, ChevronRight, Package } from "lucide-react"
import { Button } from "@/components/ui/button"
import { SEARCH_PLACEHOLDER } from "./constants"
import { formatCurrency } from "@/lib/utils"
import Image from "next/image"
import Link from "next/link"

interface SearchInputProps {
  value: string
  onChange: (v: string) => void
  inputRef?: React.RefObject<HTMLInputElement | null>
  className?: string
  onFocus?: () => void
}

export function SearchInput({ value, onChange, inputRef, className = "", onFocus }: SearchInputProps) {
  return (
    <div className="relative flex-1">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" />
      <input
        ref={inputRef}
        type="search"
        placeholder={SEARCH_PLACEHOLDER}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={onFocus}
        className={`w-full h-11 pl-10 pr-4 rounded-full border border-gray-200 bg-gray-50 text-sm
          focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all ${className}`}
      />
    </div>
  )
}

interface DesktopSearchBarProps {
  query: string
  setQuery: (v: string) => void
  onSubmit: (e: React.FormEvent) => void
  searchContainerRef: React.RefObject<HTMLDivElement | null>
  showSuggestions: boolean
  setShowSuggestions: (v: boolean) => void
  loadingSuggestions: boolean
  suggestions: {
    environments: any[]
    categories: any[]
    products: any[]
  }
}

export function DesktopSearchBar({ 
  query, 
  setQuery, 
  onSubmit, 
  searchContainerRef,
  showSuggestions,
  setShowSuggestions,
  loadingSuggestions,
  suggestions 
}: DesktopSearchBarProps) {
  return (
    <div ref={searchContainerRef} className="hidden lg:block flex-1 max-w-xl mx-6 relative">
      <form onSubmit={onSubmit} className="relative w-full">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none z-10" />
        <input
          type="search"
          placeholder={SEARCH_PLACEHOLDER}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => {
            if (query.trim().length >= 2) {
              setShowSuggestions(true)
            }
          }}
          className="w-full h-11 pl-11 pr-4 rounded-full border border-gray-200 bg-gray-50 text-sm
            focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all placeholder:text-gray-400"
        />
      </form>

      {/* Dropdown de Sugestões Inteligentes */}
      {showSuggestions && (
        <div className="absolute top-full left-0 right-0 z-50 mt-2 bg-white border border-gray-100 rounded-2xl shadow-xl overflow-hidden max-h-[380px] flex flex-col animate-in fade-in slide-in-from-top-2 duration-150">
          {loadingSuggestions ? (
            <div className="p-5 flex items-center justify-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              <span className="text-xs font-semibold">Buscando sugestões...</span>
            </div>
          ) : (
            <div className="overflow-y-auto divide-y divide-gray-100">
              {/* Ambientes */}
              {suggestions.environments.length > 0 && (
                <div className="p-3">
                  <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest block mb-1.5 px-2">Ambientes</span>
                  <div className="space-y-0.5">
                    {suggestions.environments.map(env => (
                      <Link
                        key={env.id}
                        href={`/?envs=${env.id}#produtos`}
                        onClick={() => setShowSuggestions(false)}
                        className="w-full text-left px-3 py-1.5 rounded-lg hover:bg-primary/5 flex items-center justify-between group transition-colors text-xs font-bold text-gray-700 capitalize"
                      >
                        <div className="flex items-center gap-2">
                          <Compass className="h-4 w-4 text-primary" />
                          <span>{env.name}</span>
                        </div>
                        <ChevronRight className="h-3.5 w-3.5 text-gray-300 group-hover:text-primary transition-colors" />
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Categorias */}
              {suggestions.categories.length > 0 && (
                <div className="p-3">
                  <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest block mb-1.5 px-2">Categorias</span>
                  <div className="space-y-0.5">
                    {suggestions.categories.map(cat => (
                      <Link
                        key={cat.id}
                        href={`/?cats=${cat.id}#produtos`}
                        onClick={() => setShowSuggestions(false)}
                        className="w-full text-left px-3 py-1.5 rounded-lg hover:bg-accent/5 flex items-center justify-between group transition-colors text-xs font-bold text-gray-700 capitalize"
                      >
                        <div className="flex items-center gap-2">
                          <Tag className="h-4 w-4 text-accent" />
                          <span>{cat.name}</span>
                        </div>
                        <ChevronRight className="h-3.5 w-3.5 text-gray-300 group-hover:text-accent transition-colors" />
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Produtos */}
              {suggestions.products.length > 0 && (
                <div className="p-3">
                  <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest block mb-1.5 px-2">Produtos</span>
                  <div className="space-y-1.5">
                    {suggestions.products.map(prod => (
                      <Link
                        key={prod.id}
                        href={`/produto/${prod.slug}`}
                        onClick={() => setShowSuggestions(false)}
                        className="flex items-center gap-3 p-1.5 rounded-lg hover:bg-gray-50 transition-colors group"
                      >
                        <div className="relative h-9 w-9 rounded-lg overflow-hidden border shrink-0 bg-gray-50">
                          {prod.image ? (
                            <Image src={prod.image} alt={prod.name} fill className="object-cover" />
                          ) : (
                            <Package className="h-4 w-4 m-auto text-gray-300" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-xs font-bold text-gray-800 truncate group-hover:text-primary transition-colors">{prod.name}</h4>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            {prod.promo_price ? (
                              <>
                                <span className="text-xs font-black text-accent">{formatCurrency(prod.promo_price)}</span>
                                <span className="text-[9px] text-muted-foreground line-through">{formatCurrency(prod.price)}</span>
                              </>
                            ) : (
                              <span className="text-xs font-bold text-gray-500">{formatCurrency(prod.price)}</span>
                            )}
                          </div>
                        </div>
                        <ChevronRight className="h-3.5 w-3.5 text-gray-300 group-hover:text-primary transition-colors shrink-0" />
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Sem resultados */}
              {suggestions.environments.length === 0 && suggestions.categories.length === 0 && suggestions.products.length === 0 && (
                <div className="p-6 text-center text-muted-foreground">
                  <Package className="h-6 w-6 text-gray-300 mx-auto mb-1" />
                  <p className="text-xs font-bold">Nenhuma sugestão encontrada</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

interface MobileSearchOverlayProps {
  query: string
  setQuery: (v: string) => void
  inputRef: React.RefObject<HTMLInputElement | null>
  onSubmit: (e: React.FormEvent) => void
  onClose: () => void
  searchContainerRef: React.RefObject<HTMLDivElement | null>
  showSuggestions: boolean
  setShowSuggestions: (v: boolean) => void
  loadingSuggestions: boolean
  suggestions: {
    environments: any[]
    categories: any[]
    products: any[]
  }
}

export function MobileSearchOverlay({ 
  query, 
  setQuery, 
  inputRef, 
  onSubmit, 
  onClose,
  searchContainerRef,
  showSuggestions,
  setShowSuggestions,
  loadingSuggestions,
  suggestions 
}: MobileSearchOverlayProps) {
  return (
    <div ref={searchContainerRef} className="lg:hidden absolute inset-x-0 top-full bg-white border-b border-gray-100 shadow-lg z-50 px-4 py-3 animate-in slide-in-from-top-2 duration-200">
      <form onSubmit={onSubmit} className="flex gap-2 items-center">
        <SearchInput 
          value={query} 
          onChange={setQuery} 
          inputRef={inputRef} 
          onFocus={() => {
            if (query.trim().length >= 2) {
              setShowSuggestions(true)
            }
          }}
        />
        <Button type="button" variant="ghost" size="icon" className="rounded-full shrink-0" onClick={onClose}>
          <X className="h-5 w-5" />
        </Button>
      </form>

      {/* Sugestões no Mobile */}
      {showSuggestions && (
        <div className="mt-2 bg-white border border-gray-50 rounded-xl overflow-hidden max-h-[300px] flex flex-col shadow-inner">
          {loadingSuggestions ? (
            <div className="p-4 flex items-center justify-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              <span className="text-xs font-semibold">Buscando...</span>
            </div>
          ) : (
            <div className="overflow-y-auto divide-y divide-gray-100">
              {suggestions.environments.map(env => (
                <Link
                  key={env.id}
                  href={`/?envs=${env.id}#produtos`}
                  onClick={() => {
                    setShowSuggestions(false)
                    onClose()
                  }}
                  className="w-full text-left px-4 py-2 flex items-center justify-between text-xs font-bold text-gray-700 capitalize"
                >
                  <span className="flex items-center gap-2"><Compass className="h-4 w-4 text-primary" />{env.name}</span>
                  <ChevronRight className="h-3.5 w-3.5 text-gray-300" />
                </Link>
              ))}

              {suggestions.categories.map(cat => (
                <Link
                  key={cat.id}
                  href={`/?cats=${cat.id}#produtos`}
                  onClick={() => {
                    setShowSuggestions(false)
                    onClose()
                  }}
                  className="w-full text-left px-4 py-2 flex items-center justify-between text-xs font-bold text-gray-700 capitalize"
                >
                  <span className="flex items-center gap-2"><Tag className="h-4 w-4 text-accent" />{cat.name}</span>
                  <ChevronRight className="h-3.5 w-3.5 text-gray-300" />
                </Link>
              ))}

              {suggestions.products.map(prod => (
                <Link
                  key={prod.id}
                  href={`/produto/${prod.slug}`}
                  onClick={() => {
                    setShowSuggestions(false)
                    onClose()
                  }}
                  className="flex items-center gap-3 p-2 hover:bg-gray-50 text-left"
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
                  </div>
                  <ChevronRight className="h-3.5 w-3.5 text-gray-300 shrink-0" />
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
