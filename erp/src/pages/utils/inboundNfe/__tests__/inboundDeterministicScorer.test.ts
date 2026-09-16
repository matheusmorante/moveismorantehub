import { describe, it, expect } from 'vitest';
import { 
    InboundDeterministicScorerContext, 
    rankAndScoreDeterministic,
    normalizeProductName,
    extractFeatures,
} from '../services/inboundDeterministicScorer';
import type { SupplierProductSummary } from '../inboundSupplierProductContext';

describe('InboundDeterministicScorer', () => {
    
    // Helper para gerar catálogo mock
    const createCatalog = (products: { id: string, name: string }[]): SupplierProductSummary[] => {
        return products.map(p => ({
            id: p.id,
            name: p.name,
            code: '',
            price: 0,
            variations: []
        }));
    };

    it('Caso 1 — NEW XANGAI vs MONTEVIDEO (Identidade Divergente - Montevideo Reprovado)', () => {
        const catalog = createCatalog([
            { id: 'MONTEVIDEO', name: 'Guarda Roupa Doripel Montevideo 6 Portas 2 Gavetas' }
        ]);
        const context = new InboundDeterministicScorerContext(catalog);
        const result = rankAndScoreDeterministic('G ROUPA DORIPEL NEW XANGAI 6PT 2GV MDF 68600-72 OFF WHITE/NOGUEIRA', undefined, context);
        
        // Montevideo deve receber penalidade muito forte por ser de outro modelo (divergência de termos distintivos)
        // Score deve ser baixo o suficiente para ser ignorado (< 60) ou muito inferior.
        if (result.candidates.length > 0) {
            expect(result.candidates[0].confidence).toBeLessThan(60);
        } else {
            expect(result.candidates.length).toBe(0);
        }
    });

    it('Caso 2 — TESTE — MODELO CORRETO', () => {
        const catalog = createCatalog([
            { id: 'NEW_XANGAI', name: 'Guarda Roupa Doripel New Xangai 6 Portas 2 Gavetas Off White Nogueira' }
        ]);
        const context = new InboundDeterministicScorerContext(catalog);
        const result = rankAndScoreDeterministic('G ROUPA DORIPEL NEW XANGAI 6PT 2GV MDF OFF WHITE/NOGUEIRA', undefined, context);
        
        expect(result.candidates.length).toBe(1);
        expect(result.candidates[0].productId).toBe('NEW_XANGAI');
        expect(result.candidates[0].confidence).toBeGreaterThanOrEqual(70); // Score muito alto, TOP 1
    });

    it('Caso 3 — TESTE — MODELO CERTO, COR DIFERENTE', () => {
        const catalog = createCatalog([
            { id: 'A', name: 'New Xangai 6 Portas 2 Gavetas Off White' },
            { id: 'B', name: 'New Xangai 6 Portas 2 Gavetas Cinza' }
        ]);
        const context = new InboundDeterministicScorerContext(catalog);
        const result = rankAndScoreDeterministic('NEW XANGAI 6PT 2GV OFF WHITE', undefined, context);
        
        expect(result.candidates.length).toBe(2);
        expect(result.candidates[0].productId).toBe('A'); // A > B
        expect(result.candidates[1].productId).toBe('B');
        
        // A diferença deve ser pela cor (+6 para o certo, -15 para o errado)
        expect(result.candidates[0].confidence).toBeGreaterThan(result.candidates[1].confidence);
    });

    it('Caso 4 — TESTE — MODELO CERTO, PORTAS DIFERENTES', () => {
        const catalog = createCatalog([
            { id: 'A', name: 'New Xangai 6 Portas 2 Gavetas' },
            { id: 'B', name: 'New Xangai 4 Portas 2 Gavetas' }
        ]);
        const context = new InboundDeterministicScorerContext(catalog);
        const result = rankAndScoreDeterministic('NEW XANGAI 6PT 2GV', undefined, context);
        
        expect(result.candidates.length).toBeGreaterThan(0);
        expect(result.candidates[0].productId).toBe('A');
        
        // B deve estar muito abaixo por errar as portas (A >> B)
        const b = result.candidates.find(c => c.productId === 'B');
        if (b) {
            expect(result.candidates[0].confidence).toBeGreaterThan(b.confidence + 30);
        }
    });

    it('Caso 5 — TESTE — MESMOS ATRIBUTOS, MODELOS DIFERENTES', () => {
        const catalog = createCatalog([
            { id: 'A', name: 'New Xangai 6 Portas 2 Gavetas' },
            { id: 'B', name: 'Montevideo 6 Portas 2 Gavetas' },
            { id: 'C', name: 'Paris 6 Portas 2 Gavetas' }
        ]);
        const context = new InboundDeterministicScorerContext(catalog);
        const result = rankAndScoreDeterministic('NEW XANGAI 6PT 2GV', undefined, context);
        
        expect(result.candidates.length).toBeGreaterThan(0);
        expect(result.candidates[0].productId).toBe('A');
        
        const b = result.candidates.find(c => c.productId === 'B');
        const c = result.candidates.find(c => c.productId === 'C');
        
        // A >>> B e A >>> C
        if (b) expect(result.candidates[0].confidence).toBeGreaterThan(b.confidence + 40);
        if (c) expect(result.candidates[0].confidence).toBeGreaterThan(c.confidence + 40);
    });

    it('Caso 6 — TESTE — MODELO COMPOSTO (N-Grams)', () => {
        const catalog = createCatalog([
            { id: 'A', name: 'Paris Premium 6 Portas' },
            { id: 'B', name: 'Paris Standard 6 Portas' },
            { id: 'C', name: 'Milao Plus 6 Portas' },
        ]);
        const context = new InboundDeterministicScorerContext(catalog);
        const result = rankAndScoreDeterministic('PARIS PREMIUM 6PT', undefined, context);
        
        expect(result.candidates.length).toBeGreaterThan(0);
        expect(result.candidates[0].productId).toBe('A');
        expect(result.candidates[0].matches.some(m => m.includes('Termo exato: "paris premium"'))).toBe(true);
    });

    it('Caso 7 - Código do fornecedor deve alavancar o score imediatamente', () => {
        const catalog = createCatalog([
            { id: 'A', name: 'Produto X 12345' },
            { id: 'B', name: 'Produto Y 67890' }
        ]);
        const context = new InboundDeterministicScorerContext(catalog);
        
        // Descrição lixo, mas código bate perfeitamente
        const result = rankAndScoreDeterministic('Item totalmente diferente', '12345', context);
        
        expect(result.candidates.length).toBeGreaterThanOrEqual(1);
        expect(result.candidates[0].productId).toBe('A');
        expect(result.candidates[0].confidence).toBeGreaterThanOrEqual(99);
        expect(result.isConclusive).toBe(true);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// PARSER DE ATRIBUTOS QUANTITATIVOS
// Testa normalizeProductName + extractFeatures isoladamente e em integração
// ─────────────────────────────────────────────────────────────────────────────

describe('Parser de atributos quantitativos — normalização', () => {

    // ── Portas ──────────────────────────────────────────────────────────────
    it('6PT → 6 portas', () => {
        expect(normalizeProductName('6PT')).toContain('6 portas');
    });

    it('6 PT → 6 portas', () => {
        expect(normalizeProductName('6 PT')).toContain('6 portas');
    });

    it('6PTS → 6 portas', () => {
        expect(normalizeProductName('6PTS')).toContain('6 portas');
    });

    it('6 PTS → 6 portas', () => {
        expect(normalizeProductName('6 PTS')).toContain('6 portas');
    });

    it('6 PORTA → 6 portas', () => {
        expect(normalizeProductName('6 PORTA')).toContain('6 portas');
    });

    it('6 PORTAS → 6 portas (já canônico)', () => {
        expect(normalizeProductName('6 PORTAS')).toContain('6 portas');
    });

    it('6P → 6 portas', () => {
        expect(normalizeProductName('6P')).toContain('6 portas');
    });

    it('6 P → 6 portas', () => {
        expect(normalizeProductName('6 P')).toContain('6 portas');
    });

    // ── Gavetas ─────────────────────────────────────────────────────────────
    it('2GV → 2 gavetas', () => {
        expect(normalizeProductName('2GV')).toContain('2 gavetas');
    });

    it('2 GV → 2 gavetas', () => {
        expect(normalizeProductName('2 GV')).toContain('2 gavetas');
    });

    it('2GVS → 2 gavetas', () => {
        expect(normalizeProductName('2GVS')).toContain('2 gavetas');
    });

    it('2GAV → 2 gavetas', () => {
        expect(normalizeProductName('2GAV')).toContain('2 gavetas');
    });

    it('2 GAV → 2 gavetas', () => {
        expect(normalizeProductName('2 GAV')).toContain('2 gavetas');
    });

    it('2 GAVETA → 2 gavetas', () => {
        expect(normalizeProductName('2 GAVETA')).toContain('2 gavetas');
    });

    it('2 GAVETAS → 2 gavetas (já canônico)', () => {
        expect(normalizeProductName('2 GAVETAS')).toContain('2 gavetas');
    });

    // ── Prateleiras ─────────────────────────────────────────────────────────
    it('3PR → 3 prateleiras', () => {
        expect(normalizeProductName('3PR')).toContain('3 prateleiras');
    });

    it('3 PR → 3 prateleiras', () => {
        expect(normalizeProductName('3 PR')).toContain('3 prateleiras');
    });

    it('3PRAT → 3 prateleiras', () => {
        expect(normalizeProductName('3PRAT')).toContain('3 prateleiras');
    });

    it('3 PRAT → 3 prateleiras', () => {
        expect(normalizeProductName('3 PRAT')).toContain('3 prateleiras');
    });

    it('3 PRATELEIRA → 3 prateleiras', () => {
        expect(normalizeProductName('3 PRATELEIRA')).toContain('3 prateleiras');
    });

    it('3 PRATELEIRAS → 3 prateleiras (já canônico)', () => {
        expect(normalizeProductName('3 PRATELEIRAS')).toContain('3 prateleiras');
    });

    // ── Códigos/Modelos — NÃO devem ser interpretados ────────────────────
    it('3232GV → NÃO é 3232 gavetas (código de produto)', () => {
        const norm = normalizeProductName('3232GV');
        expect(norm).not.toContain('gavetas');
    });

    it('3232PT → NÃO é 3232 portas (código de produto)', () => {
        const norm = normalizeProductName('3232PT');
        expect(norm).not.toContain('portas');
    });

    it('ABC3232GV → NÃO é gavetas (código alfanumérico)', () => {
        const norm = normalizeProductName('ABC3232GV');
        expect(norm).not.toContain('gavetas');
    });

    it('MOD3232PTX → NÃO é portas (código alfanumérico com sufixo)', () => {
        const norm = normalizeProductName('MOD3232PTX');
        expect(norm).not.toContain('portas');
    });

    it('12345PR → NÃO é prateleiras (número de 5 dígitos)', () => {
        const norm = normalizeProductName('12345PR');
        expect(norm).not.toContain('prateleiras');
    });
});

describe('Parser de atributos quantitativos — extractFeatures', () => {

    it('extrai doors=6 de "6 portas"', () => {
        expect(extractFeatures(normalizeProductName('ROUPEIRO 6PT BRANCO')).doors).toBe(6);
    });

    it('extrai drawers=2 de "2GV"', () => {
        expect(extractFeatures(normalizeProductName('ARMARIO 2GV PRETO')).drawers).toBe(2);
    });

    it('extrai shelves=3 de "3PR"', () => {
        expect(extractFeatures(normalizeProductName('ESTANTE 3PR CARVALHO')).shelves).toBe(3);
    });

    it('extrai os três atributos juntos: ROUPEIRO ATHENAS 6PT 2GV 3PR BRANCO', () => {
        const f = extractFeatures(normalizeProductName('ROUPEIRO ATHENAS 6PT 2GV 3PR BRANCO'));
        expect(f.doors).toBe(6);
        expect(f.drawers).toBe(2);
        expect(f.shelves).toBe(3);
    });

    it('código 3232GV não gera drawers (undefined)', () => {
        expect(extractFeatures(normalizeProductName('MODELO 3232GV PRETO')).drawers).toBeUndefined();
    });
});

describe('Parser de atributos quantitativos — integração no ranking', () => {

    const catalog = (products: { id: string; name: string }[]) =>
        products.map(p => ({ id: p.id, name: p.name, variations: [] } as SupplierProductSummary));

    // ── Match de atributos ────────────────────────────────────────────────
    it('6PT ↔ 6 PORTAS → MATCH forte (A acima de B 4 portas)', () => {
        const ctx = new InboundDeterministicScorerContext(catalog([
            { id: 'A', name: 'Athenas 6 Portas Branco' },
            { id: 'B', name: 'Athenas 4 Portas Branco' },
        ]));
        const r = rankAndScoreDeterministic('ATHENAS 6PT BRANCO', undefined, ctx);
        expect(r.candidates[0].productId).toBe('A');
        const b = r.candidates.find(c => c.productId === 'B');
        if (b) expect(r.candidates[0].confidence).toBeGreaterThan(b.confidence + 15);
    });

    it('2GV ↔ 2 GAVETAS → MATCH forte (A acima de B 3 gavetas)', () => {
        const ctx = new InboundDeterministicScorerContext(catalog([
            { id: 'A', name: 'Athenas 6 Portas 2 Gavetas' },
            { id: 'B', name: 'Athenas 6 Portas 3 Gavetas' },
        ]));
        const r = rankAndScoreDeterministic('ATHENAS 6PT 2GV', undefined, ctx);
        expect(r.candidates[0].productId).toBe('A');
    });

    it('3PR ↔ 3 PRATELEIRAS → MATCH forte (A acima de B 5 prateleiras)', () => {
        const ctx = new InboundDeterministicScorerContext(catalog([
            { id: 'A', name: 'Estante Milano 3 Prateleiras Branco' },
            { id: 'B', name: 'Estante Milano 5 Prateleiras Branco' },
        ]));
        const r = rankAndScoreDeterministic('ESTANTE MILANO 3PR BRANCO', undefined, ctx);
        expect(r.candidates[0].productId).toBe('A');
    });

    // ── Penalidade de incompatibilidade ───────────────────────────────────
    it('6PT ↔ 4 PORTAS → penalidade forte', () => {
        const ctx = new InboundDeterministicScorerContext(catalog([
            { id: 'A', name: 'Athenas 4 Portas Branco' },
        ]));
        const r = rankAndScoreDeterministic('ATHENAS 6PT BRANCO', undefined, ctx);
        // Deve ter penalidade: confidence bem abaixo de 100 ou nem aparecer (< threshold)
        if (r.candidates.length > 0) {
            expect(r.candidates[0].confidence).toBeLessThan(85);
            expect(r.candidates[0].divergences.some(d => d.includes('portas'))).toBe(true);
        }
        // Ou simplesmente não retornar candidato nenhum (score < 60)
    });

    it('2GV ↔ 3 GAVETAS → penalidade forte', () => {
        const ctx = new InboundDeterministicScorerContext(catalog([
            { id: 'A', name: 'Athenas 6 Portas 3 Gavetas Branco' },
        ]));
        const r = rankAndScoreDeterministic('ATHENAS 6PT 2GV BRANCO', undefined, ctx);
        if (r.candidates.length > 0) {
            expect(r.candidates[0].divergences.some(d => d.includes('gavetas'))).toBe(true);
        }
    });

    // ── Ausência não penaliza ─────────────────────────────────────────────
    it('ATHENAS 6PT (sem gavetas na NF) ↔ ATHENAS 6 PORTAS 2 GAVETAS → NÃO penaliza gavetas', () => {
        const ctx = new InboundDeterministicScorerContext(catalog([
            { id: 'A', name: 'Athenas 6 Portas 2 Gavetas Branco' },
            { id: 'B', name: 'Athenas 4 Portas 2 Gavetas Branco' },
        ]));
        const r = rankAndScoreDeterministic('ATHENAS 6PT', undefined, ctx);
        // A tem 6 portas (match) e 2 gavetas (ausência → neutro)
        // B tem 4 portas (divergência) → A deve ficar na frente
        expect(r.candidates[0].productId).toBe('A');
        // Sem divergência de gavetas (gavetas não informadas na NF)
        const aResult = r.candidates.find(c => c.productId === 'A');
        if (aResult) {
            expect(aResult.divergences.some(d => d.includes('gavetas'))).toBe(false);
        }
    });
});

