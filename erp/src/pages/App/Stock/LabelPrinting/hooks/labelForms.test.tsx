// @vitest-environment happy-dom
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useLabelQueue } from './useLabelQueue';
import { createInitialLabelConfig } from '../services/labelModelMapper';
import { labelArtSnapshotSchema, labelGridModelFormSchema, labelPartialConfigFormSchema } from '../../../../../../../shared-utils/labelDesignFormSchemas';
import { useZodForm } from '@/hooks/useZodForm';
const mocks = vi.hoisted(() => ({ print: vi.fn(), generate: vi.fn(), error: vi.fn() }));
vi.mock('./useLabelPrintMode', () => ({ useLabelPrintMode: () => mocks.print }));
vi.mock('../services/inventoryLabelService', () => ({ generateInventoryLabelsBatch: mocks.generate }));
vi.mock('react-toastify', () => ({ toast: { error: mocks.error, success: vi.fn() } }));
afterEach(() => { cleanup(); vi.clearAllMocks(); });
describe('label form boundaries', () => {
  it.each([0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY])('blocks invalid quantity %s before adding a product or blank label', async (quantity) => {
    const { result } = renderHook(() => useLabelQueue({ selectedCategory: 'identificacao', config: createInitialLabelConfig(), printingMode: 'simple' }));
    await act(async () => {
      await result.current.handleProductSelect({ id: 'product', name: 'Mesa' } as never, quantity);
      await result.current.handleAddBlankLabel(quantity);
    });
    expect(result.current.labelItems).toEqual([]);
    expect(mocks.generate).not.toHaveBeenCalled();
    expect(mocks.error).toHaveBeenCalledWith('Informe uma quantidade inteira maior que zero.');
  });

  it('queues every selection from a navigation batch and preserves variation identity', async () => {
    const { result } = renderHook(() => useLabelQueue({ selectedCategory: 'identificacao', config: createInitialLabelConfig(), printingMode: 'simple' }));
    await act(async () => {
      await Promise.all([
        result.current.handleProductSelect({ id: 'product', name: 'Mesa', unitPrice: 100 } as never, 2),
        result.current.handleProductSelect({ id: 'variation', parentId: 'parent', isVariation: true, name: 'Azul', unitPrice: 150 } as never, 3),
      ]);
    });
    expect(result.current.labelItems).toEqual([
      expect.objectContaining({ productId: 'product', quantity: 2, name: 'Mesa', instances: ['000XXX', '000XXX'] }),
      expect.objectContaining({ productId: 'parent', variationId: 'variation', quantity: 3, instances: ['000XXX', '000XXX', '000XXX'] }),
    ]);
  });

  it('blocks unidentified products and variations without a parent, but accepts a blank logo', async () => {
    const { result } = renderHook(() => useLabelQueue({ selectedCategory: 'logos', config: createInitialLabelConfig(), printingMode: 'simple' }));
    await act(async () => {
      await result.current.handleProductSelect({ id: '', name: 'Mesa' } as never, 1);
      await result.current.handleProductSelect({ id: 'variation', isVariation: true, name: 'Azul' } as never, 1);
      await result.current.handleAddBlankLabel(2);
    });
    expect(result.current.labelItems).toEqual([]);
    expect(result.current.logoItems).toEqual([expect.objectContaining({ isBlank: true, quantity: 2 })]);
    expect(mocks.error).toHaveBeenCalledWith('Produto sem identificação.');
    expect(mocks.error).toHaveBeenCalledWith('Variação sem identificação do produto.');
  });

  it('blocks fractional quantities before generating identifiers or printing', async () => {
    const { result } = renderHook(() => useLabelQueue({ selectedCategory: 'identificacao', config: createInitialLabelConfig(), printingMode: 'simple' }));
    act(() => result.current.setLabelItems([{ name: 'Mesa', price: 'R$ 100', quantity: 1.5, productId: 'product' }]));
    await act(async () => { await result.current.handlePrintLabels(); });
    expect(mocks.generate).not.toHaveBeenCalled(); expect(mocks.print).not.toHaveBeenCalled(); expect(mocks.error).toHaveBeenCalled();
  });
  it('keeps valid price labels printable without generating inventory identifiers', async () => {
    const { result } = renderHook(() => useLabelQueue({ selectedCategory: 'precos', config: createInitialLabelConfig(), printingMode: 'simple' }));
    act(() => result.current.setLabelItems([{ name: 'Mesa', price: 'CONSULTE', quantity: 2 }]));
    await act(async () => { await result.current.handlePrintLabels(); });
    expect(mocks.print).toHaveBeenCalledOnce(); expect(mocks.generate).not.toHaveBeenCalled();
  });
  it('holds validation across identifier generation and preview preparation, blocking concurrent print requests', async () => {
    vi.useFakeTimers();
    try {
      let finish!: (value: string[][]) => void;
      mocks.generate.mockImplementationOnce(() => new Promise<string[][]>((resolve) => { finish = resolve; }));
      const { result } = renderHook(() => useLabelQueue({ selectedCategory: 'identificacao', config: createInitialLabelConfig(), printingMode: 'simple' }));
      act(() => result.current.setLabelItems([{ name: 'Mesa', price: 'R$ 100', quantity: 2, productId: 'product' }]));
      let first!: Promise<unknown>;
      await act(async () => { first = result.current.handlePrintLabels(); });
      await act(async () => { await result.current.handlePrintLabels(); });
      expect(mocks.generate).toHaveBeenCalledTimes(1);
      await act(async () => { finish([['label-1', 'label-2']]); });
      expect(result.current.labelItems[0].instances).toEqual(['label-1', 'label-2']);
      await act(async () => { await result.current.handlePrintLabels(); });
      expect(mocks.generate).toHaveBeenCalledTimes(1);
      expect(mocks.print).not.toHaveBeenCalled();
      await act(async () => { await vi.advanceTimersByTimeAsync(800); await first; });
      expect(mocks.print).toHaveBeenCalledTimes(1);
      expect(result.current.isPrinting).toBe(false);
    } finally { vi.useRealTimers(); }
  });
  it('does not autosave invalid artwork hidden in another price magnitude', async () => {
    const save = vi.fn();
    const { result } = renderHook(() => useZodForm(labelPartialConfigFormSchema, {}));
    await act(async () => { await result.current.validateAndRun({ artConfig: { globalSnapshot: { magnitudeTemplates: { hundreds: { titleFontSizeHundreds: Number.NaN } } } } }, save); });
    expect(save).not.toHaveBeenCalled();
    const values = { text: 'Mesa', artConfig: { globalSnapshot: { title: 'Mesa', titleFontSizeTens: 10, legacyMetadata: 'keep' } } };
    await act(async () => { await result.current.validateAndRun(values, save); });
    expect(save).toHaveBeenCalledWith(values);
  });
  it('checks grid capacity and style numbers while preserving original model metadata', () => {
    const model = { id: 'model', name: ' Grade ', columns: 2, rows: 5, marginT: 0, marginB: 0, marginL: 0, marginR: 0, gapH: 0, gapV: 0, paperSize: 'A4', icon: '', legacy: 'keep' };
    expect(labelGridModelFormSchema.parse(model)).toMatchObject({ name: 'Grade', legacy: 'keep' });
    expect(labelGridModelFormSchema.safeParse({ ...model, columns: 0 }).success).toBe(false);
    expect(labelArtSnapshotSchema.safeParse({ titlePos: { x: Number.POSITIVE_INFINITY, y: 50 } }).success).toBe(false);
  });
});
