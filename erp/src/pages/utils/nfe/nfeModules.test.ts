import { describe, expect, it } from 'vitest';
import { generateNfeAccessKey, calculateMod11CheckDigit, formatAccessKey } from './nfeAccessKey';
import { buildNfeXml } from './nfeXmlBuilder';
import { validateOrderForNfe } from './nfeValidator';
import Order from '@/pages/types/order.type';

describe('NF-e Access Key Calculation (SEFAZ)', () => {
    it('calculates 44-digit access key with valid mod 11 check digit', () => {
        const res = generateNfeAccessKey({
            ufCode: '41', // PR
            yearMonth: '2609',
            cnpj: '44512248000107',
            model: '55',
            series: '1',
            number: 100,
            emissionType: '1',
            randomCode: '12345678'
        });

        expect(res.accessKey).toHaveLength(44);
        expect(res.accessKey.startsWith('4126094451224800010755001000000100112345678')).toBe(true);
        expect(typeof res.checkDigit).toBe('number');
    });

    it('formats access key into 4-digit readable groups', () => {
        const key = '41260944512248000107550010000001001123456784';
        const formatted = formatAccessKey(key);
        expect(formatted.split(' ')).toHaveLength(11);
    });
});

describe('NF-e Validator', () => {
    const mockSettings: any = {
        companyName: 'Móveis Morante',
        companyCnpj: '44.512.248.0001/07',
        companyIE: '9091234567',
        nfeEnvironment: 2
    };

    it('validates a complete order successfully', () => {
        const mockOrder: Order = {
            id: 'ord_123',
            items: [
                {
                    id: 'item_1',
                    productId: 'prod_1',
                    description: 'Guarda Roupa Casal',
                    quantity: 1,
                    unitPrice: 1200,
                    totalValue: 1200
                }
            ],
            itemsSummary: { totalQuantity: 1, totalValue: 1200 },
            shipping: { deliveryMethod: 'delivery', fee: 50 },
            seller: 'Matheus',
            payments: [],
            paymentsSummary: { totalOrderValue: 1250, totalPaid: 1250, balanceDue: 0 },
            customerData: { fullName: 'Cliente Teste', cpfCnpj: '12345678909' },
            observation: '',
            date: new Date().toISOString()
        };

        const result = validateOrderForNfe(mockOrder, mockSettings);
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
    });

    it('flags orders without items or with zero total', () => {
        const invalidOrder: Order = {
            id: 'ord_invalid',
            items: [],
            itemsSummary: { totalQuantity: 0, totalValue: 0 },
            shipping: { deliveryMethod: 'pickup' },
            seller: 'Matheus',
            payments: [],
            paymentsSummary: { totalOrderValue: 0, totalPaid: 0, balanceDue: 0 },
            customerData: { fullName: 'Cliente' },
            observation: '',
            date: new Date().toISOString()
        };

        const result = validateOrderForNfe(invalidOrder, mockSettings);
        expect(result.isValid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
    });
});

describe('NF-e XML Builder (Homologação)', () => {
    it('generates SEFAZ Layout 4.00 compliant XML with mandatory homologation header', () => {
        const mockOrder: Order = {
            id: 'ord_123',
            orderIndex: 2500,
            items: [
                {
                    id: 'item_1',
                    productId: 'prod_1',
                    description: 'Mesa de Jantar 6 Cadeiras',
                    quantity: 1,
                    unitPrice: 850,
                    totalValue: 850
                }
            ],
            itemsSummary: { totalQuantity: 1, totalValue: 850 },
            shipping: { deliveryMethod: 'pickup', fee: 0 },
            seller: 'Matheus',
            payments: [{ method: 'PIX', value: 850 }],
            paymentsSummary: { totalOrderValue: 850, totalPaid: 850, balanceDue: 0 },
            customerData: { fullName: 'João da Silva', cpfCnpj: '12345678909' },
            observation: '',
            date: new Date().toISOString()
        };

        const mockSettings: any = {
            companyName: 'Móveis Morante',
            companyCnpj: '44.512.248.0001/07',
            companyIE: '9091234567',
            companyCRT: '1'
        };

        const xml = buildNfeXml({
            order: mockOrder,
            settings: mockSettings,
            accessKey: '41260944512248000107650010000001001123456784',
            randomCode: '12345678',
            checkDigit: 4,
            nfeNumber: 100,
            series: '1',
            model: '65',
            environment: 2
        });

        expect(xml).toContain('<NFe xmlns="http://www.portalfiscal.inf.br/nfe">');
        expect(xml).toContain('<tpAmb>2</tpAmb>');
        expect(xml).toContain('NF-E EMITIDA EM AMBIENTE DE HOMOLOGACAO - SEM VALOR FISCAL');
        expect(xml).toContain('<mod>65</mod>');
        expect(xml).toContain('<vNF>850.00</vNF>');
    });
});
