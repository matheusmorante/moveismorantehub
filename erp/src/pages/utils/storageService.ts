import { copyProductImageUrls } from '../../../../shared-utils/productImageCopy';

export const getCatalogApiUrl = () => {
  if (import.meta.env.VITE_CATALOG_API_URL) {
    return import.meta.env.VITE_CATALOG_API_URL.replace(/\/$/, '');
  }
  // Por padrão, usa o próprio backend do MoranteHub ERP (/api/upload).
  // Em dev local, o proxy do Vite (/api) encaminha para a porta da API.
  // Em produção (Vercel), a função serverless /api/upload é servida na mesma origem.
  return '';
};

export const copyProductImages = (images: readonly string[]): Promise<string[]> =>
  copyProductImageUrls(images, getCatalogApiUrl(), 'https://www.moveismorante.com.br');

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
    const bodyPayload = JSON.stringify({ fileName: path.replace(/^\/+/, ''), contentType });

    let credentialResponse: Response | null = null;
    try {
      credentialResponse = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: bodyPayload,
      });
    } catch (primaryError) {
      console.warn('Erro ao chamar endpoint principal de upload:', primaryError);
    }

    // Se o endpoint local falhar ou retornar erro e nenhuma URL customizada foi fornecida,
    // tenta fallback automático para a API do catálogo
    if ((!credentialResponse || !credentialResponse.ok) && !catalogApiUrl) {
      try {
        const fallbackResponse = await fetch('https://www.moveismorante.com.br/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: bodyPayload,
        });
        if (fallbackResponse.ok) {
          credentialResponse = fallbackResponse;
        }
      } catch (fallbackError) {
        console.warn('Fallback para moveismorante.com.br falhou:', fallbackError);
      }
    }

    if (!credentialResponse || !credentialResponse.ok) {
      const details = credentialResponse
        ? await credentialResponse.json().catch(() => ({}))
        : {};
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
