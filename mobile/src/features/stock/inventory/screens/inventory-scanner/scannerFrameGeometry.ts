export interface ScannerPoint {
  x: number;
  y: number;
}

export interface ScannerFrameRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface BarcodeGeometry {
  cornerPoints?: readonly ScannerPoint[] | null;
}

const FRAME_EDGE_TOLERANCE = 0.025;
const FRAME_SIZE_RATIO = 0.82;

export function getScannerFrameRect(area: ScannerFrameRect): ScannerFrameRect | null {
  if (
    ![area.x, area.y, area.width, area.height].every(Number.isFinite) ||
    area.width <= 0 ||
    area.height <= 0
  ) {
    return null;
  }

  const size = Math.min(area.width * FRAME_SIZE_RATIO, area.height * FRAME_SIZE_RATIO);
  return {
    x: area.x + (area.width - size) / 2,
    y: area.y + (area.height - size) / 2,
    width: size,
    height: size,
  };
}

/**
 * expo-camera reports barcode corners in CameraView preview coordinates: Android
 * applies PreviewView scaling/cropping, and iOS transforms metadata through its
 * preview layer. The camera and overlay fill the same root, so their layout points
 * can be compared directly. Missing corners fail closed because `bounds` may not
 * contain the full barcode.
 */
export function isBarcodeWithinScannerFrame(
  barcode: BarcodeGeometry,
  frame: ScannerFrameRect
): boolean {
  const points = barcode.cornerPoints;
  if (
    !points ||
    points.length !== 4 ||
    ![frame.x, frame.y, frame.width, frame.height].every(Number.isFinite) ||
    frame.width <= 0 ||
    frame.height <= 0
  ) {
    return false;
  }

  const tolerance = Math.min(frame.width, frame.height) * FRAME_EDGE_TOLERANCE;
  const left = frame.x - tolerance;
  const top = frame.y - tolerance;
  const right = frame.x + frame.width + tolerance;
  const bottom = frame.y + frame.height + tolerance;

  return points.every(
    ({ x, y }) =>
      Number.isFinite(x) && Number.isFinite(y) && x >= left && x <= right && y >= top && y <= bottom
  );
}
