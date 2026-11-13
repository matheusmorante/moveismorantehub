import { getDerivedImageUrl } from '@/utils/imageUrlUtils';
import type {
  ImageLayer, ImageMaskStroke, TemplatePreviewProduct,
} from '../../../../../../../shared-utils/catalogImageTemplate';
import type { TemplatePicture } from './templatePictureLoader';

export function templateLayerPhotoUrls(
  layer: ImageLayer, product: TemplatePreviewProduct | null, assets: ReadonlyMap<string, string>,
): string[] | null {
  if (layer.type === 'image') {
    const url = layer.assetId ? assets.get(layer.assetId) : undefined;
    return url ? [url] : null;
  }
  if (layer.type !== 'product' || !product) return null;
  const urls = [product.images[layer.imageIndex]];
  if (layer.imageIndex > 0 && layer.fallback === 'main') urls.push(product.images[0]);
  return [...new Set(urls.filter((url): url is string => Boolean(url)))];
}

export function templatePhotoVariants(url: string, useMedium: boolean) {
  if (!useMedium) return [url];
  const medium = getDerivedImageUrl(url, 'medium');
  return medium === url ? [url] : [medium, url];
}

const photoKeys = new Map<string, Promise<string>>();
const resolvedPhotoKeys = new Map<string, string>();

export function templatePhotoKey(url: string): Promise<string> {
  const cached = photoKeys.get(url);
  if (cached) return cached;
  const key = crypto.subtle.digest('SHA-256', new TextEncoder().encode(url)).then((bytes) => {
    const value = Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, '0')).join('');
    if (photoKeys.get(url) === key) resolvedPhotoKeys.set(url, value);
    return value;
  });
  if (photoKeys.size >= 40) {
    const oldest = photoKeys.keys().next().value!;
    photoKeys.delete(oldest);
    resolvedPhotoKeys.delete(oldest);
  }
  photoKeys.set(url, key);
  return key;
}

export function cachedTemplatePhotoKey(url: string): string | undefined {
  return resolvedPhotoKeys.get(url);
}

export function drawMaskStroke(
  context: CanvasRenderingContext2D, stroke: ImageMaskStroke, width: number, height: number,
) {
  const [first, ...rest] = stroke.points;
  const x = (point: [number, number]) => point[0] * width / 1000;
  const y = (point: [number, number]) => point[1] * height / 1000;
  const diameter = stroke.size * Math.min(width, height) / 1000;
  context.lineWidth = diameter;
  context.lineCap = 'round';
  context.lineJoin = 'round';
  context.beginPath();
  if (rest.length) {
    context.moveTo(x(first), y(first));
    for (const point of rest) context.lineTo(x(point), y(point));
    context.stroke();
  } else {
    context.arc(x(first), y(first), diameter / 2, 0, Math.PI * 2);
    context.fill();
  }
}

/**
 * Restore pixels from the original image through the brush shape. Erasing only
 * changes alpha, and brush coordinates are independent of the preview scale.
 */
export function drawCorrectedPhoto(
  canvas: HTMLCanvasElement, cutout: TemplatePicture, original: CanvasImageSource,
  strokes: readonly ImageMaskStroke[],
) {
  const { width, height } = cutout;
  if (canvas.width !== width) canvas.width = width;
  if (canvas.height !== height) canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Não foi possível editar a máscara.');
  context.clearRect(0, 0, width, height);
  context.drawImage(cutout.image, 0, 0, width, height);
  let brush: HTMLCanvasElement | undefined;
  try {
    for (const stroke of strokes) {
      if (stroke.mode === 'restore') {
        if (!brush) {
          brush = document.createElement('canvas');
          brush.width = width;
          brush.height = height;
        }
        const brushContext = brush.getContext('2d')!;
        brushContext.globalCompositeOperation = 'source-over';
        brushContext.clearRect(0, 0, width, height);
        drawMaskStroke(brushContext, stroke, width, height);
        brushContext.globalCompositeOperation = 'source-in';
        brushContext.drawImage(original, 0, 0, width, height);
        context.drawImage(brush, 0, 0);
      } else {
        context.globalCompositeOperation = 'destination-out';
        drawMaskStroke(context, stroke, width, height);
        context.globalCompositeOperation = 'source-over';
      }
    }
  } finally {
    if (brush) brush.width = 0;
  }
}
