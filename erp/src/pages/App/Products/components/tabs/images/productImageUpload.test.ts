// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ compress: vi.fn(), upload: vi.fn() }));
vi.mock('@/pages/utils/imageUtils', () => ({ compressImageToFile: mocks.compress }));
vi.mock('@/pages/utils/storageService', () => ({ uploadFile: mocks.upload }));
import { uploadOptimizedProductImage } from './productImageUpload';
const file = () => new File(['image'], 'photo.webp', { type: 'image/webp' });
beforeEach(() => { vi.resetAllMocks(); mocks.compress.mockImplementation(async (image) => image); mocks.upload.mockImplementation(async (_file, path) => 'https://images.example/' + path); });
afterEach(() => { vi.useRealTimers(); });
describe('optimized image upload boundary', () => {
  it('validates the file before any compression or upload', async () => {
    await expect(uploadOptimizedProductImage(new File(['bad'], 'bad.pdf', { type: 'application/pdf' }))).rejects.toThrow(); expect(mocks.compress).not.toHaveBeenCalled(); expect(mocks.upload).not.toHaveBeenCalled();
  });
  it('shares an image identity across original, medium and thumbnail and awaits them', async () => {
    const original = await uploadOptimizedProductImage(file()); const paths = mocks.upload.mock.calls.map((call) => call[1]); expect(paths).toHaveLength(3);
    expect(paths[1]).toBe(paths[0].replace('.webp', '_medium.webp')); expect(paths[2]).toBe(paths[0].replace('.webp', '_thumb.webp')); expect(original).toBe('https://images.example/' + paths[0]);
    expect(mocks.compress.mock.calls[0][1]).toMatchObject({ maxMB: 0.5, maxWidth: 1000, initialQuality: 0.85, fileType: 'image/webp' });
    expect(mocks.compress.mock.calls[1][1]).toMatchObject({ maxMB: 0.05, maxWidth: 200, initialQuality: 0.75, fileType: 'image/webp' });
  });
  it('keeps confirmed original upload when an optional derivative fails', async () => {
    mocks.upload.mockImplementation(async (_file, path: string) => { if (path.includes('_medium')) throw new Error('Derivative failed'); return 'https://images.example/' + path; });
    await expect(uploadOptimizedProductImage(file())).resolves.toMatch(/^https:\/\//);
  });
  it('rejects a missing or unsafe original receipt', async () => {
    mocks.upload.mockResolvedValue('javascript:invalid'); await expect(uploadOptimizedProductImage(file())).rejects.toMatchObject({ uncertain: true });
  });
  it('bounds preparation before dispatching any remote upload', async () => {
    vi.useFakeTimers(); mocks.compress.mockReturnValue(new Promise(() => {})); const pending = uploadOptimizedProductImage(file()); const assertion = expect(pending).rejects.toMatchObject({ knownFailure: true });
    await vi.advanceTimersByTimeAsync(10_001); await assertion; expect(mocks.upload).not.toHaveBeenCalled();
  });
  it('classifies a local compression refusal before any remote upload as retryable', async () => {
    mocks.compress.mockRejectedValue(new Error('Canvas unavailable')); await expect(uploadOptimizedProductImage(file())).rejects.toMatchObject({ knownFailure: true }); expect(mocks.upload).not.toHaveBeenCalled();
  });
  it('bounds an uncertain original upload without inventing a URL', async () => {
    vi.useFakeTimers(); mocks.upload.mockReturnValue(new Promise(() => {})); const pending = uploadOptimizedProductImage(file()); const assertion = expect(pending).rejects.toMatchObject({ uncertain: true });
    await vi.advanceTimersByTimeAsync(30_001); await assertion;
  });
  it('stops before remote upload when the parent context changes during preparation', async () => {
    let current = true; mocks.compress.mockImplementation(async (image) => { current = false; return image; });
    await expect(uploadOptimizedProductImage(file(), { isCurrent: () => current })).rejects.toMatchObject({ knownFailure: true }); expect(mocks.upload).not.toHaveBeenCalled();
  });
});
