import { ElementModel } from '../types/postCreator';
import { PostBenefitSpec } from '../types/postSpecification';

type UnknownRecord = Record<string, unknown>;

const PRODUCT_BENEFIT_FIELDS = [
  'postBenefits',
  'post_benefits',
  'commercialBenefits',
  'commercial_benefits',
  'benefits',
] as const;

/** Fallback oficial e explícito para registros antigos que ainda não têm uma lista estruturada. */
export const SYSTEM_OFFICIAL_BENEFITS: PostBenefitSpec[] = [
  { id: 'system-delivery', title: 'Entrega Rápida', subtitle: '1 a 5 dias úteis', source: 'SYSTEM_OFFICIAL_BENEFITS' },
  { id: 'system-assembly', title: 'Montagem Inclusa', subtitle: 'Retirada ou Entrega', source: 'SYSTEM_OFFICIAL_BENEFITS' },
  { id: 'system-safe-purchase', title: 'Compra Segura', subtitle: 'Pague na Entrega', source: 'SYSTEM_OFFICIAL_BENEFITS' },
];

function cleanLiteral(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const cleaned = value.trim();
  return cleaned || undefined;
}

function normalizeBenefit(item: unknown, index: number, source: string): PostBenefitSpec | null {
  if (typeof item === 'string') {
    const title = cleanLiteral(item);
    return title ? { id: `${source}-${index + 1}`, title, source } : null;
  }
  if (!item || typeof item !== 'object') return null;

  const record = item as UnknownRecord;
  const title = cleanLiteral(record.title ?? record.name ?? record.text ?? record.label);
  if (!title) return null;

  return {
    id: cleanLiteral(record.id ?? record.key) ?? `${source}-${index + 1}`,
    title,
    subtitle: cleanLiteral(record.subtitle ?? record.description ?? record.detail),
    source,
  };
}

function normalizeList(value: unknown, source: string): PostBenefitSpec[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item, index) => normalizeBenefit(item, index, source))
    .filter((benefit): benefit is PostBenefitSpec => Boolean(benefit));
}

export function resolvePostBenefits(params: {
  product?: unknown;
  activeModels?: ElementModel[];
}): PostBenefitSpec[] {
  const product = params.product && typeof params.product === 'object'
    ? params.product as UnknownRecord
    : null;

  if (product) {
    for (const field of PRODUCT_BENEFIT_FIELDS) {
      if (Object.prototype.hasOwnProperty.call(product, field) && Array.isArray(product[field])) {
        return normalizeList(product[field], `ERP.product.${field}`);
      }
    }
  }

  for (const model of params.activeModels ?? []) {
    if (model.elementType !== 'FOOTER') continue;
    const benefits = (model as ElementModel & { benefits?: unknown }).benefits;
    if (Array.isArray(benefits)) {
      return normalizeList(benefits, `CAMPAIGN.FOOTER.${model.id}.benefits`);
    }
  }

  return SYSTEM_OFFICIAL_BENEFITS.map(benefit => ({ ...benefit }));
}
