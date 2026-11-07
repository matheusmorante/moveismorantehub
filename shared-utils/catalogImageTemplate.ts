import { z } from 'zod';

export const IMAGE_FORMATS = ['1:1', '4:5', '9:16'] as const;
export type ImageFormat = typeof IMAGE_FORMATS[number];
export const FORMAT_DIMENSIONS: Record<ImageFormat, { width: number; height: number }> = {
  '1:1': { width: 1080, height: 1080 },
  '4:5': { width: 1080, height: 1350 },
  '9:16': { width: 1080, height: 1920 },
};

export const CATALOG_FIELDS = {
  name: 'Nome', brand: 'Marca', description: 'Descrição', retailerId: 'Código/SKU',
  price: 'Preço normal', salePrice: 'Preço promocional', currentPrice: 'Preço atual',
  availability: 'Disponibilidade', productType: 'Categoria',
  custom_label_0: 'Rótulo personalizado 0', custom_label_1: 'Rótulo personalizado 1',
  custom_label_2: 'Rótulo personalizado 2', custom_label_3: 'Rótulo personalizado 3',
  custom_label_4: 'Rótulo personalizado 4',
} as const;
const fieldSchema = z.enum(Object.keys(CATALOG_FIELDS) as [keyof typeof CATALOG_FIELDS, ...(keyof typeof CATALOG_FIELDS)[]]);
export type CatalogField = z.infer<typeof fieldSchema>;
export const PRICE_FIELDS: readonly CatalogField[] = ['price', 'salePrice', 'currentPrice'];

export const CONDITION_OPERATORS = {
  exists: 'Está preenchido', empty: 'Está vazio', eq: 'É igual a', ne: 'É diferente de',
  contains: 'Contém', notContains: 'Não contém', gt: 'É maior que', gte: 'É maior ou igual a',
  lt: 'É menor que', lte: 'É menor ou igual a',
} as const;
const operatorSchema = z.enum(Object.keys(CONDITION_OPERATORS) as [keyof typeof CONDITION_OPERATORS, ...(keyof typeof CONDITION_OPERATORS)[]]);
const conditionSchema = z.object({ field: fieldSchema, operator: operatorSchema, value: z.string().trim().max(160) })
  .refine(({ field, operator, value }) => operator === 'exists' || operator === 'empty'
    || (PRICE_FIELDS.includes(field)
      ? parseCatalogPrice(value) !== null && !['contains', 'notContains'].includes(operator)
      : !!value && !['gt', 'gte', 'lt', 'lte'].includes(operator)), 'Informe um valor compatível com a regra.');
export type LayerCondition = z.infer<typeof conditionSchema>;

