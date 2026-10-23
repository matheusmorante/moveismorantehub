export interface MobileCropRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface MobileSquareSelection {
  x: number;
  y: number;
  size: number;
}

export function getContainedImageRect(
  displayWidth: number,
  displayHeight: number,
  sourceWidth: number,
  sourceHeight: number
): MobileCropRect {
  if ([displayWidth, displayHeight, sourceWidth, sourceHeight].some((value) => value <= 0)) {
    return { x: 0, y: 0, width: 0, height: 0 };
  }
  const scale = Math.min(displayWidth / sourceWidth, displayHeight / sourceHeight);
  const width = sourceWidth * scale;
  const height = sourceHeight * scale;
  return { x: (displayWidth - width) / 2, y: (displayHeight - height) / 2, width, height };
}

export function createCenteredMobileSquareSelection(rect: MobileCropRect): MobileSquareSelection {
  const size = Math.min(rect.width, rect.height) * 0.8;
  return { x: rect.x + (rect.width - size) / 2, y: rect.y + (rect.height - size) / 2, size };
}

export function moveMobileSquareSelection(
  selection: MobileSquareSelection,
  dx: number,
  dy: number,
  rect: MobileCropRect
): MobileSquareSelection {
  const maxX = rect.x + rect.width - selection.size;
  const maxY = rect.y + rect.height - selection.size;
  return {
    ...selection,
    x: Math.max(rect.x, Math.min(maxX, selection.x + dx)),
    y: Math.max(rect.y, Math.min(maxY, selection.y + dy)),
  };
}

export function resizeMobileSquareSelection(
  selection: MobileSquareSelection,
  delta: number,
  rect: MobileCropRect
): MobileSquareSelection {
  const maxSize = Math.min(rect.width, rect.height);
  const size = Math.max(Math.min(32, maxSize), Math.min(maxSize, selection.size + delta));
  return {
    size,
    x: Math.max(rect.x, Math.min(rect.x + rect.width - size, selection.x - (size - selection.size) / 2)),
    y: Math.max(rect.y, Math.min(rect.y + rect.height - size, selection.y - (size - selection.size) / 2)),
  };
}

export function mapMobileSquareSelectionToSourceCrop(
  selection: MobileSquareSelection,
  imageRect: MobileCropRect,
  sourceWidth: number,
  sourceHeight: number
): MobileCropRect {
  const scaleX = sourceWidth / imageRect.width;
  const scaleY = sourceHeight / imageRect.height;
  const crop = {
    x: Math.round((selection.x - imageRect.x) * scaleX),
    y: Math.round((selection.y - imageRect.y) * scaleY),
    width: Math.round(selection.size * scaleX),
    height: Math.round(selection.size * scaleY),
  };
  crop.x = Math.max(0, Math.min(sourceWidth - crop.width, crop.x));
  crop.y = Math.max(0, Math.min(sourceHeight - crop.height, crop.y));
  crop.width = Math.max(1, Math.min(sourceWidth - crop.x, crop.width));
  crop.height = Math.max(1, Math.min(sourceHeight - crop.y, crop.height));
  return crop;
}
