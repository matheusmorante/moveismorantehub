import { z } from 'zod';

export const IMAGE_FORMATS = ['1:1', '4:5', '9:16'] as const;
export type ImageFormat = (typeof IMAGE_FORMATS)[number];
export const FORMAT_DIMENSIONS: Record<ImageFormat, { width: number; height: number }> = {
  '1:1': { width: 1080, height: 1080 },
  '4:5': { width: 1080, height: 1350 },
  '9:16': { width: 1080, height: 1920 },
};

export const CATALOG_FIELDS = {
  // Campos principais do ERP MoranteHub
  name: 'Nome do produto',
  category: 'Categoria',
  price: 'Preço Antigo',
  promoPrice: 'Preço promocional',
  currentPrice: 'Preço Atual',
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
  custom_label_3: 'Oportunidade do produto',
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
  preco_antigo: 'price',
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

const catalogFieldSchema = z.enum(
  Object.keys(CATALOG_FIELDS) as [keyof typeof CATALOG_FIELDS, ...(keyof typeof CATALOG_FIELDS)[]]
);
export type TemplateAttributeField = `attribute_${string}`;
const templateAttributeFieldSchema = z.string().regex(/^attribute_[a-z0-9_]{1,96}$/) as z.ZodType<
  TemplateAttributeField,
  TemplateAttributeField
>;
export const fieldSchema = z.union([catalogFieldSchema, templateAttributeFieldSchema]);
export type CatalogField = z.infer<typeof catalogFieldSchema>;
export type TemplateField = z.infer<typeof fieldSchema>;
export const PRICE_FIELDS = [
  'price',
  'promoPrice',
  'salePrice',
  'currentPrice',
  'discountValue',
] as const;
export const PERCENTAGE_FIELDS = ['discountPercent'] as const;

export interface TemplateProductAttribute {
  name: string;
  value: string | number;
}
export type TemplateProductAttributes = Partial<
  Record<TemplateAttributeField, TemplateProductAttribute>
>;

export interface TemplatePreviewProduct {
  id: string;
  images: (string | null)[];
  currency: string;
  fields: Partial<Record<CatalogField, string | number>>;
  attributes?: TemplateProductAttributes;
}

export function isCatalogField(field: string): field is CatalogField {
  return Object.prototype.hasOwnProperty.call(CATALOG_FIELDS, field);
}

export function isTemplateField(field: string): field is TemplateField {
  return (
    isCatalogField(field) ||
    Object.prototype.hasOwnProperty.call(FIELD_ALIASES, field) ||
    templateAttributeFieldSchema.safeParse(field).success
  );
}

export function isPriceField(field: TemplateField): field is (typeof PRICE_FIELDS)[number] {
  const canonical = isCatalogField(field) ? field : FIELD_ALIASES[field];
  return !!canonical && (PRICE_FIELDS as readonly string[]).includes(canonical);
}

export function isPercentageField(
  field: TemplateField
): field is (typeof PERCENTAGE_FIELDS)[number] {
  const canonical = isCatalogField(field) ? field : FIELD_ALIASES[field];
  return !!canonical && (PERCENTAGE_FIELDS as readonly string[]).includes(canonical);
}

export function templateAttributeField(name: string): TemplateAttributeField | null {
  const slug = name
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 96);
  return slug ? (`attribute_${slug}` as TemplateAttributeField) : null;
}

export function templateFieldLabel(
  field: TemplateField,
  attributes?: TemplateProductAttributes
): string {
  const canonical = isCatalogField(field) ? field : FIELD_ALIASES[field];
  if (canonical && isCatalogField(canonical)) return CATALOG_FIELDS[canonical];
  if (isCatalogField(field)) return CATALOG_FIELDS[field];
  return (
    attributes?.[field as TemplateAttributeField]?.name ||
    field.slice('attribute_'.length).replace(/_/g, ' ')
  );
}

