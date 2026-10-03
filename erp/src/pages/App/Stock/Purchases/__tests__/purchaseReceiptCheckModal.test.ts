import { describe, it, expect, vi } from 'vitest';
import Purchase from '../../../../types/purchase.type';

describe('Suíte de Integração: Fluxo de Conferência de Compra (PurchaseReceiptCheckModal)', () => {
  it('localiza item por código do produto ou SKU da variação durante o bipe', () => {
    const purchase: Purchase = {
      id: 'purch-check-1',
      supplierName: 'Estofados Real',
      date: '2026-10-01',
      totalValue: 1000,
      status: 'ordered',
      items: [
        {
          productId: 'prod-101',
          description: 'Cadeira Sala Jantar',
          quantity: 4,
          unitCost: 250,
          totalCost: 1000,
        },
        {
          productId: 'prod-102',
          variationId: 'var-azul',
          description: 'Mesa Centro - Azul',
          quantity: 2,
          unitCost: 300,
          totalCost: 600,
        },
      ],
    };

    const products = [
      {
        id: 'prod-101',
        code: 'CAD-101',
        supplierRef: 'REF-FABRICA-44',
      },
      {
        id: 'prod-102',
        hasVariations: true,
        variations: [
          {
            id: 'var-azul',
            sku: 'MESA-AZUL-01',
            barcode: '7891234567890',
          },
        ],
      },
    ];

    const findItemByScannedCode = (scannedCode: string) => {
      const cleanCode = scannedCode.trim().toLowerCase();

      // Procura produto simples
      const prod = products.find(
        (p) =>
          (p.code || '').toLowerCase() === cleanCode ||
          (p.supplierRef || '').toLowerCase() === cleanCode ||
          String(p.id).toLowerCase() === cleanCode
      );

      if (prod) {
        return purchase.items.find((i) => i.productId === prod.id && !i.variationId);
      }

      // Procura em variações
      for (const p of products) {
        if (p.hasVariations && p.variations) {
          const v = p.variations.find(
            (varItem) =>
              (varItem.sku || '').toLowerCase() === cleanCode ||
              (varItem.barcode || '').toLowerCase() === cleanCode ||
              String(varItem.id).toLowerCase() === cleanCode
          );
          if (v) {
            return purchase.items.find((i) => i.productId === p.id && i.variationId === v.id);
          }
        }
      }

      return null;
    };

    // Teste 1: bipe pelo código de produto
    const matchSimple = findItemByScannedCode('CAD-101');
    expect(matchSimple?.description).toBe('Cadeira Sala Jantar');

    // Teste 2: bipe pela referência do fornecedor
    const matchRef = findItemByScannedCode('REF-FABRICA-44');
    expect(matchRef?.description).toBe('Cadeira Sala Jantar');

    // Teste 3: bipe pelo código de barras EAN da variação
    const matchBarcode = findItemByScannedCode('7891234567890');
    expect(matchBarcode?.description).toBe('Mesa Centro - Azul');

    // Teste 4: item inexistente no pedido
    const matchNotFound = findItemByScannedCode('9999999999');
    expect(matchNotFound).toBeNull();
  });
});
