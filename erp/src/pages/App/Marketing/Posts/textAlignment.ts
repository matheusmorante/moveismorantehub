export type HorizontalTextAlignment = 'left' | 'center' | 'right';
export type VerticalTextAlignment = 'top' | 'middle' | 'bottom';

export function getTextAlignmentOffset(contentWidth: number, contentHeight: number, selectionWidth: number | undefined, selectionHeight: number | undefined, horizontal: HorizontalTextAlignment = 'left', vertical: VerticalTextAlignment = 'top') {
  const width = Math.max(contentWidth, selectionWidth || contentWidth);
  const height = Math.max(contentHeight, selectionHeight || contentHeight);
  const remainingX = width - contentWidth;
  const remainingY = height - contentHeight;
  return {
    x: horizontal === 'center' ? remainingX / 2 : horizontal === 'right' ? remainingX : 0,
    y: vertical === 'middle' ? remainingY / 2 : vertical === 'bottom' ? remainingY : 0,
    width,
    height,
  };
}

export function getTextBackgroundAlignment(contentWidth: number, contentHeight: number, paddingX: number, paddingY: number, horizontal: HorizontalTextAlignment = 'left', vertical: VerticalTextAlignment = 'top') {
  return getTextAlignmentOffset(
    contentWidth,
    contentHeight,
    contentWidth + Math.max(0, paddingX) * 2,
    contentHeight + Math.max(0, paddingY) * 2,
    horizontal,
    vertical,
  );
}
