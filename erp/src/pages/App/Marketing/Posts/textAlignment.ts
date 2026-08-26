export type HorizontalTextAlignment = 'left' | 'center' | 'right';
export type VerticalTextAlignment = 'top' | 'middle' | 'bottom';

export function getTextAlignmentOffset(contentWidth: number, contentHeight: number, selectionWidth: number | undefined, selectionHeight: number | undefined, horizontal: HorizontalTextAlignment = 'left', vertical: VerticalTextAlignment = 'middle') {
  const width = Math.max(contentWidth, selectionWidth || contentWidth);
  const height = Math.max(contentHeight, selectionHeight || contentHeight);
  const remainingX = width - contentWidth;
  const remainingY = height - contentHeight;
  return {
    x: horizontal === 'center' ? remainingX / 2 : horizontal === 'right' ? remainingX : 0,
    y: vertical === 'top' ? 0 : vertical === 'bottom' ? remainingY : remainingY / 2,
    width,
    height,
  };
}

export function getTextBackgroundAlignment(contentWidth: number, contentHeight: number, paddingLeft: number, paddingRight: number, paddingTop: number, paddingBottom: number, horizontal: HorizontalTextAlignment = 'left', vertical: VerticalTextAlignment = 'middle') {
  const left = Math.max(0, paddingLeft);
  const right = Math.max(0, paddingRight);
  const top = Math.max(0, paddingTop);
  const bottom = Math.max(0, paddingBottom);

  return {
    x: horizontal === 'left' ? left : horizontal === 'right' ? right : (left + right) / 2,
    y: vertical === 'top' ? top : vertical === 'bottom' ? bottom : (top + bottom) / 2,
    width: contentWidth + left + right,
    height: contentHeight + top + bottom,
  };
}
