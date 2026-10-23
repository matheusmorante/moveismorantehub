import { afterEach, describe, expect, it, vi } from 'vitest';
import { mobileProductPhotoUrlsFormSchema } from '../../../../../shared-utils/productImageFormSchemas';
import { uploadMobileProductPhoto } from './mobileProductPhotoService';

afterEach(() => vi.unstubAllGlobals());

describe('uploadMobileProductPhoto', () => {
  it('accepts only confirmed HTTPS photo URLs before adding them to the product draft', () => {
    expect(mobileProductPhotoUrlsFormSchema.safeParse({ urls: ['https://storage.example/product.jpg'] }).success).toBe(true);
    expect(mobileProductPhotoUrlsFormSchema.safeParse({ urls: ['http://storage.example/product.jpg'] }).success).toBe(false);
    expect(mobileProductPhotoUrlsFormSchema.safeParse({ urls: [] }).success).toBe(false);
  });

  it('prepares a signed upload and returns the confirmed image URL', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({
        uploadUrl: 'https://storage.example/upload-token',
        fileUrl: 'https://storage.example/products/cropped.jpg',
      }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
      .mockResolvedValueOnce(new Response(null, { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    const blob = new Blob(['image'], { type: 'image/jpeg' });
    await expect(uploadMobileProductPhoto(blob, 'crop.jpg', 'image/jpeg'))
      .resolves.toBe('https://storage.example/products/cropped.jpg');

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0][0]).toContain('/api/upload');
    expect(fetchMock.mock.calls[1][0]).toBe('https://storage.example/upload-token');
    expect(fetchMock.mock.calls[1][1]).toMatchObject({ method: 'PUT', body: blob });
  });

  it('stops before upload if the catalog API does not issue a signed URL', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(new Response(
      JSON.stringify({ error: 'Permissão negada.' }),
      { status: 403, headers: { 'Content-Type': 'application/json' } }
    ));
    vi.stubGlobal('fetch', fetchMock);

    await expect(uploadMobileProductPhoto(new Blob(['image']), 'crop.jpg', 'image/jpeg'))
      .rejects.toThrow('Permissão negada.');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('reports a failed storage upload and does not return an unconfirmed URL', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({
        uploadUrl: 'https://storage.example/upload-token',
        fileUrl: 'https://storage.example/products/cropped.jpg',
      }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
      .mockResolvedValueOnce(new Response(null, { status: 500 }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(uploadMobileProductPhoto(new Blob(['image']), 'crop.jpg', 'image/jpeg'))
      .rejects.toThrow('Falha ao enviar a foto para o armazenamento do catálogo.');
  });
});
