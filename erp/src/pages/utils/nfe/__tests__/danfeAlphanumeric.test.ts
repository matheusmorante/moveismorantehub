import { describe, expect, it } from 'vitest';
import { generateDanfeHtml, type DanfeData } from '../danfeGenerator';
import { generateNfeAccessKey } from '../nfeAccessKey';

describe('chave alfanumérica no HTML/SVG do DANFE', () => {
  it.each(['55', '65'] as const)('preserva chave do modelo %s', (model) => {
    const { accessKey } = generateNfeAccessKey({ ufCode: '41', yearMonth: '2610', cnpj: '12ABC34501DE35', model, series: 1, number: 106, emissionType: '1', randomCode: '70536713' });
    const html = generateDanfeHtml({
      order: { id: 'TEST_UNIT_DANFE', items: [], customerData: {}, payments: [], shipping: {}, itemsSummary: {}, paymentsSummary: {} },
      settings: { companyName: 'TEST UNIT', companyCnpj: '12ABC34501DE35' },
      model, accessKey, nfeNumber: 106, series: '1', environment: 2, status: 'homologada', protocolNumber: '141260000000001', protocolDate: '2026-10-13T10:00:00-03:00',
    } as DanfeData);
    expect(html).toContain(accessKey.match(/.{4}/g)!.join(' '));
    if (model === '55') expect(html).toContain('<svg');
  });
});
