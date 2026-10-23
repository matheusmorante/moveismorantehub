import { describe, expect, it } from 'vitest';
import { planMetaGraphRequest } from './metaGraphProxyPolicy';

const settings = {
  phoneNumberId: '1234567890',
  wabaId: '2345678901',
  catalogId: '3456789012',
};

describe('planMetaGraphRequest', () => {
  it('uses only the configured Graph resources for reads', () => {
    expect(planMetaGraphRequest({ operation: 'list_templates' }, settings)).toMatchObject({
      permission: 'manageSettings',
      method: 'GET',
      path: '2345678901/message_templates?fields=name,status,language,category,components',
    });
    expect(planMetaGraphRequest({ operation: 'list_catalog_products' }, settings).path).toContain(
      '3456789012/products?fields='
    );
  });

  it('blocks customer-support dispatch and rejects unknown operations', () => {
    expect(() => planMetaGraphRequest({
      operation: 'send_message',
      purpose: 'customer_support',
      payload: { messaging_product: 'whatsapp', type: 'text', to: '14155550123', text: { body: 'x' } },
    }, settings)).toThrow('Envio indisponível por política da empresa.');
    expect(() => planMetaGraphRequest({ operation: 'arbitrary_url', payload: 'https://example.com' }, settings))
      .toThrow('Operação Meta não permitida.');
  });

  it('rejects caller-supplied Meta resources that differ from server settings', () => {
    expect(() => planMetaGraphRequest({ operation: 'connection_test', phoneNumberId: '9999999999' }, settings))
      .toThrow('Identificador Meta não corresponde à configuração.');
    expect(() => planMetaGraphRequest({ operation: 'list_templates', wabaId: '9999999999' }, settings))
      .toThrow('Identificador Meta não corresponde à configuração.');
    expect(() => planMetaGraphRequest({ operation: 'list_catalog_products', catalogId: '9999999999' }, settings))
      .toThrow('Identificador Meta não corresponde à configuração.');
  });

  it('requires an explicit non-support purpose and validates outbound messages', () => {
    expect(() => planMetaGraphRequest({ operation: 'send_message', payload: {} }, settings))
      .toThrow('Finalidade de mensagem inválida.');
    expect(() => planMetaGraphRequest({
      operation: 'send_message',
      purpose: 'sales',
      payload: { messaging_product: 'whatsapp', type: 'text', to: 'not-a-phone', text: { body: 'x' } },
    }, settings)).toThrow('Telefone destinatário inválido.');
  });

  it('keeps catalog writes bounded and requires product configuration permission', () => {
    const plan = planMetaGraphRequest({
      operation: 'sync_catalog_batch',
      payload: {
        item_type: 'PRODUCT_ITEM',
        requests: [{ method: 'DELETE', retailer_id: 'SKU-1' }],
      },
    }, settings);
    expect(plan).toMatchObject({ permission: 'productConfig', method: 'POST', path: '3456789012/items_batch' });
    expect(() => planMetaGraphRequest({
      operation: 'sync_catalog_batch',
      payload: { item_type: 'PRODUCT_ITEM', requests: Array(51).fill({ method: 'DELETE', retailer_id: 'sku' }) },
    }, settings)).toThrow('Lote do catálogo inválido.');
  });
});
