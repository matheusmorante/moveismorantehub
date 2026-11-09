import { z } from 'zod';
import { MAX_PARENT_PRODUCT_IMAGES } from './productImageLimits';

export const IMAGE_FORMATS = ['1:1', '4:5', '9:16'] as const;
export type ImageFormat = typeof IMAGE_FORMATS[number];
export const FORMAT_DIMENSIONS: Record<ImageFormat, { width: number; height: number }> = {
  '1:1': { width: 1080, height: 1080 },
  '4:5': { width: 1080, height: 1350 },
  '9:16': { width: 1080, height: 1920 },
};

export const CATALOG_FIELDS = {
  // Campos principais do ERP MoranteHub
  name: 'Nome do produto',
  category: 'Categoria',
  price: 'Preço',
  promoPrice: 'Preço promocional',
  currentPrice: 'Preço atual',
  discount: 'Desconto',
  discountPercent: 'Desconto (%)',
  discountValue: 'Valor do desconto',
  stockOrigin: 'Origem do estoque',
  color: 'Cor',
  brand: 'Marca',
  retailerId: 'Código/SKU',
  description: 'Descrição',
  availability: 'Disponibilidade',

  // Campos personalizados (iguais aos do Meta)
  custom_label_0: 'Rótulo personalizado 0',
  custom_label_1: 'Rótulo personalizado 1',
  custom_label_2: 'Rótulo personalizado 2',
  custom_label_3: 'Rótulo personalizado 3',
  custom_label_4: 'Rótulo personalizado 4',

  // Legado / Aliases de compatibilidade Meta
  productType: 'Categoria',
  salePrice: 'Preço promocional',
} as const;

export const FIELD_ALIASES: Record<string, CatalogField> = {
  nome: 'name',
  nome_produto: 'name',
  categoria: 'category',
  productType: 'category',
  product_type: 'category',
  preco: 'price',
  preco_normal: 'price',
  promotional_price: 'promoPrice',
  sale_price: 'promoPrice',
  salePrice: 'promoPrice',
  preco_promocional: 'promoPrice',
  promo_price: 'promoPrice',
  preco_atual: 'currentPrice',
  current_price: 'currentPrice',
  desconto: 'discount',
  desconto_percentual: 'discountPercent',
  discount_percent: 'discountPercent',
  desconto_valor: 'discountValue',
  discount_value: 'discountValue',
  valor_desconto: 'discountValue',
  origem_estoque: 'stockOrigin',
  origem: 'stockOrigin',
  stock_origin: 'stockOrigin',
  cor: 'color',
  marca: 'brand',
  codigo: 'retailerId',
  sku: 'retailerId',
  code: 'retailerId',
  retailer_id: 'retailerId',
  descricao: 'description',
  disponibilidade: 'availability',
};

const catalogFieldSchema = z.enum(Object.keys(CATALOG_FIELDS) as [keyof typeof CATALOG_FIELDS, ...(keyof typeof CATALOG_FIELDS)[]]);
export type TemplateAttributeField = `attribute_${string}`;
const templateAttributeFieldSchema = z.string().regex(/^attribute_[a-z0-9_]{1,96}$/) as z.ZodType<TemplateAttributeField, TemplateAttributeField>;
const fieldSchema = z.union([catalogFieldSchema, templateAttributeFieldSchema]);
export type CatalogField = z.infer<typeof catalogFieldSchema>;
export type TemplateField = z.infer<typeof fieldSchema>;
export const PRICE_FIELDS: readonly CatalogField[] = ['price', 'promoPrice', 'salePrice', 'currentPrice', 'discountValue'];
export const PERCENTAGE_FIELDS: readonly CatalogField[] = ['discountPercent'];

export interface TemplateProductAttribute { name: string; value: string | number }
export type TemplateProductAttributes = Partial<Record<TemplateAttributeField, TemplateProductAttribute>>;

export function isCatalogField(field: string): field is CatalogField {
  return Object.prototype.hasOwnProperty.call(CATALOG_FIELDS, field);
}

export function isTemplateField(field: string): field is TemplateField {
  return isCatalogField(field) || Object.prototype.hasOwnProperty.call(FIELD_ALIASES, field) || templateAttributeFieldSchema.safeParse(field).success;
}

export function isPriceField(field: TemplateField): field is CatalogField {
  const canonical = isCatalogField(field) ? field : FIELD_ALIASES[field];
  return !!canonical && (PRICE_FIELDS as readonly string[]).includes(canonical);
}

export function isPercentageField(field: TemplateField): field is CatalogField {
  const canonical = isCatalogField(field) ? field : FIELD_ALIASES[field];
  return !!canonical && (PERCENTAGE_FIELDS as readonly string[]).includes(canonical);
}

export function templateAttributeField(name: string): TemplateAttributeField | null {
  const slug = name.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 96);
  return slug ? `attribute_${slug}` as TemplateAttributeField : null;
}

