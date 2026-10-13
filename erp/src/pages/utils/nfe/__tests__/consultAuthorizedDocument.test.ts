import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { consultAuthorizedDocument } from '../../../../../../api/nfe/consultAuthorizedDocument';

const mocks = vi.hoisted(() => ({ send: vi.fn(), certificate: vi.fn() }));
vi.mock('../../../../../../api/nfe/sefazClient', () => ({ sendSoapToSefaz: mocks.send }));
vi.mock('../../../../../../api/nfe/nfeSigner', () => ({ extractCertificateAndKey: mocks.certificate }));

const doc = {
  id: 'TEST_UNIT_DOCUMENT', order_id: 'TEST_UNIT_ORDER', modelo: '55', ambiente: 2,
  status: 'homologada', numero_protocolo: '141260000000001',
  chave_acesso: '41261012345678000195550010000000011000000000',
};
const response = (document = doc) => `<retConsSitNFe xmlns="http://www.portalfiscal.inf.br/nfe"><tpAmb>${document.ambiente}</tpAmb><cStat>100</cStat><chNFe>${document.chave_acesso}</chNFe><protNFe><infProt><tpAmb>${document.ambiente}</tpAmb><cStat>100</cStat><chNFe>${document.chave_acesso}</chNFe><nProt>${document.numero_protocolo}</nProt></infProt></protNFe></retConsSitNFe>`;

beforeEach(() => {
  vi.stubEnv('NFE_CERTIFICATE_BASE64', 'TEST_UNIT');
  mocks.certificate.mockReturnValue({ certPem: 'TEST_UNIT', privateKeyPem: 'TEST_UNIT' });
  mocks.send.mockResolvedValue(response());
});
afterEach(() => { vi.unstubAllEnvs(); vi.resetAllMocks(); });

describe('consulta atual de autorização persistida (SEFAZ simulada, sem escrita)', () => {
  it('consulta CNPJ alfanumérico sem remover letras da chave', async () => {
    const source = { ...doc, chave_acesso: '41261012ABC34501DE35550010000001061705367136' };
    mocks.send.mockResolvedValue(response(source));
    expect((await consultAuthorizedDocument(source)).body.success).toBe(true);
    expect(mocks.send).toHaveBeenCalledWith(expect.objectContaining({
      xmlPayload: expect.stringContaining(`<chNFe>${source.chave_acesso}</chNFe>`),
    }));
  });
  it.each([1, 2])('consulta o ambiente %s com chave e protocolo existentes', async (environment) => {
    const source = { ...doc, ambiente: environment, status: environment === 1 ? 'autorizada' : 'homologada' };
    mocks.send.mockResolvedValue(response(source));
    expect((await consultAuthorizedDocument(source)).body).toMatchObject({ success: true, sefazConsulted: true, state: 'authorized', environment });
    expect(mocks.send).toHaveBeenCalledWith(expect.objectContaining({
      url: `https://${environment === 2 ? 'homologacao.' : ''}nfe.sefa.pr.gov.br/nfe/NFeConsultaProtocolo4`,
      xmlPayload: expect.stringContaining(`<chNFe>${doc.chave_acesso}</chNFe>`),
    }));
  });
  it('aceita namespaces prefixados', async () => {
    mocks.send.mockResolvedValue(response().replace('xmlns=', 'xmlns:nfe=').replace(/<(\/?)([A-Za-z]+)/g, '<$1nfe:$2'));
    expect((await consultAuthorizedDocument(doc)).body.success).toBe(true);
  });
  it.each([
    ['ambiente', (xml: string) => xml.replaceAll('<tpAmb>2', '<tpAmb>1')],
    ['chave', (xml: string) => xml.replaceAll(doc.chave_acesso, '1'.repeat(44))],
    ['protocolo', (xml: string) => xml.replace(doc.numero_protocolo, '141260000000002')],
    ['ausência', (xml: string) => xml.replace('<cStat>100', '<cStat>217')],
    ['cancelamento', (xml: string) => xml.replace('<cStat>100', '<cStat>101')],
    ['XML incompleto', () => '<retConsSitNFe/>'],
  ] as const)('exige reconciliação na divergência de %s', async (_, change) => {
    const original = structuredClone(doc);
    mocks.send.mockResolvedValue(change(response()));
    expect((await consultAuthorizedDocument(doc)).body).toMatchObject({ success: false, pending: true, reconciliationRequired: true });
    expect(doc).toEqual(original);
    expect(mocks.send).toHaveBeenCalledTimes(1);
  });
  it('timeout preserva a autorização e não retransmite', async () => {
    mocks.send.mockRejectedValue(new Error('timeout'));
    expect((await consultAuthorizedDocument(doc)).body).toMatchObject({ success: false, state: 'unknown', pending: true });
    expect(mocks.send).toHaveBeenCalledTimes(1);
  });
  it('bloqueia identidade incompatível antes do SOAP', async () => {
    expect((await consultAuthorizedDocument({ ...doc, modelo: '65' })).status).toBe(409);
    expect(mocks.send).not.toHaveBeenCalled();
  });
});
