import { describe, expect, it } from 'vitest';
import forge from 'node-forge';
import { generateNfeAccessKey } from '../nfeAccessKey';
import { signNfeXml } from '../../../../../../api/nfe/nfeSigner';
import {
  assertSignedFiscalXmlMatchesSnapshot,
  fiscalPreviewFingerprint,
  FiscalXmlAuditError,
} from '../../../../../../api/nfe/fiscalXmlAudit';
import type {
  FiscalDocument,
  FiscalSnapshotCandidate,
} from '../../../../../../api/nfe/fiscalSnapshot';

const keyPair = forge.pki.rsa.generateKeyPair(2048);
const certificate = forge.pki.createCertificate();
certificate.publicKey = keyPair.publicKey;
certificate.serialNumber = '01';
certificate.validity.notBefore = new Date('2026-01-01T00:00:00Z');
certificate.validity.notAfter = new Date('2027-01-01T00:00:00Z');
certificate.setSubject([{ name: 'commonName', value: 'Fiscal XML audit unit fixture' }]);
certificate.setIssuer(certificate.subject.attributes);
certificate.sign(keyPair.privateKey, forge.md.sha256.create());
const certificatePem = forge.pki.certificateToPem(certificate);
const privateKeyPem = forge.pki.privateKeyToPem(keyPair.privateKey);
const certificateDerBase64 = forge.util.encode64(
  forge.asn1.toDer(forge.pki.certificateToAsn1(certificate)).getBytes()
);

const issuedAt = '2026-10-09T12:00:00-03:00';
const identity = generateNfeAccessKey({
  ufCode: '41',
  yearMonth: '2610',
  cnpj: '12345678000199',
  model: '55',
  series: '1',
  number: 42,
  emissionType: '1',
  randomCode: '12345678',
});
const itemData = [
  { code: 'TEST_AUT_SOFA', description: 'Sofá sintético', quantity: 1, unitPrice: 2000 },
  { code: 'TEST_AUT_GUARDA_ROUPO', description: 'Guarda-roupa sintético', quantity: 1, unitPrice: 1500 },
];

function taxGroups() {
  return [
    { group: 'ICMS' as const, codeSystem: 'CSOSN' as const, code: '102', values: { vICMS: 0 }, decisionId: 'icms' },
    { group: 'PIS' as const, codeSystem: 'CST' as const, code: '08', values: { vPIS: 0 }, decisionId: 'pis' },
    { group: 'COFINS' as const, codeSystem: 'CST' as const, code: '08', values: { vCOFINS: 0 }, decisionId: 'cofins' },
  ];
}

const document: FiscalDocument = {
  snapshotHash: 'snapshot-hash',
  ruleSetVersion: 'TEST_AUT_RULES',
  model: '55',
  environment: 2,
  issuer: {
    cnpj: '12345678000199',
    name: 'Emitente sintético',
    ie: '1234567890',
    crt: '1',
    municipalityCode: '4104808',
    address: {
      street: 'Rua de Teste',
      number: '100',
      district: 'Centro',
      municipalityCode: '4104808',
      municipality: 'Cascavel',
      uf: 'PR',
      postalCode: '85801000',
    },
  },
  recipient: {
    name: 'Cliente sintético',
    cpfCnpj: '52998224725',
    ieIndicator: '9',
  },
  operation: {
    natureOfOperation: 'VENDA DE MERCADORIA',
    direction: 'outbound',
    purpose: '1',
    destination: '1',
    presence: '1',
    finalConsumer: '1',
    freightMode: '9',
  },
  items: itemData.map((item, index) => ({
    itemNumber: index + 1,
    product: {
      code: item.code,
      description: item.description,
      gtin: 'SEM GTIN',
      quantity: item.quantity,
      unitValue: item.unitPrice,
      gross: item.unitPrice,
      discount: 0,
      freight: 0,
      insurance: 0,
      otherExpenses: 0,
    },
    classification: {
      ncm: index === 0 ? '94016100' : '94035000',
      origin: '0',
      cfop: '5102',
      unit: 'UN',
    },
    taxes: taxGroups(),
    decisions: [],
  })),
  payments: [{ methodCode: '01', amount: 3500, decision: {} as FiscalDocument['payments'][number]['decision'] }],
  totals: {
    icmsBase: 0,
    products: 3500,
    discount: 0,
    freight: 0,
    insurance: 0,
    otherExpenses: 0,
    icms: 0,
    icmsExempt: 0,
    fcp: 0,
    icmsStBase: 0,
    icmsSt: 0,
    fcpSt: 0,
    fcpStRetained: 0,
    ii: 0,
    ipi: 0,
    ipiReturned: 0,
    pis: 0,
    cofins: 0,
    invoice: 3500,
    payment: 3500,
    change: 0,
  },
  decisions: [],
};

