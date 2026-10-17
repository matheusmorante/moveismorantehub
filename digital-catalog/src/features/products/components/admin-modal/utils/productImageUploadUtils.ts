import { optimizeProductImage } from '@/lib/utils/image-optimization';
import { uploadToR2 } from '@/lib/utils/upload-r2';

/**
 * Optimizes an image File into WebP format and uploads it to R2 storage.
 * @param file The original image file to optimize and upload
 * @param filenamePrefix Optional prefix for the generated file name (e.g. 'pasted', 'dragged')
 * @returns Public URL of the uploaded image
 */
export async function processAndUploadSingleProductImage(
  file: File,
  filenamePrefix?: string
): Promise<string> {
  const optimizedBlob = await optimizeProductImage(file);
  const name = filenamePrefix
    ? `${filenamePrefix}-${Date.now()}.webp`
    : `${Date.now()}.webp`;
  const optimizedFile = new File([optimizedBlob], name, {
    type: 'image/webp',
  });
  return await uploadToR2(optimizedFile);
}

/**
 * Sequentially optimizes and uploads multiple image Files to R2 storage.
 * @param files The array of image files to optimize and upload
 * @param filenamePrefix Optional prefix for each generated file name
 * @returns Array of public URLs of the uploaded images
 */
export async function processAndUploadProductImages(
  files: File[],
  filenamePrefix?: string
): Promise<string[]> {
  const urls: string[] = [];
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const url = await processAndUploadSingleProductImage(file, filenamePrefix);
    urls.push(url);
  }
  return urls;
}
