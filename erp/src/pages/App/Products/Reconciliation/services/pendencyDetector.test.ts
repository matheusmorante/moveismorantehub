import { describe, it, expect } from 'vitest';
import { detectProductPendencies, calculateReconciliationSummary } from './pendencyDetector';
import { RequiredCategoryAttribute } from '../types/reconciliation.types';

describe('pendencyDetector', () => {
    const mockCategoryAttributes: RequiredCategoryAttribute[] = [
        {
            categoryId: 'cat-wardrobe',
            attributeId: 'attr-doors',
            isRequired: true,
            attribute: {
                id: 'attr-doors',
                name: 'Quantidade de Portas',
                data_type: 'integer'
            }
        },
        {
            categoryId: 'cat-wardrobe',
            attributeId: 'attr-material',
            isRequired: true,
            attribute: {
                id: 'attr-material',
                name: 'Material',
                data_type: 'list'
            }
        }
    ];

    it('identifica pendências críticas no produto pai (fornecedor, categoria, NCM, preço)', () => {
        const product = {
            id: 'prod-1',
            name: 'Armário Sem Dados',
            variations: []
        };

        const result = detectProductPendencies(product, mockCategoryAttributes);

        expect(result.hasParentPendencies).toBe(true);
        expect(result.pendencies.some(p => p.type === 'supplier')).toBe(true);
        expect(result.pendencies.some(p => p.type === 'category')).toBe(true);
        expect(result.pendencies.some(p => p.type === 'ncm')).toBe(true);
        expect(result.pendencies.some(p => p.type === 'price')).toBe(true);
    });

    it('identifica atributos obrigatórios de categoria faltando nas variações', () => {
        const product = {
            id: 'prod-2',
            name: 'Guarda-Roupa Briz',
            category: 'Guarda-Roupas',
            categoryId: 'cat-wardrobe',
            mainSupplierId: 'supp-1',
            price: 899.90,
            fiscal: { ncm: '9403.50.00' },
            variations: [
                {
                    id: 'var-1',
                    sku: 'BRIZ-01',
                    name: 'Guarda-Roupa Briz Branco',
                    attributes: [{ name: 'Cor', value: 'Branco' }]
                },
                {
                    id: 'var-2',
                    sku: 'BRIZ-02',
                    name: 'Guarda-Roupa Briz Nature',
                    attributes: [
                        { name: 'Cor', value: 'Nature' },
                        { name: 'Quantidade de Portas', value: '4' },
                        { name: 'Material', value: 'MDP' }
                    ]
                }
            ]
        };

        const result = detectProductPendencies(product, mockCategoryAttributes);

        // var-1 está sem 'Quantidade de Portas' e 'Material'
        // var-2 está 100% preenchida
        expect(result.hasParentPendencies).toBe(false);
        expect(result.hasVariationPendencies).toBe(true);

        const var1Pendencies = result.pendencies.filter(p => p.variationId === 'var-1');
        expect(var1Pendencies.length).toBe(2);
        expect(var1Pendencies.some(p => p.attributeName === 'Quantidade de Portas')).toBe(true);
        expect(var1Pendencies.some(p => p.attributeName === 'Material')).toBe(true);
    });

    it('sinaliza atalho de herança no pai quando TODAS as variações estão sem o atributo obrigatório', () => {
        const product = {
            id: 'prod-3',
            name: 'Guarda-Roupa 3 Portas',
            category: 'Guarda-Roupas',
            categoryId: 'cat-wardrobe',
            mainSupplierId: 'supp-1',
            price: 799.00,
            fiscal: { ncm: '9403.50.00' },
            variations: [
                { id: 'v-1', sku: 'G-01', name: 'Branco', attributes: [{ name: 'Cor', value: 'Branco' }] },
                { id: 'v-2', sku: 'G-02', name: 'Preto', attributes: [{ name: 'Cor', value: 'Preto' }] },
                { id: 'v-3', sku: 'G-03', name: 'Carvalho', attributes: [{ name: 'Cor', value: 'Carvalho' }] }
            ]
        };

        const result = detectProductPendencies(product, mockCategoryAttributes);

        // Como todas as 3 variações estão sem 'Material', deve existir uma pendência no pai com resolvesVariationsCount = 3
        const sharedMaterial = result.pendencies.find(
            p => p.level === 'parent' && p.attributeName === 'Material'
        );
        expect(sharedMaterial).toBeDefined();
        expect(sharedMaterial?.resolvesVariationsCount).toBe(3);
    });

    it('não gera nenhuma pendência se o produto e suas variações forem totalmente válidos', () => {
        const product = {
            id: 'prod-4',
            name: 'Mesa de Centro',
            category: 'Mesas',
            categoryId: 'cat-mesas',
            mainSupplierId: 'supp-2',
            price: 250.00,
            fiscal: { ncm: '9403.60.00' },
            variations: [
                {
                    id: 'v-1',
                    sku: 'MC-01',
                    name: 'Mesa de Centro Madeira',
                    attributes: [{ name: 'Acabamento', value: 'Verniz' }]
                }
            ]
        };

        const result = detectProductPendencies(product, []);

        expect(result.pendencies.length).toBe(0);
        expect(result.hasParentPendencies).toBe(false);
        expect(result.hasVariationPendencies).toBe(false);
    });

    it('passa a sinalizar produto existente quando a Categoria recebe novo atributo obrigatório e remove a pendência após o preenchimento', () => {
        const product = {
            id: 'prod-existing',
            name: 'Guarda-Roupa Existente',
            category: 'Guarda-Roupas',
            categoryId: 'cat-wardrobe',
            mainSupplierId: 'supp-1',
            price: 999,
            fiscal: { ncm: '9403.50.00' },
            variations: [
                {
                    id: 'var-existing',
                    sku: 'GR-01',
                    name: 'Guarda-Roupa Existente Branco',
                    attributes: [{ name: 'Quantidade de Portas', value: '6' }]
                }
            ]
        };

        const beforeCorrection = detectProductPendencies(product, mockCategoryAttributes);
        expect(beforeCorrection.pendencies).toEqual(expect.arrayContaining([
            expect.objectContaining({
                type: 'category_attribute',
                variationId: 'var-existing',
                attributeName: 'Material'
            })
        ]));

        const correctedProduct = {
            ...product,
            variations: [{
                ...product.variations[0],
                attributes: [...product.variations[0].attributes, { name: 'Material', value: 'MDF' }]
            }]
        };
        const afterCorrection = detectProductPendencies(correctedProduct, mockCategoryAttributes);
        expect(afterCorrection.pendencies.some(
            pendency => pendency.type === 'category_attribute' && pendency.attributeName === 'Material'
        )).toBe(false);
    });

    it('remover a obrigatoriedade não apaga nem altera valores existentes nas variações', () => {
        const product = {
            id: 'prod-history',
            name: 'Guarda-Roupa Histórico',
            category: 'Guarda-Roupas',
            categoryId: 'cat-wardrobe',
            mainSupplierId: 'supp-1',
            price: 799,
            fiscal: { ncm: '9403.50.00' },
            variations: [{
                id: 'var-history',
                sku: 'GR-HIST-01',
                name: 'Guarda-Roupa Histórico',
                attributes: [{ name: 'Material', value: 'MDF' }]
            }]
        };
        const originalAttributes = structuredClone(product.variations[0].attributes);

        const result = detectProductPendencies(product, []);

        expect(result.pendencies.some(pendency => pendency.type === 'category_attribute')).toBe(false);
        expect(product.variations[0].attributes).toEqual(originalAttributes);
    });

    it('calcula o resumo e contadores de chips corretamente', () => {
        const p1 = {
            id: 'p-1',
            name: 'Produto 1',
            variations: [],
            pendencies: [
                { id: '1', type: 'supplier' as const, level: 'parent' as const, field: 'supplier', label: 'Fornecedor', isCritical: true },
                { id: '2', type: 'ncm' as const, level: 'parent' as const, field: 'ncm', label: 'NCM', isCritical: true }
            ],
            hasParentPendencies: true,
            hasVariationPendencies: false
        };

        const p2 = {
            id: 'p-2',
            name: 'Produto 2',
            variations: [],
            pendencies: [
                { id: '3', type: 'category_attribute' as const, level: 'variation' as const, field: 'attr', label: 'Portas', isCritical: false }
            ],
            hasParentPendencies: false,
            hasVariationPendencies: true
        };

        const summary = calculateReconciliationSummary([p1, p2]);

        expect(summary.totalPendingProducts).toBe(2);
        expect(summary.totalPendencies).toBe(3);
        expect(summary.totalCritical).toBe(2);
        expect(summary.chipCounts.supplier).toBe(1);
        expect(summary.chipCounts.ncm).toBe(1);
        expect(summary.chipCounts.attributes).toBe(1);
        expect(summary.chipCounts.all).toBe(3);
    });
});
