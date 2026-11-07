import {
  CATALOG_FIELDS, FORMAT_DIMENSIONS, isLayerVisible, type CatalogField, type ImageFormat, type ImageLayout,
  type PositionedLayer, type TemplatePreviewProduct,
} from '../../../../../../shared-utils/catalogImageTemplate';

type Picture = { image: CanvasImageSource; width: number; height: number; flatBackground?: boolean };
type TextLayer = Extract<PositionedLayer, { type: 'text' | 'catalog' | 'sticker' }>;

async function loadPicture(url: string): Promise<Picture> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    if (url.startsWith('https:')) image.crossOrigin = 'anonymous';
    image.referrerPolicy = 'no-referrer';
    const timer = window.setTimeout(() => fail(), 8_000);
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

// Flood from the border so a white surface inside a piece of furniture stays intact.
function cutOutFlatBackground(picture: Picture): Picture {
  const canvas = document.createElement('canvas');
  const scale = Math.min(1, 1200 / Math.max(picture.width, picture.height));
  const width = canvas.width = Math.max(1, Math.round(picture.width * scale));
  const height = canvas.height = Math.max(1, Math.round(picture.height * scale));
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) return { ...picture, flatBackground: false };
  context.drawImage(picture.image, 0, 0, width, height);
  const pixels = context.getImageData(0, 0, width, height);
  const { data } = pixels;
  const corners = [0, width - 1, width * (height - 1), width * height - 1].map((index) => index * 4);
  if (corners.every((index) => data[index + 3] < 20)) return { ...picture, flatBackground: true };
  const colors = corners.filter((index) => data[index + 3] > 220);
  const rgb = [0, 1, 2].map((channel) => colors.reduce((sum, index) => sum + data[index + channel], 0) / colors.length);
  const distance = (index: number) => Math.max(
    Math.abs(rgb[0] - data[index]), Math.abs(rgb[1] - data[index + 1]), Math.abs(rgb[2] - data[index + 2]),
  );
  if (colors.length !== 4 || colors.some((index) => distance(index) > 24)) return { ...picture, flatBackground: false };
  const seen = new Uint8Array(width * height);
  const queue = new Int32Array(width * height);
  let tail = 0;
  function visit(index: number) {
    if (seen[index]) return;
    seen[index] = 1;
    const pixel = index * 4;
    const delta = distance(pixel);
    if (data[pixel + 3] > 20 && delta > 34) return;
    data[pixel + 3] = Math.round(data[pixel + 3] * Math.max(0, (delta - 24) / 10));
    queue[tail++] = index;
  }
  for (let x = 0; x < width; x++) { visit(x); visit((height - 1) * width + x); }
  for (let y = 0; y < height; y++) { visit(y * width); visit(y * width + width - 1); }
  if (!tail) return { ...picture, flatBackground: false };
  for (let head = 0; head < tail; head++) {
    const index = queue[head];
    if (index % width) visit(index - 1);
    if (index % width < width - 1) visit(index + 1);
    if (index >= width) visit(index - width);
    if (index < width * (height - 1)) visit(index + width);
  }
  if (tail > width * height * .985) return { ...picture, flatBackground: false };
  context.putImageData(pixels, 0, 0);
  return { image: canvas, width, height, flatBackground: true };
}

export function createTemplatePictureLoader() {
  const cache = new Map<string, { picture: Promise<Picture>; retryAt?: number }>();
  function get(url: string, cutout: boolean): Promise<Picture> {
    const key = `${cutout ? 'cut:' : 'img:'}${url}`;
    const cached = cache.get(key);
    if (cached && (!cached.retryAt || cached.retryAt > Date.now())) return cached.picture;
    const picture = cutout ? get(url, false).then(cutOutFlatBackground) : loadPicture(url);
    cache.delete(key);
    if (cache.size >= 16) cache.delete(cache.keys().next().value!);
    const entry: { picture: Promise<Picture>; retryAt?: number } = { picture };
    cache.set(key, entry);
    // Repainting while a layer is moved must not repeatedly request a failed image.
    void picture.catch(() => { entry.retryAt = Date.now() + 10_000; });
    return picture;
  }
  return get;
}

