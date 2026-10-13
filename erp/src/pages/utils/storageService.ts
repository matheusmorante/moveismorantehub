export const getCatalogApiUrl = () => {
  if (import.meta.env.VITE_CATALOG_API_URL) {
    return import.meta.env.VITE_CATALOG_API_URL.replace(/\/$/, '');
  }
  // Por padrão, usa o próprio backend do MoranteHub ERP (/api/upload).
  // Em dev local, o proxy do Vite (/api) encaminha para a porta da API.
  // Em produção (Vercel), a função serverless /api/upload é servida na mesma origem.
  return '';
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
    const endpoint = catalogApiUrl ? `${catalogApiUrl}/api/upload` : '/api/upload';
    const contentType = file.type || 'image/jpeg';
    const credentialResponse = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileName: path.replace(/^\/+/, ''), contentType }),
    });

    if (!credentialResponse.ok) {
      const details = await credentialResponse.json().catch(() => ({}));
      throw new Error(details.error || 'Não foi possível preparar o envio da imagem para o R2.');
    }

    const { uploadUrl, fileUrl } = await credentialResponse.json();
    const uploadResponse = await fetch(uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': contentType },
      body: file,
    });

    if (!uploadResponse.ok) throw new Error('Falha ao enviar a imagem para o R2.');
    return fileUrl;
  } catch (error) {
    console.error('Erro ao enviar imagem para o R2:', error);
    throw error;
  }
};
