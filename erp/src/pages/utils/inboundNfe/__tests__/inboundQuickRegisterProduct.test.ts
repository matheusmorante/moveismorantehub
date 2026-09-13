import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { checkERPLegibility } from '@/pages/App/Products/productLegibilityRules';
import { InboundInvoiceItem } from '../inboundNfeTypes';
import { saveProductSupplierCode, findProductSupplierCodes, ProductSupplierCode } from '../../productSupplierCodesService';
import { saveProduct, saveVariation } from '../../productService';
import { ensureAttributeValue } from '../../variationService';
import { extractColorCandidateFromTitle } from '../inboundMatchingRules';
import Product from '@/pages/types/product.type';

// Store in-memory para códigos de fornecedor no ambiente de teste
const supplierCodesStore: ProductSupplierCode[] = [];
const attributeValuesStore: { id: string; attribute_id: string; value: string }[] = [];

vi.mock('../../supabaseConfig', () => {
    const createDbChain = () => {
        const chain: any = {
            select: () => chain,
            order: () => chain,
            gte: () => chain,
            lte: () => chain,
            or: () => chain,
            eq: () => chain,
            neq: () => chain,
            like: () => chain,
            ilike: (_col: string, val: string) => {
                const cleanVal = val.toLowerCase();
                if (cleanVal === 'cor') {
                    return {
                        limit: () => Promise.resolve({ data: [{ id: 'attr-cor-1', name: 'Cor' }], error: null }),
                    };
                }
                const foundVal = attributeValuesStore.find((v) => v.value.toLowerCase() === cleanVal);
                return {
                    limit: () => Promise.resolve({ data: foundVal ? [foundVal] : [], error: null }),
                };
            },
            in: (_col: string, codes: string[]) => {
                const found = supplierCodesStore
                    .filter((item) => codes.map((c) => c.toUpperCase()).includes(item.supplierProductCode.toUpperCase()))
                    .map((item) => ({
                        product_id: item.productId,
                        product_variation_id: item.productVariationId,
                        supplier_id: item.supplierId,
                        supplier_product_code: item.supplierProductCode,
                        supplier_description: item.supplierDescription,
                    }));
                return Promise.resolve({ data: found, error: null });
            },
            limit: () => chain,
            single: () => Promise.resolve({ data: null, error: null }),
            range: () => Promise.resolve({ data: [], count: 0, error: null }),
            upsert: (record: any) => {
                if (record && record.supplier_product_code) {
                    supplierCodesStore.push({
                        supplierId: record.supplier_id,
                        productId: record.product_id,
                        productVariationId: record.product_variation_id,
                        supplierProductCode: record.supplier_product_code,
                        supplierDescription: record.supplier_description,
                    });
                }
                return Promise.resolve({ error: null });
            },
            insert: (record: any) => {
                if (record && record.value) {
                    attributeValuesStore.push({ id: `val-${Date.now()}`, attribute_id: record.attribute_id, value: record.value });
                }
                return Promise.resolve({ error: null });
            },
            delete: () => chain,
        };
        return chain;
    };

    const db = {
        from: () => createDbChain(),
        rpc: () => Promise.resolve({ data: null, error: null }),
        functions: { invoke: () => Promise.resolve({ data: { success: true }, error: null }) }
    };

    return {
        supabase: db,
        ecommerceSupabase: db,
    };
});

const localStorageMock = (() => {
    let store: Record<string, string> = {};
    return {
        getItem: (key: string) => store[key] || null,
        setItem: (key: string, value: string) => { store[key] = value.toString(); },
        removeItem: (key: string) => { delete store[key]; },
        clear: () => { store = {}; }
    };
})();
Object.defineProperty(global, 'localStorage', { value: localStorageMock });

