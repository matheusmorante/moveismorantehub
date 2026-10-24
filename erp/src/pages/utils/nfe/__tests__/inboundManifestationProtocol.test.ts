import { describe, expect, it } from 'vitest';
import { buildInboundScienceEventElement } from '../../../../../../api/nfe/inboundManifestationProtocol';

describe('buildInboundScienceEventElement', () => {
  it('aceita destinatário diferente do CNPJ emitente que compõe a chave', () => {
    const issuerCnpj = '12345678000190';
    const recipientCnpj = 'AB12CD34EF5601';
    const accessKey = `412610${issuerCnpj}55${'001'}${'000000001'}1${'00000001'}0`;

    expect(accessKey).toHaveLength(44);
    expect(accessKey.slice(6, 20)).toBe(issuerCnpj);
    expect(() => buildInboundScienceEventElement({ accessKey, environment: 1, recipientCnpj })).not.toThrow();

    const event = buildInboundScienceEventElement({ accessKey, environment: 1, recipientCnpj });
    expect(event).toContain(`<CNPJ>${recipientCnpj}</CNPJ>`);
    expect(event).toContain(`<chNFe>${accessKey}</chNFe>`);
  });
});
