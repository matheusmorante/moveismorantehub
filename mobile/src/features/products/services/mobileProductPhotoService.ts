import { withTimeout } from '../../../../../shared-utils/withTimeout';
import { copyProductImageUrls } from '../../../../../shared-utils/productImageCopy';

const CATALOG_API_URL = (
  process.env.EXPO_PUBLIC_CATALOG_API_URL || 'https://www.moveismorante.com.br'
).replace(/\/$/, '');

export const copyMobileProductImages = (images: readonly string[]): Promise<string[]> =>
  copyProductImageUrls(images, CATALOG_API_URL);

export async function uploadMobileProductPhoto(
  blob: Blob,
  fileName: string,
  contentType: string
): Promise<string> {
  const credentialResponse = await withTimeout(
    fetch(`${CATALOG_API_URL}/api/upload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fileName: `products/${Date.now()}-${fileName.replace(/[^a-zA-Z0-9._-]/g, '-')}`,
        contentType,
      }),
    }),
    15_000,
    null,
    'Preparar envio da foto do produto'
  );
  if (!credentialResponse) throw new Error('O preparo do envio da foto demorou demais. Tente novamente.');
  if (!credentialResponse.ok) {
    const details = await credentialResponse.json().catch(() => ({}));
    throw new Error(details.error || 'Não foi possível preparar o envio da foto.');
  }

  const { uploadUrl, fileUrl } = await credentialResponse.json();
  if (typeof uploadUrl !== 'string' || typeof fileUrl !== 'string') {
    throw new Error('O serviço de imagens não confirmou os endereços de envio.');
  }

  const uploadResponse = await withTimeout(
    fetch(uploadUrl, { method: 'PUT', headers: { 'Content-Type': contentType }, body: blob }),
    30_000,
    null,
    'Enviar foto do produto'
  );
  if (!uploadResponse) throw new Error('O envio da foto demorou demais. Tente novamente.');
  if (!uploadResponse.ok) throw new Error('Falha ao enviar a foto para o armazenamento do catálogo.');
  return fileUrl;
}