describe('Cadastro Rápido de Produtos via NF-e (Modo A & Modo B)', () => {
    const testRunId = `TEST_AUT_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const createdProductIds: string[] = [];

    beforeEach(() => {
        global.localStorage.clear();
        supplierCodesStore.length = 0;
        attributeValuesStore.length = 0;
        vi.clearAllMocks();
    });

    afterEach(async () => {
        // Teardown: Garantir limpeza de qualquer produto criado para teste
        createdProductIds.forEach((id) => {
            const raw = localStorage.getItem('erp_products');
            if (raw) {
                try {
                    const products: Product[] = JSON.parse(raw);
                    const filtered = products.filter((p) => p.id !== id && !p.name?.includes(testRunId));
                    localStorage.setItem('erp_products', JSON.stringify(filtered));
                } catch {}
            }
        });
        supplierCodesStore.length = 0;
        attributeValuesStore.length = 0;
    });

    const sampleInvoiceItem: InboundInvoiceItem = {
        itemNumber: 1,
        productCode: `FORN_COD_${testRunId}`,
        productDescription: `Poltrona Reclinável Veludo Bege [${testRunId}]`,
        ncm: '94014010',
        cfop: '5102',
        unit: 'UN',
        quantity: 2,
        unitCost: 450.00,
        totalCost: 900.00,
    };

    it('Modo A: Estrutura initialProductData para Novo Produto Pai com Categoria válida e Sem Estoque Inicial (stock: 0)', () => {
        const catObj = { id: 'cat-moveis-estofados', name: 'Móveis Estofados' };
        const finalCost = sampleInvoiceItem.unitCost;
        const supplierId = crypto.randomUUID();

        // Estruturação enviada ao formulário de produtos após seleção de Modo A (Sem Estoque Inicial Pré-Carregado)
        const initialProductData: Partial<Product> = {
            name: sampleInvoiceItem.productDescription,
            title: sampleInvoiceItem.productDescription,
            description: sampleInvoiceItem.productDescription,
            ncm: sampleInvoiceItem.ncm || '',
            fiscal: { ncm: sampleInvoiceItem.ncm || undefined },
            costPrice: finalCost,
            unitPrice: finalCost * 1.5, // 50% margem
            stock: 0, // Regra de Negócio: Estoque inicial 0 (o recebimento dará a entrada)
            mainSupplierId: supplierId,
            categoryIds: [catObj.id],
            categories: [{ id: catObj.id, name: catObj.name }],
        };

        // 1. Sem estoque inicial preenchido
        expect(initialProductData.stock).toBe(0);

        // 2. Verifica legibilidade do ERP
        const erpLegibility = checkERPLegibility(initialProductData);
        expect(erpLegibility.isLegible).toBe(true);
        expect(erpLegibility.checks.categories).toBe(true);
        expect(erpLegibility.checks.description).toBe(true);
        expect(erpLegibility.checks.supplier).toBe(true);
    });

    it('Modo A: Salva o novo produto no ERP e vincula com sucesso o código do fornecedor', async () => {
        const supplierId = crypto.randomUUID();
        const newProductId = crypto.randomUUID();
        const variationId = crypto.randomUUID();
        createdProductIds.push(newProductId);

        const newProduct: Product = {
            id: newProductId,
            name: sampleInvoiceItem.productDescription,
            title: sampleInvoiceItem.productDescription,
            description: sampleInvoiceItem.productDescription,
            unit: 'UN',
            itemType: 'product',
            active: true,
            isDraft: false,
            status: 'hidden',
            mainSupplierId: supplierId,
            categoryIds: ['cat-moveis-estofados'],
            costPrice: 450.00,
            unitPrice: 675.00,
            stock: 0,
            fiscal: { ncm: '94014010' },
            hasVariations: true,
            variations: [
                {
                    id: variationId,
                    name: sampleInvoiceItem.productDescription,
                    sku: `SKU_${testRunId}`,
                    stock: 0,
                    unitPrice: 675.00,
                    costPrice: 450.00,
                    attributes: [],
                }
            ],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };

        // 1. Salvar produto no banco/service
        const savedId = await saveProduct(newProduct);
        expect(savedId).toBe(newProductId);

        // 2. Salvar o código do fornecedor vinculado
        await saveProductSupplierCode({
            supplierId,
            productId: savedId,
            productVariationId: newProduct.variations?.[0]?.id,
            supplierProductCode: sampleInvoiceItem.productCode!,
            supplierDescription: sampleInvoiceItem.productDescription,
        });

        // 3. Consultar código do fornecedor para verificar vínculo
        const mappings = await findProductSupplierCodes(supplierId, [sampleInvoiceItem.productCode!]);
        const match = mappings.get(sampleInvoiceItem.productCode!.trim().toLocaleUpperCase('pt-BR'));
        
        expect(match).toBeDefined();
        expect(match?.productId).toBe(newProductId);
        expect(match?.productVariationId).toBe(variationId);
    });

    it('Modo B: Extrai atributo de Cor do título, reusa/cria valor canônico e vincula variação ao pai existente', async () => {
        const supplierId = crypto.randomUUID();
        const existingParentId = crypto.randomUUID();
        const newVariationId = crypto.randomUUID();
        createdProductIds.push(existingParentId);

        // 1. Extração de Cor vinda da descrição da NF
        const detectedColor = extractColorCandidateFromTitle(sampleInvoiceItem.productDescription);
        expect(detectedColor).toBe('Veludo Bege');

        // 2. Garantir atributo de Cor (case-insensitive)
        const colorAttr = await ensureAttributeValue('Cor', detectedColor!);
        expect(colorAttr.name).toBe('Cor');
        expect(colorAttr.value).toBe('Veludo Bege');

        // Produto Pai Pré-existente
        const existingParent: Product = {
            id: existingParentId,
            name: `Poltrona Reclinável Família [${testRunId}]`,
            title: `Poltrona Reclinável Família [${testRunId}]`,
            description: `Poltrona Reclinável Família [${testRunId}]`,
            unit: 'UN',
            itemType: 'product',
            active: true,
            status: 'published',
            mainSupplierId: supplierId,
            categoryIds: ['cat-sofas'],
            costPrice: 800.00,
            unitPrice: 1600.00,
            stock: 5,
            hasVariations: true,
            variations: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };

        await saveProduct(existingParent);

        // Adicionar Variação no Pai Existente com Atributo de Cor extraído
        await saveVariation(existingParentId, {
            id: newVariationId,
            name: sampleInvoiceItem.productDescription,
            stock: 0,
            unitPrice: 700.00,
            costPrice: sampleInvoiceItem.unitCost,
            attributes: [{ name: colorAttr.name, value: colorAttr.value }],
        });

        // Vincular código do fornecedor à nova variação
        await saveProductSupplierCode({
            supplierId,
            productId: existingParentId,
            productVariationId: newVariationId,
            supplierProductCode: sampleInvoiceItem.productCode!,
            supplierDescription: sampleInvoiceItem.productDescription,
        });

        // Verificar o vínculo
        const mappings = await findProductSupplierCodes(supplierId, [sampleInvoiceItem.productCode!]);
        const match = mappings.get(sampleInvoiceItem.productCode!.trim().toLocaleUpperCase('pt-BR'));

        expect(match).toBeDefined();
        expect(match?.productId).toBe(existingParentId);
        expect(match?.productVariationId).toBe(newVariationId);
    });

    it('Modo A (Ambos os Modos): Extrai atributo de Cor do título para a Variação 1 do novo Produto Pai', async () => {
        const detectedColor = extractColorCandidateFromTitle(sampleInvoiceItem.productDescription);
        expect(detectedColor).toBe('Veludo Bege');

        const colorAttr = await ensureAttributeValue('Cor', detectedColor!);
        expect(colorAttr.name).toBe('Cor');
        expect(colorAttr.value).toBe('Veludo Bege');

        const supplierId = crypto.randomUUID();
        const newProductId = crypto.randomUUID();
        const variation1Id = crypto.randomUUID();
        createdProductIds.push(newProductId);

        const newProductWithAttr: Product = {
            id: newProductId,
            name: sampleInvoiceItem.productDescription,
            title: sampleInvoiceItem.productDescription,
            description: sampleInvoiceItem.productDescription,
            unit: 'UN',
            itemType: 'product',
            active: true,
            isDraft: false,
            status: 'hidden',
            mainSupplierId: supplierId,
            categoryIds: ['cat-moveis-estofados'],
            costPrice: 450.00,
            unitPrice: 675.00,
            stock: 0,
            fiscal: { ncm: '94014010' },
            hasVariations: true,
            variations: [
                {
                    id: variation1Id,
                    name: sampleInvoiceItem.productDescription,
                    sku: `SKU_${testRunId}_V1`,
                    stock: 0,
                    unitPrice: 675.00,
                    costPrice: 450.00,
                    attributes: [{ name: colorAttr.name, value: colorAttr.value }],
                }
            ],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };

        const savedId = await saveProduct(newProductWithAttr);
        expect(savedId).toBe(newProductId);
        expect(newProductWithAttr.variations[0].attributes).toEqual([{ name: 'Cor', value: 'Veludo Bege' }]);
        expect(newProductWithAttr.variations[0].stock).toBe(0);
    });
});
