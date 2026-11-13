import type * as OpenCv from '@techstark/opencv-js';
import { withTimeout } from '../../../../../../shared-utils/withTimeout';
import {
  colorRefinementCandidates,
  colorForegroundCandidates,
  inferUniformBackground,
  keepPrimaryForeground,
  polishAlpha,
  removeBackgroundComponents,
  restoreConnectedForeground,
  resizeMatte,
  type AlphaMatte,
} from './backgroundRemovalPostProcess';

let runtime: Promise<{ cv: typeof OpenCv } | null> | undefined;

function getOpenCv() {
  return runtime ??= withTimeout(
    import('./openCvRuntime').then(({ readyOpenCv }) => readyOpenCv()),
    15_000, null, 'OpenCV.js',
  ).catch(() => null);
}

export async function refineBackgroundMask(
  mask: AlphaMatte, data: Uint8ClampedArray, width: number, height: number,
): Promise<Uint8Array> {
  const original = resizeMatte(mask, width, height);
  const mats: OpenCv.Mat[] = [];
  const keep = (mat: OpenCv.Mat) => { mats.push(mat); return mat; };
  try {
    const runtime = await getOpenCv();
    if (!runtime) return keepPrimaryForeground(original, width, height);
    const { cv } = runtime;
    const source = keep(cv.matFromArray(height, width, cv.CV_8UC1, original));
    const blurred = keep(new cv.Mat());
    cv.GaussianBlur(source, blurred, new cv.Size(3, 3), .65);

    const refined = original.slice();
    const background = inferUniformBackground(data, original, width, height);
    if (background) {
      const candidates = keep(cv.matFromArray(height, width, cv.CV_8UC1,
        colorRefinementCandidates(data, original, background)));
      const labels = keep(new cv.Mat());
      const count = cv.connectedComponents(candidates, labels, 4, cv.CV_32S);
      removeBackgroundComponents(refined, labels.data32S, count, width, height);
      const foreground = keep(cv.matFromArray(height, width, cv.CV_8UC1,
        colorForegroundCandidates(data, original, background)));
      const foregroundLabels = keep(new cv.Mat());
      const foregroundCount = cv.connectedComponents(foreground, foregroundLabels, 8, cv.CV_32S);
      restoreConnectedForeground(refined, data, background, foregroundLabels.data32S, foregroundCount, width, height);
    }

    polishAlpha(refined, blurred.data);
    return keepPrimaryForeground(refined, width, height);
  } catch {
    return keepPrimaryForeground(original, width, height);
  } finally {
    for (const mat of mats) mat.delete();
  }
}
