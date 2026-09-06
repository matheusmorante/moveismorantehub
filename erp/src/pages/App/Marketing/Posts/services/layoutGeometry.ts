export interface LayoutBox { x: number; y: number; width: number; height: number; }

export const SAFE_MARGIN = .03;
export const MIN_GAP = .012;

export function insideSafeArea(box: LayoutBox, margin = SAFE_MARGIN) {
  return box.x >= margin && box.y >= margin && box.x + box.width <= 1 - margin && box.y + box.height <= 1 - margin;
}

export function overlapArea(a: LayoutBox, b: LayoutBox) {
  return Math.max(0, Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x)) *
    Math.max(0, Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y));
}

export function boxesCollide(a: LayoutBox, b: LayoutBox, gap = MIN_GAP) {
  return a.x < b.x + b.width + gap && a.x + a.width + gap > b.x &&
    a.y < b.y + b.height + gap && a.y + a.height + gap > b.y;
}

export function clampToSafeArea(box: LayoutBox, margin = SAFE_MARGIN): LayoutBox {
  const width = Math.min(box.width, 1 - margin * 2);
  const height = Math.min(box.height, 1 - margin * 2);
  return { width, height, x: Math.max(margin, Math.min(1 - margin - width, box.x)), y: Math.max(margin, Math.min(1 - margin - height, box.y)) };
}
