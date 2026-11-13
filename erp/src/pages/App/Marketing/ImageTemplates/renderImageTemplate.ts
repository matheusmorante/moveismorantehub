import {
  FORMAT_DIMENSIONS, isTemplateLayerVisible, type ImageFormat, type ImageLayout, type PositionedLayer, type TemplatePreviewProduct,
} from '../../../../../../shared-utils/catalogImageTemplate';
import type { ImageContentBounds } from '@/pages/utils/images/imageContentBounds';
import {
  BACKGROUND_REMOVAL_MASK_REVISION,
  createTemplatePictureLoader,
  getFramedPictureBounds,
  prepareTemplateProductPicture,
  type TemplatePicture,
  type TemplatePictureLoader,
} from './rendering/templatePictureLoader';
import {
  cachedTemplatePhotoKey, templateLayerPhotoUrls, templatePhotoKey, templatePhotoVariants,
} from './rendering/templateImageMask';
import {
  canvasFont,
  drawTemplateText,
  interpolateTemplateFields,
  measureTextLayerSafetyBounds,
} from './rendering/templateTextRenderer';

export {
  createTemplatePictureLoader,
  interpolateTemplateFields,
  measureTextLayerSafetyBounds,
  prepareTemplateProductPicture,
  type TemplatePicture,
};

const PRODUCT_MINIMUM_MARGIN = 0.01;

function drawPicture(
  ctx: CanvasRenderingContext2D,
  picture: TemplatePicture,
  width: number,
  height: number,
  fit: 'contain' | 'cover',
  margin = 0,
  sourceBounds: ImageContentBounds = { x: 0, y: 0, width: picture.width, height: picture.height },
) {
  const insetX = width * margin;
  const insetY = height * margin;
  const availableWidth = Math.max(1, width - insetX * 2);
  const availableHeight = Math.max(1, height - insetY * 2);
  const scale = (fit === 'contain' ? Math.min : Math.max)(availableWidth / sourceBounds.width, availableHeight / sourceBounds.height);
  const w = sourceBounds.width * scale;
  const h = sourceBounds.height * scale;
  ctx.drawImage(
    picture.image,
    sourceBounds.x,
    sourceBounds.y,
    sourceBounds.width,
    sourceBounds.height,
    insetX + (availableWidth - w) / 2,
    insetY + (availableHeight - h) / 2,
    w,
    h,
  );
}

function drawFramedProduct(
  ctx: CanvasRenderingContext2D,
  picture: TemplatePicture,
  width: number,
  height: number,
  margin: number,
  contentBounds: ImageContentBounds,
) {
  const frameAspect = width / height;
  const squareSide = Math.max(
    contentBounds.width,
    contentBounds.height,
    contentBounds.height * frameAspect,
    contentBounds.width / frameAspect,
  ) * (1 + margin * 2);
  const scale = Math.max(width / squareSide, height / squareSide);
  const centerX = contentBounds.x + contentBounds.width / 2;
  const centerY = contentBounds.y + contentBounds.height / 2;
  const drawX = width / 2 - centerX * scale;
  const drawY = height / 2 - centerY * scale;

  // O recorte virtual é sempre quadrado; a seleção só limita a área visível do resultado.
  ctx.drawImage(picture.image, drawX, drawY, picture.width * scale, picture.height * scale);
}

function drawPlaceholder(ctx: CanvasRenderingContext2D, width: number, height: number) {
  ctx.save();
  const scale = Math.min(width, height) / 400;
  ctx.translate((width - 400 * scale) / 2, (height - 400 * scale) / 2);
  ctx.scale(scale, scale);
  ctx.fillStyle = '#e2e8f0';
  ctx.beginPath(); ctx.ellipse(200, 278, 151, 21, 0, 0, 2 * Math.PI); ctx.fill();
  ctx.fillStyle = '#a99080';
  ctx.beginPath(); ctx.roundRect(77, 121, 246, 110, 29); ctx.fill();
  ctx.fillStyle = '#645449';
  ctx.fillRect(83, 247, 16, 30); ctx.fillRect(301, 247, 16, 30);
  ctx.fillStyle = '#baa99b';
  ctx.beginPath(); ctx.roundRect(55, 176, 290, 80, 22); ctx.fill();
  ctx.strokeStyle = '#927f71'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(199, 128); ctx.lineTo(199, 176); ctx.stroke();
  ctx.restore();
}