export const IMAGE_TEMPLATE_FONTS = ['Arial', 'Georgia', 'Verdana', 'Tahoma', 'Trebuchet MS', 'Times New Roman', 'Courier New'] as const;
const color = z.string().regex(/^#[\da-f]{6}$/i);
const layerName = { id: z.uuid(), name: z.string().trim().min(1).max(80) };
const position = {
  ...layerName,
  x: z.number().min(-3840).max(3840), y: z.number().min(-3840).max(3840),
  width: z.number().min(16).max(3840), height: z.number().min(16).max(3840),
  angle: z.number().min(-180).max(180), opacity: z.number().min(0).max(100),
};
const typography = {
  font: z.enum(IMAGE_TEMPLATE_FONTS), fontSize: z.number().int().min(8).max(240), color,
  bold: z.boolean(), italic: z.boolean(), strike: z.boolean(), align: z.enum(['left', 'center', 'right']),
  underline: z.boolean().optional(), verticalAlign: z.enum(['top', 'middle', 'bottom']).optional(),
  lineSpacing: z.number().min(0.5).max(3).optional(), letterSpacing: z.number().min(-20).max(100).optional(),
  textOpacity: z.number().min(0).max(100).optional(),
};
const condition = { condition: conditionSchema.nullable() };
export const TEMPLATE_ASSET_ID = /^[a-f0-9]{64}$/;
export const imageLayerSchema = z.discriminatedUnion('type', [
  z.object({ ...position, type: z.literal('product'), condition: conditionSchema.nullable().optional(), imageIndex: z.number().int().min(0).max(3),
    fallback: z.enum(['main', 'none']), fit: z.enum(['contain', 'cover']), removeBackground: z.boolean() }),
  z.object({ ...position, ...typography, ...condition, type: z.literal('catalog'), field: fieldSchema }),
  z.object({ ...position, ...typography, ...condition, type: z.literal('text'), text: z.string().max(700) }),
  z.object({ ...position, ...condition, type: z.literal('image'), assetId: z.string().regex(TEMPLATE_ASSET_ID).nullable(),
    assetName: z.string().trim().max(120).optional(), fit: z.enum(['contain', 'cover']) }),
  z.object({ ...position, ...typography, type: z.literal('sticker'), text: z.string().max(700), fill: color,
    shape: z.enum(['rectangle', 'square', 'circle']) }),
  z.object({ ...layerName, type: z.literal('background'), color }),
]);
export type ImageLayer = z.infer<typeof imageLayerSchema>;
export type PositionedLayer = Exclude<ImageLayer, { type: 'background' }>;
export type ImageLayerType = ImageLayer['type'];
export const LAYER_TYPES: Record<ImageLayerType, { label: string; icon: string }> = {
  product: { label: 'Produto', icon: 'bi-tag' }, catalog: { label: 'Campo do produto', icon: 'bi-database' },
  text: { label: 'Texto', icon: 'bi-type' }, image: { label: 'Imagem', icon: 'bi-image' },
  sticker: { label: 'Forma', icon: 'bi-sticky' }, background: { label: 'Fundo', icon: 'bi-palette' },
};
export const MAX_IMAGE_LAYERS = 20;
const layoutSchema = z.object({ layers: z.array(imageLayerSchema).min(1).max(MAX_IMAGE_LAYERS) })
  .refine(({ layers }) => layers.some((layer) => layer.type === 'product'), 'Mantenha pelo menos uma camada de produto.')
  .refine(({ layers }) => layers.slice(0, -1).every((layer) => layer.type !== 'background'), 'O fundo deve ficar por último.')
  .refine(({ layers }) => new Set(layers.map(({ id }) => id)).size === layers.length, 'Há camadas repetidas.');
export type ImageLayout = z.infer<typeof layoutSchema>;
export const imageTemplateDesignSchema = z.object({
  version: z.literal(1), formats: z.object({ '1:1': layoutSchema, '4:5': layoutSchema.optional(), '9:16': layoutSchema.optional() }),
}).refine((design) => templateAssetIds(design).length <= 12, 'Use até 12 imagens diferentes por modelo.');
export type ImageTemplateDesign = z.infer<typeof imageTemplateDesignSchema>;
export const imageTemplateMetadataSchema = z.object({
  name: z.string().trim().min(1, 'Informe o nome do modelo.').max(100),
  description: z.string().trim().max(400, 'Use até 400 caracteres.'),
});
export const deleteImageTemplateSchema = z.object({ id: z.uuid(), updated_at: z.iso.datetime({ offset: true }) });
export type DeleteImageTemplateValues = z.infer<typeof deleteImageTemplateSchema>;
export const imageTemplateFormSchema = imageTemplateMetadataSchema.extend({ design: imageTemplateDesignSchema });
export type ImageTemplateFormValues = z.infer<typeof imageTemplateFormSchema>;

export const IMAGE_TEMPLATE_STARTERS = ['blank', 'showcase', 'frame', 'offer', 'banner', 'details'] as const;
export type ImageTemplateStarter = typeof IMAGE_TEMPLATE_STARTERS[number];
export const imageTemplateStartSchema = imageTemplateMetadataSchema.extend({ starter: z.enum(IMAGE_TEMPLATE_STARTERS) });

export function createImageLayer(type: ImageLayerType, format: ImageFormat): ImageLayer {
  const { width, height } = FORMAT_DIMENSIONS[format];
  const identity = { id: crypto.randomUUID(), name: LAYER_TYPES[type].label };
  const box = { ...identity, x: 54, y: Math.round(height * .1), width: width - 108, height: 140, angle: 0, opacity: 100 };
  const text = { font: 'Arial', fontSize: 54, color: '#172033', bold: true, italic: false, underline: false, strike: false,
    align: 'center', verticalAlign: 'middle', lineSpacing: 1.16, letterSpacing: 0, textOpacity: 100 } as const;
  switch (type) {
    case 'product': return { ...box, type, x: 0, y: 0, width, height, condition: null, imageIndex: 0, fallback: 'main', fit: 'contain', removeBackground: false };
    case 'catalog': return { ...box, ...text, type, field: 'name', condition: null };
    case 'text': return { ...box, ...text, type, text: 'Seu texto', condition: null };
    case 'image': return { ...box, type, width: 324, height: 250, assetId: null, fit: 'contain', condition: null };
    case 'sticker': return { ...box, ...text, type, x: 758, width: 260, height: 260, text: 'Oferta', color: '#ffffff', fill: '#2457da', shape: 'circle' };
    case 'background': return { ...identity, type, color: '#ffffff' };
  }
}

export function startImageTemplate(starter: ImageTemplateStarter): ImageTemplateDesign {
  const product = createImageLayer('product', '1:1') as Extract<ImageLayer, { type: 'product' }>;
  const background = createImageLayer('background', '1:1') as Extract<ImageLayer, { type: 'background' }>;
  const title = { ...createImageLayer('catalog', '1:1') as Extract<ImageLayer, { type: 'catalog' }>, y: 835, height: 110, fontSize: 48 };
  const price = { ...title, id: crypto.randomUUID(), name: 'Preço atual', field: 'currentPrice' as const, y: 952, height: 78, color: '#1b5bcb' };
  let layers: ImageLayer[] = [product];
  switch (starter) {
    case 'showcase':
      layers = [title, { ...product, x: 90, y: 70, width: 900, height: 740 }, { ...background, color: '#e7efff' }];
      break;
    case 'frame':
      layers = [{ ...product, x: 60, y: 60, width: 960, height: 960 }, { ...background, color: '#dbebfe' }];
      break;
    case 'offer':
      layers = [createImageLayer('sticker', '1:1'), price, { ...product, x: 55, y: 125, width: 970, height: 780 }, { ...background, color: '#fff6e5' }];
      break;
    case 'banner': {
      const banner = createImageLayer('sticker', '1:1') as Extract<ImageLayer, { type: 'sticker' }>;
      layers = [{ ...banner, x: 0, y: 878, width: 1080, height: 202, shape: 'rectangle', text: 'Móveis Morante' }, { ...product, height: 865 }];
      break;
    }
    case 'details':
      layers = [{ ...title, x: 48, y: 275, width: 428, height: 235, align: 'left' },
        { ...price, x: 48, y: 538, width: 428, align: 'left' }, { ...product, x: 498, y: 75, width: 550, height: 930 },
        { ...background, color: '#ecf6ee' }];
      break;
  }
  return { version: 1, formats: { '1:1': { layers } } };
}

export function copyImageLayout(layout: ImageLayout, source: ImageFormat, target: ImageFormat): ImageLayout {
  const ratio = FORMAT_DIMENSIONS[target].height / FORMAT_DIMENSIONS[source].height;
  return { layers: layout.layers.map((layer) => layer.type === 'background'
    ? { ...layer }
    : { ...layer, y: Math.max(-3840, Math.min(3840, Math.round(layer.y * ratio))),
      height: Math.max(16, Math.min(3840, Math.round(layer.height * ratio))) }) };
}

export interface TemplatePreviewProduct {
  id: string;
  images: (string | null)[];
  currency: string;
  fields: Partial<Record<CatalogField, string | number>>;
}

export function templateAssetIds(design: { formats: Partial<Record<ImageFormat, ImageLayout>> }): string[] {
  return [...new Set(Object.values(design.formats).flatMap((layout) =>
    layout?.layers.flatMap((layer) => layer.type === 'image' && layer.assetId ? [layer.assetId] : []) ?? []))];
}

export function parseCatalogPrice(raw: unknown): number | null {
  if (typeof raw === 'number') return Number.isFinite(raw) && raw >= 0 ? raw : null;
  if (typeof raw !== 'string') return null;
  const match = raw.trim().match(/^(?:[A-Z]{3}\s*|R\$\s*|[$€£]\s*)?([\d.,]+)(?:\s*[A-Z]{3})?$/i);
  if (!match) return null;
  const part = match[1];
  const decimals = /[.,](\d{1,2})$/.exec(part);
  const integer = decimals ? part.slice(0, decimals.index) : part;
  if (!/^\d+$|^\d{1,3}(?:\.\d{3})+$|^\d{1,3}(?:,\d{3})+$/.test(integer)) return null;
  const value = Number(integer.replace(/[.,]/g, '') + (decimals ? `.${decimals[1]}` : ''));
  return Number.isFinite(value) ? value : null;
}

export function isLayerVisible(layer: ImageLayer, product: TemplatePreviewProduct | null) {
  if (!('condition' in layer) || !layer.condition) return true;
  const { field, operator, value } = layer.condition;
  const actual = product?.fields[field];
  if (operator === 'exists' || operator === 'empty') return (actual != null && actual !== '') === (operator === 'exists');
  if (actual == null || actual === '') return false;
  if (PRICE_FIELDS.includes(field)) {
    const expected = parseCatalogPrice(value);
    if (typeof actual !== 'number' || expected === null) return false;
    switch (operator) {
      case 'eq': return actual === expected;
      case 'ne': return actual !== expected;
      case 'gt': return actual > expected;
      case 'gte': return actual >= expected;
      case 'lt': return actual < expected;
      case 'lte': return actual <= expected;
      default: return false;
    }
  }
  const normalize = (text: string) => text.normalize('NFD').replace(/\p{M}/gu, '').trim().toLowerCase();
  const left = normalize(String(actual));
  const right = normalize(value);
  if (!right) return false;
  switch (operator) {
    case 'eq': return left === right;
    case 'ne': return left !== right;
    case 'contains': return left.includes(right);
    case 'notContains': return !left.includes(right);
    default: return false;
  }
}
