import { withTimeout } from './withTimeout';

/** Called with the image File already parsed by its owner's form. */
export async function readImageFile(file: File, signal: AbortSignal): Promise<string> {
  const reader = new FileReader();
  let rejectRead: ((error: Error) => void) | undefined;
  const abort = () => { reader.abort(); rejectRead?.(new Error('Leitura da imagem interrompida.')); };
  signal.addEventListener('abort', abort, { once: true });
  try {
    if (signal.aborted) throw new Error('Leitura da imagem interrompida.');
    const image = await withTimeout(new Promise<string | null>((resolve, reject) => {
      rejectRead = reject;
      reader.onload = () => typeof reader.result === 'string' && reader.result
        ? resolve(reader.result) : reject(new Error('A imagem não pôde ser lida.'));
      reader.onerror = () => reject(new Error('Não foi possível ler a imagem.'));
      reader.onabort = () => reject(new Error('Leitura da imagem interrompida.'));
      reader.readAsDataURL(file);
    }), 10_000, null, 'etiquetas:leitura-local');
    if (!image) throw new Error('A leitura demorou demais. Selecione a imagem novamente.');
    return image;
  } finally {
    reader.onload = null; reader.onerror = null; reader.onabort = null;
    reader.abort(); signal.removeEventListener('abort', abort);
  }
}
