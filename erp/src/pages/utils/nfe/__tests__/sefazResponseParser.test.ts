import { describe, expect, it } from 'vitest';
import { parseSefazAuthorization } from '../sefazResponseParser';

describe('SEFAZ synchronous authorization response', () => {
    it('only treats protocol cStat 100 as authorization when batch cStat is 104', () => {
        const result = parseSefazAuthorization('<retEnviNFe><cStat>104</cStat><xMotivo>Lote processado</xMotivo><protNFe><infProt><cStat>100</cStat><xMotivo>Autorizado o uso da NF-e</xMotivo><nProt>141260000123456</nProt><dhRecbto>2026-09-26T12:00:00-03:00</dhRecbto></infProt></protNFe></retEnviNFe>');
        expect(result).toMatchObject({ authorized: true, pending: false, cStat: '100', xMotivo: 'Autorizado o uso da NF-e', protocolNumber: '141260000123456' });
    });

    it('handles namespace-prefixed SEFAZ response elements', () => {
        const result = parseSefazAuthorization('<soap:Envelope><soap:Body><n:retEnviNFe><n:cStat>104</n:cStat><n:protNFe><n:infProt><n:cStat>100</n:cStat><n:xMotivo>Autorizada</n:xMotivo><n:nProt>141260000123456</n:nProt></n:infProt></n:protNFe></n:retEnviNFe></soap:Body></soap:Envelope>');
        expect(result).toMatchObject({ authorized: true, cStat: '100', xMotivo: 'Autorizada' });
    });

    it('keeps received-but-unresolved batches pending, not authorized', () => {
        expect(parseSefazAuthorization('<retEnviNFe><cStat>104</cStat><xMotivo>Lote processado</xMotivo></retEnviNFe>'))
            .toMatchObject({ authorized: false, pending: true, cStat: '104' });
        expect(parseSefazAuthorization('<retEnviNFe><cStat>103</cStat><xMotivo>Lote recebido</xMotivo></retEnviNFe>'))
            .toMatchObject({ authorized: false, pending: true, cStat: '103' });
    });

    it('returns SEFAZ rejection details without authorizing', () => {
        const result = parseSefazAuthorization('<retEnviNFe><cStat>104</cStat><protNFe><infProt><cStat>204</cStat><xMotivo>Duplicidade de NF-e</xMotivo></infProt></protNFe></retEnviNFe>');
        expect(result).toMatchObject({ authorized: false, pending: false, cStat: '204', xMotivo: 'Duplicidade de NF-e' });
    });
});
