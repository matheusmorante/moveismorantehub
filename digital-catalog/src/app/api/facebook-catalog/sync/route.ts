import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase/client"

export const dynamic = "force-dynamic"

/** Remove tags HTML e converte <br> em espaço para descrições enviadas ao Meta */
function stripHtml(html: string): string {
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

export async function POST(request: Request) {
  try {
    // 1. Buscar credenciais e configurações de integração do Meta Catalog
    const { data: catSettings, error: settingsError } = await supabase
      .from("facebook_catalog_settings")
      .select("global_description_prefix, column_mappings, meta_access_token, meta_catalog_id")
      .eq("id", true)
      .maybeSingle()

    if (settingsError || !catSettings) {
      return NextResponse.json({ error: "Configurações do catálogo Meta não encontradas no banco de dados." }, { status: 400 })
    }

    const { meta_access_token: rawToken, meta_catalog_id: rawCatalogId, global_description_prefix: globalDescPrefix, column_mappings: columnMappings } = catSettings

    const token = rawToken ? String(rawToken).trim() : ""
    const catalogId = rawCatalogId ? String(rawCatalogId).trim().replace(/\D/g, "") : ""

    if (!token || !catalogId) {
      return NextResponse.json({ error: "Access Token ou Catalog ID do Meta não configurados no painel." }, { status: 400 })
    }

    // 2. Buscar todos os produtos publicados e não deletados
    const { data: products, error: productsError } = await supabase
      .from("products")
      .select("*, product_categories(categories(name, type)), product_images(*), product_variations(*), opportunities(*)")
      .is("deleted_at", null)
      .eq("status", "published")

    if (productsError || !products) {
      return NextResponse.json({ error: productsError?.message || "Nenhum produto publicado encontrado." }, { status: 400 })
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://moveismorante.com.br"
    const origin = appUrl.includes("localhost") ? new URL(request.url).origin : appUrl.replace(/\/$/, "")

    // 3. Montar o payload da Catalog API (items_batch)
    // A API do Meta aceita até 5.000 requests por batch
    const batchRequests: any[] = []

    for (const p of products) {
      const parentCategories = p.product_categories
        ?.map((pc: any) => pc.categories)
        .filter((cat: any) => cat && cat.type === "category")
        .map((cat: any) => cat.name)
        .filter(Boolean) || []

      const googleCat = parentCategories.join(" > ") || "Furniture"
      // Ordena as imagens do produto de forma que a principal (is_main = true) fique em primeiro lugar
      const sortedImages = [...(p.product_images || [])].sort((a, b) => (b.is_main ? 1 : -1) - (a.is_main ? 1 : -1))
      const allImages = sortedImages.map((img: any) => img.image_url).filter(Boolean) || []
      const parentImage = allImages[0] || ""
      const additionalImages = allImages.slice(1).join(",")

      if (p.product_variations && p.product_variations.length > 0) {
        // Tratar as variantes como produtos individuais no Meta
        for (const v of p.product_variations) {
          const isParentPrice = v.use_parent_price !== false
          const isParentPromo = v.use_parent_promo_price !== false
          const isParentDesc = v.use_parent_description !== false
          const isParentName = v.use_parent_name !== false

          const varPrice = isParentPrice ? p.price : (v.price || p.price)
          const varPromo = isParentPromo ? p.promo_price : v.promo_price
          const varDesc = isParentDesc ? p.description : (v.description || p.description)
          let varName = isParentName ? p.name : (v.name || p.name)

          const color = v.attributes?.Cor || v.attributes?.cor || ""
          const size = v.attributes?.Tamanho || v.attributes?.tamanho || ""

          // Adiciona cor e tamanho ao título da variante para individualizar no catálogo
          const suffixParts: string[] = []
          if (color) suffixParts.push(String(color).trim())
          if (size) suffixParts.push(String(size).trim())
          if (suffixParts.length > 0) {
            varName = `${varName} - ${suffixParts.join(" / ")}`
          }

          let descWithPrefix = globalDescPrefix 
            ? `${globalDescPrefix}\n${varDesc || ""}`.trim()
            : (varDesc || "")

          if (p.opportunities && p.opportunities.observations) {
            descWithPrefix = `${descWithPrefix}\n\nAviso Importante (${p.opportunities.name}): ${p.opportunities.observations}`.trim()
          }

          descWithPrefix = stripHtml(descWithPrefix)

          let varImageLink = parentImage
          let varAdditionalImages = additionalImages

          if (v.image_url) {
            const varImagesList = v.image_url.split(",").map((url: any) => url.trim()).filter(Boolean)
            if (varImagesList.length > 0) {
              varImageLink = varImagesList[0]
              varAdditionalImages = varImagesList.slice(1).join(",")
            }
          }

          batchRequests.push({
            method: "UPDATE", // UPDATE atua como upsert por padrão (cria se não existir)
            data: {
              id: String(v.sku || v.id),
              title: varName,
              description: descWithPrefix,
              link: `${origin}/produto/${p.slug}?var=${v.id}`,
              image_link: varImageLink,
              additional_image_link: varAdditionalImages || undefined,
              availability: v.stock > 0 ? "in stock" : "out of stock",
              price: `${Number(varPrice).toFixed(2)} BRL`,
              sale_price: varPromo ? `${Number(varPromo).toFixed(2)} BRL` : undefined,
              brand: columnMappings.brand || "Móveis Morante",
              condition: columnMappings.condition || "new",
              color: color || undefined,
              gender: columnMappings.gender || "unisex",
              material: p.material || undefined,
              size: size || undefined,
              item_group_id: "", // Vazio para aparecerem como produtos individuais e separados no Meta
              identifier_exists: "no",
              quantity_to_sell_on_facebook: v.stock || 0,
              product_type: googleCat
            }
          })
        }
      } else {
        // Produto simples (sem variantes)
        let descWithPrefix = globalDescPrefix 
          ? `${globalDescPrefix}\n${p.description || ""}`.trim()
          : (p.description || "")

        if (p.opportunities && p.opportunities.observations) {
          descWithPrefix = `${descWithPrefix}\n\nAviso Importante (${p.opportunities.name}): ${p.opportunities.observations}`.trim()
        }

        descWithPrefix = stripHtml(descWithPrefix)

        const priceFormatted = `${Number(p.price).toFixed(2)} BRL`
        const salePriceFormatted = p.promo_price ? `${Number(p.promo_price).toFixed(2)} BRL` : undefined

        batchRequests.push({
          method: "UPDATE",
          data: {
            id: String(p.id),
            title: p.name,
            description: descWithPrefix,
            link: `${origin}/produto/${p.slug}`,
            image_link: parentImage,
            additional_image_link: additionalImages || undefined,
            availability: "in stock",
            price: priceFormatted,
            sale_price: salePriceFormatted,
            brand: columnMappings.brand || "Móveis Morante",
            condition: columnMappings.condition || "new",
            gender: columnMappings.gender || "unisex",
            material: p.material || undefined,
            item_group_id: "",
            identifier_exists: "no",
            quantity_to_sell_on_facebook: 10,
            product_type: googleCat
          }
        })
      }
    }

    if (batchRequests.length === 0) {
      return NextResponse.json({ message: "Nenhum produto publicado para sincronizar." })
    }

    // 4. Enviar em lote (batch) para a Catalog API do Meta
    // Endpoint: POST https://graph.facebook.com/v26.0/{catalog_id}/items_batch
    const metaApiUrl = `https://graph.facebook.com/v26.0/${catalogId}/items_batch`
    
    const formData = new URLSearchParams()
    formData.append("item_type", "PRODUCT_ITEM")
    formData.append("requests", JSON.stringify(batchRequests))

    const response = await fetch(metaApiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Authorization": `Bearer ${token}`
      },
      body: formData.toString()
    })

    const responseData = await response.json()

    if (!response.ok) {
      const metaErrorMsg = responseData?.error?.message || JSON.stringify(responseData)
      return NextResponse.json({ 
        error: `Erro do Meta: ${metaErrorMsg}`
      }, { status: response.status })
    }

    // 5. Atualizar os Conjuntos (Product Sets) correspondentes às Categorias ativas
    try {
      // Coletar nomes exclusivos das categorias de produtos sincronizados
      const categoryNames = new Set<string>()
      for (const p of products) {
        p.product_categories?.forEach((pc: any) => {
          const catName = pc.categories?.name
          const catType = pc.categories?.type
          if (catName && catType === "category") {
            categoryNames.add(catName)
          }
        })
      }

      const activeCategories = Array.from(categoryNames)

      if (activeCategories.length > 0) {
        // Buscar os conjuntos já existentes no Meta para não tentar duplicar
        const getSetsUrl = `https://graph.facebook.com/v26.0/${catalogId}/product_sets`
        const getSetsRes = await fetch(getSetsUrl, {
          headers: {
            "Authorization": `Bearer ${token}`
          }
        })
        const getSetsData = await getSetsRes.json()

        const existingSetNames = new Set<string>(
          getSetsData?.data?.map((set: any) => set.name?.toLowerCase()?.trim()).filter(Boolean) || []
        )

        // Para cada categoria ativa do nosso sistema que não tenha conjunto com o mesmo nome, cria o conjunto no Meta
        for (const catName of activeCategories) {
          const normalizedCat = catName.toLowerCase().trim()
          if (!existingSetNames.has(normalizedCat)) {
            const createSetUrl = `https://graph.facebook.com/v26.0/${catalogId}/product_sets`
            
            // Filtro dinâmico: inclui no conjunto todo produto cujo product_type seja igual ou contenha o nome da categoria
            const filterObj = {
              "product_type": {
                "i_contains": catName
              }
            }

            await fetch(createSetUrl, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
              },
              body: JSON.stringify({
                name: catName,
                filter: JSON.stringify(filterObj)
              })
            })
          }
        }
      }
    } catch (setErr: any) {
      console.warn("Erro ao tentar atualizar os conjuntos de categorias no Meta:", setErr)
      // Não bloqueia a resposta, pois os produtos em si já foram atualizados com sucesso
    }

    return NextResponse.json({
      success: true,
      message: `Produtos sincronizados (${batchRequests.length}) e conjuntos de categorias atualizados no Meta!`,
      meta_response: responseData
    })

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
