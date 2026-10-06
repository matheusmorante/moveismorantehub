import { describe, expect, it } from 'vitest';
import {
  resolveFiscalDocumentModel,
  resolveOrderFiscalModel,
  fiscalPresence,
  fiscalRecipientRequirements,
  NFCE_RECIPIENT_IDENTIFICATION_LIMIT,
  decideFiscalRecipientRequirements,
} from '../../../../../shared-utils/fiscalDocumentModel';
import { parseFiscalEmissionCommand } from '../../../../../api/nfe/fiscalSnapshot';

const normal = {
  issuerUf: 'PR',
  recipientUf: 'PR',
  finalConsumer: true,
  operationType: 'sale',
  total: 100,
  cfops: ['5102'],
};
describe('política fiscal de varejo no Paraná', () => {
  it.each(['pickup', 'delivery'])(
    'PF/PJ consumidor final: %s também pode usar 65',
    (deliveryMethod) => {
      for (const document of ['12345678909', '12345678000195']) {
        expect(
          resolveOrderFiscalModel({
            orderType: 'sale',
            shipping: { deliveryMethod, deliveryAddress: { state: 'PR' } },
            customerData: { cpfCnpj: document, fullAddress: { state: 'PR' } },
            fiscalContext: { finalConsumer: true },
          }, { issuerUf: 'PR', finalConsumer: true })
        ).toMatchObject({
          status: 'ready',
          model: '65',
          reasonCode: 'RETAIL_FINAL_CONSUMER_IN_STATE',
        });
      }
    }
  );
  it.each([
    [{ recipientUf: 'SC' }, 'INTERSTATE_OPERATION'],
    [{ finalConsumer: false }, 'RESALE'],
    [{ requiresTaxCredit: true }, 'TAX_CREDIT_REQUIRED'],
    [{ operationType: 'return' }, 'RETURN'],
    [{ operationType: 'transfer' }, 'TRANSFER'],
    [{ operationType: 'shipment' }, 'SHIPMENT'],
    [{ operationType: 'goods_return' }, 'GOODS_RETURN'],
    [{ operationType: 'export' }, 'EXPORT'],
    [{ operationType: 'import' }, 'IMPORT'],
    [{ publicAdministrationRequirement: true }, 'PUBLIC_ADMINISTRATION'],
    [{ otherFiscalRequirement: true }, 'OTHER_FISCAL_REQUIREMENT'],
    [{ total: 200000 }, 'VALUE_LIMIT'],
    [{ cfops: ['6102'] }, 'INTERSTATE_OPERATION'],
    [{ cfops: ['5901'] }, 'OTHER_FISCAL_REQUIREMENT'],
  ] as const)('escolhe 55 com motivo concreto %s', (facts, reasonCode) => {
    expect(
      resolveFiscalDocumentModel({
        ...normal,
        ...facts,
        cfops: [...('cfops' in facts ? facts.cfops : normal.cfops)],
      })
    ).toMatchObject({ status: 'ready', model: '55', reasonCode });
  });
  it('limite, UF ausente e opção de consumidor final são tratados explicitamente', () => {
    expect(resolveFiscalDocumentModel({ ...normal, total: 199999.99 })).toMatchObject({
      model: '65',
    });
    expect(resolveFiscalDocumentModel({ ...normal, recipientUf: undefined })).toMatchObject({
      status: 'blocked',
    });
    expect(resolveFiscalDocumentModel({ ...normal, finalConsumer: undefined })).toMatchObject({
      status: 'blocked',
    });
    expect(
      resolveOrderFiscalModel(
        { shipping: { deliveryMethod: 'pickup' }, customerData: { fullAddress: { state: 'SP' } } },
        { issuerUf: 'PR', finalConsumer: true }
      )
    ).toMatchObject({
      status: 'ready',
      model: '65',
      reasonCode: 'RETAIL_FINAL_CONSUMER_IN_STATE',
    });
    expect(
      resolveOrderFiscalModel(
        {
          shipping: {
            deliveryMethod: 'delivery',
            useCustomerAddress: false,
            deliveryAddress: { state: 'SC' },
          },
          customerData: { fullAddress: { state: 'PR' } },
        },
        { issuerUf: 'PR', finalConsumer: true }
      )
    ).toMatchObject({ status: 'ready', model: '55', reasonCode: 'INTERSTATE_OPERATION' });
    expect(
      resolveOrderFiscalModel(
        {
          shipping: { deliveryMethod: 'pickup' },
          customerData: { fullAddress: { state: 'SP' } },
        },
        { finalConsumer: true }
      )
    ).toMatchObject({ status: 'blocked' });
  });
  it('logística define presença e identificação, preservando o modelo', () => {
    expect(fiscalPresence('65', 'delivery')).toBe('4');
    expect(fiscalPresence('65', 'delivery', '1')).toBe('4');
    expect(fiscalPresence('65', 'pickup')).toBe('1');
    expect(fiscalPresence('65', 'pickup', '4')).toBe('1');
    expect(fiscalRecipientRequirements('65', fiscalPresence('65', 'pickup', '4'), 9999.99)).toEqual(
      { documentRequired: false, addressRequired: false }
    );
    expect(fiscalRecipientRequirements('65', '4', 100)).toEqual({
      documentRequired: true,
      addressRequired: true,
    });
    expect(fiscalRecipientRequirements('65', '2', 100)).toEqual({
      documentRequired: true,
      addressRequired: true,
    });
    expect(fiscalRecipientRequirements('65', '9', 9999.99)).toEqual({
      documentRequired: true,
      addressRequired: true,
    });
    expect(fiscalRecipientRequirements('65', '1', 9999.99)).toEqual({
      documentRequired: false,
      addressRequired: false,
    });
    expect(fiscalRecipientRequirements('65', '5', 9999.99)).toEqual({
      documentRequired: false,
      addressRequired: false,
    });
    expect(fiscalRecipientRequirements('65', '1', 10000)).toEqual({
      documentRequired: true,
      addressRequired: false,
    });
    expect(fiscalRecipientRequirements('55', '1', 100)).toEqual({
      documentRequired: true,
      addressRequired: true,
    });
    expect(fiscalPresence('55', 'delivery', '1')).toBe('9');
    expect(fiscalPresence('55', 'pickup', '4')).toBe('1');
  });
  it('aplica a matriz oficial NFC-e com limite inclusivo e motivo por cenário', () => {
    expect(NFCE_RECIPIENT_IDENTIFICATION_LIMIT).toBe(10_000);
    const decide = (total: number, presence: string, personType: 'PF' | 'PJ' = 'PF') =>
      decideFiscalRecipientRequirements({
        model: '65',
        presence,
        total,
        personType,
        operationScope: 'NORMAL_DOMESTIC_SALE',
      });

    expect(decide(9_999.99, '1')).toMatchObject({
      supported: true,
      documentRequired: false,
      addressRequired: false,
      documentType: 'CPF',
      reasonCodes: [],
      message: null,
    });
    expect(decide(10_000, '1')).toMatchObject({
      documentRequired: true,
      addressRequired: false,
      reasonCodes: ['NFCE_AMOUNT_LIMIT'],
    });
    expect(decide(10_000.01, '5', 'PJ')).toMatchObject({
      documentRequired: true,
      documentType: 'CNPJ',
      reasonCodes: ['NFCE_AMOUNT_LIMIT'],
    });
    expect(decide(569, '4')).toMatchObject({
      documentRequired: true,
      addressRequired: true,
      reasonCodes: ['NFCE_NON_PRESENT_OPERATION', 'NFCE_HOME_DELIVERY'],
      message: expect.stringContaining('entregue no endereço do cliente'),
    });
    expect(decide(569, '2', 'PJ')).toMatchObject({
      documentRequired: true,
      addressRequired: true,
      documentType: 'CNPJ',
      reasonCodes: ['NFCE_NON_PRESENT_OPERATION'],
    });
    expect(decide(569, '0')).toMatchObject({ supported: false });
  });
  it('limita a regra de NF-e 55 à venda doméstica normal e não universaliza operações especiais', () => {
    const domestic = decideFiscalRecipientRequirements({
      model: '55',
      presence: '1',
      total: 1,
      personType: 'PJ',
      operationScope: 'NORMAL_DOMESTIC_SALE',
    });
    expect(domestic).toMatchObject({
      supported: true,
      documentRequired: true,
      addressRequired: true,
      documentType: 'CNPJ',
      reasonCodes: ['NFE_MODEL_55_DOMESTIC_NORMAL_SALE'],
    });
    expect(
      decideFiscalRecipientRequirements({
        model: '55',
        presence: '1',
        total: 1,
        operationScope: 'SPECIAL_OR_FOREIGN_OPERATION',
      })
    ).toMatchObject({ supported: false, reasonCodes: ['SPECIAL_FISCAL_OPERATION'] });
  });
  it('a fronteira aceita contexto declarado, mas recusa modelo escolhido pelo cliente', () => {
    const command = {
      orderId: 'TEST_UNIT',
      environment: 2,
      emissionRequestId: 'f19b3e63-6f84-45ea-8c5f-39476d709a3d',
      finalConsumer: false,
    };
    expect(parseFiscalEmissionCommand(command)).toMatchObject({
      command: { finalConsumer: false },
    });
    expect(parseFiscalEmissionCommand({ ...command, model: '65' })).toHaveProperty('error');
    expect(parseFiscalEmissionCommand({ ...command, finalConsumer: 'false' })).toHaveProperty(
      'error'
    );
    expect(
      parseFiscalEmissionCommand({ ...command, recipientTaxId: '12345678000195' })
    ).toHaveProperty('command');
    expect(
      parseFiscalEmissionCommand({ ...command, recipientTaxId: '12.ABC.345/01DE-35' })
    ).toHaveProperty('command');
    expect(
      parseFiscalEmissionCommand({ ...command, recipientTaxId: '12.ABC.345/01DE-36' })
    ).toHaveProperty('error');
  });
  it('isSameFiscalModelDecision compara decisões semânticas ignorando ordenação de chaves jsonb', async () => {
    const { isSameFiscalModelDecision } = await import(
      '../../../../../shared-utils/fiscalDocumentModel'
    );
    const inMemory = {
      status: 'ready',
      model: '65',
      reasonCode: 'RETAIL_FINAL_CONSUMER_IN_STATE',
      reasons: ['RETAIL_FINAL_CONSUMER_IN_STATE'],
      reason: 'Venda varejista para consumidor final dentro do Paraná.',
      policyVersion: 'PR_RETAIL_2026_10',
      finalConsumer: true,
    };
    // Simula objeto recuperado de coluna jsonb do Postgres onde as chaves foram reordenadas
    const fromJsonb = {
      model: '65',
      reason: 'Venda varejista para consumidor final dentro do Paraná.',
      status: 'ready',
      reasons: ['RETAIL_FINAL_CONSUMER_IN_STATE'],
      reasonCode: 'RETAIL_FINAL_CONSUMER_IN_STATE',
      finalConsumer: true,
      policyVersion: 'PR_RETAIL_2026_10',
    };
    expect(JSON.stringify(inMemory)).not.toBe(JSON.stringify(fromJsonb));
    expect(isSameFiscalModelDecision(inMemory, fromJsonb)).toBe(true);
    expect(isSameFiscalModelDecision(inMemory, { ...fromJsonb, model: '55' })).toBe(false);
  });
});
