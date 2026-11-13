import cvModule from '@techstark/opencv-js';
import type * as OpenCv from '@techstark/opencv-js';

type Cv = typeof OpenCv;
type InitializingCv = Cv & { then?: (ready: (cv: Cv) => void, fail: (error: unknown) => void) => void };

export function readyOpenCv(): Promise<{ cv: Cv }> {
  return new Promise((resolve, reject) => {
    const cv = cvModule as InitializingCv;
    // Wrapping the ready module avoids resolving a Promise with Emscripten's thenable.
    if (typeof cv.Mat === 'function') resolve({ cv });
    else if (typeof cv.then === 'function') cv.then((ready) => resolve({ cv: ready }), reject);
    else reject(new Error('OpenCV.js indisponível.'));
  });
}
