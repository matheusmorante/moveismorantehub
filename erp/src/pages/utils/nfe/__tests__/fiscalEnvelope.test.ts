import { describe, expect, it } from 'vitest';
import { validateOrdinaryOutboundEnvelope } from '../fiscalEnvelope';

const accessKey = '1'.repeat(44);
const input = {
  xml: `<NFe><infNFe Id="NFe${accessKey}"><ide><mod>55</mod><serie>1</serie><nNF>701</nNF><tpNF>1</tpNF><tpAmb>2</tpAmb><finNFe>1</finNFe></ide></infNFe></NFe>`,
  accessKey,
  model: '55' as const,
  environment: 2 as const,
  nfeNumber: 701,
  series: '1',
};

describe('separação das rotas fiscais', () => {
  it('aceita o envelope da saída normal', () => {
    expect(validateOrdinaryOutboundEnvelope(input)).toBeNull();
  });
  it.each(['3', '4'])('não deixa finalidade %s passar pela rota de saída normal', (finalidade) => {
    expect(
      validateOrdinaryOutboundEnvelope({
        ...input,
        xml: input.xml.replace('<finNFe>1</finNFe>', `<finNFe>${finalidade}</finNFe>`),
      })
    ).toMatch(/revisão fiscal própria/);
  });
  it.each(['refNFe', 'refNFeSig'])(
    'bloqueia NF-e de saída modelo 55 referenciando NFC-e 65 via %s',
    (referenceTag) => {
      const nfceAccessKey = `${'1'.repeat(20)}65${'1'.repeat(22)}`;
      const xml = input.xml.replace(
        '</ide>',
        `<NFref><${referenceTag}>${nfceAccessKey}</${referenceTag}></NFref></ide>`
      );
      expect(validateOrdinaryOutboundEnvelope({ ...input, xml })).toMatch(
        /não pode referenciar chave de NFC-e modelo 65/
      );
    }
  );
  it('permite NF-e de saída modelo 55 referenciando outra NF-e 55', () => {
    const nfeAccessKey = `${'1'.repeat(20)}55${'1'.repeat(22)}`;
    const xml = input.xml.replace(
      '</ide>',
      `<NFref><refNFe>${nfeAccessKey}</refNFe></NFref></ide>`
    );
    expect(validateOrdinaryOutboundEnvelope({ ...input, xml })).toBeNull();
  });
  it('rejeita divergência de chave e numeração', () => {
    expect(validateOrdinaryOutboundEnvelope({ ...input, accessKey: '2'.repeat(44) })).toMatch(
      /não corresponde/
    );
    expect(validateOrdinaryOutboundEnvelope({ ...input, nfeNumber: 702 })).toMatch(
      /não corresponde/
    );
  });
  it('aceita o XML assinado persistido da mesma tentativa para reconciliação/retry', () => {
    const signedXml = input.xml.replace(
      '</NFe>',
      '<Signature>assinatura-original</Signature></NFe>'
    );
    expect(validateOrdinaryOutboundEnvelope({ ...input, xml: signedXml })).toBeNull();
  });
});
