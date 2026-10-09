import { describe, expect, it } from 'vitest';
import forge from 'node-forge';
import { signNfeXml } from '../../../../../../api/nfe/nfeSigner';
import {
  assertFiscalXmlMatchesSnapshot,
  assertFiscalXmlSignatureValid,
  FiscalXmlSnapshotMismatchError,
  type FiscalXmlSnapshotExpectation,
} from '../../../../../tests/e2e/fiscal/fiscalXmlAssertions';

const unsignedReturnXml = `<?xml version="1.0" encoding="UTF-8"?>
<NFe xmlns="http://www.portalfiscal.inf.br/nfe">
  <infNFe Id="NFe41261012345678000199550010000001231000001230" versao="4.00">
    <ide><mod>55</mod><tpAmb>2</tpAmb><tpNF>0</tpNF><finNFe>4</finNFe><nNF>123</nNF><serie>1</serie>
      <NFref><refNFe>41261012345678000199550010000001001000001001</refNFe></NFref>
    </ide>
    <emit><CNPJ>12345678000199</CNPJ><xNome>Emitente TEST_AUT</xNome>
      <enderEmit><xLgr>Rua de Teste</xLgr><nro>100</nro><xBairro>Centro</xBairro><cMun>4104808</cMun><xMun>Cascavel</xMun><UF>PR</UF><CEP>85801000</CEP><cPais>1058</cPais><xPais>Brasil</xPais></enderEmit>
    </emit>
    <dest><CNPJ>99887766000155</CNPJ><xNome>Cliente TEST_AUT</xNome>
      <enderDest><xLgr>Rua Sintética</xLgr><nro>200</nro><xBairro>Centro</xBairro><cMun>4104808</cMun><xMun>Cascavel</xMun><UF>PR</UF><CEP>85802000</CEP><cPais>1058</cPais><xPais>Brasil</xPais></enderDest>
    </dest>
    <det nItem="1"><prod><cProd>TEST_AUT_SOFA</cProd><xProd>Sofá de teste</xProd>
      <NCM>94016100</NCM><CFOP>5202</CFOP><uCom>UN</uCom><qCom>1.0000</qCom>
      <vUnCom>2000.0000000000</vUnCom><vProd>2000.00</vProd><vDesc>25.00</vDesc>
      <vFrete>10.00</vFrete>
    </prod><imposto><ICMS><ICMSSN102><orig>0</orig><CSOSN>102</CSOSN></ICMSSN102></ICMS>
      <PIS><PISOutr><CST>99</CST><vBC>2000.00</vBC><pPIS>0.0000</pPIS><vPIS>0.00</vPIS></PISOutr></PIS>
      <COFINS><COFINSOutr><CST>99</CST><vBC>2000.00</vBC><pCOFINS>0.0000</pCOFINS><vCOFINS>0.00</vCOFINS></COFINSOutr></COFINS>
    </imposto></det>
    <total><ICMSTot><vProd>2000.00</vProd><vDesc>25.00</vDesc><vFrete>10.00</vFrete>
      <vICMS>0.00</vICMS><vPIS>0.00</vPIS><vCOFINS>0.00</vCOFINS><vNF>1985.00</vNF>
    </ICMSTot></total>
    <transp><modFrete>9</modFrete></transp>
  </infNFe>
</NFe>`;

const testKeyPair = forge.pki.rsa.generateKeyPair(2048);
const testCertificate = forge.pki.createCertificate();
testCertificate.publicKey = testKeyPair.publicKey;
testCertificate.serialNumber = '01';
testCertificate.validity.notBefore = new Date('2026-01-01T00:00:00Z');
testCertificate.validity.notAfter = new Date('2027-01-01T00:00:00Z');
testCertificate.setSubject([{ name: 'commonName', value: 'Fiscal XML E2E unit fixture' }]);
testCertificate.setIssuer(testCertificate.subject.attributes);
testCertificate.sign(testKeyPair.privateKey, forge.md.sha256.create());
const certificateDer = forge.asn1.toDer(forge.pki.certificateToAsn1(testCertificate)).getBytes();
const authorizedReturnXml = signNfeXml(
  unsignedReturnXml,
  forge.pki.privateKeyToPem(testKeyPair.privateKey),
  forge.util.encode64(certificateDer)
);