function drawStickerOrTextLayer(
  ctx: CanvasRenderingContext2D,
  layer: Extract<PositionedLayer, { type: 'text' | 'sticker' }>,
  product: TemplatePreviewProduct | null,
  preview: boolean,
) {
  const { width: w, height: h } = layer;
  if (layer.type === 'sticker') {
    const size = Math.min(w, h);
    ctx.globalAlpha = (layer.opacity / 100) * ((layer.fillOpacity ?? 100) / 100);
    ctx.fillStyle = layer.fill;
    if (layer.shape === 'rectangle') ctx.fillRect(0, 0, w, h);
    else if (layer.shape === 'square') ctx.fillRect((w - size) / 2, (h - size) / 2, size, size);
    else { ctx.beginPath(); ctx.arc(w / 2, h / 2, size / 2, 0, 2 * Math.PI); ctx.fill(); }
    ctx.globalAlpha = layer.opacity / 100;
    const textWidth = layer.shape === 'rectangle' ? w : size * (layer.shape === 'circle' ? .84 : 1);
    const textHeight = layer.shape === 'rectangle' ? h : size * (layer.shape === 'circle' ? .76 : 1);
    ctx.translate((w - textWidth) / 2, (h - textHeight) / 2);
    drawTemplateText(ctx, layer, interpolateTemplateFields(layer.text, product, preview), textWidth, textHeight);
    return;
  }
  drawTemplateText(ctx, layer, interpolateTemplateFields(layer.text, product, preview), w, h);
}

/**
 * Renders all visible template layers onto a target canvas for interactive preview or PNG export.
 */
