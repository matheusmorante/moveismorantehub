import { Database } from "@/types/database"

type ProductRow = Database["public"]["Tables"]["products"]["Row"]

export interface MetaProductData {
  id: string
  title: string
  description: string
  price: string
  sale_price?: string
  image_url: string
  url: string
  availability: "in stock" | "out of stock"
  brand: string
  condition: "new" | "refurbished" | "used"
}

export interface MetaBatchRequest {
  method: "CREATE" | "UPDATE" | "DELETE"
  retailer_id: string
  data?: Partial<MetaProductData>
}

/**
 * Envia um lote de atualizações de produtos para a API do Catálogo da Meta
 */
export async function sendMetaCatalogBatch(requests: MetaBatchRequest[]) {
  const accessToken = process.env.META_ACCESS_TOKEN ? String(process.env.META_ACCESS_TOKEN).trim() : ""
  const catalogId = process.env.META_CATALOG_ID ? String(process.env.META_CATALOG_ID).trim().replace(/\D/g, "") : ""

  if (!accessToken || !catalogId) {
    console.warn("Meta Catalog API: META_ACCESS_TOKEN ou META_CATALOG_ID não configurados.")
    return { success: false, message: "Credenciais da Meta não configuradas no servidor." }
  }

  if (requests.length === 0) {
    return { success: true, message: "Nenhuma requisição de lote enviada." }
  }

  const url = `https://graph.facebook.com/v26.0/${catalogId}/items_batch`

  try {
    const formData = new URLSearchParams()
    formData.append("item_type", "PRODUCT_ITEM")
    formData.append("requests", JSON.stringify(requests))

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Bearer ${accessToken}`,
      },
      body: formData.toString(),
    })

    const result = await response.json()

    if (!response.ok) {
      console.error("Erro na API de Catálogo da Meta:", result)
      return {
        success: false,
        error: result.error || result,
        message: result.error?.message || "Falha ao enviar lote para a Meta.",
      }
    }

    return {
      success: true,
      handle: result.handles?.[0] || null,
      message: "Lote de produtos enviado com sucesso para a Meta.",
    }
  } catch (error: any) {
    console.error("Erro ao conectar com a API da Meta:", error)
    return {
      success: false,
      error,
      message: error.message || "Erro de conexão com a API da Meta.",
    }
  }
}

/**
 * Mapeia um produto do banco de dados para a estrutura aceita pela Meta
 */
export function mapProductToMeta(
  product: ProductRow & { opportunities?: any },
  mainImageUrl: string | null
): MetaProductData {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://moveismorante.com.br"
  
  // Imagem padrão caso o produto não tenha nenhuma imagem
  const imageUrl = mainImageUrl || `${appUrl}/placeholder-product.png`
  
  const productUrl = `${appUrl.replace(/\/$/, "")}/produto/${product.slug}`

  let baseDescription = product.description || product.name
  if (product.opportunities && product.opportunities.observations) {
    baseDescription = `${baseDescription}\n\nAviso Importante (${product.opportunities.name}): ${product.opportunities.observations}`.trim()
  }

  const data: MetaProductData = {
    id: product.id,
    title: product.name,
    description: stripHtml(baseDescription),
    price: `${Number(product.price).toFixed(2)} BRL`,
    image_url: imageUrl,
    url: productUrl,
    availability: product.status === "published" ? "in stock" : "out of stock",
    brand: "Móveis Morante",
    condition: product.is_salvado ? "refurbished" : "new",
  }

  if (product.promo_price && product.promo_price > 0 && product.promo_price < product.price) {
    data.sale_price = `${Number(product.promo_price).toFixed(2)} BRL`
  }

  return data;
}

export function stripHtml(html: string): string {
  if (!html) return ""
  let text = html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p\s*>/gi, "\n")
    .replace(/<\/div\s*>/gi, "\n")
    .replace(/<\/li\s*>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
  return text.trim()
}
