import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { DOMParser, XMLSerializer } from '@xmldom/xmldom';
import { buildAuthorizedNfeDownloadXml } from '../authorizedNfeXml';
beforeAll(() => { vi.stubGlobal('DOMParser', DOMParser); vi.stubGlobal('XMLSerializer', XMLSerializer); });
afterAll(() => vi.unstubAllGlobals());
const key = '41261044512248000107550010000007101193274348';
const signedXml = `<NFe xmlns="http://www.portalfiscal.inf.br/nfe"><infNFe Id="NFe${key}" versao="4.00"><ide><tpAmb>2</tpAmb></ide></infNFe><Signature xmlns="http://www.w3.org/2000/09/xmldsig#"><SignedInfo><Reference><DigestValue>YWJjZA==</DigestValue></Reference></SignedInfo></Signature></NFe>`;
const protocol = `<protNFe versao="4.00"><infProt><tpAmb>2</tpAmb><chNFe>${key}</chNFe><nProt>141260000636733</nProt><digVal>YWJjZA==</digVal><cStat>100</cStat></infProt></protNFe>`;
const soap = `<env:Envelope xmlns:env="http://www.w3.org/2003/05/soap-envelope"><env:Body><nfeResultMsg xmlns="http://www.portalfiscal.inf.br/nfe"><retEnviNFe><cStat>104</cStat>${protocol}</retEnviNFe></nfeResultMsg></env:Body></env:Envelope>`;
const input = { signedXml, protocolXml: soap, accessKey: key, environment: 2 as const, protocolNumber: '141260000636733' };

describe('XML processado para download', () => {
  it('incorpora somente o protocolo correto e conserva os bytes assinados', () => {
    const result = buildAuthorizedNfeDownloadXml({ ...input, signedXml: `<?xml version="1.0"?>\n${signedXml}` });
    expect(result).toContain(signedXml);
    expect(result).not.toContain('Envelope');
    const parsed = new DOMParser().parseFromString(result, 'application/xml');
    expect(parsed.documentElement.localName).toBe('nfeProc');
    expect(parsed.getElementsByTagNameNS('http://www.portalfiscal.inf.br/nfe', 'protNFe').length).toBe(1);
    expect(result).toContain('141260000636733');
  });
  it('preserva um XML processado válido sem aninhar outro envelope', () => {
    const result = buildAuthorizedNfeDownloadXml(input);
    expect(buildAuthorizedNfeDownloadXml({ ...input, signedXml: result, protocolXml: null })).toBe(result);
  });
  it.each([
    ['ausente', { protocolXml: '<retConsSitNFe xmlns="http://www.portalfiscal.inf.br/nfe"><cStat>217</cStat></retConsSitNFe>' }],
    ['outra chave', { protocolXml: soap.replace(key, '4'.repeat(44)) }],
    ['outro ambiente', { protocolXml: soap.replace('<tpAmb>2</tpAmb>', '<tpAmb>1</tpAmb>') }],
    ['outro digest', { protocolXml: soap.replace('YWJjZA==', 'b3V0cm8=') }],
    ['outro protocolo', { protocolNumber: '141260000000000' }],
    ['rejeição', { protocolXml: soap.replace('<cStat>100</cStat>', '<cStat>539</cStat>') }],
    ['duplicado', { protocolXml: soap.replace(protocol, protocol + protocol) }],
    ['identidade divergente', { accessKey: '4'.repeat(44) }],
    ['entidade XML', { signedXml: '<!DOCTYPE NFe>' + signedXml }],
  ])('bloqueia download processado com %s', (_label, changed) => {
    expect(() => buildAuthorizedNfeDownloadXml({ ...input, ...changed })).toThrow();
  });
});
