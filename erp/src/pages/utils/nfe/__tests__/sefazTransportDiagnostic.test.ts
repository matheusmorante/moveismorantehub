import { describe, expect, it } from 'vitest';
import { sefazTransportDiagnostic } from '../../../../../../api/nfe/sefazTransportDiagnostic';
describe('diagnóstico de transporte SEFAZ sem dados sensíveis', () => {
  it('preserva somente código conhecido, status e motivo TLS permitido', () => {
    const result = sefazTransportDiagnostic({
      code: 'EPROTO',
      message: 'tlsv1 alert unknown ca SECRET',
      response: { status: 502, data: 'PRIVATE_XML' },
      config: { key: 'PRIVATE_KEY', cert: 'PRIVATE_CERT' },
    });
    expect(result).toMatchObject({
      code: 'EPROTO',
      httpStatus: 502,
      tlsReason: 'PEER_UNKNOWN_CA',
      category: 'TLS_FAILURE',
      message: 'TLS_FAILURE: PEER_UNKNOWN_CA',
    });
  });
  it('descarta códigos, mensagens e respostas arbitrários', () => {
    expect(
      sefazTransportDiagnostic({
        code: 'SECRET',
        message: 'PRIVATE_XML',
        response: { status: 'SECRET' },
      })
    ).toMatchObject({ code: 'UNKNOWN_TRANSPORT_ERROR' });
    expect(sefazTransportDiagnostic(null)).toMatchObject({ code: 'UNKNOWN_TRANSPORT_ERROR' });
  });

  it('registra contexto da conexão e causas sem exportar requests, mensagens ou secrets', () => {
    const result = sefazTransportDiagnostic({
      code: 'UND_ERR_CONNECT_TIMEOUT',
      errno: -110,
      syscall: 'connect',
      message: 'PRIVATE_XML PRIVATE_KEY',
      sefazTransportContext: {
        endpoint: 'https://homologacao.nfce.sefa.pr.gov.br/nfce/NFeAutorizacao4?token=SECRET',
        phase: 'tls',
        tlsProtocol: 'TLSv1.3',
        model: '65',
        environment: 2,
        peerCertificate: {
          subjectCN: 'homologacao.nfce.sefa.pr.gov.br',
          issuerCN: 'TEST_AUT_CA',
          fingerprint256: Array(32).fill('AB').join(':'),
        },
        durationMs: 25007,
        timeoutMs: 25000,
      },
      cause: { code: 'ERR_SSL_TLSV1_ALERT_UNKNOWN_CA', message: 'PRIVATE_CERT', config: 'SECRET' },
      config: { cert: 'PRIVATE_CERT', key: 'PRIVATE_KEY' },
    });
    expect(result).toMatchObject({
      code: 'UND_ERR_CONNECT_TIMEOUT',
      errno: -110,
      syscall: 'connect',
      hostname: 'homologacao.nfce.sefa.pr.gov.br',
      endpoint: 'https://homologacao.nfce.sefa.pr.gov.br/nfce/NFeAutorizacao4',
      phase: 'tls',
      tlsProtocol: 'TLSv1.3',
      model: '65',
      environment: 2,
      peerCertificate: { subjectCN: 'homologacao.nfce.sefa.pr.gov.br', issuerCN: 'TEST_AUT_CA' },
      durationMs: 25007,
      timeoutMs: 25000,
      cause: [{ code: 'ERR_SSL_TLSV1_ALERT_UNKNOWN_CA' }],
    });
    expect(JSON.stringify(result)).not.toMatch(/SECRET|PRIVATE/);
  });
  it.each([
    ['ENOTFOUND', 'DNS_FAILURE'],
    ['ECONNREFUSED', 'TCP_FAILURE'],
    ['ECONNRESET', 'SOCKET_RESET'],
    ['ETIMEDOUT', 'TIMEOUT'],
    ['ERR_SSL_WRONG_VERSION_NUMBER', 'TLS_FAILURE'],
    ['A1_KEY_MISMATCH', 'MTLS_CLIENT_CERTIFICATE'],
  ])('distingue %s como %s', (code, category) => {
    expect(sefazTransportDiagnostic({ code })).toMatchObject({ code, category });
  });
  it('separa HTTP e SOAP e descarta certificados integrais', () => {
    expect(
      sefazTransportDiagnostic({ code: 'ERR_BAD_RESPONSE', response: { status: 503 } })
    ).toMatchObject({ category: 'HTTP_ERROR', httpStatus: 503 });
    const result = sefazTransportDiagnostic({
      code: 'ERR_BAD_RESPONSE',
      response: { status: 500, data: '<soap:Fault>PRIVATE_XML</soap:Fault>' },
      sefazTransportContext: {
        peerCertificate: { subjectCN: '-----BEGIN PRIVATE KEY-----\nSECRET' },
      },
    });
    expect(result).toMatchObject({ code: 'SEFAZ_SOAP_FAULT', category: 'SOAP_FAULT' });
    expect(JSON.stringify(result)).not.toMatch(/PRIVATE|SECRET/);
  });
});
