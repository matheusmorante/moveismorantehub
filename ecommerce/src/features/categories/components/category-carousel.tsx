"use client"

import Link from "next/link"

const CATEGORIES = [
  { name: "Sofás", slug: "sofas" },
  { name: "Colchões", slug: "colchoes" },
  { name: "Cozinhas", slug: "cozinhas" },
  { name: "Guarda-Roupas", slug: "guarda-roupas" },
  { name: "Mesas", slug: "mesas" },
  { name: "Painéis", slug: "paineis" },
  { name: "Estantes", slug: "estantes" },
  { name: "Cadeiras", slug: "cadeiras" },
  { name: "Escrivaninhas", slug: "escrivaninhas" },
  { name: "Aparadores", slug: "aparadores" },
]

export function CategoryCarousel() {
  return (
    <section className="py-12">
      <div className="container mx-auto px-6 md:px-12 flex flex-col items-center">
        <div className="flex flex-col items-center gap-4 mb-10 text-center">
          <h2 className="text-3xl font-bold tracking-tight text-primary">Todas as Categorias</h2>
          <div className="h-1 w-20 bg-accent rounded-full"></div>
        </div>
        
        <div className="flex flex-wrap justify-center gap-3 max-w-5xl">
          {CATEGORIES.map((category) => (
            <Link 
              key={category.slug} 
              href={`/categorias/${category.slug}`}
              className="px-6 py-3 rounded-full border-2 border-gray-100 bg-white hover:border-primary hover:text-primary hover:shadow-md transition-all font-bold text-sm text-muted-foreground whitespace-nowrap"
            >
              {category.name}
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
