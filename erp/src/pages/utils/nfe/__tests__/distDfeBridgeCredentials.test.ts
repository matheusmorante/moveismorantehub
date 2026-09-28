import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  extractCertificateAndKey: vi.fn(),
  sendDistDfeSoapToSefaz: vi.fn(),
}));

vi.mock('../../../../../../api/nfe/nfeSigner', () => ({
  extractCertificateAndKey: mocks.extractCertificateAndKey,
}));
vi.mock('../../../../../../api/nfe/distDfeClient', () => ({
  sendDistDfeSoapToSefaz: mocks.sendDistDfeSoapToSefaz,
}));

function response() {
  let statusCode = 200;
  let body: any;
  const res: any = {
    setHeader: vi.fn(),
    status(code: number) {
      statusCode = code;
      return res;
    },
    json(value: unknown) {
      body = value;
      return res;
    },
    end: vi.fn(),
  };
  return { res, get statusCode() { return statusCode; }, get body() { return body; } };
}

describe('ponte mTLS DF-e', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SEFAZ_BRIDGE_TOKEN = 'bridge-test-token';
    process.env.NFE_CERTIFICATE_BASE64 = 'server-pfx';
    process.env.NFE_CERTIFICATE_PASSWORD = 'server-password';
    mocks.extractCertificateAndKey.mockReturnValue({ certPem: 'server-cert', privateKeyPem: 'server-key' });
    mocks.sendDistDfeSoapToSefaz.mockResolvedValue({ statusCode: 200, responseXml: '<ret/>', durationMs: 1 });
  });

  it('recusa token não configurado no servidor', async () => {
    const handler = (await import('../../../../../../api/nfe/dist-dfe')).default;
    const result = response();
    await handler({ method: 'POST', headers: { authorization: 'Bearer legacy-master-token' } } as any, result.res);
    expect(result.statusCode).toBe(401);
    expect(mocks.sendDistDfeSoapToSefaz).not.toHaveBeenCalled();
  });

  it('ignora chave privada enviada pelo cliente e usa o A1 do servidor', async () => {
    const handler = (await import('../../../../../../api/nfe/dist-dfe')).default;
    const result = response();
    await handler({
      method: 'POST',
      headers: { authorization: 'Bearer bridge-test-token' },
      body: { certPem: 'client-cert', privateKeyPem: 'client-key', soapEnvelope: '<soap/>', environment: 'homologation' },
    } as any, result.res);
    expect(result.statusCode).toBe(200);
    expect(mocks.extractCertificateAndKey).toHaveBeenCalledWith('server-pfx', 'server-password');
    expect(mocks.sendDistDfeSoapToSefaz).toHaveBeenCalledWith(expect.objectContaining({ certPem: 'server-cert', privateKeyPem: 'server-key' }));
  });
});
