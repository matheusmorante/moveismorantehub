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
    expect(result).toEqual({ code: 'EPROTO', httpStatus: 502, tlsReason: 'PEER_UNKNOWN_CA' });
  });
  it('descarta códigos, mensagens e respostas arbitrários', () => {
    expect(
      sefazTransportDiagnostic({
        code: 'SECRET',
        message: 'PRIVATE_XML',
        response: { status: 'SECRET' },
      })
    ).toEqual({ code: 'UNKNOWN_TRANSPORT_ERROR' });
    expect(sefazTransportDiagnostic(null)).toEqual({ code: 'UNKNOWN_TRANSPORT_ERROR' });
  });
});
