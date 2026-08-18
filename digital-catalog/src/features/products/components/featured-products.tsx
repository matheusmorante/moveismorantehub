import { ProductGrid } from "./product-grid"

const MOCK_PRODUCTS = [
  {
    id: "1",
    name: "Sofá Retrátil e Reclinável 2.30m Marrom",
    slug: "sofa-retratil-marrom",
    price: 1899.90,
    image: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?q=80&w=800",
    category: "Sofás",
    promotion: true
  },
  {
    id: "2",
    name: "Cozinha Modulada 5 Peças Branca/Carvalho",
    slug: "cozinha-modulada-branca",
    price: 2450.00,
    image: "https://images.unsplash.com/photo-1556911220-e15b29be8c8f?q=80&w=800",
    category: "Cozinhas"
  },
  {
    id: "3",
    name: "Cama Box Casal + Colchão de Molas Ensacadas",
    slug: "cama-box-casal",
    price: 1299.00,
    image: "https://images.unsplash.com/photo-1505693314120-0d443867891c?q=80&w=800",
    category: "Colchões",
    promotion: true
  },
  {
    id: "4",
    name: "Guarda-Roupa Casal 6 Portas com Espelho",
    slug: "guarda-roupa-casal",
    price: 1599.00,
    image: "https://images.unsplash.com/photo-1595428774223-ef52624120d2?q=80&w=800",
    category: "Quartos"
  }
]

interface FeaturedProductsProps {
  title?: string
  headerAction?: React.ReactNode
}

export function FeaturedProducts({ title = "Produtos em Destaque", headerAction }: FeaturedProductsProps) {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl md:text-3xl font-bold text-primary">{title}</h2>
        {headerAction && <div>{headerAction}</div>}
      </div>
      <ProductGrid />
    </div>
  )
}
