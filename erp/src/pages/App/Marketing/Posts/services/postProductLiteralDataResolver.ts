import { PostProductLiteralField } from '../types/postSpecification';
import { shouldShowPreviousPrice } from '../postPriceVisibility';

type UnknownRecord = Record<string, any>;

function text(value: unknown): string | undefined {
  if (typeof value === 'string') return value.trim() || undefined;
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return undefined;
}

function currency(value: unknown): string | undefined {
  if (typeof value === 'string') return value.trim() || undefined;
  if (typeof value !== 'number' || !Number.isFinite(value)) return undefined;
  return value
    .toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
    .replace(/\u00a0/g, ' ');
}

function add(fields: PostProductLiteralField[], id: string, label: string, value: unknown, source: string): void {
  const literal = text(value);
  if (literal !== undefined) fields.push({ id, label, value: literal, source });
}

export function resolvePostProductLiteralData(product: unknown, selectedVariationId?: string): {
  fields: PostProductLiteralField[];
  currentPrice?: string;
  previousPrice?: string;
  installmentText?: string;
} {
  if (!product || typeof product !== 'object') return { fields: [] };
  const root = product as UnknownRecord;
  const variation = Array.isArray(root.variations)
    ? root.variations.find((item: UnknownRecord) => String(item?.id) === String(selectedVariationId))
    : undefined;
  const effective = variation ?? root;
  const sourcePrefix = variation ? `ERP.product.variations[${variation.id}]` : 'ERP.product';
  const fields: PostProductLiteralField[] = [];

  add(fields, 'product-name', 'Nome/título do produto', variation?.title ?? root.title ?? root.name ?? variation?.name, variation?.title ? `${sourcePrefix}.title` : 'ERP.product.title/name');
  add(fields, 'product-description', 'Descrição', variation?.description ?? root.ecommerceDescription ?? root.description, variation?.description ? `${sourcePrefix}.description` : 'ERP.product.description');

  const basePriceRaw = effective.unitPrice ?? effective.unit_price ?? effective.price ?? root.unitPrice ?? root.unit_price ?? root.price;
  const promoPriceRaw = effective.promoPrice ?? effective.promo_price ?? effective.promotional_price ?? root.promoPrice ?? root.promo_price ?? root.promotional_price;
  const baseNumber = typeof basePriceRaw === 'number' ? basePriceRaw : Number.NaN;
  const promoNumber = typeof promoPriceRaw === 'number' ? promoPriceRaw : Number.NaN;
  const discounted = shouldShowPreviousPrice(baseNumber, promoNumber, false);
  const currentPrice = currency(discounted ? promoPriceRaw : basePriceRaw);
  const previousPrice = discounted ? currency(basePriceRaw) : undefined;

  if (previousPrice) add(fields, 'previous-price', 'Preço anterior/de referência (riscar)', previousPrice, `${sourcePrefix}.unitPrice`);
  if (currentPrice) add(fields, 'current-price', 'Preço atual/promocional (destacar)', currentPrice, discounted ? `${sourcePrefix}.promoPrice` : `${sourcePrefix}.unitPrice`);

  const installmentText = text(
    effective.installmentText ?? effective.installmentValue ?? effective.installment ??
    root.installmentText ?? root.installmentValue ?? root.installment,
  );
  if (installmentText) add(fields, 'installment', 'Condição/parcelamento', installmentText, `${sourcePrefix}.installment`);

  const dimensionAliases: Array<[string, string, unknown]> = [
    ['width', 'Largura', effective.width ?? root.width],
    ['height', 'Altura', effective.height ?? root.height],
    ['depth', 'Profundidade', effective.depth ?? root.depth],
  ];
  for (const [id, label, value] of dimensionAliases) {
    if (value !== undefined && value !== null && value !== '') add(fields, id, label, value, `${sourcePrefix}.${id}`);
  }
  if (Array.isArray(root.extraDimensions)) {
    root.extraDimensions.forEach((dimension: UnknownRecord, index: number) => {
      add(fields, `extra-dimension-${dimension.id ?? index + 1}`, text(dimension.label) ?? `Medida adicional ${index + 1}`, dimension.value, `ERP.product.extraDimensions[${index}]`);
    });
  }

  add(fields, 'opportunity', 'Oportunidade', root.opportunityName ?? root.opportunity?.name, 'ERP.product.opportunity');

  return { fields, currentPrice, previousPrice, installmentText };
}
