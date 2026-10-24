// @vitest-environment happy-dom
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useLabelPrintingState } from './useLabelPrintingState';
import { createInitialLabelConfig } from '../services/labelModelMapper';

const mocks = vi.hoisted(() => ({ error: vi.fn(), setImage: vi.fn(), setName: vi.fn(), openLogo: vi.fn(), category: 'precos', confirmLogo: vi.fn(), print: vi.fn(), initialProduct: null as any, searchParams: new URLSearchParams() }));
vi.mock('react-router-dom', () => ({ useLocation: () => ({ pathname: '/labels', state: null }), useSearchParams: () => [mocks.searchParams] }));
vi.mock('./useLabelCategory', () => ({ useLabelCategory: () => ({ selectedCategory: mocks.category, printingMode: 'simple' }) }));
vi.mock('./useLabelLayouts', () => ({ useLabelLayouts: () => ({ config: createInitialLabelConfig() }) }));
vi.mock('./useLabelProducts', () => ({ useLabelProducts: () => ({ products: [], initialProduct: mocks.initialProduct }) }));
vi.mock('./useLabelModalsAndAssets', () => ({ useLabelModalsAndAssets: () => ({ setNewLogoImage: mocks.setImage, setNewLogoName: mocks.setName, setIsNewLogoModalOpen: mocks.openLogo, setSelectedImage: mocks.setImage, handleConfirmNewLogo: mocks.confirmLogo }) }));
vi.mock('./useLabelPreview', () => ({ useLabelPreview: () => ({}) }));
vi.mock('./useLabelPrintMode', () => ({ useLabelPrintMode: () => mocks.print }));
vi.mock('../services/inventoryLabelService', () => ({ generateInventoryLabelsBatch: vi.fn() }));
vi.mock('react-toastify', () => ({ toast: { error: mocks.error, success: vi.fn() } }));
afterEach(() => { cleanup(); vi.useRealTimers(); });
beforeEach(() => { vi.clearAllMocks(); mocks.category = 'precos'; mocks.initialProduct = null; mocks.searchParams = new URLSearchParams(); });
const image = () => new File(['photo'], 'Logo.png', { type: 'image/png' });
const event = (file: File) => ({ target: { files: [file], value: 'chosen' } }) as never;