function drawPicture(ctx: CanvasRenderingContext2D, picture: Picture, width: number, height: number, fit: 'contain' | 'cover') {
  const scale = (fit === 'contain' ? Math.min : Math.max)(width / picture.width, height / picture.height);
  const w = picture.width * scale;
  const h = picture.height * scale;
  ctx.drawImage(picture.image, (width - w) / 2, (height - h) / 2, w, h);
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
  return Math.max(0, ctx.measureText(text).width + Math.max(0, characters - 1) * letterSpacing);
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
  const padding = Math.min(20, width * .08);
  const verticalPadding = Math.min(20, height * .08);
  const available = Math.max(1, width - 2 * padding);
  const letterSpacing = layer.letterSpacing ?? 0;
  ctx.fillStyle = layer.color;
  ctx.font = `${layer.italic ? 'italic ' : ''}${layer.bold ? '700 ' : ''}${layer.fontSize}px "${layer.font}", sans-serif`;
  const textContext = ctx as CanvasRenderingContext2D & { letterSpacing?: string };
  const canSetLetterSpacing = typeof textContext.letterSpacing === 'string';
  const previousLetterSpacing = textContext.letterSpacing ?? '0px';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  const lineHeight = layer.fontSize * (layer.lineSpacing ?? 1.16);
  const lines = wrapText(ctx, text, available, letterSpacing);
  const maxLines = Math.max(1, Math.floor(Math.max(1, height - verticalPadding * 2) / lineHeight));
  if (lines.length > maxLines) {
    lines.length = maxLines;
    let last = lines[maxLines - 1].trimEnd();
    while (last && measureTextWidth(ctx, `${last}…`, letterSpacing) > available) last = Array.from(last).slice(0, -1).join('');
    lines[maxLines - 1] = `${last}…`;
  }
  const contentHeight = lines.length * lineHeight;
  const startY = (layer.verticalAlign ?? 'middle') === 'top' ? verticalPadding + lineHeight / 2
    : layer.verticalAlign === 'bottom' ? height - verticalPadding - contentHeight + lineHeight / 2
      : (height - contentHeight) / 2 + lineHeight / 2;
  const alpha = Number.isFinite(ctx.globalAlpha) ? ctx.globalAlpha : 1;
  ctx.globalAlpha = alpha * ((layer.textOpacity ?? 100) / 100);
  for (const [index, line] of lines.entries()) {
    const y = startY + index * lineHeight;
    const lineWidth = Math.min(available, measureTextWidth(ctx, line, letterSpacing));
    const x = layer.align === 'center' ? (width - lineWidth) / 2 : layer.align === 'right' ? width - padding - lineWidth : padding;
    if (canSetLetterSpacing) {
      textContext.letterSpacing = `${letterSpacing}px`;
      ctx.fillText(line, x, y, available);
    } else if (letterSpacing !== 0) {
      let cursor = x;
      for (const character of Array.from(line)) {
        ctx.fillText(character, cursor, y);
        cursor += ctx.measureText(character).width + letterSpacing;
      }
    } else {
      ctx.fillText(line, x, y, available);
    }
    const thickness = Math.max(2, layer.fontSize / 20);
    if (layer.strike) ctx.fillRect(x, y, lineWidth, thickness);
    if (layer.underline) ctx.fillRect(x, y + layer.fontSize * .38, lineWidth, thickness);
  }
  if (canSetLetterSpacing) textContext.letterSpacing = previousLetterSpacing;
}

function catalogValue(field: CatalogField, product: TemplatePreviewProduct | null, preview: boolean, label: string = CATALOG_FIELDS[field]) {
  const value = product?.fields[field];
  if (typeof value === 'number') return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: product!.currency }).format(value);
  return value ?? (!product && preview ? `[${label}]` : '');
}

export function interpolateTemplateFields(text: string, product: TemplatePreviewProduct | null, preview = false) {
  return text.replace(/\{\{product\.([a-zA-Z0-9_]+)\}\}/g, (token, field: string) =>
    Object.prototype.hasOwnProperty.call(CATALOG_FIELDS, field)
      ? catalogValue(field as CatalogField, product, preview)
      : token);
}

export async function renderImageTemplate({ canvas, format, layout, product, assets, getPicture, signal, preview = false }: {
  canvas: HTMLCanvasElement; format: ImageFormat; layout: ImageLayout; product: TemplatePreviewProduct | null;
  assets: ReadonlyMap<string, string>; getPicture: ReturnType<typeof createTemplatePictureLoader>;
  signal?: AbortSignal; preview?: boolean;
}) {
  const layers = [...layout.layers].reverse().filter((layer) => isLayerVisible(layer, product));
  const errors: string[] = [];
  const notices: string[] = [];
  const sources = await Promise.all(layers.map(async (layer) => {
    let candidates: Array<string | null | undefined>;
    if (layer.type === 'image') {
      if (!layer.assetId) return null;
      candidates = [assets.get(layer.assetId)];
    } else if (layer.type === 'product') {
      if (!product) return null;
      candidates = [product.images[layer.imageIndex]];
      if (layer.imageIndex > 0 && layer.fallback === 'main') candidates.push(product.images[0]);
    } else return null;

    for (const url of new Set(candidates)) {
      if (!url || signal?.aborted) continue;
      try {
        const picture = await getPicture(url, layer.type === 'product' && layer.removeBackground);
        if (picture.flatBackground === false) notices.push(`O fundo de “${layer.name}” foi mantido para preservar o produto.`);
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
  }));
  if (signal?.aborted) return { errors, notices };

  const { width, height } = FORMAT_DIMENSIONS[format];
  const scale = preview ? .65 : 1;
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('O navegador não oferece suporte à edição de imagens.');
  ctx.scale(canvas.width / width, canvas.height / height);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);
  for (const [index, layer] of layers.entries()) {
    if (layer.type === 'background') {
      ctx.fillStyle = layer.color;
      ctx.fillRect(0, 0, width, height);
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
      if (picture) drawPicture(ctx, picture, w, h, layer.fit);
      else if (preview && layer.type === 'product' && !product) drawPlaceholder(ctx, w, h);
    } else if (layer.type === 'sticker') {
      const size = Math.min(w, h);
      ctx.fillStyle = layer.fill;
      if (layer.shape === 'rectangle') ctx.fillRect(0, 0, w, h);
      else if (layer.shape === 'square') ctx.fillRect((w - size) / 2, (h - size) / 2, size, size);
      else { ctx.beginPath(); ctx.arc(w / 2, h / 2, size / 2, 0, 2 * Math.PI); ctx.fill(); }
      const textWidth = layer.shape === 'rectangle' ? w : size * (layer.shape === 'circle' ? .78 : 1);
      const textHeight = layer.shape === 'rectangle' ? h : size * (layer.shape === 'circle' ? .7 : 1);
      ctx.translate((w - textWidth) / 2, (h - textHeight) / 2);
      drawText(ctx, layer, interpolateTemplateFields(layer.text, product, preview), textWidth, textHeight);
    } else {
      drawText(ctx, layer, layer.type === 'text' ? interpolateTemplateFields(layer.text, product, preview)
        : catalogValue(layer.field, product, preview, layer.name), w, h);
    }
    ctx.restore();
  }
  return { errors, notices };
}