const snapshot: FiscalSnapshotCandidate = {
  schemaVersion: 1,
  capturedAt: '2026-10-09T15:00:00.000Z',
  order: {
    id: 'TEST_AUT_ORDER_XML_AUDIT',
    type: 'sale',
    status: 'ready',
    version: 1,
    updatedAt: '2026-10-09T14:55:00.000Z',
    data: {
      customerId: 'TEST_AUT_CUSTOMER',
      customerData: {
        id: 'TEST_AUT_CUSTOMER',
        fullName: 'Cliente sintético',
        cpfCnpj: '52998224725',
      },
      items: itemData.map((item, index) => ({
        orderItemId: `TEST_AUT_ORDER_ITEM_${index + 1}`,
        code: item.code,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        unitDiscount: 0,
        discountType: 'fixed',
        itemType: 'product',
      })),
      shipping: { value: 0 },
      paymentsSummary: { totalOrderValue: 3500 },
    },
  },
  issuerProfile: { companyCnpj: '12345678000199' },
  emissionRequest: {
    id: '75ad9d8a-87d9-4de2-820e-4670903f7303',
    environment: 2,
    recipientTaxId: '52998224725',
    finalConsumer: true,
    freightMode: '9',
  },
};

function unsignedXml(
  overrides: {
    sofaQuantity?: string;
    sofaCfop?: string;
    invoiceTotal?: string;
    model?: '55' | '65';
    accessKey?: string;
    number?: number;
  } = {}
) {
  const model = overrides.model || '55';
  const accessKey = overrides.accessKey || identity.accessKey;
  const number = overrides.number || 42;
  const [sofa, wardrobe] = document.items;
  const serializeItem = (item: (typeof document.items)[number], index: number) => {
    const description =
      index === 0
        ? model === '65'
          ? 'NOTA FISCAL EMITIDA EM AMBIENTE DE HOMOLOGACAO - SEM VALOR FISCAL'
          : item.product.description
        : item.product.description;
    const qty = index === 0 ? overrides.sofaQuantity || '1.0000' : '1.0000';
    const cfop = index === 0 ? overrides.sofaCfop || item.classification.cfop : item.classification.cfop;
    const price = item.product.unitValue.toFixed(4);
    const gross = item.product.gross.toFixed(2);
    const taxes =
      `<imposto><ICMS><ICMSSN102><orig>0</orig><CSOSN>102</CSOSN></ICMSSN102></ICMS>` +
      `<PIS><PISNT><CST>08</CST></PISNT></PIS><COFINS><COFINSNT><CST>08</CST></COFINSNT></COFINS></imposto>`;
    return (
      `<det nItem="${index + 1}"><prod><cProd>${item.product.code}</cProd><cEAN>SEM GTIN</cEAN>` +
      `<xProd>${description}</xProd><NCM>${item.classification.ncm}</NCM><CFOP>${cfop}</CFOP>` +
      `<uCom>UN</uCom><qCom>${qty}</qCom><vUnCom>${price}</vUnCom><vProd>${gross}</vProd>` +
      `<cEANTrib>SEM GTIN</cEANTrib><uTrib>UN</uTrib><qTrib>${qty}</qTrib><vUnTrib>${price}</vUnTrib><indTot>1</indTot>` +
      `${index === 0 && model === '65' ? '<infAdProd>Sofá sintético</infAdProd>' : ''}</prod>${taxes}</det>`
    );
  };
  const key = accessKey;
  const total = document.totals;
  const totals = [
    ['vBC', total.icmsBase], ['vICMS', total.icms], ['vICMSDeson', total.icmsExempt],
    ['vFCP', total.fcp], ['vBCST', total.icmsStBase], ['vST', total.icmsSt],
    ['vFCPST', total.fcpSt], ['vFCPSTRet', total.fcpStRetained], ['vProd', total.products],
    ['vFrete', total.freight], ['vSeg', total.insurance], ['vDesc', total.discount],
    ['vII', total.ii], ['vIPI', total.ipi], ['vIPIDevol', total.ipiReturned],
    ['vPIS', total.pis], ['vCOFINS', total.cofins], ['vOutro', total.otherExpenses],
    ['vNF', overrides.invoiceTotal || total.invoice.toFixed(2)],
  ].map(([name, value]) => `<${name}>${typeof value === 'number' ? value.toFixed(2) : value}</${name}>`).join('');
  return (
    `<?xml version="1.0" encoding="UTF-8"?><NFe xmlns="http://www.portalfiscal.inf.br/nfe">` +
    `<infNFe Id="NFe${key}" versao="4.00"><ide><cUF>41</cUF><cNF>${key.slice(35, 43)}</cNF>` +
    `<natOp>VENDA DE MERCADORIA</natOp><mod>${model}</mod><serie>1</serie><nNF>${number}</nNF><dhEmi>${issuedAt}</dhEmi>` +
    `<tpNF>1</tpNF><idDest>1</idDest><cMunFG>4104808</cMunFG><tpImp>${model === '65' ? '4' : '1'}</tpImp><tpEmis>1</tpEmis>` +
    `<cDV>${key[43]}</cDV><tpAmb>2</tpAmb><finNFe>1</finNFe><indFinal>1</indFinal><indPres>1</indPres>` +
    `<procEmi>0</procEmi><verProc>MoranteHub_1.0</verProc></ide>` +
    `<emit><CNPJ>12345678000199</CNPJ><xNome>Emitente sintético</xNome><enderEmit><xLgr>Rua de Teste</xLgr>` +
    `<nro>100</nro><xBairro>Centro</xBairro><cMun>4104808</cMun><xMun>Cascavel</xMun><UF>PR</UF>` +
    `<CEP>85801000</CEP><cPais>1058</cPais><xPais>BRASIL</xPais></enderEmit><IE>1234567890</IE><CRT>1</CRT></emit>` +
    `<dest><CPF>52998224725</CPF><xNome>${model === '55' ? 'NF-E EMITIDA EM AMBIENTE DE HOMOLOGACAO - SEM VALOR FISCAL' : 'Cliente sintético'}</xNome><indIEDest>9</indIEDest></dest>` +
    `${serializeItem(sofa, 0)}${serializeItem(wardrobe, 1)}<total><ICMSTot>${totals}</ICMSTot></total>` +
    `<transp><modFrete>9</modFrete></transp><pag><detPag><tPag>01</tPag><vPag>3500.00</vPag></detPag></pag>` +
    `</infNFe>${model === '65' ? `<infNFeSupl><qrCode><![CDATA[http://www.fazenda.pr.gov.br/nfce/qrcode?p=${key}|3|2]]></qrCode><urlChave>http://www.fazenda.pr.gov.br/nfce/consulta</urlChave></infNFeSupl>` : ''}</NFe>`
  );
}

function sign(xml = unsignedXml()) {
  return signNfeXml(xml, privateKeyPem, certificateDerBase64);
}

const auditIdentity = {
  series: '1',
  number: 42,
  accessKey: identity.accessKey,
  issuedAt,
};

describe('auditoria backend do XML fiscal', () => {
  it('aceita XML assinado de homologação NF-e 55 com as duas linhas comerciais e suas transformações obrigatórias', () => {
    expect(() =>
      assertSignedFiscalXmlMatchesSnapshot(
        snapshot,
        document,
        sign(),
        auditIdentity,
        certificatePem
      )
    ).not.toThrow();
  });

  it('aceita a transformação obrigatória da primeira descrição em NFC-e 65 de homologação', () => {
    const nfcKey = generateNfeAccessKey({
      ufCode: '41', yearMonth: '2610', cnpj: '12345678000199', model: '65', series: '1',
      number: 43, emissionType: '1', randomCode: '87654321',
    }).accessKey;
    const nfcDocument: FiscalDocument = { ...document, model: '65' };
    const nfcSnapshot: FiscalSnapshotCandidate = {
      ...snapshot,
      emissionRequest: { ...snapshot.emissionRequest, id: '2fc4ba4a-8a40-4abd-ade9-4a1ccb328735' },
    };
    expect(() =>
      assertSignedFiscalXmlMatchesSnapshot(
        nfcSnapshot,
        nfcDocument,
        sign(unsignedXml({ model: '65', accessKey: nfcKey, number: 43 })),
        { series: '1', number: 43, accessKey: nfcKey, issuedAt },
        certificatePem
      )
    ).not.toThrow();
  });

  it('bloqueia quantidade divergente no XML assinado e aponta o item e o campo', () => {
    try {
      assertSignedFiscalXmlMatchesSnapshot(
        snapshot,
        document,
        sign(unsignedXml({ sofaQuantity: '2.0000' })),
        auditIdentity,
        certificatePem
      );
      throw new Error('A auditoria deveria bloquear a quantidade divergente.');
    } catch (error) {
      expect(error).toBeInstanceOf(FiscalXmlAuditError);
      expect((error as FiscalXmlAuditError).mismatches).toContainEqual({
        field: 'det[1].prod.qCom',
        expected: 1,
        actual: 2,
      });
    }
  });

  it('bloqueia CFOP e totalizadores divergentes mesmo quando o XML continua assinado', () => {
    try {
      assertSignedFiscalXmlMatchesSnapshot(
        snapshot,
        document,
        sign(unsignedXml({ sofaCfop: '5405', invoiceTotal: '4500.00' })),
        auditIdentity,
        certificatePem
      );
      throw new Error('A auditoria deveria bloquear os valores divergentes.');
    } catch (error) {
      expect(error).toBeInstanceOf(FiscalXmlAuditError);
      const fields = (error as FiscalXmlAuditError).mismatches.map((mismatch) => mismatch.field);
      expect(fields).toContain('det[1].prod.CFOP');
      expect(fields).toContain('total.ICMSTot.vNF');
    }
  });

  it('detecta produto extra além da composição comercial', () => {
    const extraLine = unsignedXml().replace(
      '</infNFe>',
      `<det nItem="3"><prod><cProd>TEST_AUT_EXTRA</cProd></prod></det></infNFe>`
    );
    try {
      assertSignedFiscalXmlMatchesSnapshot(snapshot, document, sign(extraLine), auditIdentity, certificatePem);
      throw new Error('A auditoria deveria bloquear um produto extra.');
    } catch (error) {
      expect(error).toBeInstanceOf(FiscalXmlAuditError);
      expect((error as FiscalXmlAuditError).mismatches).toContainEqual({
        field: 'infNFe.det.count',
        expected: 2,
        actual: 3,
      });
    }
  });

  it('vincula a prévia ao snapshot comercial e ao XML assinado', () => {
    const fingerprint = fiscalPreviewFingerprint(snapshot, document, auditIdentity, sign());
    const changedSnapshot = structuredClone(snapshot);
    const orderItems = changedSnapshot.order.data.items as Array<Record<string, unknown>>;
    orderItems[0].quantity = 2;
    expect(
      fiscalPreviewFingerprint(changedSnapshot, document, auditIdentity, sign())
    ).not.toBe(fingerprint);
  });

  it('rejeita XML alterado depois da assinatura, mesmo antes da comparação comercial', () => {
    const changedAfterSigning = sign().replace('<qCom>1.0000</qCom>', '<qCom>1.5000</qCom>');
    expect(() =>
      assertSignedFiscalXmlMatchesSnapshot(snapshot, document, changedAfterSigning, auditIdentity, certificatePem)
    ).toThrow(/assinatura XMLDSig não confere/);
  });
});
