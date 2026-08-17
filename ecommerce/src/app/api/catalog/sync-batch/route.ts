import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase/client"
import { sendMetaCatalogBatch, mapProductToMeta, MetaBatchRequest } from "@/services/meta-catalog"

export async function POST(req: Request) {
  try {
    const { productId, action } = await req.json()

    if (!productId || !action) {
      return NextResponse.json(
        { error: "productId e action ('CREATE' | 'UPDATE' | 'DELETE') são obrigatórios." },
        { status: 400 }
      )
    }

    if (action === "DELETE") {
      const requests: MetaBatchRequest[] = [
        {
          method: "DELETE",
          retailer_id: productId,
        },
      ]

      const result = await sendMetaCatalogBatch(requests)
      return NextResponse.json(result)
    }

    // Para CREATE ou UPDATE, buscar os dados completos do produto no banco
    const { data: product, error: productError } = await supabase
      .from("products")
      .select("*, opportunities(*)")
      .eq("id", productId)
      .single()

    if (productError || !product) {
      return NextResponse.json(
        { error: `Produto não encontrado: ${productError?.message || ""}` },
        { status: 404 }
      )
    }

    // Buscar a imagem principal ou qualquer imagem do produto
    const { data: images } = await supabase
      .from("product_images")
      .select("image_url, is_main")
      .eq("product_id", productId)

    const mainImage = images?.find((img) => img.is_main)?.image_url || images?.[0]?.image_url || null

    const mappedData = mapProductToMeta(product, mainImage)

    const requests: MetaBatchRequest[] = [
      {
        method: action,
        retailer_id: productId,
        data: mappedData,
      },
    ]

    const result = await sendMetaCatalogBatch(requests)
    return NextResponse.json(result)
  } catch (error: any) {
    console.error("Erro na rota de sincronização do catálogo Meta:", error)
    return NextResponse.json({ error: error.message || "Erro interno do servidor." }, { status: 500 })
  }
}
