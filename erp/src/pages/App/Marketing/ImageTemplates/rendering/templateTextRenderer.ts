import {
  FIELD_ALIASES, isPercentageField, isPriceField, isTemplateField, templateFieldLabel, templateFieldValue,
  type ImageTextEffect, type PositionedLayer, type TemplateField, type TemplatePreviewProduct, type Text3dDirection,
} from '../../../../../../../shared-utils/catalogImageTemplate';

export type TextLayer = Extract<PositionedLayer, { type: 'text' | 'sticker' }>;
export type ResizableTextLayer = Extract<PositionedLayer, { type: 'text' }>;

export const TEXT_SELECTION_MARGIN = 7.56; // Aproximadamente 2 mm a 96 dpi.

let textMeasurementContext: CanvasRenderingContext2D | null | undefined;

export const canvasFont = (layer: TextLayer) =>
  `${layer.italic ? 'italic ' : ''}${layer.bold ? '700 ' : ''}${layer.fontSize}px "${layer.font}", sans-serif`;

const isLegacyTextShadow = (layer: TextLayer) =>
  layer.textShadow === true && (layer.textEffect === undefined || layer.textEffect === 'none');

const layerTextEffect = (layer: TextLayer): ImageTextEffect =>
  isLegacyTextShadow(layer) ? 'shadow' : layer.textEffect ?? 'none';

const layerTextEffectSize = (layer: TextLayer) =>
  Math.min(32, Math.max(1, layer.textEffectSize ?? Math.round(layer.fontSize * .12)));

const withOpacity = (color: string, opacity: number) => {
  const channels = [1, 3, 5].map((offset) => Number.parseInt(color.slice(offset, offset + 2), 16));
  return `rgba(${channels[0]}, ${channels[1]}, ${channels[2]}, ${opacity / 100})`;
};

const text3dDirectionVector: Record<Text3dDirection, { x: number; y: number }> = {
  'down-right': { x: 1, y: 1 }, down: { x: 0, y: 1 }, 'down-left': { x: -1, y: 1 }, left: { x: -1, y: 0 },
  'up-left': { x: -1, y: -1 }, up: { x: 0, y: -1 }, 'up-right': { x: 1, y: -1 }, right: { x: 1, y: 0 },
};

function text3dVector(layer: TextLayer) {
  if (layer.text3dAngle === undefined) return text3dDirectionVector[layer.text3dDirection ?? 'down-right'];
  const radians = layer.text3dAngle * Math.PI / 180;
  return { x: Math.cos(radians), y: Math.sin(radians) };
}

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
    descent: Math.max(0, ...metrics.map((metric, index) => (Number.isFinite(metric.actualBoundingBoxDescent)
      ? metric.actualBoundingBoxDescent : lines[index].trim() ? fallbackDescent : 0))),
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

function drawTextEffectRun(
  ctx: CanvasRenderingContext2D,
  layer: TextLayer,
  effect: ImageTextEffect,
  effectSize: number,
  drawRun: (mode: 'fill' | 'stroke', textLine: string, x: number, y: number) => void,
  line: string,
  x: number,
  y: number,
) {
  if (effect === 'shadow') {
    ctx.fillStyle = layer.color;
    ctx.shadowColor = isLegacyTextShadow(layer)
      ? 'rgba(0, 0, 0, 0.56)'
      : withOpacity(layer.textShadowColor ?? '#000000', layer.textShadowOpacity ?? 56);
    ctx.shadowBlur = isLegacyTextShadow(layer) ? Math.max(2, layer.fontSize * .12) : effectSize;
    ctx.shadowOffsetX = isLegacyTextShadow(layer) ? 0 : effectSize * .35;
    ctx.shadowOffsetY = isLegacyTextShadow(layer) ? Math.max(1, layer.fontSize * .04) : effectSize * .5;
    drawRun('fill', line, x, y);
    return;
  }
  if (effect === 'outline') {
    ctx.strokeStyle = layer.textOutlineColor ?? '#ffffff';
    ctx.lineWidth = effectSize * 2;
    ctx.lineJoin = 'round';
    drawRun('stroke', line, x, y);
    ctx.fillStyle = layer.color;
    drawRun('fill', line, x, y);
    return;
  }
  if (effect === '3d') {
    ctx.fillStyle = layer.text3dColor ?? '#172033';
    const direction = text3dVector(layer);
    const steps = Math.min(effectSize, 8);
    for (let step = steps; step > 0; step -= 1) {
      const offset = effectSize * step / steps;
      drawRun('fill', line, x + direction.x * offset, y + direction.y * offset);
    }
    ctx.fillStyle = layer.color;
    drawRun('fill', line, x, y);
    return;
  }
  if (effect === 'neon') {
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
    return;
  }
  ctx.fillStyle = layer.color;
  drawRun('fill', line, x, y);
}

