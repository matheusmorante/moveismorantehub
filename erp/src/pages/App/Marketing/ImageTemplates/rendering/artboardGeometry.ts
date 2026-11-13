import type { CSSProperties } from 'react';
import {
  isLayerVisible,
  isTemplateLayerVisible,
  type ImageLayout,
  type PositionedLayer,
  type TemplatePreviewProduct,
} from '../../../../../../../shared-utils/catalogImageTemplate';
import type { PositionedSelection } from '../../../../../../../shared-utils/catalogImageTemplateGroups';
import { measureTextLayerSafetyBounds } from '../renderImageTemplate';

export type Point = { x: number; y: number };
export type Corner = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

export const CORNERS: readonly Corner[] = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];
export const ZOOM_STEPS = [50, 75, 100, 125, 150, 200] as const;

export type Gesture = {
  layer: PositionedSelection;
  start: Point;
  pointer: number;
  corner?: Corner;
  rotating?: boolean;
};

/** Rotates a 2D vector by `angle` degrees around the origin. */
export function rotatePoint(x: number, y: number, angle: number): Point {
  const radians = (angle * Math.PI) / 180;
  const sin = Math.sin(radians);
  const cos = Math.cos(radians);
  return { x: x * cos - y * sin, y: x * sin + y * cos };
}

/** Clamps and rounds an artboard coordinate or dimension to `[min, max]`. */
export function clampArtboardCoord(value: number, min: number, max: number): number {
  return Math.round(Math.max(min, Math.min(max, value)));
}

/** Returns true when `point` falls inside the rotated bounding box of `layer`. */
export function hitTestLayer(layer: PositionedSelection, point: Point): boolean {
  const local = rotatePoint(
    point.x - layer.x - layer.width / 2,
    point.y - layer.y - layer.height / 2,
    -layer.angle,
  );
  return Math.abs(local.x) <= layer.width / 2 && Math.abs(local.y) <= layer.height / 2;
}

/** Computes the next layer or group bounds/angle from an active pointer drag, resize, or rotation gesture. */
export function computeGestureLayer(
  { layer, start, corner, rotating }: Gesture,
  point: Point,
  shiftKey = false,
  product: TemplatePreviewProduct | null = null,
): PositionedSelection {
  if (rotating && layer.type !== 'group') {
    const center = { x: layer.x + layer.width / 2, y: layer.y + layer.height / 2 };
    const angleTo = (value: Point) => (Math.atan2(value.y - center.y, value.x - center.x) * 180) / Math.PI;
    const rotated = (((layer.angle + angleTo(point) - angleTo(start) + 180) % 360) + 360) % 360 - 180;
    return { ...layer, angle: Math.round(rotated) };
  }

  const dx = point.x - start.x;
  const dy = point.y - start.y;
  if (!corner) {
    return {
      ...layer,
      x: clampArtboardCoord(layer.x + dx, -3840, 3840),
      y: clampArtboardCoord(layer.y + dy, -3840, 3840),
    };
  }

  const sx = corner.includes('e') ? 1 : corner.includes('w') ? -1 : 0;
  const sy = corner.includes('s') ? 1 : corner.includes('n') ? -1 : 0;
  const local = rotatePoint(dx, dy, -layer.angle);
  let width: number;
  let height: number;

  if (layer.type === 'image' || (layer.type === 'sticker' && layer.lockAspectRatio) || shiftKey) {
    const horizontalScale = Math.max(0.01, (layer.width + sx * local.x) / layer.width);
    const verticalScale = Math.max(0.01, (layer.height + sy * local.y) / layer.height);
    const requestedScale = sx === 0
      ? verticalScale
      : sy === 0
        ? horizontalScale
        : Math.abs(local.x) / layer.width >= Math.abs(local.y) / layer.height
          ? horizontalScale
          : verticalScale;
    const minimumScale = Math.max(16 / layer.width, 16 / layer.height);
    const maximumScale = Math.min(3840 / layer.width, 3840 / layer.height);
    const scale = Math.max(minimumScale, Math.min(maximumScale, requestedScale));
    width = Math.round(layer.width * scale);
    height = Math.round(layer.height * scale);
  } else {
    width = sx === 0 ? layer.width : clampArtboardCoord(layer.width + sx * local.x, 16, 3840);
    height = sy === 0 ? layer.height : clampArtboardCoord(layer.height + sy * local.y, 16, 3840);
  }

  if (layer.type === 'text') {
    const safe = measureTextLayerSafetyBounds({ ...layer, width, height }, product, width, height);
    width = safe.width;
    height = safe.height;
  }

  const shift = rotatePoint((sx * (width - layer.width)) / 2, (sy * (height - layer.height)) / 2, layer.angle);
  return {
    ...layer,
    width,
    height,
    x: clampArtboardCoord(layer.x + (layer.width - width) / 2 + shift.x, -3840, 3840),
    y: clampArtboardCoord(layer.y + (layer.height - height) / 2 + shift.y, -3840, 3840),
  };
}

/** Returns true when a layer or group selection is currently visible for the preview product. */
export function isArtboardSelectionVisible(
  layout: ImageLayout,
  selection: PositionedSelection,
  product: TemplatePreviewProduct | null,
): boolean {
  if (selection.type === 'group') {
    const group = layout.groups?.find((entry) => entry.id === selection.id);
    return !!group && isLayerVisible(group, product) && group.layerIds.some((id) => {
      const layer = layout.layers.find((entry) => entry.id === id);
      return !!layer && layer.type !== 'background' && isTemplateLayerVisible(layout, layer, product);
    });
  }
  const layer = layout.layers.find((entry) => entry.id === selection.id);
  return !!layer && layer.type !== 'background' && isTemplateLayerVisible(layout, layer, product);
}

/** Converts layer coordinates and optional rotation to percentage CSS positioning over the artboard. */
export function layerPercentBoxStyle(
  box: Pick<PositionedLayer, 'x' | 'y' | 'width' | 'height'> & { angle?: number },
  boardWidth: number,
  boardHeight: number,
): CSSProperties {
  return {
    left: `${(100 * box.x) / boardWidth}%`,
    top: `${(100 * box.y) / boardHeight}%`,
    width: `${(100 * box.width) / boardWidth}%`,
    height: `${(100 * box.height) / boardHeight}%`,
    ...(box.angle !== undefined ? { transform: `rotate(${box.angle}deg)` } : {}),
  };
}
