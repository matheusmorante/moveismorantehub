import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';
import { withTimeout } from '../../../../../../shared-utils/withTimeout';

export interface PreparedProductCropImageSource {
  uri: string;
  cleanup?: () => void | Promise<void>;
}

function createAbortError() {
  return Object.assign(new Error('O carregamento da foto foi cancelado.'), { name: 'AbortError' });
}

export async function downloadProductCropImageSource(
  url: string,
  signal: AbortSignal
): Promise<PreparedProductCropImageSource> {
  const cacheDirectory = FileSystem.cacheDirectory;
  if (!cacheDirectory) throw new Error('O armazenamento temporário do dispositivo não está disponível.');

  const fileUri = `${cacheDirectory}produto-recorte-${Date.now()}.image`;
  const task = FileSystem.createDownloadResumable(url, fileUri);
  let cancellation: Promise<void> | null = null;
  const cancelDownload = () => {
    cancellation ??= task.cancelAsync().catch(() => undefined);
    return cancellation;
  };
  const abortDownload = () => { void cancelDownload(); };
  signal.addEventListener('abort', abortDownload, { once: true });

  try {
    if (signal.aborted) throw createAbortError();
    const downloaded = await withTimeout(
      task.downloadAsync(),
      20_000,
      undefined,
      'Baixar foto para recorte'
    );
    if (signal.aborted) throw createAbortError();
    if (!downloaded?.uri) throw new Error('O download da foto demorou demais. Tente novamente.');

    return {
      uri: downloaded.uri,
      cleanup: () => FileSystem.deleteAsync(downloaded.uri, { idempotent: true }),
    };
  } catch (error) {
    await cancelDownload();
    await FileSystem.deleteAsync(fileUri, { idempotent: true }).catch(() => undefined);
    throw error;
  } finally {
    signal.removeEventListener('abort', abortDownload);
  }
}

const getImageFetchCandidates = (url: string) => [
  url,
  `https://images.weserv.nl/?url=${encodeURIComponent(url)}`,
  `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
];

export async function prepareProductCropImageSource(
  url: string,
  signal: AbortSignal
): Promise<PreparedProductCropImageSource> {
  if (url.startsWith('data:') || url.startsWith('blob:') || url.startsWith('file://')) {
    return { uri: url };
  }

  if (Platform.OS === 'web') {
    for (const candidate of getImageFetchCandidates(url)) {
      if (signal.aborted) throw Object.assign(new Error('O carregamento da foto foi cancelado.'), { name: 'AbortError' });
      const candidateController = new AbortController();
      const cancelCandidate = () => candidateController.abort();
      signal.addEventListener('abort', cancelCandidate, { once: true });
      try {
        const response = await withTimeout(
          fetch(candidate, { signal: candidateController.signal }),
          12_000,
          null,
          'Carregar foto para recorte'
        );
        if (!response?.ok) {
          candidateController.abort();
          continue;
        }
        const blob = await withTimeout(response.blob(), 12_000, null, 'Preparar foto para recorte');
        if (!blob || blob.size === 0) {
          candidateController.abort();
          continue;
        }
        const objectUrl = URL.createObjectURL(blob);
        return { uri: objectUrl, cleanup: () => URL.revokeObjectURL(objectUrl) };
      } catch {
        if (signal.aborted) throw Object.assign(new Error('O carregamento da foto foi cancelado.'), { name: 'AbortError' });
        // URLs públicas alternativas permitem contornar CORS do armazenamento original.
      } finally {
        signal.removeEventListener('abort', cancelCandidate);
      }
    }
    throw new Error('Não foi possível carregar a foto para recorte. Verifique sua conexão e tente novamente.');
  }

  return downloadProductCropImageSource(url, signal);
}

export async function deleteTemporaryProductPhotoUri(uri: string): Promise<void> {
  if (uri.startsWith('blob:')) {
    URL.revokeObjectURL(uri);
    return;
  }
  await FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => undefined);
}
