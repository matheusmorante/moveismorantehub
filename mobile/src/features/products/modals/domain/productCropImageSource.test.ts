import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { downloadProductCropImageSource } from './productCropImageSource';

const fileSystemMocks = vi.hoisted(() => ({
  cancelAsync: vi.fn(),
  createDownloadResumable: vi.fn(),
  deleteAsync: vi.fn(),
  downloadAsync: vi.fn(),
}));

vi.mock('expo-file-system/legacy', () => ({
  cacheDirectory: 'file:///cache/',
  createDownloadResumable: fileSystemMocks.createDownloadResumable,
  deleteAsync: fileSystemMocks.deleteAsync,
}));

describe('downloadProductCropImageSource', () => {
  beforeEach(() => {
    vi.useRealTimers();
    fileSystemMocks.cancelAsync.mockReset().mockResolvedValue(undefined);
    fileSystemMocks.deleteAsync.mockReset().mockResolvedValue(undefined);
    fileSystemMocks.downloadAsync.mockReset();
    fileSystemMocks.createDownloadResumable.mockReset().mockImplementation(() => ({
      cancelAsync: fileSystemMocks.cancelAsync,
      downloadAsync: fileSystemMocks.downloadAsync,
    }));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('cancels the Expo download and removes its partial cache file when the modal closes', async () => {
    const abortController = new AbortController();
    fileSystemMocks.downloadAsync.mockImplementation(() => new Promise((resolve) => {
      fileSystemMocks.cancelAsync.mockImplementation(async () => resolve(undefined));
    }));

    const loading = downloadProductCropImageSource('https://images.example/photo.jpg', abortController.signal);
    abortController.abort();

    await expect(loading).rejects.toMatchObject({ name: 'AbortError' });
    expect(fileSystemMocks.cancelAsync).toHaveBeenCalledOnce();
    expect(fileSystemMocks.deleteAsync).toHaveBeenCalledWith(
      expect.stringMatching(/^file:\/\/\/cache\/produto-recorte-\d+\.image$/),
      { idempotent: true }
    );
  });

  it('cancels a timed out Expo download and removes the partial cache file', async () => {
    vi.useFakeTimers();
    fileSystemMocks.downloadAsync.mockReturnValue(new Promise(() => undefined));

    const loading = downloadProductCropImageSource('https://images.example/photo.jpg', new AbortController().signal);
    const rejection = expect(loading).rejects.toThrow('O download da foto demorou demais. Tente novamente.');
    await vi.advanceTimersByTimeAsync(20_000);
    await rejection;

    expect(fileSystemMocks.cancelAsync).toHaveBeenCalledOnce();
    expect(fileSystemMocks.deleteAsync).toHaveBeenCalledWith(
      expect.stringMatching(/^file:\/\/\/cache\/produto-recorte-\d+\.image$/),
      { idempotent: true }
    );
  });

  it('returns a cleanup for the temporary source after a successful download', async () => {
    fileSystemMocks.downloadAsync.mockResolvedValue({ uri: 'file:///cache/source.image', status: 200 });

    const prepared = await downloadProductCropImageSource(
      'https://images.example/photo.jpg',
      new AbortController().signal
    );

    expect(prepared.uri).toBe('file:///cache/source.image');
    await prepared.cleanup?.();
    expect(fileSystemMocks.deleteAsync).toHaveBeenCalledWith('file:///cache/source.image', { idempotent: true });
    expect(fileSystemMocks.cancelAsync).not.toHaveBeenCalled();
  });
});
