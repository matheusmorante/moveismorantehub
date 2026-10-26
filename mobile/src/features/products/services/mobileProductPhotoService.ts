import * as FileSystem from 'expo-file-system/legacy';
import { ImageManipulator, SaveFormat, type ImageRef } from 'expo-image-manipulator';
import { withTimeout } from '../../../../../shared-utils/withTimeout';
import { copyProductImageUrls } from '../../../../../shared-utils/productImageCopy';
import {
  PRODUCT_IMAGE_DERIVATIVES,
  type ProductImageDerivative,
} from '../../../../../shared-utils/productImageDerivatives';
import { generateUUID } from '../../../utils/uuid';

const CATALOG_API_URL = (
  process.env.EXPO_PUBLIC_CATALOG_API_URL || 'https://www.moveismorante.com.br'
).replace(/\/$/, '');

export const copyMobileProductImages = (images: readonly string[]): Promise<string[]> =>
  copyProductImageUrls(images, CATALOG_API_URL);

const generatePhotoObjectId = () =>
  typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : generateUUID();

const PRODUCT_PHOTO_DERIVATIVES: readonly ProductImageDerivative[] =
  Object.values(PRODUCT_IMAGE_DERIVATIVES);

async function deleteTemporaryImage(uri: string) {
  if (uri.startsWith('blob:')) {
    URL.revokeObjectURL(uri);
    return;
  }
  await FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => undefined);
}

async function createWebpDerivative(
  sourceUri: string,
  derivative: ProductImageDerivative
): Promise<Blob> {
  let sourceImage: ImageRef | null = null;
  let resizedImage: ImageRef | null = null;

  try {
    sourceImage = await withTimeout(
      ImageManipulator.manipulate(sourceUri).renderAsync(),
      20_000,
      null,
      'Carregar foto para otimização'
    );
    if (!sourceImage) throw new Error('Não foi possível carregar a foto para otimização.');

    const needsResize = Math.max(sourceImage.width, sourceImage.height) > derivative.maxDimension;
    if (needsResize) {
      const context = ImageManipulator.manipulate(sourceImage);
      if (sourceImage.width >= sourceImage.height) {
        context.resize({ width: derivative.maxDimension });
      } else {
        context.resize({ height: derivative.maxDimension });
      }
      resizedImage = await withTimeout(
        context.renderAsync(),
        20_000,
        null,
        'Redimensionar foto do produto'
      );
      if (!resizedImage) throw new Error('O redimensionamento da foto do produto demorou demais.');
    }

    const imageToSave = resizedImage || sourceImage;
    if (!imageToSave) throw new Error('Não foi possível redimensionar a foto do produto.');
    let quality: number = derivative.initialQuality;
    while (true) {
      let temporaryUri: string | null = null;
      let blob: Blob | null = null;
      try {
        const saved = await withTimeout(
          imageToSave.saveAsync({ format: SaveFormat.WEBP, compress: quality }),
          20_000,
          null,
          'Salvar versão otimizada da foto'
        );
        if (!saved?.uri) throw new Error('Não foi possível salvar a versão otimizada da foto.');
        temporaryUri = saved.uri;

        const response = await withTimeout(
          fetch(saved.uri),
          12_000,
          null,
          'Ler versão otimizada da foto'
        );
        if (!response?.ok) throw new Error('Não foi possível preparar a versão otimizada para envio.');
        blob = await withTimeout(response.blob(), 12_000, null, 'Preparar versão otimizada da foto');
        if (!blob || blob.size === 0) throw new Error('A versão otimizada da foto ficou vazia.');
      } finally {
        if (temporaryUri) await deleteTemporaryImage(temporaryUri);
      }

      if (blob.size <= derivative.maxSizeBytes || quality <= 0.1) return blob;
      quality = Math.max(0.1, Math.round((quality - 0.1) * 100) / 100);
    }
  } finally {
    if (resizedImage && resizedImage !== sourceImage) resizedImage.release();
    sourceImage?.release();
  }
}

async function uploadPhotoObject(blob: Blob, objectKey: string, contentType: string): Promise<string> {
  const credentialResponse = await withTimeout(
    fetch(`${CATALOG_API_URL}/api/upload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileName: objectKey, contentType }),
    }),
    15_000,
    null,
    'Preparar envio da foto do produto'
  );
  if (!credentialResponse) throw new Error('O preparo do envio da foto demorou demais. Tente novamente.');
  if (!credentialResponse.ok) {
    const details = await credentialResponse.json().catch(() => ({}));
    throw new Error(details.error || 'Não foi possível preparar o envio da foto.');
  }

  const { uploadUrl, fileUrl } = await credentialResponse.json();
  if (typeof uploadUrl !== 'string' || typeof fileUrl !== 'string') {
    throw new Error('O serviço de imagens não confirmou os endereços de envio.');
  }

  const uploadResponse = await withTimeout(
    fetch(uploadUrl, { method: 'PUT', headers: { 'Content-Type': contentType }, body: blob }),
    30_000,
    null,
    'Enviar foto do produto'
  );
  if (!uploadResponse) throw new Error('O envio da foto demorou demais. Tente novamente.');
  if (!uploadResponse.ok) throw new Error('Falha ao enviar a foto para o armazenamento do catálogo.');
  return fileUrl;
}

export async function uploadMobileProductPhoto(
  blob: Blob,
  fileName: string,
  contentType: string,
  sourceUri?: string
): Promise<string> {
  const safeName = fileName
    .replace(/[^a-zA-Z0-9._-]/g, '-')
    .replace(/^\.+|\.+$/g, '') || 'produto.jpg';
  const mimeSubtype = contentType.split('/')[1]?.split(';')[0]?.toLowerCase();
  const inferredExtension = mimeSubtype === 'jpeg'
    ? 'jpg'
    : mimeSubtype === 'svg+xml'
      ? 'svg'
      : mimeSubtype && /^[a-z0-9-]+$/.test(mimeSubtype)
        ? mimeSubtype
        : 'jpg';
  const safeFileName = /\.[a-z0-9]{1,12}$/i.test(safeName)
    ? safeName
    : `${safeName}.${inferredExtension}`;
  const originalObjectKey = `products/${generatePhotoObjectId()}-${safeFileName}`;
  const originalUrl = await uploadPhotoObject(blob, originalObjectKey, contentType);

  if (!sourceUri) return originalUrl;

  const extensionIndex = originalObjectKey.lastIndexOf('.');
  const baseObjectKey = extensionIndex > originalObjectKey.lastIndexOf('/')
    ? originalObjectKey.slice(0, extensionIndex)
    : originalObjectKey;

  for (const derivative of PRODUCT_PHOTO_DERIVATIVES) {
    const derivativeKey = `${baseObjectKey}${derivative.suffix}.webp`;
    try {
      const derivativeBlob = await createWebpDerivative(sourceUri, derivative);
      await uploadPhotoObject(derivativeBlob, derivativeKey, 'image/webp');
    } catch (error) {
      console.warn(
        `Falha no preparo ou upload da versão ${derivative.suffix.slice(1)}; a tela usará a imagem original:`,
        error
      );
    }
  }

  return originalUrl;
}