export function templateFieldValue(field: TemplateField, product: TemplatePreviewProduct | null) {
  if (!product) return undefined;
  const canonical = (
    isCatalogField(field) ? field : FIELD_ALIASES[field]
  ) as CatalogField | undefined;
  if (canonical) {
    if (product.fields[canonical] !== undefined) return product.fields[canonical];
    if (canonical === 'category' && product.fields.productType !== undefined) {
      return product.fields.productType;
    }
    if (canonical === 'productType' && product.fields.category !== undefined) {
      return product.fields.category;
    }
    if (canonical === 'promoPrice' && product.fields.salePrice !== undefined) {
      return product.fields.salePrice;
    }
    if (canonical === 'salePrice' && product.fields.promoPrice !== undefined) {
      return product.fields.promoPrice;
    }
  }
  if (isCatalogField(field) && product.fields[field] !== undefined) return product.fields[field];
  return product.attributes?.[field as TemplateAttributeField]?.value;
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

export const CONDITION_OPERATORS = {
  exists: 'Está preenchido',
  empty: 'Está vazio',
  eq: 'É igual a',
  ne: 'É diferente de',
  contains: 'Contém',
  notContains: 'Não contém',
  gt: 'É maior que',
  gte: 'É maior ou igual a',
  lt: 'É menor que',
  lte: 'É menor ou igual a',
} as const;
const operatorSchema = z.enum(
  Object.keys(CONDITION_OPERATORS) as [
    keyof typeof CONDITION_OPERATORS,
    ...(keyof typeof CONDITION_OPERATORS)[],
  ]
);
const CONDITION_VALUES_PREFIX = '__condition_values_v1__:';
export const MAX_CONDITION_VALUES = 20;
export const MAX_CONDITION_VALUE_LENGTH = 160;

export function parseConditionValues(value: string): string[] {
  if (!value.startsWith(CONDITION_VALUES_PREFIX)) return value.trim() ? [value.trim()] : [];
  try {
    const values: unknown = JSON.parse(value.slice(CONDITION_VALUES_PREFIX.length));
    return Array.isArray(values) && values.every((entry) => typeof entry === 'string')
      ? values.map((entry) => entry.trim()).filter(Boolean)
      : [];
  } catch {
    return [];
  }
}

export function serializeConditionValues(values: string[]): string {
  const unique: string[] = [];
  const seen = new Set<string>();
  values.forEach((entry) => {
    const value = entry.trim();
    const key = value
      .normalize('NFD')
      .replace(/\p{M}/gu, '')
      .toLowerCase();
    if (key && value.length <= MAX_CONDITION_VALUE_LENGTH && !seen.has(key)) {
      seen.add(key);
      unique.push(value);
    }
  });
  if (unique.length === 0) return '';
  if (unique.length === 1) return unique[0];
  return `${CONDITION_VALUES_PREFIX}${JSON.stringify(unique)}`;
}

export const conditionSchema = z
  .object({
    field: fieldSchema,
    operator: operatorSchema,
    value: z.string().trim().max(7000),
  })
  .refine(({ field, operator, value }) => {
    if (operator === 'exists' || operator === 'empty') return true;
    if (isPriceField(field)) {
      return (
        value.length <= MAX_CONDITION_VALUE_LENGTH &&
        parseCatalogPrice(value) !== null &&
        !['contains', 'notContains'].includes(operator)
      );
    }
    if (isPercentageField(field)) {
      const num = Number(value.replace(/%/g, '').trim());
      return (
        value.length <= MAX_CONDITION_VALUE_LENGTH &&
        Number.isFinite(num) &&
        !['contains', 'notContains'].includes(operator)
      );
    }
    if (field === 'discount') {
      if (['gt', 'gte', 'lt', 'lte'].includes(operator)) {
        const num = Number(value.replace(/%/g, '').trim());
        return value.length <= MAX_CONDITION_VALUE_LENGTH && Number.isFinite(num);
      }
      return !!value;
    }
    const values = parseConditionValues(value);
    return (
      values.length > 0 &&
      values.length <= MAX_CONDITION_VALUES &&
      values.every((entry) => entry.length <= MAX_CONDITION_VALUE_LENGTH) &&
      !['gt', 'gte', 'lt', 'lte'].includes(operator)
    );
  }, 'Informe um valor compatível com a regra.');
export type LayerCondition = z.infer<typeof conditionSchema>;
