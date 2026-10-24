import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { withTimeout } from '../../../../../shared-utils/withTimeout';

const CATALOG_API_URL = (
  process.env.EXPO_PUBLIC_CATALOG_API_URL || 'https://www.moveismorante.com.br'
).replace(/\/$/, '');

export class DeliveryProofUploadUnavailableError extends Error {
  constructor() {
    super('A conexão caiu durante o envio da comprovação. A imagem ficará na fila offline.');
    this.name = 'DeliveryProofUploadUnavailableError';
  }
}

const sanitizeFileName = (fileName: string): string =>
  (fileName || 'comprovante.jpg').replace(/[^a-zA-Z0-9._-]/g, '-');

export async function persistDeliveryProofForOffline(
  uri: string,
  fileName: string
): Promise<string> {
  // Browser blob URLs live for the current page; native files are copied out of cache.
  if (Platform.OS === 'web' || !FileSystem.documentDirectory || !uri.startsWith('file://')) {
    return uri;
  }

  const directory = `${FileSystem.documentDirectory}delivery-proofs/`;
  await FileSystem.makeDirectoryAsync(directory, { intermediates: true }).catch(() => undefined);
  const destination = `${directory}${Date.now()}-${Math.random().toString(16).slice(2)}-${sanitizeFileName(fileName)}`;
  await FileSystem.copyAsync({ from: uri, to: destination });
  return destination;
}

export async function uploadDeliveryProof(
  uri: string,
  fileName: string,
  contentType: string
): Promise<string> {
  let credentialResponse: Response | null;
  try {
    credentialResponse = await withTimeout(
      fetch(`${CATALOG_API_URL}/api/upload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: `delivery-proofs/${sanitizeFileName(fileName)}`,
          contentType,
        }),
      }),
      15_000,
      null,
      'Preparar envio da comprovação'
    );
  } catch {
    throw new DeliveryProofUploadUnavailableError();
  }
  if (!credentialResponse) throw new DeliveryProofUploadUnavailableError();
  if (!credentialResponse.ok) {
    if (credentialResponse.status >= 500) throw new DeliveryProofUploadUnavailableError();
    const details = await credentialResponse.json().catch(() => ({}));
    throw new Error(details.error || 'Não foi possível preparar o envio da imagem.');
  }

  const { uploadUrl, fileUrl } = await credentialResponse.json();
  if (typeof uploadUrl !== 'string' || typeof fileUrl !== 'string') {
    throw new Error('O serviço de imagens não confirmou os endereços de envio.');
  }

  const imageResponse = await withTimeout(
    fetch(uri),
    15_000,
    null,
    'Ler a foto de comprovação'
  );
  if (!imageResponse?.ok) throw new Error('Não foi possível ler a foto salva no aparelho.');
  const imageBlob = await imageResponse.blob();

  let uploadResponse: Response | null;
  try {
    uploadResponse = await withTimeout(
      fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': contentType },
        body: imageBlob,
      }),
      30_000,
      null,
      'Enviar foto de comprovação'
    );
  } catch {
    throw new DeliveryProofUploadUnavailableError();
  }
  if (!uploadResponse) throw new DeliveryProofUploadUnavailableError();
  if (!uploadResponse.ok) {
    if (uploadResponse.status >= 500) throw new DeliveryProofUploadUnavailableError();
    throw new Error('Falha ao enviar a imagem de comprovação.');
  }

  return fileUrl;
}
