import {
  BACKGROUND_REMOVAL_REVISION,
  removeImageBackground,
  type BackgroundRemovalPriority,
} from '@/pages/utils/images/backgroundRemoval';
import { imageAlphaContentBounds, imageContentBounds, type ImageContentBounds } from '@/pages/utils/images/imageContentBounds';
import { loadHtmlImage } from '@/pages/utils/images/imageHtmlLoader';
import type { ImageMaskStroke } from '../../../../../../../shared-utils/catalogImageTemplate';
import { drawCorrectedPhoto } from './templateImageMask';

export type TemplatePicture = { image: CanvasImageSource; width: number; height: number; flatBackground?: boolean };

export type TemplatePictureLoadOptions = {
  preview?: boolean;
  priority?: BackgroundRemovalPriority;
  signal?: AbortSignal;
  maskStrokes?: readonly ImageMaskStroke[];
};

export type TemplatePictureLoader = ((url: string, cutout: boolean, options?: TemplatePictureLoadOptions) => Promise<TemplatePicture>) & {
  getCached: (url: string, cutout: boolean, options?: TemplatePictureLoadOptions) => TemplatePicture | undefined;
};

export const BACKGROUND_REMOVAL_MASK_REVISION = 'birefnet-opencv-v1';
const PICTURE_CACHE_LIMIT = 48;

const framedPictureBounds = new WeakMap<TemplatePicture, ImageContentBounds>();

async function loadPicture(url: string, timeoutMs = 8_000): Promise<TemplatePicture> {
  const image = await loadHtmlImage(url, {
    timeoutMs,
    decode: true,
    corsMode: 'https-only',
    errorMessage: 'Imagem indisponível.',
  });
  return { image, width: image.naturalWidth, height: image.naturalHeight };
}

async function cutOutProductBackground(
  picture: TemplatePicture,
  options?: TemplatePictureLoadOptions,
): Promise<TemplatePicture> {
  try {
    const result = await removeImageBackground(picture.image, picture.width, picture.height, {
      centerContent: false,
      maxSide: options?.preview ? 768 : undefined,
      priority: options?.priority ?? 'high',
      signal: options?.signal,
    });
    if (result.alreadyTransparent) return { ...picture, flatBackground: true };
    return { image: result.canvas, width: result.width, height: result.height, flatBackground: true };
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') throw error;
    return { ...picture, flatBackground: false };
  }
}

/**
 * Creates a deduplicated per-editor image & cutout cache with failure cooldowns and abort cleanup.
 */
export function createTemplatePictureLoader(): TemplatePictureLoader {
  const cache = new Map<string, { picture: Promise<TemplatePicture>; resolved?: TemplatePicture; retryAt?: number }>();
  const cacheKey = (url: string, cutout: boolean, options?: TemplatePictureLoadOptions) =>
    cutout
      ? `cut:${BACKGROUND_REMOVAL_MASK_REVISION}:${BACKGROUND_REMOVAL_REVISION}:${options?.preview ? 'preview' : 'full'}:${options?.maskStrokes ? JSON.stringify(options.maskStrokes) : ''}:${url}`
      : `img:${url}`;

  const get = ((url: string, cutout: boolean, options?: TemplatePictureLoadOptions): Promise<TemplatePicture> => {
    const key = cacheKey(url, cutout, options);
    const cached = cache.get(key);
    if (cached && (!cached.retryAt || cached.retryAt > Date.now())) return cached.picture;

    const isDerivedPreview = /_medium\.webp(?:[?#]|$)/i.test(url);
    const strokes = options?.maskStrokes;
    const picture = cutout
      ? strokes?.length
        ? Promise.all([get(url, false), get(url, true, { ...options, maskStrokes: undefined })]).then(([original, cutoutPicture]) => {
          const canvas = document.createElement('canvas');
          drawCorrectedPhoto(canvas, cutoutPicture, original.image, strokes);
          return { ...cutoutPicture, image: canvas };
        })
        : get(url, false).then((raw) => cutOutProductBackground(raw, options))
      : loadPicture(url, isDerivedPreview ? 2_500 : 8_000);

    cache.delete(key);
    if (cache.size >= PICTURE_CACHE_LIMIT) cache.delete(cache.keys().next().value!);
    const entry: { picture: Promise<TemplatePicture>; resolved?: TemplatePicture; retryAt?: number } = { picture };
    cache.set(key, entry);

    void picture.then((result) => {
      entry.resolved = result;
      if (cutout && result.flatBackground === false) entry.retryAt = Date.now() + 30_000;
    }, () => {});
    // Repainting while a layer is moved must not repeatedly request a failed image.
    void picture.catch((error) => {
      if (error instanceof Error && error.name === 'AbortError') {
        if (cache.get(key) === entry) cache.delete(key);
        return;
      }
      entry.retryAt = Date.now() + 10_000;
    });
    return picture;
  }) as TemplatePictureLoader;

  get.getCached = (url, cutout, options) => {
    const entry = cache.get(cacheKey(url, cutout, options));
    return entry && (!entry.retryAt || entry.retryAt > Date.now()) ? entry.resolved : undefined;
  };
  return get;
}

/**
 * Computes and caches tight content bounds for framing product layers (`fit: 'cover'`).
 */
export function getFramedPictureBounds(picture: TemplatePicture): ImageContentBounds {
  let bounds = framedPictureBounds.get(picture);
  if (!bounds) {
    const alphaBounds = imageAlphaContentBounds(picture.image, picture.width, picture.height, .005);
    const alphaBoundsAreFullImage = alphaBounds.x === 0 && alphaBounds.y === 0
      && alphaBounds.width === picture.width && alphaBounds.height === picture.height;
    bounds = picture.flatBackground || !alphaBoundsAreFullImage
      ? alphaBounds
      : imageContentBounds(picture.image, picture.width, picture.height, .005);
    framedPictureBounds.set(picture, bounds);
  }
  return bounds;
}

export function prepareTemplateProductPicture(picture: TemplatePicture): TemplatePicture {
  getFramedPictureBounds(picture);
  return picture;
}