describe('label image read owner', () => {
  it('adds a linked price-label product to the queue only once', async () => {
    mocks.initialProduct = {
      id: 'product-id',
      description: 'Camiseta Azul',
      unitPrice: 49.9,
      promo_price: 39.9,
      images: [],
    };
    const { result, rerender } = renderHook(useLabelPrintingState);

    await waitFor(() => expect(result.current.labelItems).toHaveLength(1));
    expect(result.current.labelItems[0]).toMatchObject({
      name: 'Camiseta Azul',
      productId: 'product-id',
      price: expect.any(String),
    });
    rerender();
    expect(result.current.labelItems).toHaveLength(1);
  });

  it('fills an identification sheet with the linked variation', async () => {
    mocks.category = 'identificacao';
    mocks.searchParams = new URLSearchParams({ fillSheet: '1' });
    mocks.initialProduct = {
      id: 'variation-id',
      parentId: 'product-id',
      isVariation: true,
      description: 'Camiseta Azul',
      unitPrice: 49.9,
      images: [],
    };
    const { result } = renderHook(useLabelPrintingState);

    await waitFor(() => expect(result.current.labelItems).toHaveLength(1));
    const config = createInitialLabelConfig();
    expect(result.current.labelItems[0]).toMatchObject({
      quantity: Math.max(config.columns * config.rows, 10),
      productId: 'product-id',
      variationId: 'variation-id',
    });
  });

  it('blocks invalid input before FileReader and reports a read failure without changing the queue', async () => {
    const read = vi.spyOn(FileReader.prototype, 'readAsDataURL');
    const { result } = renderHook(useLabelPrintingState);
    await act(async () => { await result.current.handleLogoUpload(event(new File(['text'], 'text.txt', { type: 'text/plain' }))); });
    expect(read).not.toHaveBeenCalled();
    expect(mocks.error).toHaveBeenCalledWith('Selecione um arquivo de imagem.');
    read.mockImplementation(function (this: FileReader) { this.dispatchEvent(new Event('error')); });
    await act(async () => { await result.current.handleLogoUpload(event(image())); });
    expect(mocks.error).toHaveBeenCalledWith('Não foi possível ler a imagem.');
    expect(result.current.labelItems).toEqual([]);
    expect(mocks.setImage).not.toHaveBeenCalled();
    read.mockRestore();
    await act(async () => { await result.current.handleLogoUpload(event(image())); });
    expect(result.current.labelItems).toEqual([expect.objectContaining({ image: expect.stringContaining('data:image/png;base64,'), quantity: 1 })]);
  });

  it('keeps the resolver active until reading finishes and opens the parsed logo only once', async () => {
    mocks.category = 'logos';
    const read = vi.spyOn(FileReader.prototype, 'readAsDataURL').mockImplementation(() => {});
    const { result } = renderHook(useLabelPrintingState);
    let first!: Promise<unknown>;
    await act(async () => { first = result.current.handleLogoUpload(event(image())); });
    await act(async () => { await result.current.handleLogoUpload(event(image())); });
    expect(read).toHaveBeenCalledTimes(1);
    const reader = read.mock.contexts[0] as FileReader;
    await act(async () => { Object.defineProperty(reader, 'result', { value: 'data:image/png;base64,logo' }); reader.dispatchEvent(new Event('load')); await first; });
    expect(mocks.setName).toHaveBeenCalledWith('LOGO');
    expect(mocks.setImage).toHaveBeenCalledWith('data:image/png;base64,logo');
    expect(mocks.openLogo).toHaveBeenCalledTimes(1);
  });

  it('aborts a category change before applying a late image', async () => {
    const read = vi.spyOn(FileReader.prototype, 'readAsDataURL').mockImplementation(() => undefined);
    const abort = vi.spyOn(FileReader.prototype, 'abort');
    const { result, rerender } = renderHook(useLabelPrintingState);
    let pending!: Promise<unknown>;
    await act(async () => { pending = result.current.handleLogoUpload(event(image())); });
    expect(result.current.imageUploading).toBe(true);
    mocks.category = 'logos'; rerender();
    const reader = read.mock.contexts[0] as FileReader;
    await act(async () => { Object.defineProperty(reader, 'result', { value: 'data:image/png;base64,late' }); reader.dispatchEvent(new Event('load')); await pending; });
    expect(result.current.imageUploading).toBe(false); expect(abort).toHaveBeenCalled();
    expect(result.current.labelItems).toEqual([]); expect(mocks.setImage).not.toHaveBeenCalled(); expect(mocks.openLogo).not.toHaveBeenCalled(); expect(mocks.error).not.toHaveBeenCalled();
  });

  it('releases an expired read without publishing late effects', async () => {
    const read = vi.spyOn(FileReader.prototype, 'readAsDataURL').mockImplementation(() => undefined);
    const { result } = renderHook(useLabelPrintingState); vi.useFakeTimers();
    let pending!: Promise<unknown>;
    await act(async () => { pending = result.current.handleLogoUpload(event(image())); });
    await act(async () => { await vi.advanceTimersByTimeAsync(10_000); await pending; });
    expect(result.current.imageUploading).toBe(false); expect(result.current.imageUploadError).toContain('leitura demorou');
    const reader = read.mock.contexts[0] as FileReader;
    await act(async () => { Object.defineProperty(reader, 'result', { value: 'data:image/png;base64,late' }); reader.dispatchEvent(new Event('load')); });
    expect(result.current.labelItems).toEqual([]); expect(mocks.setImage).not.toHaveBeenCalled();
  });

  it('does not publish after unmount', async () => {
    const read = vi.spyOn(FileReader.prototype, 'readAsDataURL').mockImplementation(() => undefined);
    const { result, unmount } = renderHook(useLabelPrintingState);
    let pending!: Promise<unknown>;
    await act(async () => { pending = result.current.handleLogoUpload(event(image())); });
    unmount();
    const reader = read.mock.contexts[0] as FileReader;
    await act(async () => { Object.defineProperty(reader, 'result', { value: 'data:image/png;base64,late' }); reader.dispatchEvent(new Event('load')); await pending; });
    expect(mocks.setImage).not.toHaveBeenCalled(); expect(mocks.openLogo).not.toHaveBeenCalled(); expect(mocks.error).not.toHaveBeenCalled();
  });
});
