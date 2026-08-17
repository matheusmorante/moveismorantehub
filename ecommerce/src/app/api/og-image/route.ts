import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const imageUrl = searchParams.get("url")

    if (!imageUrl) {
      return new Response("Parâmetro URL ausente", { status: 400 })
    }

    // Apenas permite fazer proxy de imagens do nosso bucket R2 do Cloudflare ou domínios conhecidos por segurança
    if (!imageUrl.includes("r2.dev") && !imageUrl.includes("moveismorante.com.br") && !imageUrl.includes("fbcdn.net")) {
      return new Response("Domínio não autorizado para proxy", { status: 403 })
    }

    const response = await fetch(imageUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
      next: { revalidate: 86400 } // Cache no Next.js por 24 horas
    })

    if (!response.ok) {
      return new Response("Erro ao buscar a imagem de origem", { status: response.status })
    }

    const contentType = response.headers.get("content-type") || "image/jpeg"
    const buffer = await response.arrayBuffer()

    return new Response(buffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable", // Cache de 1 ano no navegador/CDN
      },
    })
  } catch (error: any) {
    console.error("Erro no proxy de imagem OG:", error)
    return new Response("Erro interno do servidor", { status: 500 })
  }
}
