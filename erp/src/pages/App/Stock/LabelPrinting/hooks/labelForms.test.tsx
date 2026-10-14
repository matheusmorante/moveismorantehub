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