export function templateFieldLabel(field: TemplateField, attributes?: TemplateProductAttributes): string {
  const canonical = isCatalogField(field) ? field : FIELD_ALIASES[field];
  if (canonical && isCatalogField(canonical)) return CATALOG_FIELDS[canonical];
  if (isCatalogField(field)) return CATALOG_FIELDS[field];
  return attributes?.[field as TemplateAttributeField]?.name || field.slice('attribute_'.length).replace(/_/g, ' ');
}

export function templateFieldValue(field: TemplateField, product: TemplatePreviewProduct | null) {
  if (!product) return undefined;
  const canonical = (isCatalogField(field) ? field : FIELD_ALIASES[field]) as CatalogField | undefined;
  if (canonical) {
    if (product.fields[canonical] !== undefined) return product.fields[canonical];
    if (canonical === 'category' && product.fields.productType !== undefined) return product.fields.productType;
    if (canonical === 'productType' && product.fields.category !== undefined) return product.fields.category;
    if (canonical === 'promoPrice' && product.fields.salePrice !== undefined) return product.fields.salePrice;
    if (canonical === 'salePrice' && product.fields.promoPrice !== undefined) return product.fields.promoPrice;
  }
  if (isCatalogField(field) && product.fields[field] !== undefined) return product.fields[field];
  return product.attributes?.[field as TemplateAttributeField]?.value;
}

export const CONDITION_OPERATORS = {
  exists: 'Está preenchido', empty: 'Está vazio', eq: 'É igual a', ne: 'É diferente de',
  contains: 'Contém', notContains: 'Não contém', gt: 'É maior que', gte: 'É maior ou igual a',
  lt: 'É menor que', lte: 'É menor ou igual a',
} as const;
const operatorSchema = z.enum(Object.keys(CONDITION_OPERATORS) as [keyof typeof CONDITION_OPERATORS, ...(keyof typeof CONDITION_OPERATORS)[]]);
const conditionSchema = z.object({ field: fieldSchema, operator: operatorSchema, value: z.string().trim().max(160) })
  .refine(({ field, operator, value }) => {
    if (operator === 'exists' || operator === 'empty') return true;
    if (isPriceField(field)) {
      return parseCatalogPrice(value) !== null && !['contains', 'notContains'].includes(operator);
    }
    if (isPercentageField(field)) {
      const num = Number(value.replace(/%/g, '').trim());
      return Number.isFinite(num) && !['contains', 'notContains'].includes(operator);
    }
    if (field === 'discount') {
      if (['gt', 'gte', 'lt', 'lte'].includes(operator)) {
        const num = Number(value.replace(/%/g, '').trim());
        return Number.isFinite(num);
      }
      return !!value;
    }
    return !!value && !['gt', 'gte', 'lt', 'lte'].includes(operator);
  }, 'Informe um valor compatível com a regra.');
export type LayerCondition = z.infer<typeof conditionSchema>;

export const IMAGE_TEMPLATE_FONTS = ['Bowlby One', 'Noto Sans', 'Noto Serif', 'Open Sans', 'Optimistic',
  'Optimistic Condensed', 'Optimistic Dark Mode', 'Oswald', 'Playfair Display', 'Poppins', 'Quicksand', 'Raleway',
  'Roboto', 'Verdana', 'Work Sans'] as const;