export async function renderImageTemplate({ canvas, format, layout, product, assets, getPicture, signal, preview = false,
  processedPictures, onBackgroundRemovalReady, onRenderMessages }: {
  canvas: HTMLCanvasElement; format: ImageFormat; layout: ImageLayout; product: TemplatePreviewProduct | null;
  assets: ReadonlyMap<string, string>; getPicture: TemplatePictureLoader;
  signal?: AbortSignal; preview?: boolean;
  processedPictures?: ReadonlyMap<string, TemplatePicture>;
  onBackgroundRemovalReady?: (url: string, picture: TemplatePicture) => void;
  onRenderMessages?: (messages: string[]) => void;
}) {
  const layers = [...layout.layers].reverse().filter((layer) => isTemplateLayerVisible(layout, layer, product));
  const errors: string[] = [];
  const notices: string[] = [];
  const sources: Array<TemplatePicture | null> = layers.map(() => null);
  let backgroundRemovalPending = false;

  const sourcePromises = layers.map(async (layer, layerIndex) => {
    const photos = templateLayerPhotoUrls(layer, product, assets);
    if (!photos) return null;
    const candidates = photos.flatMap((photo) => templatePhotoVariants(photo, preview && layer.type === 'product')
      .map((url) => ({ photo, url })));

    for (const { photo, url } of candidates) {
      if (signal?.aborted) continue;
      try {
        const needsBackgroundRemoval = 'removeBackground' in layer && layer.removeBackground === true;
        const correction = needsBackgroundRemoval && 'imageMask' in layer ? layer.imageMask : undefined;
        const photoKey = correction ? cachedTemplatePhotoKey(photo) ?? await templatePhotoKey(photo) : undefined;
        const maskStrokes = correction && correction.photoKey === photoKey ? correction.strokes : undefined;
        if (signal?.aborted) return null;
        const pictureOptions = { preview, priority: 'high' as const, maskStrokes, signal: preview ? undefined : signal };
        const backgroundCacheKey = `${BACKGROUND_REMOVAL_MASK_REVISION}:${url}:${maskStrokes ? JSON.stringify(maskStrokes) : ''}`;
        const cachedCutout = needsBackgroundRemoval && processedPictures?.has(backgroundCacheKey)
          ? processedPictures.get(backgroundCacheKey)!
          : needsBackgroundRemoval && getPicture.getCached?.(url, true, pictureOptions);
        if (cachedCutout) {
          sources[layerIndex] = cachedCutout;
          if (cachedCutout.flatBackground === false) {
            notices.push(`O recorte automático de “${layer.name}” falhou. Você pode ajustar a máscara com o pincel.`);
          }
          return cachedCutout;
        }
        const cachedSource = getPicture.getCached?.(url, false);
        const removeNow = needsBackgroundRemoval && !(preview && onBackgroundRemovalReady);
        // Source requests are deduplicated and cached; a canvas redraw must not cancel their shared work.
        const source = !removeNow && cachedSource
          ? cachedSource
          : await getPicture(url, removeNow, pictureOptions);
        if (removeNow && source.flatBackground === false) {
          notices.push(`O recorte automático de “${layer.name}” falhou. Você pode ajustar a máscara com o pincel.`);
        }
        sources[layerIndex] = source;
        if (preview && needsBackgroundRemoval && onBackgroundRemovalReady && !signal?.aborted) {
          backgroundRemovalPending = true;
          void getPicture(url, true, pictureOptions).then((processed) => {
            if (!signal?.aborted) onBackgroundRemovalReady(backgroundCacheKey, processed);
          }).catch(() => {});
        }
        return source;
      } catch {
        // A foto adicional pode estar cadastrada e ficar indisponível no servidor de imagens.
      }
    }

    if (layer.type === 'product' && layer.imageIndex > 0 && layer.fallback === 'none') {
      if (preview) notices.push(`A foto adicional de “${layer.name}” está indisponível. A camada fica em branco.`);
    } else {
      errors.push(`Não foi possível abrir a imagem de “${layer.name}”.`);
    }
    return null;
  });

  const { width, height } = FORMAT_DIMENSIONS[format];
  const scale = preview ? .65 : 1;
  const canvasWidth = Math.round(width * scale);
  const canvasHeight = Math.round(height * scale);
  if (canvas.width !== canvasWidth) canvas.width = canvasWidth;
  if (canvas.height !== canvasHeight) canvas.height = canvasHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('O navegador não oferece suporte à edição de imagens.');
  if (typeof ctx.setTransform === 'function') {
    ctx.setTransform(canvas.width / width, 0, 0, canvas.height / height, 0, 0);
  } else {
    ctx.scale(canvas.width / width, canvas.height / height);
  }

  const fonts = [...new Set(layers.flatMap((layer) => ('font' in layer ? [canvasFont(layer)] : [])))];
  const fontsReady = document.fonts?.load
    ? Promise.all(fonts.map((font) => document.fonts.load(font).catch(() => [])))
    : Promise.resolve();

  let repaintFrame = 0;
  const paint = () => {
    if (signal?.aborted) return;
    ctx.clearRect(0, 0, width, height);
    if (!layers.some((layer) => layer.type === 'background')) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);
    }
    for (const [index, layer] of layers.entries()) {
      if (layer.type === 'background') {
        ctx.save();
        ctx.globalAlpha = (layer.opacity ?? 100) / 100;
        ctx.fillStyle = layer.color;
        ctx.fillRect(0, 0, width, height);
        ctx.restore();
        continue;
      }
      const { width: w, height: h } = layer;
      ctx.save();
      ctx.translate(layer.x + w / 2, layer.y + h / 2);
      ctx.rotate(layer.angle * Math.PI / 180);
      ctx.translate(-w / 2, -h / 2);
      ctx.beginPath(); ctx.rect(0, 0, w, h); ctx.clip();
      ctx.globalAlpha = layer.opacity / 100;
      if (layer.type === 'image' || layer.type === 'product') {
        const picture = sources[index];
        if (picture) {
          if (layer.type === 'product' && layer.fit === 'cover') {
            drawFramedProduct(ctx, picture, w, h, PRODUCT_MINIMUM_MARGIN, getFramedPictureBounds(picture));
          } else {
            drawPicture(ctx, picture, w, h, layer.fit);
          }
        } else if (preview && layer.type === 'product') {
          drawPlaceholder(ctx, w, h);
        }
      } else {
        drawStickerOrTextLayer(ctx, layer, product, preview);
      }
      ctx.restore();
    }
  };

  const schedulePaint = () => {
    if (signal?.aborted || repaintFrame) return;
    repaintFrame = requestAnimationFrame(() => { repaintFrame = 0; paint(); });
  };
  const watchedSources = sourcePromises.map((sourcePromise, index) => sourcePromise.then((picture) => {
    sources[index] = picture;
    if (preview) schedulePaint();
    return picture;
  }));

  if (!preview) {
    await Promise.all([fontsReady, ...watchedSources]);
    if (!signal?.aborted) paint();
    return { errors, notices, backgroundRemovalPending: false };
  }

  paint();
  void fontsReady.then(schedulePaint);
  void Promise.all(watchedSources).then(() => {
    if (signal?.aborted) return;
    const messageList = [...new Set([...errors, ...notices])];
    onRenderMessages?.(backgroundRemovalPending ? ['Aplicando recorte por IA…', ...messageList] : messageList);
  });
  return { errors, notices, backgroundRemovalPending };
}
