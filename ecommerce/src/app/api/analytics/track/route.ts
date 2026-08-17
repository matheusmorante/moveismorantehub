import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export const dynamic = "force-dynamic"

// Instancia um cliente do Supabase usando as credenciais públicas
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
const supabase = createClient(supabaseUrl, supabaseAnonKey)

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { product_id, visitor_id, referer } = body

    if (!product_id || !visitor_id) {
      return NextResponse.json({ error: "Parâmetros inválidos" }, { status: 400 })
    }

    // 1. Detectar o IP
    let ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1"

    // Se for IP de desenvolvimento, simula um IP real de Curitiba/PR para testar a localização
    if (ip === "127.0.0.1" || ip === "::1" || ip.startsWith("10.") || ip.startsWith("192.168.")) {
      ip = "186.220.192.1" // IP real do PR
    }

    // 2. Detectar Localização (prioriza os cabeçalhos do Vercel Edge, senão usa GeoIP API)
    let city = request.headers.get("x-vercel-ip-city") || ""
    let region = request.headers.get("x-vercel-ip-country-region") || ""
    let country = request.headers.get("x-vercel-ip-country") || ""

    if (!city && ip && ip !== "127.0.0.1") {
      try {
        const geoRes = await fetch(`http://ip-api.com/json/${ip}?fields=status,country,region,city`)
        const geoData = await geoRes.json()
        if (geoData.status === "success") {
          city = geoData.city || ""
          region = geoData.region || ""
          country = geoData.country || ""
        }
      } catch (geoErr) {
        console.error("Erro ao buscar GeoIP:", geoErr)
      }
    }

    // 3. Registrar no Supabase
    const { error } = await supabase.from("product_analytics").insert({
      product_id,
      visitor_id,
      ip_address: ip,
      country: country || "BR",
      region: region || "PR",
      city: city || "Curitiba",
      referer: referer || "Tráfego Direto"
    })

    if (error) {
      // Se a tabela não existir ainda no banco de dados, retorna erro informativo
      if (error.code === "42P01") {
        return NextResponse.json({ 
          error: "Tabela product_analytics não encontrada. Por favor execute a migration SQL no Supabase.",
          code: "MIGRATION_REQUIRED"
        }, { status: 500 })
      }
      throw error
    }

    return NextResponse.json({ success: true, geo: { city, region, country, ip } })
  } catch (err: any) {
    console.error("Erro no track API:", err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
