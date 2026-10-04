import { describe, expect, it } from 'vitest';
import { resolveFiscalDocumentModel, resolveOrderFiscalModel, fiscalPresence, fiscalRecipientRequirements } from '../../../../../shared-utils/fiscalDocumentModel';
import { parseFiscalEmissionCommand } from '../../../../../api/nfe/fiscalSnapshot';

const normal = { issuerUf: 'PR', recipientUf: 'PR', finalConsumer: true, operationType: 'sale', total: 100, cfops: ['5102'] };
describe('política fiscal de varejo no Paraná', () => {
  it.each(['pickup','delivery'])('PF/PJ consumidor final: %s também pode usar 65', (deliveryMethod) => {
    for (const document of ['12345678909','12345678000195']) {
      expect(resolveOrderFiscalModel({ orderType:'sale', shipping: { deliveryMethod, deliveryAddress:{state:'PR'} },
        customerData:{cpfCnpj:document,fullAddress:{state:'PR'}}, fiscalContext:{finalConsumer:true} }))
        .toMatchObject({status:'ready',model:'65',reasonCode:'RETAIL_FINAL_CONSUMER_IN_STATE'});
    }
  });
  it.each([
    [{recipientUf:'SC'},'INTERSTATE_OPERATION'], [{finalConsumer:false},'RESALE'],
    [{requiresTaxCredit:true},'TAX_CREDIT_REQUIRED'], [{operationType:'return'},'RETURN'],
    [{operationType:'transfer'},'TRANSFER'], [{operationType:'shipment'},'SHIPMENT'],
    [{operationType:'goods_return'},'GOODS_RETURN'], [{operationType:'export'},'EXPORT'],
    [{operationType:'import'},'IMPORT'], [{publicAdministrationRequirement:true},'PUBLIC_ADMINISTRATION'],
    [{otherFiscalRequirement:true},'OTHER_FISCAL_REQUIREMENT'], [{total:200000},'VALUE_LIMIT'],
    [{cfops:['6102']},'INTERSTATE_OPERATION'], [{cfops:['5901']},'OTHER_FISCAL_REQUIREMENT'],
  ] as const)('escolhe 55 com motivo concreto %s', (facts, reasonCode) => {
    expect(resolveFiscalDocumentModel({...normal,...facts,cfops: [...(('cfops' in facts ? facts.cfops : normal.cfops))]}))
      .toMatchObject({status:'ready',model:'55',reasonCode});
  });
  it('limite, UF ausente e opção de consumidor final são tratados explicitamente', () => {
    expect(resolveFiscalDocumentModel({...normal,total:199999.99})).toMatchObject({model:'65'});
    expect(resolveFiscalDocumentModel({...normal,recipientUf:undefined})).toMatchObject({status:'blocked'});
    expect(resolveFiscalDocumentModel({...normal,finalConsumer:undefined})).toMatchObject({status:'blocked'});
    expect(resolveOrderFiscalModel({shipping:{deliveryMethod:'pickup'},customerData:{fullAddress:{state:'SP'}}}, {finalConsumer:true}))
      .toMatchObject({model:'55',reasonCode:'INTERSTATE_OPERATION'});
  });
  it('logística define presença e identificação, preservando o modelo', () => {
    expect(fiscalPresence('65','delivery')).toBe('1');
    expect(fiscalPresence('65','pickup')).toBe('1');
    expect(fiscalRecipientRequirements('65','4',100)).toEqual({documentRequired:false,addressRequired:true});
    expect(fiscalRecipientRequirements('65','2',100)).toEqual({documentRequired:false,addressRequired:true});
    expect(fiscalRecipientRequirements('65','1',9999.99)).toEqual({documentRequired:false,addressRequired:false});
    expect(fiscalRecipientRequirements('65','1',10000)).toEqual({documentRequired:true,addressRequired:false});
    expect(fiscalRecipientRequirements('55','1',100)).toEqual({documentRequired:true,addressRequired:true});
  });
  it('a fronteira aceita contexto declarado, mas recusa modelo escolhido pelo cliente', () => {
    const command={orderId:'TEST_UNIT',environment:2,emissionRequestId:'f19b3e63-6f84-45ea-8c5f-39476d709a3d',finalConsumer:false};
    expect(parseFiscalEmissionCommand(command)).toMatchObject({command:{finalConsumer:false}});
    expect(parseFiscalEmissionCommand({...command,model:'65'})).toHaveProperty('error');
    expect(parseFiscalEmissionCommand({...command,finalConsumer:'false'})).toHaveProperty('error');
    expect(parseFiscalEmissionCommand({...command,recipientTaxId:'12345678000195'})).toHaveProperty('command');
  });
  it('isSameFiscalModelDecision compara decisões semânticas ignorando ordenação de chaves jsonb', async () => {
    const { isSameFiscalModelDecision } = await import('../../../../../shared-utils/fiscalDocumentModel');
    const inMemory = {
      status: 'ready',
      model: '65',
      reasonCode: 'RETAIL_FINAL_CONSUMER_IN_STATE',
      reasons: ['RETAIL_FINAL_CONSUMER_IN_STATE'],
      reason: 'Venda varejista para consumidor final dentro do Paraná.',
      policyVersion: 'PR_RETAIL_2026_10',
      finalConsumer: true
    };
    // Simula objeto recuperado de coluna jsonb do Postgres onde as chaves foram reordenadas
    const fromJsonb = {
      model: '65',
      reason: 'Venda varejista para consumidor final dentro do Paraná.',
      status: 'ready',
      reasons: ['RETAIL_FINAL_CONSUMER_IN_STATE'],
      reasonCode: 'RETAIL_FINAL_CONSUMER_IN_STATE',
      finalConsumer: true,
      policyVersion: 'PR_RETAIL_2026_10'
    };
    expect(JSON.stringify(inMemory)).not.toBe(JSON.stringify(fromJsonb));
    expect(isSameFiscalModelDecision(inMemory, fromJsonb)).toBe(true);
    expect(isSameFiscalModelDecision(inMemory, { ...fromJsonb, model: '55' })).toBe(false);
  });
});
