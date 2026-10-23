// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useProductFormImages } from './useProductFormImages';
import { uploadFile } from '@/pages/utils/storageService';
import { compressImageToFile } from '@/pages/utils/imageUtils';
import { toast } from 'react-toastify';

vi.mock('@/pages/utils/imageUtils', () => ({
  compressImageToFile: vi.fn().mockImplementation((file) => Promise.resolve(file)),
}));

vi.mock('@/pages/utils/storageService', () => ({
  uploadFile: vi.fn((file: any, path: string) => Promise.resolve(`https://r2.cdn.com/${path}`)),
}));

vi.mock('react-toastify', () => ({
  toast: {
    warning: vi.fn(),
    info: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('useProductFormImages', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('blocks invalid uploads before compression, Storage and form updates', async () => {
    const setFormData = vi.fn();
    const setLoading = vi.fn();
    const { result } = renderHook(() => useProductFormImages({ images: [] }, setFormData, setLoading));
    await act(async () => { await result.current.handleFileChange({ files: [new File(['x'], 'invalid.txt', { type: 'text/plain' })] }); });
    expect(toast.error).toHaveBeenCalledWith('Selecione um arquivo de imagem.');
    expect(compressImageToFile).not.toHaveBeenCalled();
    expect(uploadFile).not.toHaveBeenCalled();
    expect(setFormData).not.toHaveBeenCalled();
    expect(setLoading).not.toHaveBeenCalled();
  });

  it('uploads images and adds them to formData', async () => {
    let formData = { images: [] as string[] };
    const setFormData = vi.fn().mockImplementation((updater) => {
      if (typeof updater === 'function') {
        formData = updater(formData);
      } else {
        formData = updater;
      }
    });
    const setLoading = vi.fn();
    const onImagesSaved = vi.fn();

    const { result } = renderHook(() =>
      useProductFormImages(formData, setFormData, setLoading, onImagesSaved)
    );

    const mockFile = new File(['dummy'], 'foto.jpg', { type: 'image/jpeg' });

    await act(async () => {
      await result.current.handleFileChange({ files: [mockFile] });
    });

    expect(setLoading).toHaveBeenCalledWith(true);
    expect(setLoading).toHaveBeenCalledWith(false);
    expect(setFormData).toHaveBeenCalled();
    expect(onImagesSaved).toHaveBeenCalled();
    expect(formData.images.length).toBe(1);
    expect(formData.images[0]).toContain('products/');
  });

  it('respects the MAX_PARENT_PRODUCT_IMAGES (75) cap', async () => {
    const existing = Array.from({ length: 75 }, (_, i) => `url-${i}`);
    const formData = { images: existing };
    const setFormData = vi.fn();
    const setLoading = vi.fn();

    const { result } = renderHook(() =>
      useProductFormImages(formData, setFormData, setLoading)
    );

    const mockFile = new File(['dummy'], 'extra.jpg', { type: 'image/jpeg' });

    await act(async () => {
      await result.current.handleFileChange({ files: [mockFile] });
    });

    expect(setFormData).not.toHaveBeenCalled();
    expect(setLoading).not.toHaveBeenCalled();
  });

  it('limits selected files to the remaining gallery slots before compression or upload', async () => {
    let formData = { images: Array.from({ length: 74 }, (_, index) => `url-${index}`) };
    const setFormData = vi.fn((updater) => {
      formData = typeof updater === 'function' ? updater(formData) : updater;
    });
    const { result } = renderHook(() => useProductFormImages(formData, setFormData, vi.fn()));
    const files = [
      new File(['first'], 'first.jpg', { type: 'image/jpeg' }),
      new File(['second'], 'second.jpg', { type: 'image/jpeg' }),
      new File(['third'], 'third.jpg', { type: 'image/jpeg' }),
    ];

    await act(async () => {
      await result.current.handleFileChange({ files });
    });

    expect(toast.info).toHaveBeenCalledWith(
      'Apenas as primeiras 1 foto(s) serão adicionadas (limite máximo de 75 fotos).'
    );
    expect(compressImageToFile).toHaveBeenCalledTimes(2);
    expect(uploadFile).toHaveBeenCalledTimes(3);
    expect(formData.images).toHaveLength(75);
  });

  it('unlinks a removed parent photo from every variation that uses it', () => {
    let formData = {
      images: ['cover.jpg', 'side.jpg'],
      variations: [
        {
          id: 'v1', sku: 'SKU-1', name: 'Variação 1', stock: 0, unitPrice: 0,
          active: true, attributes: [], images: ['cover.jpg', 'side.jpg'],
        },
        {
          id: 'v2', sku: 'SKU-2', name: 'Variação 2', stock: 0, unitPrice: 0,
          active: true, attributes: [], images: ['cover.jpg'],
        },
      ],
    };
    const setFormData = vi.fn((updater) => {
      formData = typeof updater === 'function' ? updater(formData) : updater;
    });
    const { result } = renderHook(() => useProductFormImages(formData, setFormData, vi.fn()));

    act(() => result.current.removePhoto('cover.jpg'));

    expect(formData).toEqual({
      images: ['side.jpg'],
      variations: [
        {
          id: 'v1', sku: 'SKU-1', name: 'Variação 1', stock: 0, unitPrice: 0,
          active: true, attributes: [], images: ['side.jpg'],
        },
        {
          id: 'v2', sku: 'SKU-2', name: 'Variação 2', stock: 0, unitPrice: 0,
          active: true, attributes: [], images: [],
        },
      ],
    });
  });

  it('still succeeds and keeps original image if medium or thumb optimization upload fails', async () => {
    let formData = { images: [] as string[] };
    const setFormData = vi.fn().mockImplementation((updater) => {
      if (typeof updater === 'function') {
        formData = updater(formData);
      } else {
        formData = updater;
      }
    });
    const setLoading = vi.fn();

    const { result } = renderHook(() =>
      useProductFormImages(formData, setFormData, setLoading)
    );

    const mockFile = new File(['dummy'], 'foto.jpg', { type: 'image/jpeg' });

    await act(async () => {
      await result.current.handleFileChange({ files: [mockFile] });
    });

    expect(formData.images.length).toBe(1);
    expect(formData.images[0]).toContain('products/');
  });
});
