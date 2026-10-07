// @vitest-environment jsdom
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useInboundInvoiceSuggestions } from './useInboundInvoiceSuggestions';
import { rankAndScoreDeterministic } from '@/pages/utils/inboundNfe/services/inboundDeterministicScorer';
import { fetchSupplierProductsForContext } from '@/pages/utils/inboundNfe/inboundSupplierProductContext';
import type { InboundInvoiceItem } from '@/pages/utils/inboundNfe/inboundNfeTypes';

vi.mock('@/pages/utils/inboundNfe/services/inboundDeterministicScorer', () => ({
  InboundDeterministicScorerContext: class {
    constructor(public products: any[]) {}
  },
  rankAndScoreDeterministic: vi.fn(),
}));

vi.mock('@/pages/utils/inboundNfe/inboundSupplierProductContext', () => ({
  fetchSupplierProductsForContext: vi.fn(async () => [
    { id: 'p1', name: 'Beliche Rubim', variations: [{ id: 'v1', name: 'Rubim Branco' }] },
  ]),
}));

vi.mock('react-toastify', () => ({
  toast: { error: vi.fn(), warning: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

const item = {
  itemNumber: 1,
  productDescription: 'BEL RUBIM BR',
  productCode: 'FORN1',
} as InboundInvoiceItem;

const candidate = {
  productId: 'p1',
  variationId: 'v1',
  displayName: 'Rubim Branco',
  confidence: 95,
  reason: 'Mesmo modelo e cor',
  matches: ['modelo', 'cor'],
  divergences: [],
};

describe('useInboundInvoiceSuggestions', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.mocked(rankAndScoreDeterministic).mockReturnValue({
      topCandidate: candidate,
      candidates: [candidate],
    } as unknown as ReturnType<typeof rankAndScoreDeterministic>);
    vi.mocked(fetchSupplierProductsForContext).mockResolvedValue([
      { id: 'p1', name: 'Beliche Rubim', variations: [{ id: 'v1', name: 'Rubim Branco' }] },
    ] as unknown as Awaited<ReturnType<typeof fetchSupplierProductsForContext>>);
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  const advance = () =>
    act(async () => {
      await vi.advanceTimersByTimeAsync(200);
    });

  it('consulta itens e gera sugestões determinísticas quando há fornecedor', async () => {
    const entries = [{ ...item, itemNumber: 1 }, { ...item, itemNumber: 2 }];
    const { result } = renderHook(() =>
      useInboundInvoiceSuggestions({ items: entries, supplierId: 's1' })
    );

    await advance();
    expect(fetchSupplierProductsForContext).toHaveBeenCalledWith('s1');
    expect(rankAndScoreDeterministic).toHaveBeenCalledTimes(2);
    expect(result.current.suggestionFor(entries[0])?.variationId).toBe('v1');
    expect(result.current.suggestionFor(entries[1])?.variationId).toBe('v1');
  });

  it('sugere apenas itens sem vínculo e permite rejeitar sugestão', async () => {
    const linked = { ...item, itemNumber: 2, matchedProductId: 'p1' };
    const { result, rerender } = renderHook(() =>
      useInboundInvoiceSuggestions({ items: [item, linked], supplierId: 's1' })
    );

    await advance();
    expect(result.current.suggestionFor(item)?.variationId).toBe('v1');
    expect(result.current.suggestionFor(linked)).toBeUndefined();

    // Rejeitar sugestão
    act(() => result.current.rejectSuggestion(item));
    expect(result.current.suggestionFor(item)).toBeUndefined();

    // Re-render não deve pesquisar item rejeitado
    rerender();
    await advance();
    expect(result.current.suggestionFor(item)).toBeUndefined();
  });

  it('rejeita sugestão e o botão de retry limpa as rejeições para reprocessar', async () => {
    const { result } = renderHook(() =>
      useInboundInvoiceSuggestions({ items: [item], supplierId: 's1' })
    );
    await advance();
    expect(result.current.suggestionFor(item)?.variationId).toBe('v1');

    act(() => result.current.rejectSuggestion(item));
    expect(result.current.suggestionFor(item)).toBeUndefined();

    act(() => result.current.retrySuggestions());
    await advance();
    expect(result.current.suggestionFor(item)?.variationId).toBe('v1');
  });

  it('não busca sugestão nem processa se nenhum fornecedor estiver selecionado e limpa ao remover fornecedor', async () => {
    const { result, rerender } = renderHook(
      ({ supplierId }: { supplierId?: string }) =>
        useInboundInvoiceSuggestions({ items: [item], supplierId }),
      { initialProps: { supplierId: undefined as string | undefined } }
    );
    await advance();
    expect(fetchSupplierProductsForContext).not.toHaveBeenCalled();
    expect(result.current.isProcessingSuggestions).toBe(false);
    expect(result.current.suggestionFor(item)).toBeUndefined();

    // Ao selecionar fornecedor, busca
    rerender({ supplierId: 's1' });
    await advance();
    expect(fetchSupplierProductsForContext).toHaveBeenCalledTimes(1);
    expect(result.current.suggestionFor(item)?.variationId).toBe('v1');

    // Ao remover fornecedor, limpa as sugestões
    rerender({ supplierId: undefined });
    expect(result.current.suggestionFor(item)).toBeUndefined();
    expect(result.current.isProcessingSuggestions).toBe(false);
  });

  it('não exibe sugestão quando rankAndScoreDeterministic não encontra candidato', async () => {
    vi.mocked(rankAndScoreDeterministic).mockReturnValue({
      topCandidate: undefined,
      candidates: [],
    } as unknown as ReturnType<typeof rankAndScoreDeterministic>);
    const { result } = renderHook(() =>
      useInboundInvoiceSuggestions({ items: [item], supplierId: 's1' })
    );
    await advance();
    expect(result.current.suggestionFor(item)).toBeUndefined();
    expect(result.current.isProcessingSuggestions).toBe(false);
  });

  it('lida com falha de rede ao buscar produtos do fornecedor', async () => {
    vi.mocked(fetchSupplierProductsForContext).mockRejectedValueOnce(new Error('Network error'));
    const { result } = renderHook(() =>
      useInboundInvoiceSuggestions({ items: [item], supplierId: 's1' })
    );
    await advance();
    expect(result.current.suggestionFor(item)).toBeUndefined();
    expect(result.current.isProcessingSuggestions).toBe(false);
  });
});
