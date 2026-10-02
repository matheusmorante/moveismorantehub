import { describe, it, expect, vi, beforeEach } from 'vitest';
import { adaptInboundInvoiceToReceiptState } from '../inboundInvoiceToReceiptAdapter';
import type Person from '@/pages/types/person.type';
import type { InboundInvoice } from '@/pages/utils/inboundNfe/inboundNfeTypes';

vi.mock('@/pages/utils/inboundNfe/inboundInvoicesService', () => ({
  normalizeInvoiceItem: vi.fn((item, idx) => ({
    itemNumber: idx + 1,
    productCode: item.productCode || `COD-${idx + 1}`,
    productDescription: item.productDescription || 'Item Teste',
    quantity: item.quantity || 1,
    unitCost: item.unitCost || 10,
    totalCost: item.totalCost || (item.quantity || 1) * (item.unitCost || 10),
    ...item,
  })),
  ensureInboundInvoiceAttachment: vi.fn(() => Promise.resolve('https://storage/nfe-xml.pdf')),
}));

vi.mock('@/pages/utils/productSupplierCodesService', () => ({
  findProductSupplierCodes: vi.fn(() =>
    Promise.resolve(
      new Map([['FORN-SKU-100', { productId: 'prod-uuid-1', productVariationId: 'var-uuid-1' }]])
    )
  ),
}));

vi.mock('@/pages/utils/productService', () => ({
  getProductsByIds: vi.fn(() =>
    Promise.resolve([
      {
        id: 'prod-uuid-1',
        name: 'MDF Cru 15mm',
        code: 'MDF-01',
        variations: [{ id: 'var-uuid-1', name: 'MDF Cru 15mm 2.75x1.83', sku: 'MDF-15' }],
      },
    ])
  ),
}));

vi.mock('@/pages/utils/personService', () => ({
  fetchPersons: vi.fn(() =>
    Promise.resolve([
      {
        id: 'sup-dynamic-fetch',
        fullName: 'Madeireira Dinâmica Ltda',
        cpfCnpj: '55.444.333/0001-22',
      },
    ])
  ),
}));

describe('inboundInvoiceToReceiptAdapter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve vincular fornecedor pelo CNPJ desconsiderando pontuação e calcular percentuais fiscais', async () => {
    const suppliers: Person[] = [
      {
        id: 'sup-parana-uuid',
        fullName: 'Madeireira Paraná Ltda',
        cpfCnpj: '12.345.678/0001-90',
      } as any,
    ];

    const invoice: InboundInvoice = {
      id: 'inv-1',
      nfeKey: '41261012345678000190550010000001231000000123',
      nfeNumber: 123,
      emitterCnpj: '12345678000190', // CNPJ limpo
      emitterName: 'Madeireira Paraná',
      issuedAt: '2026-10-01T08:00:00Z',
      totalProducts: 1000,
      totalIpi: 50, // 5%
      totalFreight: 100, // 10%
      totalOtherExpenses: 20,
      totalInsurance: 10,
      totalIcmsSt: 15, // Outras despesas = 20 + 10 + 15 = 45
      totalDiscount: 30,
      items: [
        {
          itemNumber: 1,
          productCode: 'FORN-SKU-100',
          productDescription: 'Chapa MDF 15mm',
          quantity: 10,
          unitCost: 100,
          totalCost: 1000,
        },
      ],
    } as any;

    const result = await adaptInboundInvoiceToReceiptState(invoice, suppliers);

    expect(result.resolvedSupplierId).toBe('sup-parana-uuid');
    expect(result.invoiceNumber).toBe('123');
    expect(result.fiscalKey).toBe(invoice.nfeKey);
    expect(result.receiptDate).toBe('2026-10-01');
    expect(result.ipiPercent).toBe(5);
    expect(result.freightPercent).toBe(10);
    expect(result.fiscalOtherExpenses).toBe(45);
    expect(result.fiscalDiscount).toBe(30);
    expect(result.attachmentUrl).toBe('https://storage/nfe-xml.pdf');

    // Item vinculado automaticamente via findProductSupplierCodes
    expect(result.linkedItems).toHaveLength(1);
    const item = result.linkedItems[0];
    expect(item.linkedProductId).toBe('prod-uuid-1');
    expect(item.linkedVariationId).toBe('var-uuid-1');
    expect(item.linkStatus).toBe('automatic');
    expect(item.linkedProductName).toBe('MDF Cru 15mm 2.75x1.83');
  });

  it('deve vincular fornecedor pelo nome ignorando acentos e maiúsculas', async () => {
    const suppliers: Person[] = [
      {
        id: 'sup-compensados-uuid',
        fullName: 'Compensados São Paulo Indústria',
        tradeName: 'Compensados SP',
        cpfCnpj: '99.999.999/0001-99',
      } as any,
    ];

    const invoice: InboundInvoice = {
      id: 'inv-2',
      nfeNumber: 456,
      emitterCnpj: '00000000000000', // CNPJ diferente
      emitterName: 'compensados sao paulo', // Sem acento, minúsculo
      totalProducts: 500,
      items: [],
    } as any;

    const result = await adaptInboundInvoiceToReceiptState(invoice, suppliers);
    expect(result.resolvedSupplierId).toBe('sup-compensados-uuid');
  });

  it('deve buscar fornecedores dinamicamente se o array de fornecedores for passado vazio', async () => {
    const invoice: InboundInvoice = {
      id: 'inv-dynamic',
      emitterCnpj: '55444333000122',
      totalProducts: 200,
      items: [],
    } as any;

    const result = await adaptInboundInvoiceToReceiptState(invoice, []);
    expect(result.resolvedSupplierId).toBe('sup-dynamic-fetch');
  });

  it('deve marcar linkStatus como pending quando produto não possui correspondência cadastrada', async () => {
    const invoice: InboundInvoice = {
      id: 'inv-3',
      totalProducts: 100,
      items: [
        {
          itemNumber: 1,
          productCode: 'DESCONHECIDO-999',
          productDescription: 'Item Sem Cadastro',
          quantity: 1,
          unitCost: 100,
        },
      ],
    } as any;

    const result = await adaptInboundInvoiceToReceiptState(invoice, []);
    expect(result.linkedItems[0].linkStatus).toBe('pending');
    expect(result.linkedItems[0].linkedProductId).toBeUndefined();
  });
});