const partialReturnSnapshot: FiscalXmlSnapshotExpectation = {
  model: '55',
  environment: 2,
  operation: 'return',
  number: 123,
  series: 1,
  accessKey: '41261012345678000199550010000001231000001230',
  finality: '4',
  issuerTaxId: '12.345.678/0001-99',
  issuerName: 'Emitente TEST_AUT',
  issuerAddress: {
    street: 'Rua de Teste',
    number: '100',
    neighborhood: 'Centro',
    municipalityCode: '4104808',
    city: 'Cascavel',
    state: 'PR',
    postalCode: '85801000',
    countryCode: '1058',
    country: 'Brasil',
  },
  recipientTaxId: '99.887.766/0001-55',
  recipientName: 'Cliente TEST_AUT',
  recipientAddress: {
    street: 'Rua Sintética',
    number: '200',
    neighborhood: 'Centro',
    municipalityCode: '4104808',
    city: 'Cascavel',
    state: 'PR',
    postalCode: '85802000',
    countryCode: '1058',
    country: 'Brasil',
  },
  referenceAccessKey: '41261012345678000199550010000001001000001001',
  freightMode: '9',
  items: [
    {
      code: 'TEST_AUT_SOFA',
      description: 'Sofá de teste',
      ncm: '94016100',
      cest: null,
      cfop: '5202',
      origin: '0',
      csosn: '102',
      quantity: 1,
      unitPrice: 2000,
      productTotal: 2000,
      discount: 25,
      freight: 10,
      pis: 0,
      cofins: 0,
      pisBase: 2000,
      pisRate: 0,
      cofinsBase: 2000,
      cofinsRate: 0,
    },
  ],
  totals: { products: 2000, discount: 25, freight: 10, icms: 0, pis: 0, cofins: 0, invoice: 1985 },
};

describe('comparador independente de XML fiscal', () => {
  it('aceita uma NFD parcial quando referência, produto, tributação e totais batem com o snapshot', () => {
    expect(() => assertFiscalXmlMatchesSnapshot(authorizedReturnXml, partialReturnSnapshot)).not.toThrow();
    expect(() => assertFiscalXmlSignatureValid(authorizedReturnXml)).not.toThrow();
  });

  it('identifica a quantidade divergente pelo campo e pelos valores esperado e encontrado', () => {
    const wrongQuantityXml = authorizedReturnXml.replace('<qCom>1.0000</qCom>', '<qCom>2.0000</qCom>');

    try {
      assertFiscalXmlMatchesSnapshot(wrongQuantityXml, partialReturnSnapshot);
      throw new Error('A comparação deveria falhar para a quantidade divergente.');
    } catch (error) {
      expect(error).toBeInstanceOf(FiscalXmlSnapshotMismatchError);
      expect((error as FiscalXmlSnapshotMismatchError).mismatches).toContainEqual({
        field: 'det[1].prod.qCom',
        expected: 1,
        actual: 2,
      });
    }
  });

  it('falha quando a NFD contém também um item que não foi selecionado na devolução', () => {
    const extraProductXml = authorizedReturnXml.replace(
      '</infNFe>',
      `<det nItem="2"><prod><cProd>TEST_AUT_GUARDA_ROUPA</cProd></prod></det></infNFe>`
    );

    expect(() => assertFiscalXmlMatchesSnapshot(extraProductXml, partialReturnSnapshot)).toThrow(
      /infNFe\.det\.count: esperado 1; encontrado 2/
    );
  });

  it('aponta diferenças de numeração, endereço e chave de acesso sem mascarar o campo divergente', () => {
    const snapshot = {
      ...partialReturnSnapshot,
      number: 124,
      accessKey: '41261012345678000199550010000001241000001240',
      recipientAddress: { ...partialReturnSnapshot.recipientAddress, state: 'SP' },
    };

    try {
      assertFiscalXmlMatchesSnapshot(authorizedReturnXml, snapshot);
      throw new Error('A comparação deveria detectar as diferenças do envelope e do destinatário.');
    } catch (error) {
      expect(error).toBeInstanceOf(FiscalXmlSnapshotMismatchError);
      expect((error as FiscalXmlSnapshotMismatchError).mismatches).toContainEqual({
        field: 'ide.nNF',
        expected: 124,
        actual: 123,
      });
      expect((error as FiscalXmlSnapshotMismatchError).mismatches).toContainEqual({
        field: 'dest.enderDest.UF',
        expected: 'SP',
        actual: 'PR',
      });
      expect((error as FiscalXmlSnapshotMismatchError).mismatches).toContainEqual({
        field: 'infNFe.Id',
        expected: '41261012345678000199550010000001241000001240',
        actual: '41261012345678000199550010000001231000001230',
      });
    }
  });

  it('detecta alteração feita depois da assinatura XMLDSig', () => {
    const changedAfterSigning = authorizedReturnXml.replace('<qCom>1.0000</qCom>', '<qCom>1.5000</qCom>');

    expect(() => assertFiscalXmlSignatureValid(changedAfterSigning)).toThrow(
      /assinatura XMLDSig não confere/
    );
  });
});
