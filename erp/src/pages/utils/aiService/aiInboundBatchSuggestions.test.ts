import { expect, it, vi } from 'vitest';
import { callGeminiDirect } from './aiDirectClient';
import { suggestInboundProductsBatch } from './aiInboundBatchSuggestions';
import type { InboundInvoiceItem } from '../inboundNfe/inboundNfeTypes';
vi.mock('./aiDirectClient', () => ({ callGeminiDirect: vi.fn() }));
const products = [{ id: 'comoda', name: 'Comoda Evidencia CP25', variations: [{ id: 'branco', name: 'CP251 Branco', attributes: { Cor: 'Branco' } }] }];
const items = [2, 3].map(itemNumber => ({ itemNumber, productDescription: 'COMODA EVIDENCIA CP25 Branco', productCode: '2880.1.0' } as InboundInvoiceItem));
const candidate = { productId: 'comoda', variationId: 'branco', confidence: 95, reason: 'Modelo e cor', matches: [], divergences: [] };

it('envia dois itens em uma chamada e associa respostas fora de ordem pelo número', async () => {
    vi.mocked(callGeminiDirect).mockResolvedValue(JSON.stringify({ items: [{ itemNumber: 3, candidates: [] }, { itemNumber: 2, candidates: [candidate] }] }));
    const result = await suggestInboundProductsBatch(items, products);
    expect(callGeminiDirect).toHaveBeenCalledTimes(1);
    expect(result[2][0].variationId).toBe('branco');
    expect(result[3]).toEqual([]);
    const prompt = vi.mocked(callGeminiDirect).mock.calls[0][0];
    expect(prompt).toContain('"itemNumber":2');
    expect(prompt).toContain('"itemNumber":3');
});

it('rejeita resposta que omite um item em vez de silenciosamente considerá-lo sem candidato', async () => {
    vi.mocked(callGeminiDirect).mockResolvedValue(JSON.stringify({ items: [{ itemNumber: 2, candidates: [candidate] }] }));
    await expect(suggestInboundProductsBatch(items, products)).rejects.toThrow('item 3');
});

it('não aceita IDs de produto ou variação inventados pelo Gemini', async () => {
    vi.mocked(callGeminiDirect).mockResolvedValue(JSON.stringify({ items: items.map(item => ({ itemNumber: item.itemNumber, candidates: [{ ...candidate, variationId: 'inventada' }] })) }));
    expect(await suggestInboundProductsBatch(items, products)).toEqual({ 2: [], 3: [] });
});
