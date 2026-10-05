import https from 'node:https';
import { getCACertificates } from 'node:tls';
import forge from 'node-forge';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { extractCertificateAndKey } from '../../../../../../api/nfe/nfeSigner';
import { sendSoapToSefaz } from '../../../../../../api/nfe/sefazClient';
import { createSefazHttpsAgent } from '../../../../../../api/nfe/sefazHttpsAgent';
import { sefazTransportDiagnostic } from '../../../../../../api/nfe/sefazTransportDiagnostic';

const mocks = vi.hoisted(() => ({ post: vi.fn() }));
vi.mock('axios', () => ({
  default: {
    post: mocks.post,
    isAxiosError: (error: unknown) => Boolean((error as any)?.response),
  },
}));
let certPem: string;
let privateKeyPem: string;
let pfx: string;
beforeAll(() => {
  const pair = forge.pki.rsa.generateKeyPair({ bits: 2048, workers: 0 });
  const certificate = forge.pki.createCertificate();
  certificate.publicKey = pair.publicKey;
  certificate.serialNumber = '01';
  certificate.validity.notBefore = new Date(Date.now() - 60_000);
  certificate.validity.notAfter = new Date(Date.now() + 86_400_000);
  certificate.setSubject([{ name: 'commonName', value: 'TEST_AUT_TRANSPORT' }]);
  certificate.setIssuer(certificate.subject.attributes);
  certificate.setExtensions([{ name: 'basicConstraints', cA: false }]);
  certificate.sign(pair.privateKey, forge.md.sha256.create());
  certPem = forge.pki.certificateToPem(certificate);
  privateKeyPem = forge.pki.privateKeyToPem(pair.privateKey);
  const ca = forge.pki.createCertificate();
  ca.publicKey = pair.publicKey;
  ca.serialNumber = '02';
  ca.validity.notBefore = certificate.validity.notBefore;
  ca.validity.notAfter = certificate.validity.notAfter;
  ca.setSubject([{ name: 'commonName', value: 'TEST_AUT_CA' }]);
  ca.setIssuer(ca.subject.attributes);
  ca.setExtensions([{ name: 'basicConstraints', cA: true }]);
  ca.sign(pair.privateKey, forge.md.sha256.create());
  pfx = forge.util.encode64(
    forge.asn1
      .toDer(
        forge.pkcs12.toPkcs12Asn1(pair.privateKey, [ca, certificate], 'TEST_AUT_PASSWORD', {
          algorithm: '3des',
        })
      )
      .getBytes()
  );
});
afterEach(() => {
  vi.restoreAllMocks();
  mocks.post.mockReset();
});
const params = () => ({
  url: 'https://homologacao.nfce.sefa.pr.gov.br/nfce/NFeAutorizacao4',
  action: 'synthetic-action',
  xmlPayload: '<synthetic/>',
  certPem,
  privateKeyPem,
});

