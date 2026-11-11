import {
  FIELD_ALIASES, FORMAT_DIMENSIONS, isTemplateLayerVisible, isPercentageField, isPriceField, isTemplateField, templateFieldLabel, templateFieldValue,
  type ImageFormat, type ImageLayout, type ImageTextEffect, type PositionedLayer, type TemplateField, type TemplatePreviewProduct,
  type Text3dDirection,
} from '../../../../../../shared-utils/catalogImageTemplate';
import { getDerivedImageUrl } from '@/utils/imageUrlUtils';
import { BACKGROUND_REMOVAL_REVISION, removeImageBackground } from '@/pages/utils/backgroundRemoval';
import { imageContentBounds, type ImageContentBounds } from '@/pages/utils/imageContentBounds';

export type TemplatePicture = { image: CanvasImageSource; width: number; height: number; flatBackground?: boolean };
type Picture = TemplatePicture;
type TextLayer = Extract<PositionedLayer, { type: 'text' | 'sticker' }>;
const TEXT_SELECTION_MARGIN = 7.56; // Aproximadamente 2 mm a 96 dpi.
const BACKGROUND_REMOVAL_MASK_REVISION = 'connected-edge-floor-v2';
const canvasFont = (layer: TextLayer) => `${layer.italic ? 'italic ' : ''}${layer.bold ? '700 ' : ''}${layer.fontSize}px "${layer.font}", sans-serif`;
const isLegacyTextShadow = (layer: TextLayer) => layer.textShadow === true && (layer.textEffect === undefined || layer.textEffect === 'none');
const layerTextEffect = (layer: TextLayer): ImageTextEffect => isLegacyTextShadow(layer) ? 'shadow' : layer.textEffect ?? 'none';
const layerTextEffectSize = (layer: TextLayer) => Math.min(32, Math.max(1, layer.textEffectSize ?? Math.round(layer.fontSize * .12)));
const withOpacity = (color: string, opacity: number) => {
  const channels = [1, 3, 5].map((offset) => Number.parseInt(color.slice(offset, offset + 2), 16));
  return `rgba(${channels[0]}, ${channels[1]}, ${channels[2]}, ${opacity / 100})`;
};

function measureTextInk(ctx: CanvasRenderingContext2D, lines: string[], fontSize: number) {
  const fallbackAscent = fontSize * .8;
  const fallbackDescent = fontSize * .2;
  const metrics = lines.map((line) => ctx.measureText(line));
  return {
    ascent: Math.max(0, ...metrics.map((metric, index) => {
      const actual = metric.actualBoundingBoxAscent;
      const font = metric.fontBoundingBoxAscent;
      if (Number.isFinite(actual) && actual > 0) return actual;
      if (lines[index].trim() && Number.isFinite(font) && font > 0) return font;
      return lines[index].trim() ? fallbackAscent : 0;
    })),
    descent: Math.max(0, ...metrics.map((metric, index) => Number.isFinite(metric.actualBoundingBoxDescent)
      ? metric.actualBoundingBoxDescent : lines[index].trim() ? fallbackDescent : 0)),
  };
}

function measureTextFontBox(ctx: CanvasRenderingContext2D, lines: string[], fontSize: number) {
  const sample = lines.find((line) => line.trim()) || 'Mg';
  const metrics = ctx.measureText(sample);
  const ascent = metrics.fontBoundingBoxAscent;
  const descent = metrics.fontBoundingBoxDescent;
  return {
    ascent: Number.isFinite(ascent) && ascent > 0 ? ascent : fontSize * .8,
    descent: Number.isFinite(descent) && descent > 0 ? descent : fontSize * .2,
  };
}
const text3dDirectionVector: Record<Text3dDirection, { x: number; y: number }> = {
  'down-right': { x: 1, y: 1 }, down: { x: 0, y: 1 }, 'down-left': { x: -1, y: 1 }, left: { x: -1, y: 0 },
  'up-left': { x: -1, y: -1 }, up: { x: 0, y: -1 }, 'up-right': { x: 1, y: -1 }, right: { x: 1, y: 0 },
};
function text3dVector(layer: TextLayer) {
  if (layer.text3dAngle === undefined) return text3dDirectionVector[layer.text3dDirection ?? 'down-right'];
  const radians = layer.text3dAngle * Math.PI / 180;
  return { x: Math.cos(radians), y: Math.sin(radians) };
}

