import { toast } from 'react-toastify';

export interface CompressImageOptions {
  maxMB?: number;
  maxWidth?: number;
  fileType?: string;
  initialQuality?: number;
}

function buildCompressionOptions(options: CompressImageOptions | undefined, useWebWorker: boolean) {
  return {
    maxSizeMB: options?.maxMB || 0.1,
    maxWidthOrHeight: options?.maxWidth || 1200,
    useWebWorker,
    initialQuality: options?.initialQuality || 0.75,
    fileType: options?.fileType,
  };
}

function toOutputImageFile(sourceFile: File, compressed: Blob, fileType?: string): File {
  let fileName = sourceFile.name;
  if (fileType === 'image/webp' && !fileName.toLowerCase().endsWith('.webp')) {
    fileName = `${fileName.replace(/\.[^/.]+$/, '')}.webp`;
  }
  const finalType = compressed.type || fileType || 'image/webp';
  return new File([compressed], fileName, { type: finalType });
}

/**
 * Compresses an image File and resolves with a base64 Data URL.
 */
export const compressImage = async (
  file: File,
  options?: CompressImageOptions,
): Promise<string> => {
  try {
    const imageCompression = (await import('browser-image-compression')).default;
    const compressedFile = await imageCompression(file, buildCompressionOptions(options, true));
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(compressedFile);
    });
  } catch (error) {
    console.error('Erro ao comprimir imagem:', error);
    toast.error('Falha ao processar imagem.');
    throw error;
  }
};

/**
 * Compresses an image File and returns a File instance (falling back without worker or original file on failure).
 */
export const compressImageToFile = async (
  file: File,
  options?: CompressImageOptions,
): Promise<File> => {
  const imageCompression = (await import('browser-image-compression')).default;
  try {
    const compressedFile = await imageCompression(file, buildCompressionOptions(options, true));
    return toOutputImageFile(file, compressedFile, options?.fileType);
  } catch (workerError) {
    console.warn('Erro ao comprimir com webworker, tentando sem webworker:', workerError);
    try {
      const compressedFile = await imageCompression(file, buildCompressionOptions(options, false));
      return toOutputImageFile(file, compressedFile, options?.fileType);
    } catch (fallbackError) {
      console.warn('Compressão falhou completamente, usando arquivo original como fallback:', fallbackError);
      return file;
    }
  }
};
