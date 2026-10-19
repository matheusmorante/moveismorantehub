import { describe, expect, it } from 'vitest';
import {
  confirmedOperationCfop,
  getEstornoCfopOptions,
  originalItemCfop,
  suggestEstornoCfop,
  suggestReturnCfop,
} from '../fiscalCfopResolution';
import {
  planEstornoFiscalDocument,
  planReturnFiscalDocuments,
  type FiscalSourceDocument,
} from '../fiscalOperationPlanning';

const source: FiscalSourceDocument = {
  id: 'source',
  accessKey: '1'.repeat(44),
  model: '55',
  environment: 1,
  status: 'autorizada',
  lines: [
    {
      invoiceItemNumber: 1,
      productCode: 'A',
      description: 'Cadeira',
      billedQuantity: 1,
      unitValue: 100,
      grossValue: 100,
      discountValue: 0,
      productXml: '<prod><CFOP>5102</CFOP></prod>',
      taxesXml: '<imposto/>',
    },
    {
      invoiceItemNumber: 2,
      productCode: 'B',
      description: 'Colchao',
      billedQuantity: 1,
      unitValue: 200,
      grossValue: 200,
      discountValue: 0,
      productXml: '<prod><CFOP>5405</CFOP></prod>',
      taxesXml: '<imposto/>',
    },
  ],
};

describe('CFOP configurável das operações fiscais', () => {
  it('devolução usa 1202 somente na ausência de configuração; configuração alterada prevalece', () => {
    expect(suggestReturnCfop()).toBe('1202');
    expect(suggestReturnCfop({ returnCfop: '1411' })).toBe('1411');
    expect(suggestReturnCfop({ returnCfop: '5102' })).toBeNull();
    const base = {
      returnOrderId: 'return',
      returnOrderStatus: 'fulfilled',
      environment: 1 as const,
      sources: [source],
      allocations: [
        { returnItemIndex: 0, originalDocumentId: source.id, originalItemNumber: 1, quantity: 1 },
      ],
    };
    expect(planReturnFiscalDocuments(base)[0].lines[0].suggestedCfop).toBe('1202');
    expect(
      planReturnFiscalDocuments({ ...base, cfopConfig: { returnCfop: '1411' } })[0].lines[0]
        .suggestedCfop
    ).toBe('1411');
  });

  it('estorno resolve somente mapeamento explícito e separadamente por item', () => {
    const draft = planEstornoFiscalDocument({
      source,
      environment: 1,
      operationDidNotOccur: true,
      goodsDidNotCirculate: true,
      cancellationWindowExpired: true,
      reason: 'Operacao nao realizada apos o prazo de cancelamento.',
      cfopConfig: { inverseCfopMappings: { '5102': '1102', '5405': '1405' } },
    });
    expect(
      draft.lines.map((line) => [line.originalCfop, line.suggestedCfop, line.reviewedCfop])
    ).toEqual([
      ['5102', '1102', null],
      ['5405', '1405', null],
    ]);
    expect(originalItemCfop(source.lines[0].productXml)).toBe('5102');
  });

  it('oferece o CFOP inverso canônico validado e não utiliza CFOP genérico como fallback', () => {
    expect(getEstornoCfopOptions('5102')).toEqual([
      { value: '1949', label: '1.949 · Estorno fiscal (art. 298)' },
    ]);
    expect(getEstornoCfopOptions('6102')).toEqual([
      { value: '2949', label: '2.949 · Estorno fiscal (art. 298)' },
    ]);
    // CFOP não mapeado retorna lista vazia (sem fallback genérico 5949/6949/7949)
    expect(getEstornoCfopOptions('5999')).toEqual([]);
    expect(
      getEstornoCfopOptions('5102', { inverseCfopMappings: { '5102': '1949' } })
    ).toEqual([{ value: '1949', label: '1.949 · Estorno fiscal (art. 298)' }]);
  });

  it('determina CFOP canônico, respeita sobreposição de configuração e falha fechado para não mapeado', () => {
    expect(suggestEstornoCfop('5102')).toBe('1949');
    expect(suggestEstornoCfop('6102')).toBe('2949');
    expect(suggestEstornoCfop('5999')).toBeNull();
    // Inversão inválida (mesmo prefixo de saída) deve falhar fechado
    expect(suggestEstornoCfop('5102', { inverseCfopMappings: { '5102': '5102' } })).toBeNull();
    expect(() => confirmedOperationCfop(null, suggestEstornoCfop('5999'))).toThrow(/não mapeado/);
    expect(
      confirmedOperationCfop(
        '1949',
        suggestEstornoCfop('5102', {
          inverseCfopMappings: { '5102': '1949' },
        })
      )
    ).toBe('1949');
    expect(() => confirmedOperationCfop(null, suggestReturnCfop())).toThrow(/Confirme/);
  });
});
