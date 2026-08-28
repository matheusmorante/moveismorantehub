import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase/client"

export const dynamic = "force-dynamic"

function normalizeMetaImageUrl(urlStr: any): string {
  if (!urlStr) return ""
  const str = String(urlStr).trim()
  
  // Mantém URLs públicas de origem. A antiga conversão de Supabase para R2
  // descartava o caminho do arquivo e gerava links 404 para imagens ainda não
  // migradas ao R2, que o Meta não consegue baixar.
  try {
    const decoded = decodeURI(str)
    return encodeURI(decoded).replace(/%2520/g, '%20').replace(/\s+/g, '%20')
  } catch (e) {
    return str.replace(/\s+/g, '%20')
  }
}

function stripHtml(html: string): string {
  if (!html) return ""
  let text = html
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<\/p\s*>/gi, " ")
    .replace(/<\/div\s*>/gi, " ")
    .replace(/<\/li\s*>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[\r\n]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
  return text
}

// Helper para tratar valores do CSV sem quebrar linhas na estrutura do arquivo
function formatCsvValue(val: any): string {
  if (val === null || val === undefined) return ""
  let str = String(val).replace(/[\r\n]+/g, " ").trim()
  
  if (/[",]/.test(str)) {
    str = `"${str.replace(/"/g, '""')}"`
  }
  return str
}

export async function GET(request: Request) {
  try {
    // Buscar todos os produtos publicados, ativos e não deletados
    const { data: products, error } = await supabase
      .from("products")
      .select("*, product_categories(categories(name, type)), product_images(*), product_variations(*), opportunities(*)")
      .is("deleted_at", null)
      .eq("status", "published")

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Buscar configurações do catálogo
    let globalDescriptionPrefix = ""
    let columnMappings: Record<string, string> = {
      brand: "Móveis Morante",
      condition: "new",
      gender: "unisex",
      age_group: "adult"
    }

    try {
      const { data: catSettings } = await supabase
        .from("facebook_catalog_settings")
        .select("global_description_prefix, column_mappings")
        .eq("id", true)
        .maybeSingle()

      if (catSettings) {
        if (catSettings.global_description_prefix) {
          globalDescriptionPrefix = catSettings.global_description_prefix
        }
        if (catSettings.column_mappings) {
          columnMappings = { ...columnMappings, ...catSettings.column_mappings }
        }
      }
    } catch (dbErr) {
      console.warn("facebook_catalog_settings não pôde ser lido, usando fallbacks:", dbErr)
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://moveismorante.com.br"
    const origin = appUrl.includes("localhost") ? new URL(request.url).origin : appUrl.replace(/\/$/, "")

    // Cabeçalho idêntico ao modelo wix do cliente
    const headers = [
      "id",
      "title",
      "description",
      "link",
      "image_link",
      "additional_image_link",
      "availability",
      "rich_text_description",
      "price",
      "sale_price",
      "brand",
      "condition",
      "color",
      "gender",
      "material",
      "size",
      "item_group_id",
      "identifier_exists",
      "quantity_to_sell_on_facebook",
      "product_type",
      "custom_label_0"
    ]

    const rows: string[][] = []

    for (const p of (products || [])) {
      // Produtos publicados entram no feed mesmo quando marcados como inativos
      // no ERP. Apenas ocultos, rascunhos ou removidos ficam fora do catálogo.
      if (p.status !== 'published' || p.is_draft || p.deleted || p.deleted_at) {
        continue
      }

      // Filtra apenas categorias reais (type = 'category') e ignora ambientes (type = 'environment')
      const parentCategories = p.product_categories
        ?.map((pc: any) => pc.categories)
        .filter((cat: any) => cat && cat.type === "category")
        .map((cat: any) => cat.name)
        .filter(Boolean) || []

      const environments = p.product_categories
        ?.map((pc: any) => pc.categories)
        .filter((cat: any) => cat && cat.type === "environment")
        .map((cat: any) => cat.name)
        .filter(Boolean) || []

      let productType = ""
      if (environments.length > 0 && parentCategories.length > 0) {
        productType = `${environments[0]} > ${parentCategories[0]}`
      } else if (parentCategories.length > 0) {
        productType = parentCategories[0]
      } else if (environments.length > 0) {
        productType = environments[0]
      } else {
        productType = "Furniture"
      }
      
      // Ordena as imagens do produto de forma que a principal (is_main = true) fique em primeiro lugar
      const sortedImages = [...(p.product_images || [])].sort((a, b) => (b.is_main ? 1 : -1) - (a.is_main ? 1 : -1))
      const allImages = sortedImages.map((img: any) => img.image_url).filter(Boolean) || []
      const parentImage = allImages[0] || (Array.isArray(p.images) ? p.images[0] : "") || ""
      const additionalImages = allImages.slice(1).join(",") || (Array.isArray(p.images) ? p.images.slice(1).join(",") : "")

      const priceFormatted = `${Number(p.price || p.unit_price || 0).toFixed(2)} BRL`
      const salePriceFormatted = p.promo_price ? `${Number(p.promo_price).toFixed(2)} BRL` : ""

      // Suporte a variações relacionais e variações no formato JSON
      let variationsList: any[] = []
      if (p.product_variations && p.product_variations.length > 0) {
        variationsList = p.product_variations.filter((v: any) => (v.status === "published" || !v.status) && v.active !== false)
      } else if (p.variations) {
        const rawVars = Array.isArray(p.variations) ? p.variations : (typeof p.variations === 'string' ? JSON.parse(p.variations || '[]') : [])
        variationsList = rawVars.filter((v: any) => v.status !== "hidden" && v.active !== false)
      }

      // Caso tenha variações ativas e publicadas
      if (variationsList.length > 0) {
        for (const v of variationsList) {
          // Ignorar variações ocultas ou inativas
          if ((v.status && v.status !== "published" && v.status === "hidden") || v.active === false) {
            continue
          }

          const isParentPrice = v.use_parent_price !== false
          const isParentPromo = v.use_parent_promo_price !== false
          const isParentDesc = v.use_parent_description !== false
          const isParentName = v.use_parent_name !== false

          const varPrice = isParentPrice ? p.price : (v.price || p.price)
          const varPromo = isParentPromo ? p.promo_price : v.promo_price
          const varDesc = isParentDesc ? p.description : (v.description || p.description)
          let varName = isParentName ? p.name : (v.name || p.name)

          // Pegar cor e tamanho das propriedades de attributes se houver
          const color = v.attributes?.Cor || v.attributes?.cor || ""
          const size = v.attributes?.Tamanho || v.attributes?.tamanho || ""

          // Adiciona cor e tamanho ao título da variante para individualizar no catálogo
          const suffixParts: string[] = []
          if (color) suffixParts.push(String(color).trim())
          if (size) suffixParts.push(String(size).trim())
          if (suffixParts.length > 0) {
            varName = `${varName} - ${suffixParts.join(" / ")}`
          }

          // Se a variação tiver imagem própria, trata se houver lista separada por vírgula
          let varImageLink = normalizeMetaImageUrl(parentImage)
          let varAdditionalImages = additionalImages.split(',').map(normalizeMetaImageUrl).filter(Boolean).join(',')

          if (v.image_url) {
            const varImagesList = v.image_url.split(",").map((url: any) => url.trim()).filter(Boolean)
            if (varImagesList.length > 0) {
              varImageLink = normalizeMetaImageUrl(varImagesList[0])
              varAdditionalImages = varImagesList.slice(1).map(normalizeMetaImageUrl).filter(Boolean).join(",")
            }
          }

          // Adicionar prefixo global e posicionar o aviso de oportunidade entre o prefixo e a descrição
          const descParts: string[] = []
          if (globalDescriptionPrefix) {
            descParts.push(globalDescriptionPrefix)
          }
          if (p.opportunities && p.opportunities.observations) {
            descParts.push(`***Aviso Importante (${p.opportunities.name}): ${p.opportunities.observations}***`)
          }
          if (varDesc) {
            descParts.push(varDesc)
          }
          let descWithPrefix = stripHtml(descParts.join("\n\n"))

          rows.push([
            v.sku || v.id, // id
            varName, // title
            descWithPrefix, // description
            `${origin}/produto/${p.slug}?var=${v.id}`, // link
            varImageLink, // image_link
            varAdditionalImages, // additional_image_link
            "in stock", // availability
            descWithPrefix, // rich_text_description
            `${Number(varPrice).toFixed(2)} BRL`, // price
            varPromo ? `${Number(varPromo).toFixed(2)} BRL` : "", // sale_price
            columnMappings.brand || "Móveis Morante", // brand
            p.is_salvado ? "refurbished" : "new", // condition (refurbished se for salvado, senão new)
            color, // color
            columnMappings.gender || "unisex", // gender
            p.material || "", // material
            size, // size
            "", // item_group_id
            "no", // identifier_exists
            "1", // quantity_to_sell_on_facebook
            productType, // product_type
            productType // custom_label_0 (ambiente > categoria)
          ])
        }
      } else {
        // Sem variações, insere apenas o produto pai
        const descParts: string[] = []
        if (globalDescriptionPrefix) {
          descParts.push(globalDescriptionPrefix)
        }
        if (p.opportunities && p.opportunities.observations) {
          descParts.push(`***Aviso Importante (${p.opportunities.name}): ${p.opportunities.observations}***`)
        }
        if (p.description) {
          descParts.push(p.description)
        }
        let descWithPrefix = stripHtml(descParts.join("\n\n"))

        rows.push([
          p.id, // id
          p.name, // title
          descWithPrefix, // description
          `${origin}/produto/${p.slug}`, // link
          normalizeMetaImageUrl(parentImage), // image_link
          additionalImages.split(',').map(normalizeMetaImageUrl).filter(Boolean).join(','), // additional_image_link
          "in stock", // availability
          descWithPrefix, // rich_text_description
          priceFormatted, // price
          salePriceFormatted, // sale_price
          columnMappings.brand || "Móveis Morante", // brand
          p.is_salvado ? "refurbished" : "new", // condition (refurbished se for salvado, senão new)
          "", // color
          columnMappings.gender || "unisex", // gender
          p.material || "", // material
          "", // size
          "", // item_group_id
          "no", // identifier_exists
          "1", // quantity_to_sell_on_facebook
          productType, // product_type
          productType // custom_label_0 (ambiente > categoria)
        ])
      }
    }

    // Gerar o corpo do arquivo separado por VÍRGULAS (CSV legítimo)
    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(formatCsvValue).join(","))
    ].join("\n")

    return new Response(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": "attachment; filename=catalog_products.csv",
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        "Pragma": "no-cache",
        "Expires": "0"
      }
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
