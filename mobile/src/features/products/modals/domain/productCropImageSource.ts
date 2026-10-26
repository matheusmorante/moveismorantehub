import * as FileSystem from 'expo-file-system/legacy';
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
