export const getCatalogApiUrl = () => {
    if (import.meta.env.VITE_CATALOG_API_URL) {
        return import.meta.env.VITE_CATALOG_API_URL.replace(/\/$/, "");
    }
    // Em produção, as credenciais do R2 ficam protegidas na API do catálogo.
    // O ERP recebe apenas uma URL temporária para enviar o arquivo. Para usar
    // uma API local, defina VITE_CATALOG_API_URL no arquivo .env.local.
    return "https://www.moveismorante.com.br";
};

/**
 * Envia uma imagem ao Cloudflare R2 por uma URL temporária gerada pelo catálogo.
 * @param file O arquivo da imagem.
 * @param path A chave que será usada no R2 (ex.: products/imagem.jpg).
 * @returns A URL pública final no R2.
 */
export const uploadFile = async (file: File, path: string): Promise<string> => {
    try {
        const catalogApiUrl = getCatalogApiUrl();
        const credentialResponse = await fetch(`${catalogApiUrl}/api/upload`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ fileName: path.replace(/^\/+/, ""), contentType: file.type }),
        });

        if (!credentialResponse.ok) {
            const details = await credentialResponse.json().catch(() => ({}));
            throw new Error(details.error || "Não foi possível preparar o envio da imagem para o R2.");
        }

        const { uploadUrl, fileUrl } = await credentialResponse.json();
        const uploadResponse = await fetch(uploadUrl, {
            method: "PUT",
            headers: { "Content-Type": file.type },
            body: file,
        });

        if (!uploadResponse.ok) throw new Error("Falha ao enviar a imagem para o R2.");
        return fileUrl;
    } catch (error) {
        console.error("Erro ao enviar imagem para o R2:", error);
        throw error;
    }
};