const legacyImageTemplateFonts = ['Arial', 'Georgia', 'Tahoma', 'Trebuchet MS', 'Times New Roman', 'Courier New'] as const;
const imageTemplateFontSchema = z.enum([...IMAGE_TEMPLATE_FONTS, ...legacyImageTemplateFonts]);
const color = z.string().regex(/^#[\da-f]{6}$/i);
const layerName = { id: z.uuid(), name: z.string().trim().min(1).max(80) };
const position = {
  ...layerName,
  x: z.number().min(-3840).max(3840), y: z.number().min(-3840).max(3840),
  width: z.number().min(16).max(3840), height: z.number().min(16).max(3840),
  angle: z.number().min(-180).max(180), opacity: z.number().min(0).max(100),
};
const typography = {
  font: imageTemplateFontSchema, fontSize: z.number().int().min(8).max(240), color,
  bold: z.boolean(), italic: z.boolean(), strike: z.boolean(), align: z.enum(['left', 'center', 'right']),
  underline: z.boolean().optional(), verticalAlign: z.enum(['top', 'middle', 'bottom']).optional(),
  lineSpacing: z.number().min(0.5).max(3).optional(), letterSpacing: z.number().min(-20).max(100).optional(),
  textOpacity: z.number().min(0).max(100).optional(), textShadow: z.boolean().optional(),
};
const condition = { condition: conditionSchema.nullable() };
export const TEMPLATE_ASSET_ID = /^[a-f0-9]{64}$/;
export const imageLayerSchema = z.discriminatedUnion('type', [
  z.object({ ...position, type: z.literal('product'), condition: conditionSchema.nullable().optional(), imageIndex: z.number().int().min(0).max(MAX_PARENT_PRODUCT_IMAGES - 1),
    fallback: z.enum(['main', 'none']), fit: z.enum(['contain', 'cover']), removeBackground: z.boolean() }),
  z.object({ ...position, ...typography, ...condition, type: z.literal('catalog'), field: fieldSchema }),
  z.object({ ...position, ...typography, ...condition, type: z.literal('text'), text: z.string().max(700) }),
  z.object({ ...position, ...condition, type: z.literal('image'), assetId: z.string().regex(TEMPLATE_ASSET_ID).nullable(),
    assetName: z.string().trim().max(120).optional(), fit: z.enum(['contain', 'cover']) }),
  z.object({ ...position, ...typography, condition: conditionSchema.nullable().optional(), type: z.literal('sticker'), text: z.string().max(700), fill: color,
    fillOpacity: z.number().min(0).max(100).optional(), lockAspectRatio: z.boolean().optional(), shape: z.enum(['rectangle', 'square', 'circle']) }),
  z.object({ ...layerName, type: z.literal('background'), color, opacity: z.number().min(0).max(100).default(100) }),
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
export const IMAGE_TEMPLATE_TEST_SCENARIO = 'image_template_crud' as const;
export const imageTemplateTestArtifactSchema = z.object({
  is_test: z.literal(true), runId: z.uuid(), ownerId: z.uuid(), scenarioKey: z.literal(IMAGE_TEMPLATE_TEST_SCENARIO),
}).strict();
export type ImageTemplateTestArtifact = z.infer<typeof imageTemplateTestArtifactSchema>;
export const imageTemplateDesignSchema = z.object({
  version: z.literal(1), formats: z.object({ '1:1': layoutSchema, '4:5': layoutSchema.optional(), '9:16': layoutSchema.optional() }),
  testArtifact: imageTemplateTestArtifactSchema.optional(),
}).refine((design) => templateAssetIds(design).length <= 12, 'Use até 12 imagens diferentes por modelo.');
export type ImageTemplateDesign = z.infer<typeof imageTemplateDesignSchema>;
export const imageTemplateMetadataSchema = z.object({
  name: z.string().trim().min(1, 'Informe o nome do modelo.').max(100),
  description: z.string().trim().max(400, 'Use até 400 caracteres.'),
});
export const deleteImageTemplateSchema = z.object({ id: z.uuid(), updated_at: z.iso.datetime({ offset: true }),
  test_artifact: imageTemplateTestArtifactSchema.optional() });
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
  const text = { font: 'Verdana', fontSize: 54, color: '#172033', bold: true, italic: false, underline: false, strike: false,
    textShadow: false, align: 'center', verticalAlign: 'middle', lineSpacing: 1.16, letterSpacing: 0, textOpacity: 100 } as const;
  switch (type) {
    case 'product': return { ...box, type, x: 0, y: 0, width, height, condition: null, imageIndex: 0, fallback: 'main', fit: 'contain', removeBackground: false };
    case 'catalog': return { ...box, ...text, type, field: 'name', condition: null };
    case 'text': return { ...box, ...text, type, text: 'Seu texto', condition: null };
    case 'image': return { ...box, type, width: 324, height: 250, assetId: null, fit: 'contain', condition: null };
    case 'sticker': return { ...box, ...text, type, x: 758, width: 260, height: 260, fontSize: 44, angle: 0, opacity: 100, condition: null,
      text: 'Oferta', color: '#ffffff',
      fill: '#2457da', fillOpacity: 100, lockAspectRatio: false, shape: 'circle' };
    case 'background': return { ...identity, type, color: '#ffffff', opacity: 100 };
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
      layers = [{ ...banner, x: 0, y: 878, width: 1080, height: 202, fontSize: 54, shape: 'rectangle', text: 'Móveis Morante' }, { ...product, height: 865 }];
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
  return { layers: layout.layers.map((layer) => {
    if (layer.type === 'background') return { ...layer };
    const keepBoxHeight = layer.type === 'sticker' && (layer.shape !== 'rectangle' || !!layer.lockAspectRatio);
    return {
      ...layer,
      y: Math.max(-3840, Math.min(3840, Math.round(layer.y * ratio))),
      height: keepBoxHeight ? layer.height : Math.max(16, Math.min(3840, Math.round(layer.height * ratio))),
    };
  }) };
}

export interface TemplatePreviewProduct {
  id: string;
  images: (string | null)[];
  currency: string;
  fields: Partial<Record<CatalogField, string | number>>;
  attributes?: TemplateProductAttributes;
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
  const actual = templateFieldValue(field, product);
  if (operator === 'exists' || operator === 'empty') return (actual != null && actual !== '') === (operator === 'exists');
  if (actual == null || actual === '') return false;
  if (isPriceField(field)) {
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
  if (isPercentageField(field) || (field === 'discount' && ['gt', 'gte', 'lt', 'lte'].includes(operator))) {
    const actualNum = typeof actual === 'number' ? actual : Number(String(actual).replace(/%/g, '').trim());
    const expectedNum = Number(String(value).replace(/%/g, '').trim());
    if (!Number.isFinite(actualNum) || !Number.isFinite(expectedNum)) return false;
    switch (operator) {
      case 'eq': return actualNum === expectedNum;
      case 'ne': return actualNum !== expectedNum;
      case 'gt': return actualNum > expectedNum;
      case 'gte': return actualNum >= expectedNum;
      case 'lt': return actualNum < expectedNum;
      case 'lte': return actualNum <= expectedNum;
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
