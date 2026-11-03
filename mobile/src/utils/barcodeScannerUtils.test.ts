import { describe, expect, it } from 'vitest';
import { matchScannedProductItem, extractLabelIdentity } from './barcodeScannerUtils';

describe('barcodeScannerUtils — identificação e correspondência de etiqueta', () => {
  it('reconhece etiquetas escaneadas em formatos variados (SKU|SERIAL, Barcode, JSON e ID)', () => {
    const item = {
      id: 'item-10',
      key: 'p-10-v-10',
      productId: 'prod-uuid-10',
      variationId: 'var-uuid-10',
      sku: 'CADEIRA-PRETA-01',
      code: 'CAD-01',
      barcode: '7891234567890',
      name: 'Cadeira Office Preta',
    };

    // 1. Etiqueta de identificação com pipe e serial gerado pelo ERP: SKU|SERIAL
    expect(matchScannedProductItem(item, 'CADEIRA-PRETA-01|000042')).toBe(true);

    // 2. Barcode com serial: BARCODE|UUID
    expect(matchScannedProductItem(item, '7891234567890|uuid-xyz')).toBe(true);

    // 3. Código de barras simples
    expect(matchScannedProductItem(item, '7891234567890')).toBe(true);

    // 4. SKU simples
    expect(matchScannedProductItem(item, 'CADEIRA-PRETA-01')).toBe(true);

    // 5. JSON em QR code
    expect(
      matchScannedProductItem(item, JSON.stringify({ sku: 'CADEIRA-PRETA-01', scanId: '123' }))
    ).toBe(true);

    // 6. Produto não encontrado
    expect(matchScannedProductItem(item, 'PRODUTO-INEXISTENTE|0001')).toBe(false);

    // 7. Novo formato canônico MH:L:<uuid>|<sku>
    expect(
      matchScannedProductItem(item, 'MH:L:12345678-1234-4234-8234-123456789abc|CADEIRA-PRETA-01')
    ).toBe(true);

    // 8. Etiqueta gerada na tela antes da impressão (placeholder 000XXX)
    expect(matchScannedProductItem(item, 'MH:L:000XXX|CADEIRA-PRETA-01')).toBe(true);

    // 9. Match direto por variationId e productId
    expect(
      matchScannedProductItem(item, 'MH:L:12345678-1234-4234-8234-123456789abc|var-uuid-10')
    ).toBe(true);
    expect(matchScannedProductItem(item, 'MH:L:000XXX|prod-uuid-10')).toBe(true);
  });

  it('extrai corretamente a identidade da etiqueta física (MH:L e UUID) e impede duplicidade local no inventário', () => {
    const qr1 = 'MH:L:aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa|SOFA-RET';
    const identity1 = extractLabelIdentity(qr1);
    expect(identity1.labelId).toBe('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
    expect(identity1.code).toBe('SOFA-RET');

    const qr2 = 'SOFA-RET|bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
    const identity2 = extractLabelIdentity(qr2);
    expect(identity2.labelId).toBe('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');
    expect(identity2.code).toBe('SOFA-RET');

    const qrSimple = 'SOFA-RET';
    const identitySimple = extractLabelIdentity(qrSimple);
    expect(identitySimple.labelId).toBeUndefined();
    expect(identitySimple.code).toBe('SOFA-RET');

    // Etiqueta com placeholder 000XXX na tela não deve assumir 000XXX como o código do produto
    const qrPlaceholder = 'MH:L:000XXX|CADEIRA-PRETA-01';
    const identityPlaceholder = extractLabelIdentity(qrPlaceholder);
    expect(identityPlaceholder.labelId).toBeUndefined();
    expect(identityPlaceholder.code).toBe('CADEIRA-PRETA-01');
  });
});
