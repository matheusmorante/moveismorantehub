import { Layer } from '../types';
import { clampToSafeArea, LayoutBox, SAFE_MARGIN } from './layoutGeometry';

export type CompositionFormat = '4:5' | '9:16';
export interface CompositionPlan { strategy?: 'SIDE_BY_SIDE' | 'VERTICAL'; regions?: Partial<Record<string, string>>; }
export interface LayoutContext { variationCount?: number; }

type LayoutByRole = Record<string, LayoutBox>;
const feed: LayoutByRole = {
  brand: { x: .04, y: .04, width: .32, height: .085 }, badge: { x: .61, y: .035, width: .35, height: .20 },
  main: { x: .04, y: .15, width: .54, height: .59 }, title: { x: .61, y: .29, width: .35, height: .11 },
  oldPrice: { x: .63, y: .42, width: .31, height: .045 }, price: { x: .60, y: .48, width: .36, height: .105 },
  installment: { x: .60, y: .60, width: .36, height: .075 }, productSlogan: { x: .04, y: .76, width: .42, height: .06 },
  gallery: { x: .04, y: .85, width: .48, height: .10 }, storeSlogan: { x: .75, y: .82, width: .21, height: .13 },
};
const story: LayoutByRole = {
  brand: { x: .04, y: .03, width: .30, height: .07 }, badge: { x: .62, y: .03, width: .34, height: .15 },
  main: { x: .08, y: .13, width: .84, height: .42 }, title: { x: .10, y: .565, width: .80, height: .06 },
  oldPrice: { x: .19, y: .64, width: .62, height: .03 }, price: { x: .14, y: .69, width: .72, height: .08 },
  installment: { x: .14, y: .79, width: .72, height: .065 }, productSlogan: { x: .05, y: .87, width: .31, height: .035 },
  gallery: { x: .42, y: .88, width: .50, height: .07 }, storeSlogan: { x: .05, y: .925, width: .32, height: .035 },
};

function roleBox(role: string | undefined, format: CompositionFormat, fallback: LayoutBox, plan?: CompositionPlan, context?: LayoutContext) {
  const source = (format === '9:16' ? story : feed)[role || ''];
  const standard = source ? { ...source } : fallback;
  // O planejamento pode escolher a composição, mas não coordenadas livres. Em Story,
  // uma estratégia lateral só troca a zona do produto e do bloco comercial pré-definidas.
  if (format === '9:16' && plan?.strategy === 'SIDE_BY_SIDE' && role === 'main') return { x: .05, y: .22, width: .53, height: .46 };
  if (format === '9:16' && plan?.strategy === 'SIDE_BY_SIDE' && ['title', 'oldPrice', 'price', 'installment'].includes(role || '')) {
    const right: LayoutByRole = { title: { x: .62, y: .31, width: .32, height: .10 }, oldPrice: { x: .63, y: .43, width: .29, height: .04 }, price: { x: .60, y: .49, width: .35, height: .10 }, installment: { x: .60, y: .61, width: .35, height: .07 } };
    return right[role || ''] || standard;
  }
  if (role === 'gallery' && context?.variationCount) return { ...standard, width: context.variationCount === 1 ? .28 : context.variationCount === 2 ? .46 : Math.min(.66, .22 * context.variationCount) };
  return standard;
}

export function composeLayout(layers: Layer[], format: CompositionFormat, plan?: CompositionPlan, context?: LayoutContext) {
  return layers.map(layer => {
    if (!layer.visible || layer.locked) return layer;
    const box = roleBox(layer.role, format, { ...layer, height: layer.height || .1 }, plan, context);
    return { ...layer, ...clampToSafeArea(box, layer.safeMargin ?? SAFE_MARGIN) };
  });
}

export function repairLayout(layers: Layer[], format: CompositionFormat, plan?: CompositionPlan, context?: LayoutContext) {
  // A composição padrão é deliberadamente formada por blocos sem sobreposição. Reaplicá-la
  // é o reparo seguro quando uma sugestão externa não passa nas invariantes geométricas.
  return composeLayout(layers, format, plan, context);
}
