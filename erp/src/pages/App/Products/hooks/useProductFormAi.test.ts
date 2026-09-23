// @vitest-environment jsdom
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { useProductFormAi } from './useProductFormAi';
import { aiService } from '@/pages/utils/aiService';
import type { NcmAiSuggestion } from '@/pages/utils/aiService/aiFiscalClassificationService';

vi.mock('@/pages/utils/aiService', () => ({ aiService: { findNCM: vi.fn() } }));
vi.mock('@/pages/utils/settingsService', () => ({ getSettings: vi.fn() }));
vi.mock('react-toastify', () => ({ toast: { warning: vi.fn(), success: vi.fn(), error: vi.fn() } }));

const complete = { name: 'Mesa', title: 'Mesa', description: 'Mesa de madeira', categoryIds: ['mesa'] };
const categories = [{ id: 'mesa', name: 'Mesas' }];
const mockNcmSuggestion: NcmAiSuggestion = {
    ncm: '94036000', description: 'Mesa', confidence: 0.8,
    materialDetermination: 'informado', needsReview: true,
    reviewReason: 'Confirme a classificação fiscal.',
};
const advance = () => act(async () => { await vi.advanceTimersByTimeAsync(1100); });
beforeEach(() => { vi.useFakeTimers(); vi.mocked(aiService.findNCM).mockResolvedValue(mockNcmSuggestion); });
afterEach(() => { cleanup(); vi.useRealTimers(); });

it('começa ligado, aguarda descrição e não repete a mesma tentativa', async () => {
    const setData = vi.fn();
    const { result, rerender } = renderHook(({ description }) =>
        useProductFormAi({ ...complete, description }, setData, categories),
    { initialProps: { description: '' } });
    expect(result.current.isNcmAutoEnabled).toBe(true);
    await advance();
    expect(aiService.findNCM).not.toHaveBeenCalled();
    rerender({ description: complete.description });
    await advance();
    expect(aiService.findNCM).toHaveBeenCalledTimes(1);
    await advance();
    expect(aiService.findNCM).toHaveBeenCalledTimes(1);
});

it('desliga e solicita nova sugestão ao religar mesmo com NCM preenchido', async () => {
    const { result } = renderHook(() => useProductFormAi({ ...complete, fiscal: { ncm: '94036000' } }, vi.fn(), categories));
    act(() => result.current.toggleNcmAuto());
    await advance();
    expect(aiService.findNCM).not.toHaveBeenCalled();
    act(() => result.current.toggleNcmAuto());
    await advance();
    expect(aiService.findNCM).toHaveBeenCalledTimes(1);
    act(() => result.current.toggleNcmAuto());
    act(() => result.current.toggleNcmAuto());
    await advance();
    expect(aiService.findNCM).toHaveBeenCalledTimes(2);
});

it('descarta resposta em andamento depois de desligar', async () => {
    let resolve!: (value: NcmAiSuggestion) => void;
    vi.mocked(aiService.findNCM).mockReturnValue(new Promise(done => { resolve = done; }));
    const setData = vi.fn();
    const { result } = renderHook(() => useProductFormAi(complete, setData, categories));
    await advance();
    act(() => result.current.toggleNcmAuto());
    await act(async () => { resolve(mockNcmSuggestion); });
    expect(setData).not.toHaveBeenCalled();
});

it('não gera com formulário fechado e volta ligado ao abrir', async () => {
    const { result, rerender } = renderHook(({ open }) => useProductFormAi(complete, vi.fn(), categories, false, open), { initialProps: { open: false } });
    await advance();
    expect(aiService.findNCM).not.toHaveBeenCalled();
    rerender({ open: true });
    expect(result.current.isNcmAutoEnabled).toBe(true);
    await advance();
    expect(aiService.findNCM).toHaveBeenCalledTimes(1);
});

it('mantém NCM da IA como sugestão até a confirmação humana', async () => {
    const setData = vi.fn();
    vi.mocked(aiService.findNCM).mockResolvedValue({
        ncm: '94036000', description: 'Outros móveis de madeira', confidence: 0.8,
        materialDetermination: 'presumido', needsReview: true,
        reviewReason: 'Confirme o material real.',
    });
    const { result } = renderHook(() => useProductFormAi(complete, setData, categories));
    await advance();
    expect(result.current.ncmSuggestion?.ncm).toBe('94036000');
    expect(setData).not.toHaveBeenCalled();

    act(() => result.current.acceptNcmSuggestion());
    expect(setData).toHaveBeenCalledTimes(1);
    const update = setData.mock.calls[0][0];
    expect(update(complete).fiscal.ncm).toBe('94036000');
});
