import { describe, expect, it } from 'vitest';

type InboundInvoiceItem = {
    productCode: string;
    matchedProductId?: string;
};

export const hasMatchedProductsRule = (items: InboundInvoiceItem[]): boolean => {
    return items.some((item) => Boolean(item.matchedProductId));
};

export const normalizeSupplierCode = (code: string): string => {
    return code.trim().toLocaleUpperCase('pt-BR');
};

describe('Regras de Códigos dos Fornecedores e Trava de Fornecedor na NF-e', () => {
    it('deve desabilitar/travar alteração do fornecedor na NF quando houver ao menos um produto vinculado', () => {
        const itemsWithMatch: InboundInvoiceItem[] = [
            { productCode: 'ITEM-01', matchedProductId: 'PROD-UUID-1' },
            { productCode: 'ITEM-02' }
        ];
        expect(hasMatchedProductsRule(itemsWithMatch)).toBe(true);

        const itemsWithoutMatch: InboundInvoiceItem[] = [
            { productCode: 'ITEM-01' },
            { productCode: 'ITEM-02' }
        ];
        expect(hasMatchedProductsRule(itemsWithoutMatch)).toBe(false);
    });

    it('deve normalizar os códigos dos fornecedores garantindo comparações sem case sensitivity ou espaços em branco', () => {
        expect(normalizeSupplierCode('  sup-code-123 ')).toBe('SUP-CODE-123');
        expect(normalizeSupplierCode('abc_99 ')).toBe('ABC_99');
    });

    it('deve permitir múltiplos códigos para o mesmo fornecedor apontando para a mesma variação', () => {
        const supplierId = 'FORN-001';
        const variationId = 'VAR-UUID-100';

        // Simula cadastro histórico de 2 códigos diferentes do mesmo fornecedor
        const mockDbTuples = [
            { supplier_id: supplierId, supplier_product_code: 'OLD-SUP-10', variation_id: variationId },
            { supplier_id: supplierId, supplier_product_code: 'NEW-SUP-10', variation_id: variationId },
        ];

        const matchCode = (supId: string, code: string) => {
            const normalized = normalizeSupplierCode(code);
            return mockDbTuples.find(t => t.supplier_id === supId && t.supplier_product_code === normalized)?.variation_id;
        };

        expect(matchCode(supplierId, 'old-sup-10')).toBe(variationId);
        expect(matchCode(supplierId, 'NEW-SUP-10')).toBe(variationId);
        expect(matchCode(supplierId, 'UNKNOWN-CODE')).toBeUndefined();
    });

    it('deve detectar tentativa de inclusão de chave de acesso que já existe no sistema', () => {
        const existingKey = '41251102869763005168550010001254721050659320';
        const existingInvoices = [
            { id: 'inv-1', nfeKey: existingKey, emitterName: 'Fornecedor Exemplo' }
        ];

        const isDuplicateKey = (key: string, currentId?: string) => {
            const clean = key.replace(/\D/g, '');
            return existingInvoices.some(inv => inv.nfeKey === clean && (!currentId || inv.id !== currentId));
        };

        expect(isDuplicateKey('4125 1102 8697 6300 5168 5500 1000 1254 7210 5065 9320')).toBe(true);
        expect(isDuplicateKey(existingKey, 'inv-1')).toBe(false);
        expect(isDuplicateKey('41251102869763005168550010001254721050659999')).toBe(false);
    });
});
