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
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function saveProductImageSelection(
  productId: string,
  selection: ProductImageSelectionState
): void {
  if (!productId) return;
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${productId}`, JSON.stringify(selection));
  } catch (err) {
    console.warn('[postProductImageSelections] Falha ao persistir seleção local:', err);
  }
}

export function clearProductImageSelection(productId: string): void {
  if (!productId) return;
  try {
    localStorage.removeItem(`${STORAGE_PREFIX}${productId}`);
  } catch (err) {
    console.warn('[postProductImageSelections] Falha ao limpar seleção local:', err);
  }
}
