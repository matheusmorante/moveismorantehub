import { describe, expect, it } from 'vitest';
import {
  createCenteredMobileSquareSelection,
  getContainedImageRect,
  getPaddedImageRect,
  mapMobileSquareSelectionToRasterCrop,
  moveMobileSquareSelection,
  resizeMobileSquareSelection,
} from './mobileProductImageCrop';

describe('mobile product image crop geometry', () => {
  it('fits the source image into the padded stage and starts with the full square selection', () => {
    const image = getContainedImageRect(320, 320, 1600, 900);
    expect(image).toEqual({ x: 0, y: 70, width: 320, height: 180 });
    expect(getPaddedImageRect(320, 320, 1600, 900, 20)).toEqual({ x: 64, y: 106, width: 192, height: 108 });
    expect(createCenteredMobileSquareSelection({ x: 0, y: 0, width: 320, height: 320 })).toEqual({ x: 0, y: 0, size: 320 });
  });

  it('keeps a dragged square within the white stage, including its margins', () => {
    const stage = { x: 0, y: 0, width: 300, height: 300 };
    const selection = { x: 60, y: 80, size: 120 };
    expect(moveMobileSquareSelection(selection, 1000, -1000, stage)).toEqual({
      x: 180,
      y: 0,
      size: 120,
    });
  });

  it('resizes around the center and maps stage coordinates to the captured raster', () => {
    const stage = { x: 0, y: 0, width: 300, height: 300 };
    const selection = { x: 60, y: 80, size: 120 };
    const resized = resizeMobileSquareSelection(selection, 20, stage);
    expect(resized).toEqual({ x: 50, y: 70, size: 140 });
    expect(mapMobileSquareSelectionToRasterCrop(resized, stage, 900, 900)).toEqual({
      x: 150,
      y: 210,
      width: 420,
      height: 420,
    });
  });
});
