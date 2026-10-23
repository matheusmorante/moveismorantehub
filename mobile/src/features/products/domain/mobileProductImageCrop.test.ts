import { describe, expect, it } from 'vitest';
import {
  createCenteredMobileSquareSelection,
  getContainedImageRect,
  mapMobileSquareSelectionToSourceCrop,
  moveMobileSquareSelection,
  resizeMobileSquareSelection,
} from './mobileProductImageCrop';

describe('mobile product image crop geometry', () => {
  it('fits the source image into the square preview and centers a square crop inside the image', () => {
    const image = getContainedImageRect(320, 320, 1600, 900);
    expect(image).toEqual({ x: 0, y: 70, width: 320, height: 180 });
    expect(createCenteredMobileSquareSelection(image)).toEqual({ x: 88, y: 88, size: 144 });
  });

  it('keeps a dragged square within the visible image', () => {
    const image = { x: 0, y: 60, width: 300, height: 200 };
    const selection = { x: 60, y: 80, size: 120 };
    expect(moveMobileSquareSelection(selection, 1000, -1000, image)).toEqual({
      x: 180,
      y: 60,
      size: 120,
    });
  });

  it('resizes around the center and maps display coordinates back to source pixels', () => {
    const image = getContainedImageRect(300, 300, 1200, 800);
    const selection = { x: 60, y: 90, size: 120 };
    const resized = resizeMobileSquareSelection(selection, 20, image);
    expect(resized).toEqual({ x: 50, y: 80, size: 140 });
    expect(mapMobileSquareSelectionToSourceCrop(resized, image, 1200, 800)).toEqual({
      x: 200,
      y: 120,
      width: 560,
      height: 560,
    });
  });
});
