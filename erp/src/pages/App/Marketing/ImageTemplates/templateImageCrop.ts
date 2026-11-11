import type { ImageLayer } from '../../../../../../shared-utils/catalogImageTemplate';

export type TemplateImageCrop = {
  sourceWidth: number;
  sourceHeight: number;
  selection: { x: number; y: number; width: number; height: number };
};

export async function imageFileDimensions(file: File) {
  const bitmap = await createImageBitmap(file);
  try {
    return { width: bitmap.width, height: bitmap.height };
  } finally {
    bitmap.close();
  }
}

export function imageLayerBoundsForSourceSize(layer: Extract<ImageLayer, { type: 'image' }>, sourceWidth: number, sourceHeight: number) {
  const scale = Math.min(layer.width / sourceWidth, layer.height / sourceHeight);
  const width = Math.max(16, Math.min(3840, Math.round(sourceWidth * scale)));
  const height = Math.max(16, Math.min(3840, Math.round(sourceHeight * scale)));
  const centerX = layer.x + layer.width / 2;
  const centerY = layer.y + layer.height / 2;
  return { x: centerX - width / 2, y: centerY - height / 2, width, height };
}

export function imageLayerBoundsAfterCrop(layer: Extract<ImageLayer, { type: 'image' }>, crop: TemplateImageCrop) {
  const scale = layer.fit === 'cover'
    ? Math.max(layer.width / crop.sourceWidth, layer.height / crop.sourceHeight)
    : Math.min(layer.width / crop.sourceWidth, layer.height / crop.sourceHeight);
  const sourceOffsetX = (layer.width - crop.sourceWidth * scale) / 2;
  const sourceOffsetY = (layer.height - crop.sourceHeight * scale) / 2;
  const localLeft = sourceOffsetX + crop.selection.x * scale;
  const localTop = sourceOffsetY + crop.selection.y * scale;
  const minimumScale = Math.max(16 / crop.selection.width, 16 / crop.selection.height);
  const maximumScale = Math.min(3840 / crop.selection.width, 3840 / crop.selection.height);
  const sizeScale = Math.max(minimumScale, Math.min(maximumScale, scale));
  const width = Math.max(16, Math.min(3840, Math.round(crop.selection.width * sizeScale)));
  const height = Math.max(16, Math.min(3840, Math.round(crop.selection.height * sizeScale)));

  // Move the resized box around the original center, preserving the crop's canvas position after rotation.
  const localCenterX = localLeft + crop.selection.width * scale / 2;
  const localCenterY = localTop + crop.selection.height * scale / 2;
  const deltaX = localCenterX - layer.width / 2;
  const deltaY = localCenterY - layer.height / 2;
  const angle = layer.angle * Math.PI / 180;
  const centerX = layer.x + layer.width / 2 + deltaX * Math.cos(angle) - deltaY * Math.sin(angle);
  const centerY = layer.y + layer.height / 2 + deltaX * Math.sin(angle) + deltaY * Math.cos(angle);

  return {
    x: Math.max(-3840, Math.min(3840, centerX - width / 2)),
    y: Math.max(-3840, Math.min(3840, centerY - height / 2)),
    width,
    height,
  };
}
