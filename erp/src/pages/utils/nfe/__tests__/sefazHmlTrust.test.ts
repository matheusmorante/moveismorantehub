import { X509Certificate } from 'node:crypto';
import { getCACertificates } from 'node:tls';
import { describe, expect, it } from 'vitest';
import { hmlSefazTrust, ICP_BRASIL_V10 } from '../../../../../../api/nfe/sefazHmlTrust';
describe('autoridade TLS oficial somente na SEFAZ-PR de homologação', () => {
  it('usa a raiz oficial autenticada, CA válida e com assinatura própria íntegra', () => {
    const certificate = new X509Certificate(ICP_BRASIL_V10);
    expect(certificate.fingerprint256).toBe('6E:0B:FF:06:9A:26:99:4C:15:DE:2C:48:88:CC:54:AF:84:88:2E:54:95:B7:FB:F6:6B:E9:CC:FF:EC:74:89:F6');
    expect(certificate.ca).toBe(true);
    expect(certificate.verify(certificate.publicKey)).toBe(true);
    expect(Date.parse(certificate.validTo)).toBeGreaterThan(Date.now());
  });
  it('preserva as autoridades padrão e adiciona a raiz específica no host HML', () => {
    expect(hmlSefazTrust('https://homologacao.nfe.sefa.pr.gov.br/nfe/NFeConsultaProtocolo4'))
      .toEqual([...getCACertificates('default'), ICP_BRASIL_V10]);
  });
  it.each(['https://nfe.sefa.pr.gov.br/nfe/NFeAutorizacao4', 'http://homologacao.nfe.sefa.pr.gov.br/',
    'https://homologacao.nfe.sefa.pr.gov.br.example.com/', 'https://example.com/'])(
    'não altera confiança para %s', (url) => expect(hmlSefazTrust(url)).toBeUndefined());
});
