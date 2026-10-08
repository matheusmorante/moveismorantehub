import { describe, expect, it } from 'vitest';
import {
  MISSING_AUTHORIZED_ORIGINAL_NFE_MESSAGE,
  resolveFiscalReturnMethod,
  validateAuthorizedOutboundNfe,
  validateSupportedReturnEntryScenario,
} from '../../../../../../api/nfe/returnFiscalRules';
import { generateNfeAccessKey } from '../nfeAccessKey';
import {
  getFiscalFormRules,
  getFiscalFormXmlDefaults,
  getReturnCfopOptionsForSourceItem,
  RETURN_TAX_MATRIX_REQUIRED_MESSAGE,
  validateReturnTaxScenario,
} from '../../../../../../shared-utils/fiscalOperationContext';

const orderId = '11111111-1111-4111-8111-111111111111';
const companyCnpj = '44512248000107';
const companyTaxRegime = '1';
const originalProtocol = '141260000123456';
const accessKey = generateNfeAccessKey({
  ufCode: '41',
  yearMonth: '2610',
  cnpj: companyCnpj,
  model: '55',
  series: '1',
  number: 700,
  emissionType: '1',
  randomCode: '12345678',
}).accessKey;

function authorizedSource() {
  return {
    id: '22222222-2222-4222-8222-222222222222',
    order_id: orderId,
    document_type: 'outbound',
    status: 'autorizada',
    ambiente: 1,
    modelo: '55',
    chave_acesso: accessKey,
    numero_nfe: 700,
    serie: '1',
    numero_protocolo: originalProtocol,
    xml_protocolo: `<protNFe><infProt><tpAmb>1</tpAmb><cStat>100</cStat><chNFe>${accessKey}</chNFe><nProt>${originalProtocol}</nProt></infProt></protNFe>`,
    xml_nfe: `<NFe><infNFe Id="NFe${accessKey}"><ide><tpAmb>1</tpAmb><mod>55</mod><serie>1</serie><nNF>700</nNF></ide><emit><CNPJ>${companyCnpj}</CNPJ><CRT>${companyTaxRegime}</CRT></emit></infNFe></NFe>`,
  };
}

const sameStateNonTaxpayerFinalConsumer =
  '<NFe><infNFe><ide><indFinal>1</indFinal></ide><emit><CRT>1</CRT></emit><dest><UF>PR</UF><indIEDest>9</indIEDest></dest></infNFe></NFe>';

