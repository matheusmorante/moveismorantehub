import { beforeAll, describe, expect, it } from 'vitest';
import forge from 'node-forge';
import { signNfeEventXml } from '../../../../../../api/nfe/nfeSigner';
import { validateCancellationAgainstOfficialSchema } from '../../../../../../api/nfe/schemaValidator';

let privateKey: string;
beforeAll(() => {
  privateKey = forge.pki.privateKeyToPem(
    forge.pki.rsa.generateKeyPair({ bits: 2048, workers: 0 }).privateKey
  );
});
const key = (model: string) => `41261012345678000195${model}0010000000011000000000`;
const expected = (model = '55', environment = 2) => ({
  accessKey: key(model),
  environment,
  protocol: '141260000000001',
});
const unsigned = (model = '55', environment = 2) =>
  `<envEvento xmlns="http://www.portalfiscal.inf.br/nfe" versao="1.00"><idLote>123</idLote><evento versao="1.00"><infEvento Id="ID110111${key(model)}01"><cOrgao>41</cOrgao><tpAmb>${environment}</tpAmb><CNPJ>12345678000195</CNPJ><chNFe>${key(model)}</chNFe><dhEvento>2026-10-13T10:00:00-03:00</dhEvento><tpEvento>110111</tpEvento><nSeqEvento>1</nSeqEvento><verEvento>1.00</verEvento><detEvento versao="1.00"><descEvento>Cancelamento</descEvento><nProt>141260000000001</nProt><xJust>Cancelamento antes da circulação da mercadoria</xJust></detEvento></infEvento></evento></envEvento>`;
const signed = (xml: string) =>
  signNfeEventXml(xml, privateKey, Buffer.from('synthetic certificate').toString('base64'));

describe('XSD oficial do cancelamento, envelope e detalhe', () => {
  it('valida evento assinado com CNPJ e chave alfanuméricos', async () => {
    const accessKey = '41261012ABC34501DE35550010000001061705367136';
    const xml = unsigned().replaceAll(key('55'), accessKey).replace('<CNPJ>12345678000195</CNPJ>', '<CNPJ>12ABC34501DE35</CNPJ>');
    await expect(validateCancellationAgainstOfficialSchema(signed(xml), { ...expected(), accessKey })).resolves.toBeUndefined();
  });
  it.each([
    ['55', 1],
    ['55', 2],
    ['65', 1],
    ['65', 2],
  ] as const)('aceita evento assinado modelo %s ambiente %s', async (model, environment) => {
    const xml = signed(unsigned(model, environment));
    await expect(
      validateCancellationAgainstOfficialSchema(xml, expected(model, environment))
    ).resolves.toBeUndefined();
    expect(xml).toContain('<Signature');
  });
  it('rejeita ausência de assinatura', async () => {
    await expect(validateCancellationAgainstOfficialSchema(unsigned(), expected())).rejects.toThrow(
      'schema oficial'
    );
  });
  it.each([
    [
      'justificativa',
      '<xJust>Cancelamento antes da circulação da mercadoria</xJust>',
      '<xJust>curto</xJust>',
    ],
    ['protocolo', '<nProt>141260000000001</nProt>', '<nProt>123</nProt>'],
    ['timestamp', '2026-10-13T10:00:00-03:00', '2026-10-13T13:00:00.000Z'],
    ['evento', '<tpEvento>110111</tpEvento>', '<tpEvento>110110</tpEvento>'],
    ['sequência', '<nSeqEvento>1</nSeqEvento>', '<nSeqEvento>2</nSeqEvento>'],
    ['ambiente', '<tpAmb>2</tpAmb>', '<tpAmb>1</tpAmb>'],
    [
      'ordem detalhe',
      '<descEvento>Cancelamento</descEvento><nProt>141260000000001</nProt>',
      '<nProt>141260000000001</nProt><descEvento>Cancelamento</descEvento>',
    ],
  ])('rejeita %s inválido antes do envio', async (_name, from, to) => {
    await expect(
      validateCancellationAgainstOfficialSchema(signed(unsigned().replace(from, to)), expected())
    ).rejects.toThrow();
  });
  it('recusa entidades externas', async () => {
    await expect(
      validateCancellationAgainstOfficialSchema(
        `<!DOCTYPE x SYSTEM "file:///private">${unsigned()}`,
        expected()
      )
    ).rejects.toThrow('não permitida');
  });
});
