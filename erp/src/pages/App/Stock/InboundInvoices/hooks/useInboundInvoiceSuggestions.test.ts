// @vitest-environment jsdom
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { useInboundInvoiceSuggestions } from './useInboundInvoiceSuggestions';
import { suggestInboundProducts } from '@/pages/utils/aiService/aiInboundProductSuggestions';
import type { InboundInvoiceItem } from '@/pages/utils/inboundNfe/inboundNfeTypes';

vi.mock('@/pages/utils/aiService/aiInboundProductSuggestions', () => ({ suggestInboundProducts: vi.fn() }));
vi.mock('@/pages/utils/inboundNfe/inboundSupplierProductContext', () => ({
    fetchSupplierProductsForContext: async () => [{ id: 'p1', name: 'Beliche Rubim', variations: [{ id: 'v1', name: 'Rubim Branco' }] }],
    buildSupplierContextSummary: () => 'Beliche Rubim [p1] Branco [v1]',
}));
vi.mock('react-toastify', () => ({ toast: { error: vi.fn() } }));
const item = { itemNumber: 1, productDescription: 'BEL RUBIM BR', productCode: 'FORN1' } as InboundInvoiceItem;
const answer = [{ productId: 'p1', variationId: 'v1', displayName: 'Rubim Branco', confidence: 95, reason: 'Mesmo modelo e cor', matches: ['modelo', 'cor'], divergences: [] }];
beforeEach(() => { vi.useFakeTimers(); vi.mocked(suggestInboundProducts).mockResolvedValue(answer); });
afterEach(() => { cleanup(); vi.useRealTimers(); });
const advance = () => act(async () => { await vi.advanceTimersByTimeAsync(650); });

it('sugere apenas itens sem vínculo, sem vinculá-los automaticamente ou repetir chamadas', async () => {
    const linked = { ...item, itemNumber: 2, matchedProductId: 'p1' };
    const { result, rerender } = renderHook(() => useInboundInvoiceSuggestions({ items: [item, linked], supplierId: 's1' }));
    await advance();
    expect(result.current.suggestionFor(item)?.variationId).toBe('v1');
    expect(result.current.suggestionFor(linked)).toBeUndefined();
    expect(item.matchedProductId).toBeUndefined();
    rerender(); await advance();
    expect(suggestInboundProducts).toHaveBeenCalledTimes(1);
    act(() => result.current.rejectSuggestion(item));
    expect(result.current.suggestionFor(item)).toBeUndefined();
    await advance();
    expect(suggestInboundProducts).toHaveBeenCalledTimes(1);
});

it('mantém o processamento ativo até a IA responder', async () => {
    let resolve!: (value: typeof answer) => void;
    vi.mocked(suggestInboundProducts).mockReturnValue(new Promise(done => { resolve = done; }));
    const { result } = renderHook(() => useInboundInvoiceSuggestions({ items: [item], supplierId: 's1' }));
    await advance();
    expect(result.current.isProcessingSuggestions).toBe(true);
    await act(async () => { resolve(answer); });
    expect(result.current.isProcessingSuggestions).toBe(false);
});

it('não exibe sugestões quando o serviço rejeita os candidatos', async () => {
    vi.mocked(suggestInboundProducts).mockResolvedValue([]);
    const { result } = renderHook(() => useInboundInvoiceSuggestions({ items: [item], supplierId: 's1' }));
    await advance();
    expect(result.current.suggestionFor(item)).toBeUndefined();
});

it('limpa sugestões visíveis ao mudar fornecedor e consulta o novo contexto', async () => {
    const { result, rerender } = renderHook(({ supplierId }) => useInboundInvoiceSuggestions({ items: [item], supplierId }), { initialProps: { supplierId: 's1' } });
    await advance();
    rerender({ supplierId: 's2' });
    expect(result.current.suggestionFor(item)).toBeUndefined();
    await advance();
    expect(suggestInboundProducts).toHaveBeenCalledTimes(2);
});