describe('regras fiscais centralizadas da NF-e de devolução', () => {
  it('fixa o modelo, finalidade, natureza e tipo de operação da NF-e de estorno', () => {
    const rules = getFiscalFormRules('estorno');
    expect(rules.allowedModels).toEqual(['55']);
    expect(rules.allowedFinalidades).toEqual([3]);
    expect(rules.fixedValues).toMatchObject({ finalidade: 3, tpNF: 0, natOp: 'Nota Fiscal de Estorno' });
    expect(rules.natureOptions).toEqual([
      { value: 'Nota Fiscal de Estorno', label: 'Nota Fiscal de Estorno' },
    ]);
    expect(rules.readOnlyFields).toContain('natureOfOperation');
    expect(rules.requiredFields).toContain('natureOfOperation');
  });

  it('aceita somente NF-e 55 autorizada, protocolada, íntegra e vinculada ao mesmo pedido', () => {
    expect(validateAuthorizedOutboundNfe(authorizedSource(), orderId, 1)).toBeNull();
    expect(validateAuthorizedOutboundNfe(authorizedSource(), '33333333-3333-4333-8333-333333333333', 1))
      .toBe(MISSING_AUTHORIZED_ORIGINAL_NFE_MESSAGE);

    const rejected = { ...authorizedSource(), status: 'rejeitada' };
    expect(validateAuthorizedOutboundNfe(rejected, orderId, 1)).toBe(
      MISSING_AUTHORIZED_ORIGINAL_NFE_MESSAGE
    );
  });

  it('rejeita modelo, ambiente ou prova SEFAZ divergentes', () => {
    expect(validateAuthorizedOutboundNfe({ ...authorizedSource(), modelo: '65' }, orderId, 1))
      .toBe(MISSING_AUTHORIZED_ORIGINAL_NFE_MESSAGE);
    expect(validateAuthorizedOutboundNfe(authorizedSource(), orderId, 2))
      .toBe(MISSING_AUTHORIZED_ORIGINAL_NFE_MESSAGE);
    expect(validateAuthorizedOutboundNfe({ ...authorizedSource(), xml_protocolo: '<retEnviNFe><cStat>104</cStat></retEnviNFe>' }, orderId, 1))
      .toBe(MISSING_AUTHORIZED_ORIGINAL_NFE_MESSAGE);
  });

  it('aceita NFC-e como origem somente na validação específica de estorno', () => {
    const nfceKey = generateNfeAccessKey({
      ufCode: '41',
      yearMonth: '2610',
      cnpj: companyCnpj,
      model: '65',
      series: '1',
      number: 700,
      emissionType: '1',
      randomCode: '12345678',
    }).accessKey;
    const source = authorizedSource();
    const nfceSource = {
      ...source,
      modelo: '65',
      chave_acesso: nfceKey,
      xml_protocolo: source.xml_protocolo.replace(accessKey, nfceKey),
      xml_nfe: source.xml_nfe
        .replace('NFe' + accessKey, 'NFe' + nfceKey)
        .replace(accessKey, nfceKey)
        .replace('<mod>55</mod>', '<mod>65</mod>'),
    };

    expect(validateAuthorizedOutboundNfe(nfceSource, orderId, 1)).toBe(
      MISSING_AUTHORIZED_ORIGINAL_NFE_MESSAGE
    );
    expect(
      validateAuthorizedOutboundNfe(nfceSource, orderId, 1, { allowNfceSource: true })
    ).toBeNull();
  });

  it('distingue bloqueios de capacidade do ERP e não infere método logístico pelo status', () => {
    expect(validateSupportedReturnEntryScenario(sameStateNonTaxpayerFinalConsumer, 'PR', 'CLIENT_DELIVERED', companyTaxRegime)).toBeNull();
    expect(validateSupportedReturnEntryScenario(sameStateNonTaxpayerFinalConsumer, 'PR', 'COMPANY_PICKUP', companyTaxRegime)).toBeNull();
    expect(resolveFiscalReturnMethod({ returnMethod: 'store_delivery' })).toBe('CLIENT_DELIVERED');
    expect(resolveFiscalReturnMethod({ returnMethod: 'store_collection' })).toBe('COMPANY_PICKUP');
    expect(resolveFiscalReturnMethod({})).toBeNull();
    expect(validateSupportedReturnEntryScenario(
      sameStateNonTaxpayerFinalConsumer.replace('<UF>PR</UF>', '<UF>SC</UF>'),
      'PR',
      'CLIENT_DELIVERED',
      companyTaxRegime
    )).toMatch(/TEMPORARY_BLOCK.*interestadual/);
    expect(validateSupportedReturnEntryScenario(
      sameStateNonTaxpayerFinalConsumer.replace('<indIEDest>9</indIEDest>', '<indIEDest>1</indIEDest>'),
      'PR',
      'CLIENT_DELIVERED',
      companyTaxRegime
    )).toMatch(/UNSUPPORTED_BY_ERP.*contribuinte do ICMS/);
    expect(validateSupportedReturnEntryScenario(
      sameStateNonTaxpayerFinalConsumer.replace('<indFinal>1</indFinal>', '<indFinal>0</indFinal>'),
      'PR',
      'CLIENT_DELIVERED',
      companyTaxRegime
    )).toMatch(/UNSUPPORTED_BY_ERP.*consumidor final/);
    expect(validateSupportedReturnEntryScenario(
      sameStateNonTaxpayerFinalConsumer,
      'PR',
      null,
      companyTaxRegime
    )).toMatch(/UNSUPPORTED_BY_ERP.*método de retorno/);
  });

  it('expõe somente finalidade/modelo/pagamento/transporte de devolução e CFOP por origem/ST', () => {
    const rules = getFiscalFormRules('return', { scope: 'internal', returnMethod: 'CLIENT_DELIVERED' });
    expect(rules.allowedModels).toEqual(['55']);
    expect(rules.allowedFinalidades).toEqual([4]);
    expect(rules.fixedValues).toMatchObject({ finalidade: 4, tpNF: 0, idDest: 1, tPag: '90', modFrete: '4' });
    expect(rules.allowedPaymentOptions).toEqual([{ value: '90', label: 'Sem pagamento' }]);
    expect(rules.natureOptions).toEqual([
      { value: 'Devolução de mercadoria', label: 'Devolução de mercadoria' },
    ]);
    expect(rules.readOnlyFields).toEqual(expect.arrayContaining([
      'purpose', 'model', 'environment', 'natureOfOperation', 'recipient', 'totals',
      'payment', 'transport', 'originalDocumentReference', 'originalItemReference',
      'additionalInformation',
    ]));
    expect(rules.hiddenFields).toEqual(expect.arrayContaining([
      'salePaymentMethods', 'normalPurposeOptions', 'estornoReason',
    ]));
    expect(getFiscalFormXmlDefaults(rules)).toEqual({
      natureOfOperation: 'Devolução de mercadoria',
      paymentXml: '<pag><detPag><tPag>90</tPag><vPag>0.00</vPag></detPag></pag>',
      transportXml: '<transp><modFrete>4</modFrete></transp>',
    });
    expect(rules.requiredFields).toEqual(expect.arrayContaining([
      'purpose', 'model', 'environment', 'recipient', 'items', 'taxes', 'transport', 'payment',
      'natureOfOperation', 'totals', 'originalDocumentReference', 'originalItemReference',
    ]));
    const collectionRules = getFiscalFormRules('return', {
      scope: 'internal',
      returnMethod: 'COMPANY_PICKUP',
    });
    expect(collectionRules.allowedTransportModes).toEqual([{
      value: '3',
      label: 'Transporte próprio por conta do emitente (coleta da empresa)',
    }]);
    expect(getFiscalFormXmlDefaults(collectionRules)?.transportXml)
      .toBe('<transp><modFrete>3</modFrete></transp>');

    const interstateRules = getFiscalFormRules('return', {
      issuerUf: 'PR',
      recipientUf: 'SC',
      returnMethod: 'CLIENT_DELIVERED',
    });
    expect(interstateRules.availability).toBe('TEMPORARY_BLOCK');
    expect(interstateRules.allowedCfops.map((item) => item.value)).toEqual(['2202', '2201', '2411']);
    expect(getFiscalFormXmlDefaults(interstateRules)).toBeNull();

    expect(getReturnCfopOptionsForSourceItem('5102', '<imposto><ICMS><ICMSSN102/></ICMS></imposto>').map((item) => item.value))
      .toEqual(['1202']);
    expect(getReturnCfopOptionsForSourceItem('5101', '<imposto><ICMS><ICMSSN102/></ICMS></imposto>').map((item) => item.value))
      .toEqual(['1201']);
    expect(getReturnCfopOptionsForSourceItem('5405', '<imposto><ICMS><ICMSSN500/></ICMS></imposto>').map((item) => item.value))
      .toEqual(['1411']);
    expect(getReturnCfopOptionsForSourceItem('6102', '<imposto><ICMS><ICMSSN102/></ICMS></imposto>').map((item) => item.value))
      .toEqual(['2202']);
    expect(getReturnCfopOptionsForSourceItem('6101', '<imposto><ICMS><ICMSSN102/></ICMS></imposto>').map((item) => item.value))
      .toEqual(['2201']);
  });

  it('bloqueia base ou valor tributário diferente de zero sem matriz de devolução aprovada', () => {
    expect(validateReturnTaxScenario('', '<imposto><ICMS><ICMS00><vBC>100.00</vBC><vICMS>18.00</vICMS></ICMS00></ICMS></imposto>'))
      .toBe(RETURN_TAX_MATRIX_REQUIRED_MESSAGE);
    expect(validateReturnTaxScenario(
      '<NFe><total><ICMSTot><vBC>100.00</vBC><vICMS>18.00</vICMS><vProd>100.00</vProd><vNF>100.00</vNF></ICMSTot></total></NFe>',
      '<imposto><ICMS><ICMSSN102/></ICMS></imposto>'
    )).toBe(RETURN_TAX_MATRIX_REQUIRED_MESSAGE);
    expect(validateReturnTaxScenario(
      '<NFe><total><ICMSTot><vBC>0.00</vBC><vICMS>0.00</vICMS><vProd>100.00</vProd><vNF>100.00</vNF></ICMSTot></total></NFe>',
      '<imposto><ICMS><ICMSSN102><orig>0</orig><CSOSN>102</CSOSN></ICMSSN102></ICMS></imposto>'
    )).toBeNull();
    expect(validateReturnTaxScenario(
      '<NFe><total><ICMSTot><vProd>100.00</vProd><vNF>100.00</vNF></ICMSTot><IBSCBSTot><vIBS>2.00</vIBS></IBSCBSTot></total></NFe>',
      '<imposto><ICMS><ICMSSN102/></ICMS></imposto>'
    )).toBe(RETURN_TAX_MATRIX_REQUIRED_MESSAGE);
    expect(validateReturnTaxScenario(
      '<NFe><total><vNFTot>100.00</vNFTot></total></NFe>',
      '<imposto><ICMS><ICMSSN102/></ICMS></imposto>'
    )).toBeNull();
  });
});
