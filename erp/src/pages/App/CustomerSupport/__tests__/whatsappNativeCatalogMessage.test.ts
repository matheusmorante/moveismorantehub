import { describe, expect, it } from 'vitest';
import { buildWhatsAppNativeCatalogMessage } from '../../../../../../shared-utils/whatsappNativeCatalogMessage';

describe('buildWhatsAppNativeCatalogMessage', () => {
  it('monta mensagem nativa de produto único', () => {
    expect(buildWhatsAppNativeCatalogMessage({
      recipient: '+55 (41) 99749-3547',
      catalogId: '1234567890',
      bodyText: 'Confira este produto.',
      retailerIds: ['GUARDA-ROUPA-6P'],
    })).toEqual({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: '5541997493547',
      type: 'interactive',
      interactive: {
        type: 'product',
        body: { text: 'Confira este produto.' },
        action: { catalog_id: '1234567890', product_retailer_id: 'GUARDA-ROUPA-6P' },
      },
    });
  });

  it('monta lista nativa em uma seção e respeita o limite de 30 produtos', () => {
    const retailerIds = Array.from({ length: 30 }, (_, index) => `SKU-${index + 1}`);
    const payload = buildWhatsAppNativeCatalogMessage({
      recipient: '5541997493547',
      catalogId: '1234567890',
      bodyText: 'Veja estas opções.',
      retailerIds,
    });
    const interactive = payload.interactive as {
      type: string;
      action: { sections: Array<{ title: string; product_items: Array<{ product_retailer_id: string }> }> };
    };

    expect(interactive.type).toBe('product_list');
    expect(interactive.action.sections).toHaveLength(1);
    expect(interactive.action.sections[0].product_items.map((item) => item.product_retailer_id)).toEqual(retailerIds);
    expect(() => buildWhatsAppNativeCatalogMessage({
      recipient: '5541997493547',
      catalogId: '1234567890',
      bodyText: 'Veja estas opções.',
      retailerIds: [...retailerIds, 'SKU-31'],
    })).toThrow('1 a 30 produtos');
  });
});
