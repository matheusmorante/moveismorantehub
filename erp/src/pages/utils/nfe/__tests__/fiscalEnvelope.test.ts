import { describe, expect, it } from 'vitest';
import { validateOrdinaryOutboundEnvelope } from '../fiscalEnvelope';

const accessKey = '1'.repeat(44);
const input = {
    xml: `<NFe><infNFe Id="NFe${accessKey}"><ide><mod>55</mod><serie>1</serie><nNF>701</nNF><tpNF>1</tpNF><tpAmb>2</tpAmb><finNFe>1</finNFe></ide></infNFe></NFe>`,
    accessKey, model: '55' as const, environment: 2 as const, nfeNumber: 701, series: '1',
};

describe('separação das rotas fiscais', () => {
    it('aceita o envelope da saída normal', () => {
        expect(validateOrdinaryOutboundEnvelope(input)).toBeNull();
    });
    it.each(['3', '4'])('não deixa finalidade %s passar pela rota de saída normal', (finalidade) => {
        expect(validateOrdinaryOutboundEnvelope({ ...input,
            xml: input.xml.replace('<finNFe>1</finNFe>', `<finNFe>${finalidade}</finNFe>`),
        })).toMatch(/revisão fiscal própria/);
    });
    it('rejeita divergência de chave e numeração', () => {
        expect(validateOrdinaryOutboundEnvelope({ ...input, accessKey: '2'.repeat(44) })).toMatch(/não corresponde/);
        expect(validateOrdinaryOutboundEnvelope({ ...input, nfeNumber: 702 })).toMatch(/não corresponde/);
    });
});
