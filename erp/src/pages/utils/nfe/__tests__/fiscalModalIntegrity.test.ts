import { describe, expect, it } from 'vitest';
import { parseFiscalEmissionCommand } from '../../../../../../api/nfe/fiscalSnapshot';
import { parseFiscalItemSelections } from '../../../../../../shared-utils/fiscalItemSelections';
const selection = { ncm: '94036000', cfop: '5102', origem: '0', cest: '', csosn: '103' };
const command = {
  orderId: 'TEST_AUT_CONTROLLED',
  environment: 2,
  emissionRequestId: 'f19b3e63-6f84-45ea-8c5f-39476d709a3d',
};
describe('contrato estrito do modal fiscal', () => {
  it.each([
    { ncm: '9403.60.00' },
    { ncm: ' 94036000' },
    { ncm: 94036000 },
    { cfop: '1102' },
    { cfop: '' },
    { origem: '9' },
    { origem: 0 },
    { cest: '28.044.00' },
    { csosn: '999' },
    { csosn: 103 },
    { vProd: 999 },
  ])('rejeita informação inválida sem normalizar: %j', (invalid) => {
    expect(() => parseFiscalItemSelections({ '1': { ...selection, ...invalid } })).toThrow();
    expect(
      parseFiscalEmissionCommand({
        ...command,
        itemFiscalSelections: { '1': { ...selection, ...invalid } },
      })
    ).toHaveProperty('error');
  });
  it('rejeita conflito entre escolhas de CSOSN e impede promoção a produção', () => {
    expect(
      parseFiscalEmissionCommand({
        ...command,
        itemCsosnOverrides: { '1': '500' },
        itemFiscalSelections: { '1': selection },
      })
    ).toHaveProperty('error');
    expect(
      parseFiscalEmissionCommand({
        ...command,
        environment: 1,
        itemFiscalSelections: { '1': selection },
      })
    ).toHaveProperty('error');
  });
  it('preserva cada campo, incluindo CEST vazio explicitamente confirmado', () => {
    const parsed = parseFiscalEmissionCommand({
      ...command,
      itemFiscalSelections: { '1': selection },
    });
    expect(parsed).toMatchObject({ command: { itemFiscalSelections: { '1': selection } } });
  });
  it.each(['123.456.789-09', '11.222.333/0001-81'])('preserva o CPF/CNPJ %s digitado no modal no comando temporário de emissão', (recipientTaxId) => {
    const parsed = parseFiscalEmissionCommand({ ...command, recipientTaxId });
    expect(parsed).toMatchObject({ command: { recipientTaxId } });
  });
  it.each(['abc12345678909', '12345678', 12345678909])('rejeita documento malformado %s', (recipientTaxId) => {
    expect(parseFiscalEmissionCommand({ ...command, recipientTaxId })).toHaveProperty('error');
  });
});
