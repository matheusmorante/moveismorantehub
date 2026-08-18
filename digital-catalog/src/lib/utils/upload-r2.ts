/**
 * Envia um arquivo para o Cloudflare R2 usando a rota de API de Presigned URLs.
 * 
 * @param file O arquivo a ser enviado.
 * @param keyName Nome opcional do arquivo no R2. Caso não fornecido, um nome único será gerado.
 * @returns A URL pública final do arquivo.
 */
export async function uploadToR2(file: File, keyName?: string): Promise<string> {
  const fileName = keyName || `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.]/g, "_")}`
  
  // 1. Solicita a URL pré-assinada no backend
  const response = await fetch("/api/upload", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      fileName,
      contentType: file.type,
    }),
  })

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.error || "Falha ao obter credencial temporária de upload.")
  }

  const { uploadUrl, fileUrl } = await response.json()

  // 2. Faz o upload do arquivo diretamente para o R2
  const uploadResponse = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Type": file.type,
    },
    body: file,
  })

  if (!uploadResponse.ok) {
    throw new Error("Falha ao enviar arquivo para o Cloudflare R2.")
  }

  return fileUrl
}
