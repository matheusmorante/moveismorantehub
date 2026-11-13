export interface LoadHtmlImageOptions {
  timeoutMs?: number;
  decode?: boolean;
  corsMode?: 'http-and-https' | 'https-only';
  errorMessage?: string;
}

/**
 * Loads an image URL into a decoded HTMLImageElement with bounded timeout and CORS configuration.
 */
export function loadHtmlImage(url: string, options: LoadHtmlImageOptions = {}): Promise<HTMLImageElement> {
  const {
    timeoutMs = 8_000,
    decode = false,
    corsMode = 'http-and-https',
    errorMessage = 'Não foi possível carregar a imagem.',
  } = options;

  return new Promise((resolve, reject) => {
    const image = new Image();
    const needsCors = corsMode === 'https-only' ? url.startsWith('https:') : url.startsWith('http');
    if (needsCors) image.crossOrigin = 'anonymous';
    image.referrerPolicy = 'no-referrer';

    let settled = false;
    const finish = (success: boolean) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      image.onload = null;
      image.onerror = null;
      if (success) resolve(image);
      else reject(new Error(errorMessage));
    };

    const timer = window.setTimeout(() => finish(false), timeoutMs);
    image.onerror = () => finish(false);
    image.onload = () => {
      if (!image.naturalWidth || !image.naturalHeight) {
        finish(false);
        return;
      }
      if (!decode || typeof image.decode !== 'function') {
        finish(true);
        return;
      }
      void image.decode().catch(() => {}).then(() => finish(true));
    };
    image.src = url;
  });
}
