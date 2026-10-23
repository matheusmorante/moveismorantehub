import { describe, expect, it } from 'vitest';
import {
  getScannerFrameRect,
  isBarcodeWithinScannerFrame,
  type ScannerPoint,
} from './scannerFrameGeometry';

const frame = { x: 100, y: 200, width: 240, height: 240 };
const points = (...coords: [number, number][]): ScannerPoint[] =>
  coords.map(([x, y]) => ({ x, y }));

describe('inventory scanner frame geometry', () => {
  it.each([
    { name: 'small portrait screen', area: { x: 0, y: 80, width: 320, height: 360 } },
    { name: 'large portrait screen', area: { x: 0, y: 110, width: 440, height: 680 } },
    { name: 'short landscape area', area: { x: 0, y: 40, width: 800, height: 200 } },
  ])('keeps the visual frame centered and inside a $name', ({ area }) => {
    const result = getScannerFrameRect(area);
    expect(result).not.toBeNull();
    if (!result) throw new Error('Expected a measurable scanner frame.');
    expect(result.width).toBe(result.height);
    expect(result.x + result.width / 2).toBe(area.x + area.width / 2);
    expect(result.y + result.height / 2).toBe(area.y + area.height / 2);
    expect(result.x).toBeGreaterThanOrEqual(area.x);
    expect(result.y).toBeGreaterThanOrEqual(area.y);
    expect(result.x + result.width).toBeLessThanOrEqual(area.x + area.width);
    expect(result.y + result.height).toBeLessThanOrEqual(area.y + area.height);
  });

  it('accepts a QR fully inside the measured frame', () => {
    expect(
      isBarcodeWithinScannerFrame(
        { cornerPoints: points([150, 250], [250, 250], [250, 350], [150, 350]) },
        frame
      )
    ).toBe(true);
  });

  it('rejects a QR outside the frame and one extending beyond the edge tolerance', () => {
    expect(
      isBarcodeWithinScannerFrame(
        { cornerPoints: points([20, 250], [80, 250], [80, 310], [20, 310]) },
        frame
      )
    ).toBe(false);
    expect(
      isBarcodeWithinScannerFrame(
        { cornerPoints: points([90, 250], [150, 250], [150, 310], [90, 310]) },
        frame
      )
    ).toBe(false);
  });

  it('allows only a small edge tolerance and validates every corner of a rotated QR', () => {
    expect(
      isBarcodeWithinScannerFrame(
        { cornerPoints: points([96, 260], [180, 220], [220, 304], [136, 344]) },
        frame
      )
    ).toBe(true);
    expect(
      isBarcodeWithinScannerFrame(
        { cornerPoints: points([90, 260], [180, 220], [220, 304], [136, 344]) },
        frame
      )
    ).toBe(false);
  });

  it('selects only the in-frame QR when multiple detections are reported', () => {
    const detections = [
      { data: 'outside', cornerPoints: points([20, 250], [80, 250], [80, 310], [20, 310]) },
      { data: 'inside', cornerPoints: points([150, 250], [250, 250], [250, 350], [150, 350]) },
    ];

    expect(
      detections.filter((qr) => isBarcodeWithinScannerFrame(qr, frame)).map((qr) => qr.data)
    ).toEqual(['inside']);
  });

  it('fails closed when the camera does not provide all four QR corners', () => {
    expect(isBarcodeWithinScannerFrame({ cornerPoints: [] }, frame)).toBe(false);
    expect(
      isBarcodeWithinScannerFrame(
        { cornerPoints: points([110, 210], [120, 210], [120, 220]) },
        frame
      )
    ).toBe(false);
  });
});
