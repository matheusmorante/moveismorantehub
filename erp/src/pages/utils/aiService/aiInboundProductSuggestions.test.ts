import { expect, it, vi } from 'vitest';
import { suggestInboundProducts, validateInboundCandidates } from './aiInboundProductSuggestions';
import { callGeminiDirect } from './aiDirectClient';
import type { InboundInvoiceItem } from '../inboundNfe/inboundNfeTypes';
vi.mock('./aiDirectClient', () => ({ callGeminiDirect: vi.fn() }));
const products = [{ id: 'madrid', name: 'Guarda Roupa Madrid 6 Portas 2 Gavetas Freijó', variations: [{ id: 'freijo', name: 'Madrid Freijó', attributes: { Cor: 'Freijó' } }] }];
const candidate = { productId: 'madrid', variationId: 'freijo', confidence: 96, reason: 'Mesmo modelo, portas, gavetas e cor', matches: ['Madrid', '6 portas', '2 gavetas', 'Freijó'], divergences: [] };

it('envia as regras semânticas e os dados disponíveis ao Gemini', async () => {
    vi.mocked(callGeminiDirect).mockResolvedValue(JSON.stringify({ candidates: [candidate] }));
    const result = await suggestInboundProducts({ productDescription: 'ROUPEIRO 6P 2G MADRID FREIJO', productCode: 'FORN-01' } as InboundInvoiceItem, products);
    const prompt = vi.mocked(callGeminiDirect).mock.calls[0][0];
    expect(prompt).toContain('Características incompatíveis');
    expect(prompt).toContain('ERP pode possuir códigos próprios diferentes');
    expect(prompt).toContain('ROUPEIRO 6P 2G MADRID FREIJO');
    expect(result[0]).toMatchObject({ confidence: 96, matches: candidate.matches, divergences: [] });
});

it('descarta candidatos inventados e confiança fraca ou fora da escala', () => {
    expect(validateInboundCandidates({ candidates: [
        { ...candidate, productId: 'inexistente' }, { ...candidate, variationId: 'inexistente' },
        { ...candidate, confidence: 59 }, { ...candidate, confidence: 101 },
    ] }, products)).toEqual([]);
});

it('preserva divergências e pontuação de conferência sem promover a alta confiança', () => {
    const result = validateInboundCandidates({ candidates: [{ ...candidate, confidence: 65, divergences: ['Medida informada na NF difere do cadastro'] }] }, products);
    expect(result[0].confidence).toBe(65);
    expect(result[0].divergences).toHaveLength(1);
});
