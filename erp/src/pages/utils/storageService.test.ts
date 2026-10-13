import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getCatalogApiUrl, uploadFile } from './storageService';

describe('storageService', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('getCatalogApiUrl returns empty string by default to use relative /api/upload', () => {
    expect(getCatalogApiUrl()).toBe('');
  });

  it('uploadFile uses /api/upload endpoint and returns fileUrl', async () => {
    const mockFile = new File(['dummy'], 'foto.jpg', { type: 'image/jpeg' });
    const mockUploadUrl = 'https://r2.test.com/signed-put';
    const mockFileUrl = 'https://pub-r2.test.com/products/foto.jpg';

    const globalFetch = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      if (url === '/api/upload') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ uploadUrl: mockUploadUrl, fileUrl: mockFileUrl }),
        });
      }
      if (url === mockUploadUrl) {
        expect(init?.method).toBe('PUT');
        const headers = init?.headers as Record<string, string> | undefined;
        expect(headers?.['Content-Type']).toBe('image/jpeg');
        return Promise.resolve({ ok: true });
      }
      return Promise.reject(new Error(`Unknown url: ${url}`));
    });

    vi.stubGlobal('fetch', globalFetch);

    const result = await uploadFile(mockFile, 'products/foto.jpg');
    expect(result).toBe(mockFileUrl);
    expect(globalFetch).toHaveBeenCalledTimes(2);
  });
});
