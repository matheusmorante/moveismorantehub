import { NextResponse } from "next/server";

const allowedOrigins = new Set([
  "https://moveismorante.com.br",
  "https://www.moveismorante.com.br",
  "https://erp.moveismorante.com.br",
  "https://morantehub.vercel.app",
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:3000",
  "http://localhost:3001",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:5174",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:3001",
]);

function corsHeaders(request: Request) {
  const origin = request.headers.get("origin") || "*";
  return {
    "Access-Control-Allow-Origin": allowedOrigins.has(origin) ? origin : "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

export async function OPTIONS(request: Request) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(request) });
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const imageUrl = searchParams.get("url");

    if (!imageUrl) {
      return NextResponse.json({ error: "URL da imagem não fornecida" }, { status: 400, headers: corsHeaders(req) });
    }

    const response = await fetch(imageUrl);
    if (!response.ok) {
      return NextResponse.json({ error: `Falha ao buscar imagem: ${response.status}` }, { status: response.status, headers: corsHeaders(req) });
    }

    const contentType = response.headers.get("content-type") || "image/jpeg";
    const arrayBuffer = await response.arrayBuffer();

    return new NextResponse(arrayBuffer, {
      headers: {
        ...corsHeaders(req),
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch (error: any) {
    console.error("Erro no proxy de imagem:", error);
    return NextResponse.json({ error: error.message }, { status: 500, headers: corsHeaders(req) });
  }
}
