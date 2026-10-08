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

  it('oferece somente os CFOPs alternativos da orientação da SEFA/PR quando falta mapa inverso', () => {
    expect(getEstornoCfopOptions('5102')).toEqual([
      { value: '5949', label: '5.949 · outra saída não especificada' },
      { value: '6949', label: '6.949 · outra saída não especificada' },
      { value: '7949', label: '7.949 · outra saída não especificada' },
    ]);
    expect(
      getEstornoCfopOptions('5102', { inverseCfopMappings: { '5102': '1102' } })
    ).toEqual([{ value: '1102', label: '1.102 · CFOP inverso configurado' }]);
  });

  it('sem mapa, com mapa inválido ou após mudança de config, não troca CFOP confirmado', () => {
    expect(suggestEstornoCfop('5102')).toBeNull();
    expect(suggestEstornoCfop('5102', { inverseCfopMappings: { '5102': '5102' } })).toBeNull();
    expect(() => confirmedOperationCfop(null, suggestEstornoCfop('5102'))).toThrow(/não mapeado/);
    expect(
      confirmedOperationCfop(
        '1102',
        suggestEstornoCfop('5102', {
          inverseCfopMappings: { '5102': '1202' },
        })
      )
    ).toBe('1102');
    expect(() => confirmedOperationCfop(null, suggestReturnCfop())).toThrow(/Confirme/);
  });
});