describe('transporte fiscal padrão Node mTLS', () => {
  it('limita também DNS e handshake pelo prazo total sem repetir transmissão', async () => {
    vi.spyOn(AbortSignal, 'timeout').mockReturnValue(AbortSignal.abort());
    mocks.post.mockRejectedValueOnce(
      Object.assign(new Error('PRIVATE_XML'), { code: 'ERR_CANCELED' })
    );
    let result: unknown;
    try {
      await sendSoapToSefaz(params());
    } catch (error) {
      result = error;
    }
    expect(sefazTransportDiagnostic(result)).toMatchObject({
      code: 'ETIMEDOUT',
      category: 'TIMEOUT',
      cause: [{ code: 'ERR_CANCELED' }],
    });
    expect(mocks.post).toHaveBeenCalledTimes(1);
  });
  it.each([
    'http://homologacao.nfce.sefa.pr.gov.br/nfce/NFeAutorizacao4',
    'https://homologacao.nfce.sefa.pr.gov.br.example.com/nfce/NFeAutorizacao4',
  ])('bloqueia destino não oficial %s antes do POST', async (url) => {
    await expect(sendSoapToSefaz({ ...params(), url })).rejects.toMatchObject({
      code: 'SEFAZ_ENDPOINT_INVALID',
    });
    expect(mocks.post).not.toHaveBeenCalled();
  });
  it('rejeita certificado remoto inválido em handshake TLS real isolado', async () => {
    const reachedHttp = vi.fn((_req, res) => res.end('synthetic'));
    const server = https.createServer({ cert: certPem, key: privateKeyPem }, reachedHttp);
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const port = (server.address() as import('node:net').AddressInfo).port;
    const agent = createSefazHttpsAgent(certPem, privateKeyPem);
    try {
      const error = await new Promise<Error>((resolve) => {
        const request = https.get(`https://127.0.0.1:${port}`, { agent }, (response) =>
          response.resume()
        );
        request.on('error', resolve);
        request.setTimeout(2000, () => request.destroy(new Error('synthetic timeout')));
      });
      expect(['DEPTH_ZERO_SELF_SIGNED_CERT', 'UNABLE_TO_VERIFY_LEAF_SIGNATURE']).toContain(
        (error as NodeJS.ErrnoException).code
      );
      expect(reachedHttp).not.toHaveBeenCalled();
    } finally {
      agent.destroy();
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });
  it('usa A1, confiança Node e SO, TLS 1.2 ou superior e validação habilitada', () => {
    const agent = createSefazHttpsAgent(certPem, privateKeyPem);
    expect(agent.options).toMatchObject({
      cert: certPem,
      key: privateKeyPem,
      minVersion: 'TLSv1.2',
      rejectUnauthorized: true,
    });
    expect(agent.options.ca).toEqual([
      ...new Set([...getCACertificates('default'), ...getCACertificates('system')]),
    ]);
    expect(agent.options).not.toHaveProperty('maxVersion');
    expect(agent.options).not.toHaveProperty('checkServerIdentity');
    agent.destroy();
  });
  it('carrega o PFX válido com chave correspondente e rejeita senha incorreta', () => {
    expect(extractCertificateAndKey(pfx, 'TEST_AUT_PASSWORD')).toMatchObject({
      certPem,
      privateKeyPem,
    });
    expect(() => extractCertificateAndKey(pfx, 'WRONG_PASSWORD')).toThrow();
  });
  it('recusa A1 vencido antes de abrir conexão', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(Date.now() + 2 * 86_400_000);
    await expect(sendSoapToSefaz(params())).rejects.toMatchObject({
      code: 'A1_CERTIFICATE_EXPIRED',
    });
    expect(mocks.post).not.toHaveBeenCalled();
  });
  it('recusa certificado e chave privada incompatíveis', () => {
    const differentKey = forge.pki.rsa.generateKeyPair({ bits: 2048, workers: 0 }).privateKey;
    expect(() => createSefazHttpsAgent(certPem, forge.pki.privateKeyToPem(differentKey))).toThrow(
      'incompatível'
    );
  });
  it.each([
    'ECONNRESET',
    'ETIMEDOUT',
    'EPROTO',
    'CERT_HAS_EXPIRED',
    'ERR_TLS_CERT_ALTNAME_INVALID',
    'ENOTFOUND',
  ])('preserva %s sem repetir o POST', async (code) => {
    const error = Object.assign(new Error('PRIVATE_KEY PRIVATE_XML'), { code });
    mocks.post.mockRejectedValueOnce(error);
    await expect(sendSoapToSefaz(params())).rejects.toBe(error);
    const diagnostic = sefazTransportDiagnostic(error);
    expect(diagnostic).toMatchObject({
      code,
      timeoutMs: 25000,
      model: '65',
      environment: 2,
      hostname: 'homologacao.nfce.sefa.pr.gov.br',
    });
    expect(diagnostic.durationMs).toBeGreaterThanOrEqual(0);
    expect(JSON.stringify(diagnostic)).not.toMatch(/PRIVATE/);
    expect(mocks.post).toHaveBeenCalledTimes(1);
  });
  it('recebe SOAP no único POST sem proxy ou redirect e destrói o agente', async () => {
    const xml = '<retEnviNFe><cStat>100</cStat></retEnviNFe>';
    mocks.post.mockResolvedValueOnce({ data: xml, status: 200 });
    const destroy = vi.spyOn((await import('node:https')).default.Agent.prototype, 'destroy');
    expect(await sendSoapToSefaz(params())).toBe(xml);
    expect(mocks.post.mock.calls[0][2]).toMatchObject({
      proxy: false,
      maxRedirects: 0,
      timeout: 25000,
      signal: expect.any(AbortSignal),
    });
    expect(mocks.post).toHaveBeenCalledTimes(1);
    expect(destroy).toHaveBeenCalledTimes(1);
  });
  it('distingue falha SOAP de rejeição fiscal e não expõe o conteúdo da falha', async () => {
    mocks.post.mockResolvedValueOnce({ data: '<soap:Fault>PRIVATE_XML</soap:Fault>', status: 200 });
    await expect(sendSoapToSefaz(params())).rejects.toMatchObject({ code: 'SEFAZ_SOAP_FAULT' });
    expect(mocks.post).toHaveBeenCalledTimes(1);
  });
});