it('aguarda a verificação dos vínculos e não anima itens já vinculados', async () => {
    const { result, rerender } = renderHook(({ enabled, linked }) => useInboundInvoiceSuggestions({
        items: [{ ...item, matchedProductId: linked ? 'p1' : undefined }], supplierId: 's1', enabled,
    }), { initialProps: { enabled: false, linked: false } });
    await advance();
    expect(result.current.isItemProcessing(item)).toBe(false);
    expect(suggestInboundProducts).not.toHaveBeenCalled();
    rerender({ enabled: true, linked: true });
    await advance();
    expect(result.current.isProcessingSuggestions).toBe(false);
    expect(suggestInboundProducts).not.toHaveBeenCalled();
});

it('encerra sem sugestão quando não há correspondência e não consulta novamente ao renderizar', async () => {
    vi.mocked(suggestInboundProducts).mockResolvedValue([]);
    const { result, rerender } = renderHook(() => useInboundInvoiceSuggestions({ items: [item], supplierId: 's1' }));
    await advance();
    expect(result.current.isProcessingSuggestions).toBe(false);
    expect(result.current.isItemProcessing(item)).toBe(false);
    expect(result.current.suggestionFor(item)).toBeUndefined();
    rerender(); await advance();
    expect(suggestInboundProducts).toHaveBeenCalledTimes(1);
});

it('libera todos os campos em vinte segundos e ignora respostas tardias', async () => {
    let finish!: (value: typeof answer) => void;
    vi.mocked(suggestInboundProducts).mockReturnValue(new Promise(resolve => { finish = resolve; }));
    const second = { ...item, itemNumber: 2 };
    const { result } = renderHook(() => useInboundInvoiceSuggestions({ items: [item, second], supplierId: 's1' }));
    await advance();
    expect(result.current.isItemProcessing(item)).toBe(true);
    await act(async () => { await vi.advanceTimersByTimeAsync(19349); });
    expect(result.current.isProcessingSuggestions).toBe(true);
    await act(async () => { await vi.advanceTimersByTimeAsync(100); });
    expect(result.current.isProcessingSuggestions).toBe(false);
    expect(result.current.suggestionFor(item)).toBeUndefined();
    expect(result.current.isItemProcessing(second)).toBe(false);
    await act(async () => { finish(answer); });
    expect(result.current.suggestionFor(item)).toBeUndefined();
    expect(suggestInboundProducts).toHaveBeenCalledTimes(1);
});

it('o botão reinicia a consulta dos itens sem vínculo, inclusive sugestões recusadas', async () => {
    const linked = { ...item, itemNumber: 2, matchedProductId: 'p1' };
    const { result } = renderHook(() => useInboundInvoiceSuggestions({ items: [item, linked], supplierId: 's1' }));
    await advance();
    act(() => result.current.rejectSuggestion(item));
    expect(result.current.suggestionFor(item)).toBeUndefined();
    act(() => result.current.retrySuggestions());
    expect(result.current.isItemProcessing(item)).toBe(true);
    await advance();
    expect(suggestInboundProducts).toHaveBeenCalledTimes(2);
    expect(result.current.suggestionFor(item)?.variationId).toBe('v1');
    expect(result.current.suggestionFor(linked)).toBeUndefined();
});

it('não busca sugestão nem processa se nenhum fornecedor estiver selecionado e limpa ao remover fornecedor', async () => {
    const { result, rerender } = renderHook(
        ({ supplierId }: { supplierId?: string }) => useInboundInvoiceSuggestions({ items: [item], supplierId }),
        { initialProps: { supplierId: undefined as string | undefined } }
    );
    await advance();
    expect(suggestInboundProducts).not.toHaveBeenCalled();
    expect(result.current.isProcessingSuggestions).toBe(false);
    expect(result.current.isItemProcessing(item)).toBe(false);
    expect(result.current.suggestionFor(item)).toBeUndefined();

    // Chamada manual de retry não deve fazer nada sem fornecedor
    act(() => result.current.retrySuggestions());
    await advance();
    expect(suggestInboundProducts).not.toHaveBeenCalled();

    // Ao selecionar fornecedor, aí sim começa a buscar
    rerender({ supplierId: 's1' });
    await advance();
    expect(suggestInboundProducts).toHaveBeenCalledTimes(1);
    expect(result.current.suggestionFor(item)?.variationId).toBe('v1');

    // Ao desselecionar o fornecedor, limpa as sugestões existentes
    rerender({ supplierId: undefined });
    expect(result.current.suggestionFor(item)).toBeUndefined();
    expect(result.current.isProcessingSuggestions).toBe(false);
});

