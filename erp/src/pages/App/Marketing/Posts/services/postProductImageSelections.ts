import { marketingImageSelectionFormSchema } from '../../../../../../../shared-utils/marketingFormSchemas';

export interface ProductImageSelectionState {
  primaryUrl?: string;
  openViewUrl?: string | null;
  variationUrls?: Record<string, string>; // variationId -> url
}

const STORAGE_PREFIX = 'morante_post_image_selection_';

export function getProductImageSelection(productId: string): ProductImageSelectionState | null {
  if (!productId) return null;
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${productId}`);
    if (!raw) return null;
    const result = marketingImageSelectionFormSchema.safeParse({ productId, selection: JSON.parse(raw) });
    return result.success ? result.data.selection : null;
  } catch {
    return null;
  }
}

export function saveProductImageSelection(
  productId: string,
  selection: ProductImageSelectionState
): void {
  if (!productId) throw new Error('Produto não identificado.');
  try {
    const serialized = JSON.stringify(selection);
    localStorage.setItem(`${STORAGE_PREFIX}${productId}`, serialized);
    if (localStorage.getItem(`${STORAGE_PREFIX}${productId}`) !== serialized) throw new Error();
  } catch {
    throw new Error('A seleção não foi salva neste navegador. Tente novamente.');
  }
}

export function clearProductImageSelection(productId: string): void {
  if (!productId) throw new Error('Produto não identificado.');
  try {
    localStorage.removeItem(`${STORAGE_PREFIX}${productId}`);
    if (localStorage.getItem(`${STORAGE_PREFIX}${productId}`) !== null) throw new Error();
  } catch {
    throw new Error('A seleção salva não foi removida. Tente novamente.');
  }
}
