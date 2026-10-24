import { withTimeout } from './withTimeout';

export async function copyProductImageUrls(
  images: readonly string[],
  apiUrl: string,
  fallbackApiUrl?: string
): Promise<string[]> {
  if (images.length === 0) return [];

  const endpoint = (baseUrl: string) =>
    baseUrl ? `${baseUrl.replace(/\/+$/, '')}/api/upload` : '/api/upload';
  const requestCopy = (url: string) =>
    withTimeout<Response | null>(
      fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'copy-product-images', images }),
      }),
      55_000,
      null,
      'Duplicar fotos do produto'
    ).catch(() => null);

  const primaryEndpoint = endpoint(apiUrl);
  let response = await requestCopy(primaryEndpoint);
  if (response && [404, 405].includes(response.status) && fallbackApiUrl) {
    const fallbackEndpoint = endpoint(fallbackApiUrl);
    if (fallbackEndpoint !== primaryEndpoint) response = await requestCopy(fallbackEndpoint);
  }

  if (!response) throw new Error('Não foi possível preparar a cópia independente das fotos.');
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(result?.error || 'Não foi possível copiar as fotos do produto.');
  }
  if (
    !Array.isArray(result?.images) ||
    result.images.length !== images.length ||
    result.images.some((image: unknown) => typeof image !== 'string' || !image)
  ) {
    throw new Error('O serviço de imagens não confirmou a cópia de todas as fotos.');
  }
  return result.images;
}
