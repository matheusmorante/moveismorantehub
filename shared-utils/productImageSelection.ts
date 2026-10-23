export interface ProductImageUploadSelection<T> {
  filesToUpload: T[];
  skippedCount: number;
  availableSlots: number;
}

/** Keeps selected uploads within the gallery's remaining capacity. */
export const limitProductImageSelection = <T,>(
  files: readonly T[],
  currentImageCount: number,
  maxImageCount: number
): ProductImageUploadSelection<T> => {
  const availableSlots = Math.max(0, maxImageCount - currentImageCount);
  const filesToUpload = files.slice(0, availableSlots);

  return {
    filesToUpload,
    skippedCount: files.length - filesToUpload.length,
    availableSlots,
  };
};

/** Toggles the gallery's first selectable parent images, matching ERP and mobile selection order. */
export const toggleAllParentProductImages = (
  selectedImages: readonly string[],
  availableImages: readonly string[],
  maxSelection: number
): string[] => {
  const selectableImages = availableImages.slice(0, Math.max(0, maxSelection));
  if (selectedImages.length === selectableImages.length) return [];
  return [...selectableImages];
};
