import { describe, it, expect } from 'vitest';
import { checkERPLegibility, checkEcomLegibility } from './productLegibilityRules';
import Product from '@/pages/types/product.type';

describe('productLegibilityRules (Domínio Puro)', () => {
    it('deve reprovar produto ERP sem descrição, categoria ou fornecedor', () => {
        const product: Partial<Product> = {
            description: '',
            categoryIds: [],
            mainSupplierId: ''
        };
        const result = checkERPLegibility(product);
        expect(result.isLegible).toBe(false);
        expect(result.errors.length).toBeGreaterThanOrEqual(3);
    });

    it('deve aprovar produto ERP completo com variações', () => {
        const product: Partial<Product> = {
            description: 'Mesa de Jantar Dora',
            categoryIds: ['cat-123'],
            mainSupplierId: 'supp-456',
            hasVariations: true,
            variations: [
                { id: 'var-1', name: 'Mesa Dora Amêndoa', stock: 5, unitPrice: 890, active: true, attributes: [] } as any
            ]
        };
        const result = checkERPLegibility(product);
        expect(result.isLegible).toBe(true);
        expect(result.errors).toHaveLength(0);
        expect(result.checks.description).toBe(true);
        expect(result.checks.categories).toBe(true);
        expect(result.checks.supplier).toBe(true);
    });

    it('deve validar requisitos de dimensões e fotos para publicação no E-commerce', () => {
        const product: Partial<Product> = {
            title: 'Sofá Retrátil 3 Lugares',
            description: 'Excelente sofá',
            categoryIds: ['cat-1'],
            unitPrice: 1500,
            images: [],
            width: 0,
            height: 90,
            depth: 100
        };
        const result = checkEcomLegibility(product);
        expect(result.isLegible).toBe(false);
        expect(result.checks.images).toBe(false);
        expect(result.checks.dimensions).toBe(false);
    });
});
