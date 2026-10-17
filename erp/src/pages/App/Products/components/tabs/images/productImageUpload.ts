import { compressImageToFile } from '@/pages/utils/imageUtils';
import { uploadFile } from '@/pages/utils/storageService';
import { imageFilesFormSchema } from '../../../../../../../../shared-utils/fileFormSchemas';
import { withTimeout } from '../../../../../../../../shared-utils/withTimeout';
import { productImageReplacementFormSchema } from '../../../../../../../../shared-utils/productImageFormSchemas';

/**
 * Faz compressão e upload otimizado de uma imagem de produto para o R2,
 * gerando a versão original, a versão média em webp (1000px) e thumbnail em webp (200px).
 *
 * @param file Arquivo da imagem a ser processada
 * @returns URL pública original no R2
 */
export async function uploadOptimizedProductImage(file: File, options?: { isCurrent?: () => boolean }): Promise<string> {
  file = imageFilesFormSchema.parse({ files: [file] }).files[0];
  const current = options?.isCurrent || (() => true);
  const assertCurrent = () => { if (!current()) throw Object.assign(new Error('O contexto da foto mudou.'), { knownFailure: true }); };
  assertCurrent();
  const fileExt = file.name.split('.').pop() || 'webp';
  const randomId =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}_${Math.random().toString(36).substring(2)}`;
  const baseName = `${randomId}`;

  // Original
  const originalPath = `products/${baseName}.${fileExt}`;

  // Medium (webp, 1000px, 0.85)
  const mediumFile = await withTimeout(compressImageToFile(file, {
    maxMB: 0.5,
    maxWidth: 1000,
    fileType: 'image/webp',
    initialQuality: 0.85,
  }), 10_000, null, 'Preparar foto média').catch(() => { throw Object.assign(new Error('Não foi possível preparar a foto média.'), { knownFailure: true }); });
  if (!mediumFile) throw Object.assign(new Error('A preparação da foto demorou demais.'), { knownFailure: true });
  assertCurrent();
  const mediumPath = `products/${baseName}_medium.webp`;

  // Thumb (webp, 200px, 0.75)
  const thumbFile = await withTimeout(compressImageToFile(file, {
    maxMB: 0.05,
    maxWidth: 200,
    fileType: 'image/webp',
    initialQuality: 0.75,
  }), 10_000, null, 'Preparar miniatura').catch(() => { throw Object.assign(new Error('Não foi possível preparar a miniatura.'), { knownFailure: true }); });
  if (!thumbFile) throw Object.assign(new Error('A preparação da miniatura demorou demais.'), { knownFailure: true });
  assertCurrent();
  const thumbPath = `products/${baseName}_thumb.webp`;

  let originalUrl;
  try { [originalUrl] = await Promise.all([
    withTimeout(uploadFile(file, originalPath), 30_000, null, 'Enviar foto original'),
    withTimeout(uploadFile(mediumFile, mediumPath), 30_000, null, 'Enviar foto média').catch((err) => {
      console.warn('Falha no upload da versão medium, fallback para original:', err);
      return originalPath;
    }),
    withTimeout(uploadFile(thumbFile, thumbPath), 30_000, null, 'Enviar miniatura').catch((err) => {
      console.warn('Falha no upload da versão thumbnail, fallback para original:', err);
      return originalPath;
    }),
  ]); } catch { throw Object.assign(new Error('O envio da foto não foi confirmado. Confira antes de repetir.'), { uncertain: true }); }
  if (!originalUrl || !productImageReplacementFormSchema.shape.newUrl.safeParse(originalUrl).success) throw Object.assign(new Error('O envio da foto não foi confirmado. Confira antes de repetir.'), { uncertain: true });
  return originalUrl;
}
