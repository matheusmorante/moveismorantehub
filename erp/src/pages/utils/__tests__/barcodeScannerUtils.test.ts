import { describe, it, expect } from 'vitest';
import { extractScannedCodes, matchScannedProductItem } from '../barcodeScannerUtils';

describe('barcodeScannerUtils', () => {
    describe('extractScannedCodes', () => {
        it('extrai código simples direto', () => {
            expect(extractScannedCodes('CAD-01')).toContain('CAD-01');
            expect(extractScannedCodes('7891234567890')).toContain('7891234567890');
        });

        it('extrai partes separadas por pipe "|" (etiquetas com serial/uuid)', () => {
            const codes = extractScannedCodes('CAD-01|000042');
            expect(codes).toContain('CAD-01|000042');
            expect(codes).toContain('CAD-01');
            expect(codes).toContain('000042');
        });

        it('extrai dados de JSON em QR Code', () => {
            const jsonStr = JSON.stringify({ sku: 'MESA-RED-02', scanId: '999888', productId: 'prod-uuid-1' });
            const codes = extractScannedCodes(jsonStr);
            expect(codes).toContain('MESA-RED-02');
            expect(codes).toContain('prod-uuid-1');
            expect(codes).toContain('999888');
        });

        it('lida com strings vazias ou nulas com segurança', () => {
            expect(extractScannedCodes('')).toEqual([]);
            expect(extractScannedCodes('   ')).toEqual([]);
        });
    });

    describe('matchScannedProductItem', () => {
        const sampleItem = {
            id: 'item-1',
            key: 'prod-1-var-1',
            productId: 'prod-1',
            variationId: 'var-1',
            sku: 'CADEIRA-PRETA',
            code: '1001',
            barcode: '7890001112223',
            name: 'Cadeira Office Executiva Preta'
        };

        it('encontra por SKU exato', () => {
            expect(matchScannedProductItem(sampleItem, 'CADEIRA-PRETA')).toBe(true);
            expect(matchScannedProductItem(sampleItem, 'cadeira-preta')).toBe(true);
        });

        it('encontra por QR Code com pipe "SKU|UUID"', () => {
            expect(matchScannedProductItem(sampleItem, 'CADEIRA-PRETA|000005')).toBe(true);
            expect(matchScannedProductItem(sampleItem, 'cadeira-preta|000099')).toBe(true);
        });

        it('encontra por código de barras numérico', () => {
            expect(matchScannedProductItem(sampleItem, '7890001112223')).toBe(true);
            expect(matchScannedProductItem(sampleItem, '7890001112223|SERIAL-01')).toBe(true);
        });

        it('encontra por código interno do produto', () => {
            expect(matchScannedProductItem(sampleItem, '1001')).toBe(true);
        });

        it('encontra por productId ou variationId', () => {
            expect(matchScannedProductItem(sampleItem, 'prod-1')).toBe(true);
            expect(matchScannedProductItem(sampleItem, 'var-1')).toBe(true);
        });

        it('encontra via catálogo allProducts mesmo para item legado sem sku no objeto', () => {
            const legacyItem = {
                id: 'leg-1',
                productId: 'prod-legacy-1',
                variationId: 'var-legacy-1',
                name: 'Mesa Bistrô Alta'
            };

            const allProducts = [
                {
                    id: 'prod-legacy-1',
                    code: 'PROD-99',
                    variations: [
                        { id: 'var-legacy-1', sku: 'BISTRO-MADEIRA', barcode: '7899998887776' }
                    ]
                }
            ];

            // Escaneou o SKU ou o QR Code com serial gerado pela impressão de etiquetas
            expect(matchScannedProductItem(legacyItem, 'BISTRO-MADEIRA|000012', allProducts)).toBe(true);
            expect(matchScannedProductItem(legacyItem, '7899998887776', allProducts)).toBe(true);
        });

        it('retorna false quando o código não bate com nenhum produto', () => {
            expect(matchScannedProductItem(sampleItem, 'OUTRO-PRODUTO-999')).toBe(false);
            expect(matchScannedProductItem(sampleItem, '9999999999999')).toBe(false);
        });
    });
});
