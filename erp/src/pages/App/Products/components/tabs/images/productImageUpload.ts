import { compressImageToFile } from '@/pages/utils/imageUtils';
import { uploadFile } from '@/pages/utils/storageService';

/**
 * Faz compressão e upload otimizado de uma imagem de produto para o R2,
 * gerando a versão original, a versão média em webp (1000px) e thumbnail em webp (200px).
 *
 * @param file Arquivo da imagem a ser processada
 * @returns URL pública original no R2
 */
export async function uploadOptimizedProductImage(file: File): Promise<string> {
  const fileExt = file.name.split('.').pop() || 'webp';
  const randomId =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}_${Math.random().toString(36).substring(2)}`;
  const baseName = `${randomId}`;

  // Original
  const originalPath = `products/${baseName}.${fileExt}`;

  // Medium (webp, 1000px, 0.85)
  const mediumFile = await compressImageToFile(file, {
    maxMB: 0.5,
    maxWidth: 1000,
    fileType: 'image/webp',
    initialQuality: 0.85,
  });
  const mediumPath = `products/${baseName}_medium.webp`;

  // Thumb (webp, 200px, 0.75)
  const thumbFile = await compressImageToFile(file, {
    maxMB: 0.05,
    maxWidth: 200,
    fileType: 'image/webp',
    initialQuality: 0.75,
  });
  const thumbPath = `products/${baseName}_thumb.webp`;

  const [originalUrl] = await Promise.all([
    uploadFile(file, originalPath),
    uploadFile(mediumFile, mediumPath).catch((err) => {
      console.warn('Falha no upload da versão medium, fallback para original:', err);
      return originalPath;
    }),
    uploadFile(thumbFile, thumbPath).catch((err) => {
      console.warn('Falha no upload da versão thumbnail, fallback para original:', err);
      return originalPath;
    }),
  ]);

  return originalUrl;
}
