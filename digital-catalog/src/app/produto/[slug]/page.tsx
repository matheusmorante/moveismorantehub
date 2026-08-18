import { Metadata } from "next"
import { supabase } from "@/lib/supabase/client"
import ProductPageContent from "@/features/products/components/product-page-content"
import { stripHtml } from "@/services/meta-catalog"

interface Props {
  params: Promise<{ slug: string }>
}

// Função para buscar dados compartilhada entre generateMetadata e o componente
async function getProductData(slug: string) {
  const [prodRes, styleRes] = await Promise.all([
    supabase
      .from("products")
      .select("*, product_images(*), opportunities(*), product_variations(*)")
      .eq("slug", slug)
      .maybeSingle(),
    supabase
      .from("store_style_settings")
      .select("button_style")
      .eq("id", true)
      .maybeSingle()
  ])

  if (prodRes.error || !prodRes.data) {
    return null
  }

  const { data: specifications } = await supabase
    .from("technical_specifications")
    .select("name, slug")
    .order("name")

  const data = prodRes.data
  const sortedImages = (data.product_images || [])
    .sort((a: any, b: any) => (b.is_main ? 1 : -1) - (a.is_main ? 1 : -1))
  
  const imageUrls = sortedImages.length > 0 
    ? sortedImages.map((img: any) => img.image_url)
    : ["https://images.unsplash.com/photo-1594462250122-b2d99d3d0f3c?q=80&w=800"]

  return {
    product: {
      ...data,
      images: imageUrls,
      variations: data.product_variations || []
    },
    technicalSpecifications: specifications || [],
    buttonStyle: (styleRes.data?.button_style || "standard") as "standard" | "rounded"
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const data = await getProductData(slug)
  
  if (!data || !data.product) {
    return {
      title: "Produto não encontrado | Móveis Morante"
    }
  }

  const product = data.product
  const title = `${product.name} | Móveis Morante`
  const rawDescription = product.description || "Encontre os melhores móveis em Curitiba na Móveis Morante."
  const description = stripHtml(rawDescription)
  const mainImage = product.images?.[0] || ""
  
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://moveismorante.com.br"
  const baseUrl = appUrl.replace(/\/$/, "")

  // Utiliza URL absoluta para a imagem de Preview
  const imageUrl = mainImage.startsWith("http") 
    ? mainImage 
    : `${baseUrl}${mainImage}`

  // Passa imagens do R2 e do Facebook CDN pelo proxy próprio do site para evitar bloqueios de crawler do WhatsApp
  const ogImageUrl = (imageUrl.includes("r2.dev") || imageUrl.includes("fbcdn.net"))
    ? `${baseUrl}/api/og-image?url=${encodeURIComponent(imageUrl)}`
    : imageUrl

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      url: `${baseUrl}/produto/${slug}`,
      images: [
        {
          url: ogImageUrl,
          width: 800,
          height: 800,
          alt: product.name,
        }
      ],
      siteName: "Móveis Morante",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImageUrl],
    }
  }
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params
  const data = await getProductData(slug)

  if (!data) {
    return (
      <ProductPageContent 
        initialProduct={null} 
        technicalSpecifications={[]} 
        buttonStyleSetting="standard" 
      />
    )
  }

  return (
    <ProductPageContent 
      initialProduct={data.product}
      technicalSpecifications={data.technicalSpecifications}
      buttonStyleSetting={data.buttonStyle}
    />
  )
}