async function loadPicture(url: string, timeoutMs = 8_000): Promise<Picture> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    if (url.startsWith('https:')) image.crossOrigin = 'anonymous';
    image.referrerPolicy = 'no-referrer';
    const timer = window.setTimeout(() => fail(), timeoutMs);
    const fail = () => { clearTimeout(timer); image.onload = null; image.onerror = null; reject(new Error('Imagem indisponível.')); };
    image.onerror = fail;
    image.onload = () => {
      clearTimeout(timer);
      if (!image.naturalWidth || !image.naturalHeight) return fail();
      resolve({ image, width: image.naturalWidth, height: image.naturalHeight });
    };
    image.src = url;
  });
}

async function cutOutProductBackground(picture: Picture): Promise<Picture> {
  try {
    const result = await removeImageBackground(picture.image, picture.width, picture.height);
    if (result.alreadyTransparent) return { ...picture, flatBackground: true };
    return { image: result.canvas, width: result.width, height: result.height, flatBackground: true };
  } catch {
    return { ...picture, flatBackground: false };
  }
}

export function createTemplatePictureLoader() {
  const cache = new Map<string, { picture: Promise<Picture>; retryAt?: number }>();
  function get(url: string, cutout: boolean): Promise<Picture> {
    const key = `${cutout ? `cut:${BACKGROUND_REMOVAL_MASK_REVISION}:${BACKGROUND_REMOVAL_REVISION}:` : 'img:'}${url}`;
    const cached = cache.get(key);
    if (cached && (!cached.retryAt || cached.retryAt > Date.now())) return cached.picture;
    const isDerivedPreview = /_medium\.webp(?:[?#]|$)/i.test(url);
    const picture = cutout ? get(url, false).then(cutOutProductBackground)
      : loadPicture(url, isDerivedPreview ? 2_500 : 8_000);
    cache.delete(key);
    if (cache.size >= 16) cache.delete(cache.keys().next().value!);
    const entry: { picture: Promise<Picture>; retryAt?: number } = { picture };
    cache.set(key, entry);
    void picture.then((result) => { if (cutout && result.flatBackground === false) entry.retryAt = Date.now() + 30_000; }, () => {});
    // Repainting while a layer is moved must not repeatedly request a failed image.
    void picture.catch(() => { entry.retryAt = Date.now() + 10_000; });
    return picture;
  }
  return get;
}

const PRODUCT_MINIMUM_MARGIN = 0.05;
const framedPictureBounds = new WeakMap<Picture, ImageContentBounds>();

function getFramedPictureBounds(picture: Picture) {
  let bounds = framedPictureBounds.get(picture);
  if (!bounds) {
    bounds = imageContentBounds(picture.image, picture.width, picture.height, .015);
    framedPictureBounds.set(picture, bounds);
  }
  return bounds;
}

function drawPicture(ctx: CanvasRenderingContext2D, picture: Picture, width: number, height: number,
  fit: 'contain' | 'cover', margin = 0, sourceBounds: ImageContentBounds = { x: 0, y: 0, width: picture.width, height: picture.height }) {
  const insetX = width * margin;
  const insetY = height * margin;
  const availableWidth = Math.max(1, width - insetX * 2);
  const availableHeight = Math.max(1, height - insetY * 2);
  const scale = (fit === 'contain' ? Math.min : Math.max)(availableWidth / sourceBounds.width, availableHeight / sourceBounds.height);
  const w = sourceBounds.width * scale;
  const h = sourceBounds.height * scale;
  ctx.drawImage(picture.image, sourceBounds.x, sourceBounds.y, sourceBounds.width, sourceBounds.height,
    insetX + (availableWidth - w) / 2, insetY + (availableHeight - h) / 2, w, h);
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

function measureTextWidth(ctx: CanvasRenderingContext2D, text: string, letterSpacing: number) {
  const characters = Array.from(text).length;
  return Math.max(0, ctx.measureText(text).width + (characters - 1) * letterSpacing);
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, width: number, letterSpacing: number) {
  const lines: string[] = [];
  for (const paragraph of text.split(/\r?\n/)) {
    let line = '';
    for (const word of paragraph.split(/\s+/).filter(Boolean)) {
      const next = line ? `${line} ${word}` : word;
      if (measureTextWidth(ctx, next, letterSpacing) <= width) { line = next; continue; }
      if (line) lines.push(line);
      line = '';
      for (const letter of Array.from(word)) {
        if (line && measureTextWidth(ctx, line + letter, letterSpacing) > width) { lines.push(line); line = ''; }
        line += letter;
      }
    }
    lines.push(line);
  }
  return lines;
}

function drawText(ctx: CanvasRenderingContext2D, layer: TextLayer, text: string, width: number, height: number) {
  if (!text) return;
  const effect = layerTextEffect(layer);
  const effectSize = layerTextEffectSize(layer);
  const padding = TEXT_SELECTION_MARGIN;
  const verticalPadding = TEXT_SELECTION_MARGIN;
  const available = Math.max(1, width - 2 * padding);
  const letterSpacing = layer.letterSpacing ?? 0;
  ctx.font = canvasFont(layer);
  const textContext = ctx as CanvasRenderingContext2D & { letterSpacing?: string };
  const canSetLetterSpacing = typeof textContext.letterSpacing === 'string';
  const previousLetterSpacing = textContext.letterSpacing ?? '0px';
  if (canSetLetterSpacing) textContext.letterSpacing = '0px';
  const drawRun = (mode: 'fill' | 'stroke', textLine: string, x: number, y: number) => {
    const draw = (value: string, position: number, maxWidth?: number) => {
      if (mode === 'stroke') {
        if (maxWidth === undefined) ctx.strokeText(value, position, y);
        else ctx.strokeText(value, position, y, maxWidth);
      } else if (maxWidth === undefined) ctx.fillText(value, position, y);
      else ctx.fillText(value, position, y, maxWidth);
    };
    if (canSetLetterSpacing) {
      textContext.letterSpacing = `${letterSpacing}px`;
      draw(textLine, x, available);
      textContext.letterSpacing = '0px';
    } else if (letterSpacing !== 0) {
      let cursor = x;
      for (const character of Array.from(textLine)) {
        draw(character, cursor);
        cursor += ctx.measureText(character).width + letterSpacing;
      }
    } else draw(textLine, x, available);
  };
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  const lineHeight = layer.fontSize * (layer.lineSpacing ?? 1.16);
  let lines = wrapText(ctx, text, available, letterSpacing);
  let ink = measureTextInk(ctx, lines, layer.fontSize);
  const maxLines = Math.max(1, Math.floor(Math.max(0, height - verticalPadding * 2 - ink.ascent - ink.descent) / lineHeight) + 1);
  if (lines.length > maxLines) {
    lines.length = maxLines;
    let last = lines[maxLines - 1].trimEnd();
    while (last && measureTextWidth(ctx, `${last}...`, letterSpacing) > available) last = Array.from(last).slice(0, -1).join('');
    lines[maxLines - 1] = `${last}...`;
    ink = measureTextInk(ctx, lines, layer.fontSize);
  }
  const underlineOverflow = layer.underline
    ? Math.max(0, Math.max(1, ink.descent * .5) + Math.max(2, layer.fontSize / 20) - ink.descent) : 0;
  const fontBox = measureTextFontBox(ctx, lines, layer.fontSize);
  const lineBoxHeight = fontBox.ascent + fontBox.descent;
  const verticalContentHeight = lineBoxHeight + Math.max(0, lines.length - 1) * lineHeight + underlineOverflow;
  const verticalSlack = Math.max(0, height - verticalPadding * 2 - verticalContentHeight);
  const verticalOffset = (layer.verticalAlign ?? 'middle') === 'top' ? 0
    : layer.verticalAlign === 'bottom' ? verticalSlack : verticalSlack / 2;
  const startY = verticalPadding + verticalOffset + fontBox.ascent;
  const alpha = Number.isFinite(ctx.globalAlpha) ? ctx.globalAlpha : 1;
  ctx.globalAlpha = alpha * ((layer.textOpacity ?? 100) / 100);
  for (const [index, line] of lines.entries()) {
    const y = startY + index * lineHeight;
    const lineWidth = Math.min(available, measureTextWidth(ctx, line, letterSpacing));
    const x = layer.align === 'center' ? (width - lineWidth) / 2 : layer.align === 'right' ? width - padding - lineWidth : padding;
    ctx.save();
    if (effect === 'shadow') {
      ctx.fillStyle = layer.color;
      ctx.shadowColor = isLegacyTextShadow(layer) ? 'rgba(0, 0, 0, 0.56)'
        : withOpacity(layer.textShadowColor ?? '#000000', layer.textShadowOpacity ?? 56);
      ctx.shadowBlur = isLegacyTextShadow(layer) ? Math.max(2, layer.fontSize * .12) : effectSize;
      ctx.shadowOffsetX = isLegacyTextShadow(layer) ? 0 : effectSize * .35;
      ctx.shadowOffsetY = isLegacyTextShadow(layer) ? Math.max(1, layer.fontSize * .04) : effectSize * .5;
      drawRun('fill', line, x, y);
    } else if (effect === 'outline') {
      ctx.strokeStyle = layer.textOutlineColor ?? '#ffffff';
      ctx.lineWidth = effectSize * 2;
      ctx.lineJoin = 'round';
      drawRun('stroke', line, x, y);
      ctx.fillStyle = layer.color;
      drawRun('fill', line, x, y);
    } else if (effect === '3d') {
      ctx.fillStyle = layer.text3dColor ?? '#172033';
      const direction = text3dVector(layer);
      const steps = Math.min(effectSize, 8);
      for (let step = steps; step > 0; step -= 1) {
        const offset = effectSize * step / steps;
        drawRun('fill', line, x + direction.x * offset, y + direction.y * offset);
      }
      ctx.fillStyle = layer.color;
      drawRun('fill', line, x, y);
    } else if (effect === 'neon') {
      const neonColor = layer.textNeonColor ?? '#00e5ff';
      ctx.strokeStyle = neonColor;
      ctx.lineWidth = effectSize;
      ctx.lineJoin = 'round';
      ctx.shadowColor = neonColor;
      ctx.shadowBlur = effectSize * 2;
      drawRun('stroke', line, x, y);
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.fillStyle = layer.color;
      drawRun('fill', line, x, y);
    } else {
      ctx.fillStyle = layer.color;
      drawRun('fill', line, x, y);
    }
    ctx.restore();
    ctx.fillStyle = layer.color;
    const thickness = Math.max(2, layer.fontSize / 20);
    if (layer.strike) ctx.fillRect(x, y - Math.max(1, ink.ascent * .35), lineWidth, thickness);
    if (layer.underline) ctx.fillRect(x, y + Math.max(1, ink.descent * .5), lineWidth, thickness);
  }
  if (canSetLetterSpacing) textContext.letterSpacing = previousLetterSpacing;
}

function catalogValue(field: TemplateField, product: TemplatePreviewProduct | null, preview: boolean, label = templateFieldLabel(field, product?.attributes)) {
  const value = templateFieldValue(field, product);
  if (typeof value === 'number') {
    if (isPriceField(field)) {
      return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: product?.currency || 'BRL' }).format(value);
    }
    if (isPercentageField(field) || field === 'discountPercent') {
      return `${value}%`;
    }
    return new Intl.NumberFormat('pt-BR').format(value);
  }
  return value ?? (!product && preview ? `[${label}]` : '');
}

export function interpolateTemplateFields(text: string, product: TemplatePreviewProduct | null, preview = false) {
  return text.replace(/\{\{product\.([a-zA-Z0-9_]+)\}\}/g, (token, rawField: string) => {
    const field = FIELD_ALIASES[rawField] || rawField;
    if (isTemplateField(field)) {
      const label = templateFieldLabel(field as TemplateField, product?.attributes);
      return String(catalogValue(field as TemplateField, product, preview, label));
    }
    return token;
  });
}

type ResizableTextLayer = Extract<PositionedLayer, { type: 'text' }>;
let textMeasurementContext: CanvasRenderingContext2D | null | undefined;

export function measureTextLayerSafetyBounds(layer: ResizableTextLayer, product: TemplatePreviewProduct | null,
  requestedWidth = layer.width, requestedHeight = layer.height) {
  const safeRequestedWidth = Math.min(3840, Math.max(16, requestedWidth));
  const text = interpolateTemplateFields(layer.text, product, !product);
  const padding = TEXT_SELECTION_MARGIN;
  const available = Math.max(1, safeRequestedWidth - 2 * padding);
  const letterSpacing = layer.letterSpacing ?? 0;
  if (textMeasurementContext === undefined) {
    textMeasurementContext = typeof document === 'undefined' ? null : document.createElement('canvas').getContext('2d');
  }
  const context = textMeasurementContext;
  let widestLine: number;
  let ascent: number;
  let descent: number;
  if (context) {
    context.font = canvasFont(layer);
    const lines = wrapText(context, text, available, letterSpacing);
    widestLine = Math.max(0, ...lines.map((line) => measureTextWidth(context, line, letterSpacing)));
    ({ ascent, descent } = measureTextInk(context, lines, layer.fontSize));
  } else {
    const characterWidth = Math.max(1, layer.fontSize * .62 + letterSpacing);
    const textLines = text.split(/\r?\n/);
    widestLine = Math.min(available, Math.max(0, ...textLines.map((line) => Array.from(line).length * characterWidth)));
    ascent = layer.fontSize * .8;
    descent = layer.fontSize * .2;
  }
  const minimumWidth = Math.min(3840, Math.max(16, Math.ceil(widestLine + padding * 2)));
  const width = Math.min(3840, Math.max(minimumWidth, safeRequestedWidth));
  const underlineOverflow = layer.underline
    ? Math.max(0, Math.max(1, descent * .5) + Math.max(2, layer.fontSize / 20) - descent) : 0;
  const minimumHeight = Math.min(3840, Math.max(16, Math.ceil(ascent + descent + underlineOverflow + padding * 2)));
  return { width, height: Math.min(3840, Math.max(requestedHeight, minimumHeight)), minimumWidth, minimumHeight };
}

export async function renderImageTemplate({ canvas, format, layout, product, assets, getPicture, signal, preview = false,
  processedPictures, onBackgroundRemovalReady }: {
  canvas: HTMLCanvasElement; format: ImageFormat; layout: ImageLayout; product: TemplatePreviewProduct | null;
  assets: ReadonlyMap<string, string>; getPicture: ReturnType<typeof createTemplatePictureLoader>;
  signal?: AbortSignal; preview?: boolean;
  processedPictures?: ReadonlyMap<string, TemplatePicture>;
  onBackgroundRemovalReady?: (url: string, picture: TemplatePicture) => void;
}) {
  const layers = [...layout.layers].reverse().filter((layer) => isTemplateLayerVisible(layout, layer, product));
  const errors: string[] = [];
  const notices: string[] = [];
  const sources: Array<Picture | null> = layers.map(() => null);
  const sourcePromises = layers.map(async (layer) => {
    let candidates: Array<string | null | undefined>;
    if (layer.type === 'image') {
      if (!layer.assetId) return null;
      candidates = [assets.get(layer.assetId)];
    } else if (layer.type === 'product') {
      if (!product) return null;
      candidates = [product.images[layer.imageIndex]];
      if (layer.imageIndex > 0 && layer.fallback === 'main') candidates.push(product.images[0]);
    } else return null;

    const previewCandidates = preview && layer.type === 'product'
      ? candidates.flatMap((url) => {
        if (!url) return [];
        const mediumUrl = getDerivedImageUrl(url, 'medium');
        return mediumUrl === url ? [url] : [mediumUrl, url];
      })
      : candidates;
    for (const url of new Set(previewCandidates)) {
      if (!url || signal?.aborted) continue;
      try {
        const needsBackgroundRemoval = layer.type === 'product' && layer.removeBackground;
        const backgroundCacheKey = `${BACKGROUND_REMOVAL_MASK_REVISION}:${url}`;
        const picture = needsBackgroundRemoval && processedPictures?.has(backgroundCacheKey)
          ? processedPictures.get(backgroundCacheKey)!
          : preview && needsBackgroundRemoval && onBackgroundRemovalReady
            ? await getPicture(url, false).then((source) => {
              void getPicture(url, true).then((processed) => {
                if (!signal?.aborted) onBackgroundRemovalReady(backgroundCacheKey, processed);
              }).catch(() => {});
              return source;
            })
            : await getPicture(url, needsBackgroundRemoval);
        if (picture.flatBackground === false) notices.push(`Não foi possível concluir o recorte de “${layer.name}”; a foto original foi mantida.`);
        return picture;
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
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('O navegador não oferece suporte à edição de imagens.');
  ctx.scale(canvas.width / width, canvas.height / height);
  const fonts = [...new Set(layers.flatMap((layer) => 'font' in layer ? [canvasFont(layer)] : []))];
  const fontsReady = document.fonts?.load
    ? Promise.all(fonts.map((font) => document.fonts.load(font).catch(() => [])))
    : Promise.resolve();
  const paint = () => {
    if (signal?.aborted) return;
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
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
          const frameToProduct = layer.type === 'product' && layer.fit === 'cover';
          drawPicture(ctx, picture, w, h, frameToProduct ? 'contain' : layer.fit,
            frameToProduct ? PRODUCT_MINIMUM_MARGIN : 0, frameToProduct ? getFramedPictureBounds(picture) : undefined);
        } else if (preview && layer.type === 'product' && !product) drawPlaceholder(ctx, w, h);
      } else if (layer.type === 'sticker') {
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
        drawText(ctx, layer, interpolateTemplateFields(layer.text, product, preview), textWidth, textHeight);
      } else {
        drawText(ctx, layer, interpolateTemplateFields(layer.text, product, preview), w, h);
      }
      ctx.restore();
    }
  };

  const loaded = await Promise.all(sourcePromises);
  loaded.forEach((picture, index) => { sources[index] = picture; });
  await fontsReady;
  if (signal?.aborted) return { errors, notices };
  paint();
  return { errors, notices };
}
