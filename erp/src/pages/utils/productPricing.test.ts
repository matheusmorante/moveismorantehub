import { describe, expect, it } from 'vitest';
import { getSelectedProductPricing } from './productPricing';

describe('getSelectedProductPricing', () => {
    it('retorna preço de tabela e desconto zero quando o produto não tem promoção', () => {
        const pricing = getSelectedProductPricing({
            unitPrice: 1500
        });

        expect(pricing).toEqual({
            unitPrice: 1500,
            unitDiscount: 0,
            discountType: 'fixed',
            finalUnitPrice: 1500,
            hasDiscount: false
        });
    });

    it('calcula o desconto e o preço final quando o produto simples tem preço promocional', () => {
        const pricing = getSelectedProductPricing({
            unitPrice: 1000,
            promoPrice: 850
        });

        expect(pricing).toEqual({
            unitPrice: 1000,
            unitDiscount: 150,
            discountType: 'fixed',
            finalUnitPrice: 850,
            hasDiscount: true
        });
    });

    it('utiliza o preço promocional específico da variação quando syncPromoPrice é falso', () => {
        const pricing = getSelectedProductPricing(
            { unitPrice: 1000, promoPrice: 900 },
            {
                id: 'var-1',
                sku: 'SOFA-AZUL',
                name: 'Sofá Azul',
                unitPrice: 1200,
                promoPrice: 950,
                syncUnitPrice: false,
                syncPromoPrice: false,
                stock: 5,
                active: true,
                attributes: []
            }
        );

        expect(pricing).toEqual({
            unitPrice: 1200,
            unitDiscount: 250,
            discountType: 'fixed',
            finalUnitPrice: 950,
            hasDiscount: true
        });
    });

    it('herda o preço promocional do pai na variação quando syncPromoPrice é true por padrão', () => {
        const pricing = getSelectedProductPricing(
            { unitPrice: 1000, promoPrice: 800 },
            {
                id: 'var-1',
                sku: 'SOFA-AZUL',
                name: 'Sofá Azul',
                unitPrice: 1000,
                syncUnitPrice: true,
                syncPromoPrice: true,
                stock: 5,
                active: true,
                attributes: []
            }
        );

        expect(pricing).toEqual({
            unitPrice: 1000,
            unitDiscount: 200,
            discountType: 'fixed',
            finalUnitPrice: 800,
            hasDiscount: true
        });
    });

    it('não aplica desconto se o promoPrice for maior ou igual ao unitPrice', () => {
        const pricing = getSelectedProductPricing({
            unitPrice: 500,
            promoPrice: 600
        });

        expect(pricing).toEqual({
            unitPrice: 500,
            unitDiscount: 0,
            discountType: 'fixed',
            finalUnitPrice: 500,
            hasDiscount: false
        });
    });

    it('trata valores zerados ou nulos de forma segura', () => {
        const pricing = getSelectedProductPricing(null, null);

        expect(pricing).toEqual({
            unitPrice: 0,
            unitDiscount: 0,
            discountType: 'fixed',
            finalUnitPrice: 0,
            hasDiscount: false
        });
    });
});
