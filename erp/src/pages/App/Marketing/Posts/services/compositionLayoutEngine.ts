import { Layer } from '../types';
import { clampToSafeArea, LayoutBox, SAFE_MARGIN } from './layoutGeometry';

export type CompositionFormat = '4:5' | '9:16';
export interface CompositionPlan {
  strategy?: 'SIDE_BY_SIDE' | 'VERTICAL';
  regions?: Partial<Record<string, string>>;
}
export interface LayoutContext {
  variationCount?: number;
}

type LayoutByRole = Record<string, LayoutBox>;
const feed: LayoutByRole = {
  brand: { x: 0.04, y: 0.04, width: 0.32, height: 0.085 },
  badge: { x: 0.61, y: 0.035, width: 0.35, height: 0.2 },
  main: { x: 0.04, y: 0.15, width: 0.54, height: 0.59 },
  title: { x: 0.61, y: 0.29, width: 0.35, height: 0.11 },
  oldPrice: { x: 0.63, y: 0.42, width: 0.31, height: 0.045 },
  price: { x: 0.6, y: 0.48, width: 0.36, height: 0.105 },
  installment: { x: 0.6, y: 0.6, width: 0.36, height: 0.075 },
  productSlogan: { x: 0.04, y: 0.76, width: 0.42, height: 0.06 },
  gallery: { x: 0.04, y: 0.85, width: 0.48, height: 0.1 },
  storeSlogan: { x: 0.75, y: 0.82, width: 0.21, height: 0.13 },
};
const story: LayoutByRole = {
  brand: { x: 0.04, y: 0.03, width: 0.3, height: 0.07 },
  badge: { x: 0.62, y: 0.03, width: 0.34, height: 0.15 },
  main: { x: 0.08, y: 0.13, width: 0.84, height: 0.42 },
  title: { x: 0.1, y: 0.565, width: 0.8, height: 0.06 },
  oldPrice: { x: 0.19, y: 0.64, width: 0.62, height: 0.03 },
  price: { x: 0.14, y: 0.69, width: 0.72, height: 0.08 },
  installment: { x: 0.14, y: 0.79, width: 0.72, height: 0.065 },
  productSlogan: { x: 0.05, y: 0.87, width: 0.31, height: 0.035 },
  gallery: { x: 0.42, y: 0.88, width: 0.5, height: 0.07 },
  storeSlogan: { x: 0.05, y: 0.925, width: 0.32, height: 0.035 },
};

function roleBox(
  role: string | undefined,
  format: CompositionFormat,
  fallback: LayoutBox,
  plan?: CompositionPlan,
  context?: LayoutContext
) {
  const source = (format === '9:16' ? story : feed)[role || ''];
  const standard = source ? { ...source } : fallback;
  // O planejamento pode escolher a composição, mas não coordenadas livres. Em Story,
  // uma estratégia lateral só troca a zona do produto e do bloco comercial pré-definidas.
  if (format === '9:16' && plan?.strategy === 'SIDE_BY_SIDE' && role === 'main')
    return { x: 0.05, y: 0.22, width: 0.53, height: 0.46 };
  if (
    format === '9:16' &&
    plan?.strategy === 'SIDE_BY_SIDE' &&
    ['title', 'oldPrice', 'price', 'installment'].includes(role || '')
  ) {
    const right: LayoutByRole = {
      title: { x: 0.62, y: 0.31, width: 0.32, height: 0.1 },
      oldPrice: { x: 0.63, y: 0.43, width: 0.29, height: 0.04 },
      price: { x: 0.6, y: 0.49, width: 0.35, height: 0.1 },
      installment: { x: 0.6, y: 0.61, width: 0.35, height: 0.07 },
    };
    return right[role || ''] || standard;
  }
  if (role === 'gallery' && context?.variationCount)
    return {
      ...standard,
      width:
        context.variationCount === 1
          ? 0.28
          : context.variationCount === 2
            ? 0.46
            : Math.min(0.66, 0.22 * context.variationCount),
    };
  return standard;
}

export function composeLayout(
  layers: Layer[],
  format: CompositionFormat,
  plan?: CompositionPlan,
  context?: LayoutContext
) {
  return layers.map((layer) => {
    if (!layer.visible || layer.locked) return layer;
    const box = roleBox(
      layer.role,
      format,
      { ...layer, height: layer.height || 0.1 },
      plan,
      context
    );
    return { ...layer, ...clampToSafeArea(box, layer.safeMargin ?? SAFE_MARGIN) };
  });
}

export function repairLayout(
  layers: Layer[],
  format: CompositionFormat,
  plan?: CompositionPlan,
  context?: LayoutContext
) {
  // A composição padrão é deliberadamente formada por blocos sem sobreposição. Reaplicá-la
  // é o reparo seguro quando uma sugestão externa não passa nas invariantes geométricas.
  return composeLayout(layers, format, plan, context);
}