/**
 * Draws formatted, wrapped, and effect-styled text inside a bounding box on a 2D canvas context.
 */
export function drawTemplateText(
  ctx: CanvasRenderingContext2D,
  layer: TextLayer,
  text: string,
  width: number,
  height: number,
) {
  if (!text) return;
  const effect = layerTextEffect(layer);
  const effectSize = layerTextEffectSize(layer);
  const padding = TEXT_SELECTION_MARGIN;
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
      } else if (maxWidth === undefined) {
        ctx.fillText(value, position, y);
      } else {
        ctx.fillText(value, position, y, maxWidth);
      }
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
    } else {
      draw(textLine, x, available);
    }
  };

  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  const lineHeight = layer.fontSize * (layer.lineSpacing ?? 1.16);
  const lines = wrapText(ctx, text, available, letterSpacing);
  let ink = measureTextInk(ctx, lines, layer.fontSize);
  const maxLines = Math.max(1, Math.floor(Math.max(0, height - padding * 2 - ink.ascent - ink.descent) / lineHeight) + 1);
  if (lines.length > maxLines) {
    lines.length = maxLines;
    let last = lines[maxLines - 1].trimEnd();
    while (last && measureTextWidth(ctx, `${last}...`, letterSpacing) > available) {
      last = Array.from(last).slice(0, -1).join('');
    }
    lines[maxLines - 1] = `${last}...`;
    ink = measureTextInk(ctx, lines, layer.fontSize);
  }

  const underlineOverflow = layer.underline
    ? Math.max(0, Math.max(1, ink.descent * .5) + Math.max(2, layer.fontSize / 20) - ink.descent)
    : 0;
  const fontBox = measureTextFontBox(ctx, lines, layer.fontSize);
  const verticalContentHeight = (fontBox.ascent + fontBox.descent) + Math.max(0, lines.length - 1) * lineHeight + underlineOverflow;
  const verticalSlack = Math.max(0, height - padding * 2 - verticalContentHeight);
  const verticalOffset = (layer.verticalAlign ?? 'middle') === 'top'
    ? 0
    : layer.verticalAlign === 'bottom'
      ? verticalSlack
      : verticalSlack / 2;
  const startY = padding + verticalOffset + fontBox.ascent;
  const alpha = Number.isFinite(ctx.globalAlpha) ? ctx.globalAlpha : 1;
  ctx.globalAlpha = alpha * ((layer.textOpacity ?? 100) / 100);

  for (const [index, line] of lines.entries()) {
    const y = startY + index * lineHeight;
    const lineWidth = Math.min(available, measureTextWidth(ctx, line, letterSpacing));
    const x = layer.align === 'center'
      ? (width - lineWidth) / 2
      : layer.align === 'right'
        ? width - padding - lineWidth
        : padding;
    ctx.save();
    drawTextEffectRun(ctx, layer, effect, effectSize, drawRun, line, x, y);
    ctx.restore();
    ctx.fillStyle = layer.color;
    const thickness = Math.max(2, layer.fontSize / 20);
    if (layer.strike) ctx.fillRect(x, y - Math.max(1, ink.ascent * .35), lineWidth, thickness);
    if (layer.underline) ctx.fillRect(x, y + Math.max(1, ink.descent * .5), lineWidth, thickness);
  }
  if (canSetLetterSpacing) textContext.letterSpacing = previousLetterSpacing;
}

function catalogValue(
  field: TemplateField,
  product: TemplatePreviewProduct | null,
  preview: boolean,
  label = templateFieldLabel(field, product?.attributes),
) {
  const value = templateFieldValue(field, product);
  if (typeof value === 'number') {
    if (isPriceField(field)) {
      return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: product?.currency || 'BRL' }).format(value);
    }
    if (isPercentageField(field) || (field as string) === 'discountPercent') {
      return `${value}%`;
    }
    return new Intl.NumberFormat('pt-BR').format(value);
  }
  return value ?? (!product && preview ? `[${label}]` : '');
}

/**
 * Replaces `{{product.<field>}}` tokens with localized formatted product values or preview placeholders.
 */
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

/**
 * Measures the minimum non-clipping text layer dimensions for the current font and interpolated content.
 */
export function measureTextLayerSafetyBounds(
  layer: ResizableTextLayer,
  product: TemplatePreviewProduct | null,
  requestedWidth = layer.width,
  requestedHeight = layer.height,
) {
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
    ? Math.max(0, Math.max(1, descent * .5) + Math.max(2, layer.fontSize / 20) - descent)
    : 0;
  const minimumHeight = Math.min(3840, Math.max(16, Math.ceil(ascent + descent + underlineOverflow + padding * 2)));
  return { width, height: Math.min(3840, Math.max(requestedHeight, minimumHeight)), minimumWidth, minimumHeight };
}
