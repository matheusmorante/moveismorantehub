import { NextResponse } from "next/server"
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"

const s3Client = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
  },
  forcePathStyle: true,
})

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
  ...(process.env.UPLOAD_ALLOWED_ORIGINS || "").split(",").map(origin => origin.trim()).filter(Boolean),
])

function corsHeaders(request: Request) {
  const origin = request.headers.get("origin") || ""
  return allowedOrigins.has(origin)
    ? { "Access-Control-Allow-Origin": origin, "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type" }
    : {}
}

export async function OPTIONS(request: Request) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(request) })
}

export async function POST(req: Request) {
  try {
    const origin = req.headers.get("origin")
    if (origin && !allowedOrigins.has(origin)) {
      return NextResponse.json({ error: "Origem não autorizada." }, { status: 403 })
    }

    const { fileName, contentType } = await req.json()

    if (!fileName || !contentType) {
      return NextResponse.json({ error: "fileName e contentType são obrigatórios." }, { status: 400, headers: corsHeaders(req) })
    }

    const bucketName = process.env.R2_BUCKET_NAME || ""
    const publicUrlBase = process.env.NEXT_PUBLIC_R2_PUBLIC_URL || ""

    if (!bucketName || !process.env.CLOUDFLARE_ACCOUNT_ID || !process.env.R2_ACCESS_KEY_ID || !process.env.R2_SECRET_ACCESS_KEY) {
      return NextResponse.json({ error: "Configurações do Cloudflare R2 estão ausentes no servidor." }, { status: 500, headers: corsHeaders(req) })
    }

    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: fileName,
      ContentType: contentType,
    })

    // Gera a URL assinada válida por 5 minutos (300 segundos)
    const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 300 })
    
    // A URL pública final da imagem (remove barras extras no final do domínio se houver)
    const fileUrl = `${publicUrlBase.replace(/\/$/, "")}/${fileName}`

    return NextResponse.json({ uploadUrl, fileUrl }, { headers: corsHeaders(req) })
  } catch (error: any) {
    console.error("Erro ao gerar presigned URL R2:", error)
    return NextResponse.json({ error: error.message }, { status: 500, headers: corsHeaders(req) })
  }
}
