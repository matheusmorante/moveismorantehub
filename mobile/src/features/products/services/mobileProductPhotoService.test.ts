import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  mobileProductPhotoUploadFormSchema,
  mobileProductPhotoUrlsFormSchema,
} from '../../../../../shared-utils/productImageFormSchemas';
import { uploadMobileProductPhoto } from './mobileProductPhotoService';

const photoMocks = vi.hoisted(() => ({
  manipulate: vi.fn(),
  deleteAsync: vi.fn(),
}));

vi.mock('expo-image-manipulator', () => ({
  ImageManipulator: { manipulate: photoMocks.manipulate },
  SaveFormat: { WEBP: 'webp' },
}));

vi.mock('expo-file-system/legacy', () => ({ deleteAsync: photoMocks.deleteAsync }));

beforeEach(() => {
  photoMocks.deleteAsync.mockResolvedValue(undefined);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('uploadMobileProductPhoto', () => {
  it('accepts only confirmed HTTPS photo URLs before adding them to the product draft', () => {
    expect(mobileProductPhotoUrlsFormSchema.safeParse({ urls: ['https://storage.example/product.jpg'] }).success).toBe(true);
    expect(mobileProductPhotoUrlsFormSchema.safeParse({ urls: ['http://storage.example/product.jpg'] }).success).toBe(false);
    expect(mobileProductPhotoUrlsFormSchema.safeParse({ urls: [] }).success).toBe(false);
  });

  it('validates supported temporary image source URIs through the upload form schema', () => {
    const photo = { file: new Blob(['image'], { type: 'image/jpeg' }), name: 'photo.jpg', contentType: 'image/jpeg' };
    expect(mobileProductPhotoUploadFormSchema.safeParse({ photos: [{ ...photo, sourceUri: 'file:///cache/photo.jpg' }] }).success).toBe(true);
    expect(mobileProductPhotoUploadFormSchema.safeParse({ photos: [{ ...photo, sourceUri: 'javascript:alert(1)' }] }).success).toBe(false);
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

  it('adds a MIME-based extension when the selected file has no extension', async () => {
    vi.stubGlobal('crypto', { randomUUID: vi.fn().mockReturnValue('photo-uuid') });
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({
        uploadUrl: 'https://storage.example/upload-token',
        fileUrl: 'https://storage.example/products/photo-uuid-photo.jpg',
      }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
      .mockResolvedValueOnce(new Response(null, { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    await uploadMobileProductPhoto(new Blob(['image']), 'photo', 'image/jpeg');

    expect(JSON.parse(fetchMock.mock.calls[0][1].body).fileName).toBe('products/photo-uuid-photo.jpg');
  });

  it('uploads medium and thumbnail WebP siblings while returning only the original URL', async () => {
    vi.stubGlobal('crypto', { randomUUID: vi.fn().mockReturnValue('photo-uuid') });
    const sourceImages = [
      { width: 2400, height: 1200, release: vi.fn() },
      { width: 2400, height: 1200, release: vi.fn() },
    ];
    const mediumImage = {
      width: 1000,
      height: 500,
      release: vi.fn(),
      saveAsync: vi.fn()
        .mockResolvedValueOnce({ uri: 'file:///cache/medium-too-large.webp' })
        .mockResolvedValueOnce({ uri: 'file:///cache/medium.webp' }),
    };
    const thumbnailImage = {
      width: 200,
      height: 100,
      release: vi.fn(),
      saveAsync: vi.fn().mockResolvedValue({ uri: 'file:///cache/thumb.webp' }),
    };
    const derivativeImages = [mediumImage, thumbnailImage];
    const resizeCalls: Array<{ width?: number; height?: number }> = [];
    photoMocks.manipulate.mockImplementation((source: unknown) => {
      const context = { resize: vi.fn(), renderAsync: vi.fn() };
      context.resize.mockImplementation((size: { width?: number; height?: number }) => {
        resizeCalls.push(size);
        return context;
      });
      context.renderAsync.mockResolvedValue(
        typeof source === 'string' ? sourceImages.shift() : derivativeImages.shift()
      );
      return context;
    });

    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ uploadUrl: 'https://storage.example/original-put', fileUrl: 'https://storage.example/products/photo-uuid-photo.jpg' }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
      .mockResolvedValueOnce(new Response(null, { status: 200 }))
      .mockResolvedValueOnce(new Response(new Blob([new Uint8Array(600 * 1024)]), { status: 200 }))
      .mockResolvedValueOnce(new Response(new Blob(['medium']), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ uploadUrl: 'https://storage.example/medium-put', fileUrl: 'https://storage.example/products/photo-uuid-photo_medium.webp' }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
      .mockResolvedValueOnce(new Response(null, { status: 200 }))
      .mockResolvedValueOnce(new Response(new Blob(['thumbnail']), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ uploadUrl: 'https://storage.example/thumb-put', fileUrl: 'https://storage.example/products/photo-uuid-photo_thumb.webp' }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
      .mockResolvedValueOnce(new Response(null, { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(uploadMobileProductPhoto(
      new Blob(['original'], { type: 'image/jpeg' }),
      'photo.jpg',
      'image/jpeg',
      'file:///cache/source.jpg'
    )).resolves.toBe('https://storage.example/products/photo-uuid-photo.jpg');

    const objectKeys = fetchMock.mock.calls
      .filter(([, init]) => init?.method === 'POST')
      .map(([, init]) => JSON.parse(init.body).fileName);
    expect(objectKeys).toEqual([
      'products/photo-uuid-photo.jpg',
      'products/photo-uuid-photo_medium.webp',
      'products/photo-uuid-photo_thumb.webp',
    ]);
    expect(photoMocks.manipulate).toHaveBeenCalledTimes(4);
    expect(resizeCalls).toEqual([{ width: 1000 }, { width: 200 }]);
    expect(mediumImage.saveAsync.mock.calls.map(([options]) => options.compress)).toEqual([0.85, 0.75]);
    expect(photoMocks.deleteAsync).toHaveBeenCalledTimes(3);
  });

  it('keeps the original photo when an optional derivative upload fails', async () => {
    vi.stubGlobal('crypto', { randomUUID: vi.fn().mockReturnValue('photo-uuid') });
    const imageRefs = [
      { width: 180, height: 120, release: vi.fn(), saveAsync: vi.fn().mockResolvedValue({ uri: 'blob:medium' }) },
      { width: 180, height: 120, release: vi.fn(), saveAsync: vi.fn().mockResolvedValue({ uri: 'blob:thumb' }) },
    ];
    photoMocks.manipulate.mockImplementation(() => ({ renderAsync: vi.fn().mockResolvedValue(imageRefs.shift()) }));
    const revokeObjectURL = vi.spyOn(URL, 'revokeObjectURL');
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ uploadUrl: 'https://storage.example/original-put', fileUrl: 'https://storage.example/products/photo-uuid-photo.jpg' }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
      .mockResolvedValueOnce(new Response(null, { status: 200 }))
      .mockResolvedValueOnce(new Response(new Blob(['medium']), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ error: 'Storage indisponível.' }), { status: 503, headers: { 'Content-Type': 'application/json' } }))
      .mockResolvedValueOnce(new Response(new Blob(['thumbnail']), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ uploadUrl: 'https://storage.example/thumb-put', fileUrl: 'https://storage.example/products/photo-uuid-photo_thumb.webp' }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
      .mockResolvedValueOnce(new Response(null, { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(uploadMobileProductPhoto(
      new Blob(['original']),
      'photo.jpg',
      'image/jpeg',
      'blob:source-image'
    )).resolves.toBe('https://storage.example/products/photo-uuid-photo.jpg');

    const objectKeys = fetchMock.mock.calls
      .filter(([, init]) => init?.method === 'POST')
      .map(([, init]) => JSON.parse(init.body).fileName);
    expect(objectKeys).toEqual([
      'products/photo-uuid-photo.jpg',
      'products/photo-uuid-photo_medium.webp',
      'products/photo-uuid-photo_thumb.webp',
    ]);
    expect(fetchMock).toHaveBeenCalledWith('https://storage.example/thumb-put', expect.objectContaining({ method: 'PUT' }));
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:medium');
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:thumb');
  });

  it('uses a unique object key when repeated photo names are uploaded at the same time', async () => {
    const randomUUID = vi
      .fn()
      .mockReturnValueOnce('upload-uuid-1')
      .mockReturnValueOnce('upload-uuid-2');
    vi.stubGlobal('crypto', { randomUUID });
    vi.spyOn(Date, 'now').mockReturnValue(1234);
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({
        uploadUrl: 'https://storage.example/put-1',
        fileUrl: 'https://storage.example/products/one.jpg',
      }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
      .mockResolvedValueOnce(new Response(null, { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        uploadUrl: 'https://storage.example/put-2',
        fileUrl: 'https://storage.example/products/two.jpg',
      }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
      .mockResolvedValueOnce(new Response(null, { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    const blob = new Blob(['image'], { type: 'image/jpeg' });
    await uploadMobileProductPhoto(blob, 'crop.jpg', 'image/jpeg');
    await uploadMobileProductPhoto(blob, 'crop.jpg', 'image/jpeg');

    const firstKey = JSON.parse(fetchMock.mock.calls[0][1].body).fileName;
    const secondKey = JSON.parse(fetchMock.mock.calls[2][1].body).fileName;
    expect(firstKey).toBe('products/upload-uuid-1-crop.jpg');
    expect(secondKey).toBe('products/upload-uuid-2-crop.jpg');
    expect(firstKey).not.toBe(secondKey);
  });

  it('uses the mobile UUID fallback when crypto.randomUUID is unavailable', async () => {
    vi.stubGlobal('crypto', undefined);
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({
        uploadUrl: 'https://storage.example/put',
        fileUrl: 'https://storage.example/products/photo.jpg',
      }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
      .mockResolvedValueOnce(new Response(null, { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    await uploadMobileProductPhoto(new Blob(['image']), 'photo.jpg', 'image/jpeg');

    const objectKey = JSON.parse(fetchMock.mock.calls[0][1].body).fileName;
    expect(objectKey).toMatch(
      /^products\/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}-photo\.jpg$/i
    );
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
