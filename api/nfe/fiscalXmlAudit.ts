import { createHash } from 'node:crypto';
import { DOMParser } from '@xmldom/xmldom';
import { SignedXml } from 'xml-crypto';
import {
  HOMOLOGATION_FIRST_ITEM_DESCRIPTION,
  getHomologationRecipientName,
  shouldUseHomologationFirstItemDescription,
} from '../../shared-utils/fiscalDocumentModel';
import { composeServiceFiscalValues } from '../../erp/src/pages/utils/nfe/serviceFiscalComposition';
import { canonicalFiscalCommand } from './normal-sale/attemptPolicy';
import type {
  DeterminedFiscalItem,
  DeterminedTaxGroup,
  FiscalDocument,
  FiscalSnapshotCandidate,
} from './fiscalSnapshot';

export interface FiscalXmlAuditMismatch {
  field: string;
  expected: string | number;
  actual: string | number;
}

export class FiscalXmlAuditError extends Error {
  readonly mismatches: FiscalXmlAuditMismatch[];

  constructor(mismatches: FiscalXmlAuditMismatch[]) {
    const detail = mismatches
      .map(({ field, expected, actual }) => `${field}: esperado ${expected}; encontrado ${actual}`)
      .join('\n');
    super(`O XML assinado diverge do snapshot fiscal confirmado:\n${detail}`);
    this.name = 'FiscalXmlAuditError';
    this.mismatches = mismatches;
  }
}

export function fiscalPreviewFingerprint(
  snapshot: FiscalSnapshotCandidate,
  document: FiscalDocument,
  identity: { series: string; number: number; accessKey: string; issuedAt: string },
  signedXml: string
): string {
  const { capturedAt: _capturedAt, persistedHash: _persistedHash, ...frozenFacts } = snapshot;
  const { snapshotHash: _snapshotHash, ...frozenDocument } = document;
  return createHash('sha256')
    .update(
      canonicalFiscalCommand({
        snapshot: frozenFacts,
        document: frozenDocument,
        identity,
        signedXmlSha256: createHash('sha256').update(signedXml).digest('hex'),
      })
    )
    .digest('hex');
}

type XmlDocument = ReturnType<InstanceType<typeof DOMParser>['parseFromString']>;
type XmlNode = NonNullable<XmlDocument['documentElement']>;

const localName = (node: XmlNode) => (node.localName || node.tagName).split(':').at(-1) || '';
const children = (node: XmlNode | null | undefined): XmlNode[] =>
  node ? Array.from(node.childNodes).filter((child): child is XmlNode => child.nodeType === 1) : [];
const child = (node: XmlNode | null, name: string): XmlNode | null =>
  node ? children(node).find((candidate) => localName(candidate) === name) || null : null;
const childElements = (node: XmlNode | null, name: string): XmlNode[] =>
  node ? children(node).filter((candidate) => localName(candidate) === name) : [];
const text = (node: XmlNode | null, name: string): string =>
  child(node, name)?.textContent?.trim() || '';
const allDescendants = (node: XmlNode, name: string): XmlNode[] => {
  const result: XmlNode[] = [];
  const visit = (current: XmlNode) => {
    if (localName(current) === name) result.push(current);
    children(current).forEach(visit);
  };
  visit(node);
  return result;
};

function normalizeTaxId(value: string) {
  return value.replace(/\D/g, '');
}

function objectValue(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function addTextMismatch(
  mismatches: FiscalXmlAuditMismatch[],
  field: string,
  expected: string | undefined,
  actual: string,
  normalize?: (value: string) => string
) {
  if (expected === undefined) return;
  const wanted = normalize ? normalize(expected) : expected;
  const found = normalize ? normalize(actual) : actual;
  if (wanted !== found)
    mismatches.push({ field, expected: wanted, actual: found || '(ausente)' });
}

function addOptionalTextMismatch(
  mismatches: FiscalXmlAuditMismatch[],
  field: string,
  expected: string | undefined,
  actual: string
) {
  if (expected === undefined || expected === '') {
    if (actual !== '') mismatches.push({ field, expected: '(ausente)', actual });
    return;
  }
  addTextMismatch(mismatches, field, expected, actual);
}

function addNumberMismatch(
  mismatches: FiscalXmlAuditMismatch[],
  field: string,
  expected: number,
  actualText: string,
  tolerance = 0.005
) {
  const actual = actualText ? Number(actualText.replace(',', '.')) : NaN;
  if (!Number.isFinite(actual) || Math.abs(actual - expected) > tolerance)
    mismatches.push({
      field,
      expected,
      actual: Number.isFinite(actual) ? actual : actualText || '(ausente)',
    });
}

function compareAddress(
  mismatches: FiscalXmlAuditMismatch[],
  field: string,
  actual: XmlNode | null,
  expected: FiscalDocument['issuer']['address'] | FiscalDocument['recipient']['address']
) {
  if (!expected) {
    if (actual)
      mismatches.push({ field, expected: '(ausente)', actual: '(presente)' });
    return;
  }
  for (const [xmlName, value] of [
    ['xLgr', expected.street],
    ['nro', expected.number],
    ['xBairro', expected.district],
    ['cMun', expected.municipalityCode],
    ['xMun', expected.municipality],
    ['UF', expected.uf],
    ['CEP', expected.postalCode || ''],
    ['cPais', '1058'],
    ['xPais', 'BRASIL'],
  ] as const) {
    addOptionalTextMismatch(mismatches, `${field}.${xmlName}`, value, text(actual, xmlName));
  }
}

function taxGroupTag(tax: DeterminedTaxGroup): string {
  if (tax.group === 'ICMS') {
    if (tax.codeSystem === 'CSOSN') return `ICMSSN${tax.code}`;
    return `ICMS${tax.code}`;
  }
  if (tax.group === 'PIS' || tax.group === 'COFINS') {
    if (['04', '05', '06', '07', '08', '09'].includes(tax.code)) return `${tax.group}NT`;
    return `${tax.group}${['01', '02'].includes(tax.code) ? 'Aliq' : 'Outr'}`;
  }
  if (tax.group === 'IPI')
    return ['04', '05', '06', '07', '08', '09'].includes(tax.code) ? 'IPINT' : 'IPITrib';
  return tax.group;
}

function compareTaxGroup(
  mismatches: FiscalXmlAuditMismatch[],
  itemNumber: number,
  tax: DeterminedTaxGroup,
  actualContainer: XmlNode | null
) {
  const groupName = tax.group === 'ICMS' ? 'ICMS' : tax.group;
  const container = child(actualContainer, groupName);
  const expectedTag = taxGroupTag(tax);
  const expectedGroups = childElements(container, expectedTag);
  if (expectedGroups.length !== 1) {
    mismatches.push({
      field: `det[${itemNumber}].imposto.${groupName}.${expectedTag}`,
      expected: 1,
      actual: expectedGroups.length,
    });
    return;
  }
  const group = expectedGroups[0];
  const codeTag = tax.codeSystem === 'CSOSN' ? 'CSOSN' : 'CST';
  addTextMismatch(
    mismatches,
    `det[${itemNumber}].imposto.${groupName}.${expectedTag}.${codeTag}`,
    tax.code,
    text(group, codeTag)
  );
  const expectedFields = new Set<string>([codeTag]);
  if (tax.group === 'ICMS') {
    expectedFields.add('orig');
    if (tax.codeSystem === 'CST' && tax.code === '00')
      ['modBC', 'vBC', 'pICMS', 'vICMS'].forEach((field) => expectedFields.add(field));
    else if (tax.codeSystem === 'CSOSN') {
      const icmsValue = tax.values.vICMS;
      if (typeof icmsValue === 'number' && icmsValue !== 0)
        mismatches.push({
          field: `det[${itemNumber}].imposto.ICMS.${expectedTag}.vICMS`,
          expected: 0,
          actual: icmsValue,
        });
    }
  } else if (tax.group === 'PIS' || tax.group === 'COFINS') {
    if (!['04', '05', '06', '07', '08', '09'].includes(tax.code)) {
      expectedFields.add('vBC');
      expectedFields.add(tax.group === 'PIS' ? 'pPIS' : 'pCOFINS');
      expectedFields.add(tax.group === 'PIS' ? 'vPIS' : 'vCOFINS');
    }
  } else if (tax.group === 'IPI') {
    if (!['04', '05', '06', '07', '08', '09'].includes(tax.code)) {
      expectedFields.add('vBC');
      expectedFields.add('pIPI');
      expectedFields.add('vIPI');
    }
  }

  for (const [field, value] of Object.entries(tax.values)) {
    if (!expectedFields.has(field) || field === 'orig') continue;
    const expectedPath = `det[${itemNumber}].imposto.${groupName}.${expectedTag}.${field}`;
    if (typeof value === 'number') {
      addNumberMismatch(
        mismatches,
        expectedPath,
        value,
        text(group, field),
        field.startsWith('p') ? 0.00005 : 0.005
      );
    } else {
      addTextMismatch(mismatches, expectedPath, String(value), text(group, field));
    }
  }
  for (const field of expectedFields) {
    if (field === codeTag || field === 'orig') continue;
    if (!Object.prototype.hasOwnProperty.call(tax.values, field))
      mismatches.push({
        field: `det[${itemNumber}].imposto.${groupName}.${expectedTag}.${field}`,
        expected: '(valor ausente no snapshot fiscal)',
        actual: text(group, field) || '(ausente)',
      });
  }
  for (const field of children(group).map(localName)) {
    if (!expectedFields.has(field))
      mismatches.push({
        field: `det[${itemNumber}].imposto.${groupName}.${expectedTag}.${field}`,
        expected: '(ausente)',
        actual: '(presente)',
      });
  }
}

function compareItem(
  mismatches: FiscalXmlAuditMismatch[],
  item: DeterminedFiscalItem,
  actual: XmlNode,
  environment: 1 | 2,
  model: '55' | '65'
) {
  const n = item.itemNumber;
  const field = `det[${n}]`;
  const product = child(actual, 'prod');
  const taxes = child(actual, 'imposto');
  const printType = model === '65' ? '4' : '1';
  const homologationName =
    n === 1 &&
    shouldUseHomologationFirstItemDescription({ model, environment, printType })
      ? HOMOLOGATION_FIRST_ITEM_DESCRIPTION
      : item.product.description;

  addTextMismatch(mismatches, `${field}.@nItem`, String(n), actual.getAttribute('nItem') || '');
  addTextMismatch(mismatches, `${field}.prod.cProd`, item.product.code, text(product, 'cProd'));
  addTextMismatch(mismatches, `${field}.prod.xProd`, homologationName, text(product, 'xProd'));
  addOptionalTextMismatch(mismatches, `${field}.prod.infAdProd`,
    n === 1 && homologationName !== item.product.description ? item.product.description : undefined,
    text(product, 'infAdProd'));
  addTextMismatch(mismatches, `${field}.prod.NCM`, item.classification.ncm, text(product, 'NCM'));
  addOptionalTextMismatch(mismatches, `${field}.prod.CEST`, item.classification.cest, text(product, 'CEST'));
  addOptionalTextMismatch(mismatches, `${field}.prod.cBenef`, item.classification.benefitCode, text(product, 'cBenef'));
  addTextMismatch(mismatches, `${field}.prod.CFOP`, item.classification.cfop, text(product, 'CFOP'));
  addTextMismatch(mismatches, `${field}.prod.uCom`, item.classification.unit, text(product, 'uCom'));
  addNumberMismatch(mismatches, `${field}.prod.qCom`, item.product.quantity, text(product, 'qCom'), 0.00005);
  addNumberMismatch(mismatches, `${field}.prod.vUnCom`, item.product.unitValue, text(product, 'vUnCom'), 0.00005);
  addNumberMismatch(mismatches, `${field}.prod.vProd`, item.product.gross, text(product, 'vProd'));
  addTextMismatch(mismatches, `${field}.prod.cEAN`, item.product.gtin, text(product, 'cEAN'));
  addTextMismatch(mismatches, `${field}.prod.cEANTrib`, item.product.gtin, text(product, 'cEANTrib'));
  addTextMismatch(mismatches, `${field}.prod.uTrib`, item.classification.unit, text(product, 'uTrib'));
  addNumberMismatch(mismatches, `${field}.prod.qTrib`, item.product.quantity, text(product, 'qTrib'), 0.00005);
  addNumberMismatch(mismatches, `${field}.prod.vUnTrib`, item.product.unitValue, text(product, 'vUnTrib'), 0.00005);
  addOptionalTextMismatch(mismatches, `${field}.prod.vFrete`, item.product.freight ? item.product.freight.toFixed(2) : undefined, text(product, 'vFrete'));
  addOptionalTextMismatch(mismatches, `${field}.prod.vSeg`, item.product.insurance ? item.product.insurance.toFixed(2) : undefined, text(product, 'vSeg'));
  addOptionalTextMismatch(mismatches, `${field}.prod.vDesc`, item.product.discount ? item.product.discount.toFixed(2) : undefined, text(product, 'vDesc'));
  addOptionalTextMismatch(mismatches, `${field}.prod.vOutro`, item.product.otherExpenses ? item.product.otherExpenses.toFixed(2) : undefined, text(product, 'vOutro'));
  addTextMismatch(mismatches, `${field}.prod.indTot`, '1', text(product, 'indTot'));
  const icmsGroup = children(child(taxes, 'ICMS'))[0] || null;
  addTextMismatch(mismatches, `${field}.imposto.ICMS.orig`, item.classification.origin, text(icmsGroup, 'orig'));

  const expectedTaxGroups = new Set(item.taxes.map((tax) => tax.group));
  const actualTaxGroups = children(taxes).map(localName).filter((name) => name !== 'vTotTrib');
  for (const name of ['ICMS', 'IPI', 'PIS', 'COFINS']) {
    const expected = expectedTaxGroups.has(name as DeterminedTaxGroup['group']);
    const actualGroup = child(taxes, name);
    if (expected !== Boolean(actualGroup))
      mismatches.push({
        field: `${field}.imposto.${name}`,
        expected: expected ? 'presente' : 'ausente',
        actual: actualGroup ? 'presente' : 'ausente',
      });
  }
  for (const tax of item.taxes) compareTaxGroup(mismatches, n, tax, taxes);
  for (const extra of actualTaxGroups) {
    if (!expectedTaxGroups.has(extra as DeterminedTaxGroup['group']))
      mismatches.push({
        field: `${field}.imposto.${extra}`,
        expected: '(ausente)',
        actual: '(presente)',
      });
  }
}

export function assertNfeSignature(xml: string, expectedCertificatePem?: string) {
  const parseErrors: string[] = [];
  const parsed = new DOMParser({
    errorHandler: {
      error: (message) => parseErrors.push(message),
      fatalError: (message) => parseErrors.push(message),
    },
  }).parseFromString(xml, 'application/xml');
  if (parseErrors.length || !parsed.documentElement)
    throw new Error(`XML assinado inválido: ${parseErrors.join('; ') || 'raiz ausente'}`);
  const signatures = allDescendants(parsed.documentElement, 'Signature');
  const infNfes = allDescendants(parsed.documentElement, 'infNFe');
  if (
    localName(parsed.documentElement) !== 'NFe' ||
    signatures.length !== 1 ||
    infNfes.length !== 1 ||
    child(parsed.documentElement, 'infNFe') !== infNfes[0] ||
    child(parsed.documentElement, 'Signature') !== signatures[0]
  )
    throw new Error('XML fiscal precisa conter uma NF-e e uma assinatura XMLDSig.');
  const elementId = infNfes[0].getAttribute('Id');
  const signature = signatures[0];
  const references = allDescendants(signature, 'Reference');
  const signatureMethod = child(child(signature, 'SignedInfo'), 'SignatureMethod')?.getAttribute('Algorithm');
  const digestMethod = child(references[0] || null, 'DigestMethod')?.getAttribute('Algorithm');
  const transforms = allDescendants(references[0] || signature, 'Transform').map((node) => node.getAttribute('Algorithm'));
  if (
    !elementId ||
    references.length !== 1 ||
    references[0].getAttribute('URI') !== `#${elementId}` ||
    signatureMethod !== 'http://www.w3.org/2000/09/xmldsig#rsa-sha1' ||
    digestMethod !== 'http://www.w3.org/2000/09/xmldsig#sha1' ||
    !transforms.includes('http://www.w3.org/2000/09/xmldsig#enveloped-signature') ||
    !transforms.includes('http://www.w3.org/TR/2001/REC-xml-c14n-20010315') ||
    !allDescendants(signature, 'SignatureValue')[0]?.textContent?.trim() ||
    !allDescendants(signature, 'X509Certificate')[0]?.textContent?.trim()
  )
    throw new Error('Assinatura fiscal incompleta ou sem referência ao infNFe desta nota.');
  const verifier = new SignedXml({
    getCertFromKeyInfo: SignedXml.getCertFromKeyInfo,
    ...(expectedCertificatePem ? { publicCert: expectedCertificatePem } : {}),
  });
  verifier.loadSignature(signature);
  if (!verifier.checkSignature(xml))
    throw new Error('A assinatura XMLDSig não confere com o conteúdo final do XML fiscal.');
}

/** Ensures the server-resolved fiscal document still represents the frozen commercial order. */
export function assertFiscalDocumentMatchesCommercialSnapshot(
  snapshot: FiscalSnapshotCandidate,
  document: FiscalDocument
): void {
  const orderItems = snapshot.order.data.items;
  if (!Array.isArray(orderItems)) throw new Error('Snapshot comercial sem itens do pedido.');
  const composition = composeServiceFiscalValues(orderItems as never[]);
  const mismatches: FiscalXmlAuditMismatch[] = [];
  if (composition.products.length !== document.items.length)
    mismatches.push({ field: 'itens.count', expected: composition.products.length, actual: document.items.length });

  composition.products.forEach(({ item, vProdCents, vDescCents }, index) => {
    const fiscalItem = document.items[index];
    if (!fiscalItem) return;
    const n = index + 1;
    const code = String(item.code || (item as unknown as { sku?: string }).sku || `ITEM-${n}`).slice(0, 60);
    const description = String(item.description || '').trim();
    const quantity = Number(item.quantity) || 1;
    const gross = vProdCents / 100;
    const freight = index === 0 ? Number((snapshot.order.data.shipping as Record<string, unknown> | undefined)?.value || 0) : 0;
    const otherExpenses = index === 0 ? composition.vOutroCents / 100 : 0;
    const fields: Array<[string, string | number, string | number, number?]> = [
      [`itens[${n}].codigo`, code, fiscalItem.product.code],
      [`itens[${n}].descricao`, description, fiscalItem.product.description],
      [`itens[${n}].quantidade`, quantity, fiscalItem.product.quantity, 0.000001],
      [`itens[${n}].valorBruto`, gross, fiscalItem.product.gross],
      [`itens[${n}].desconto`, vDescCents / 100, fiscalItem.product.discount],
      [`itens[${n}].valorUnitario`, gross / quantity, fiscalItem.product.unitValue, 0.000001],
      [`itens[${n}].frete`, freight, fiscalItem.product.freight],
      [`itens[${n}].outrasDespesas`, otherExpenses, fiscalItem.product.otherExpenses],
    ];
    for (const [field, expected, actual, tolerance = 0.005] of fields) {
      const matches =
        typeof expected === 'string'
          ? expected === actual
          : typeof actual === 'number' && Math.abs(expected - actual) <= tolerance;
      if (!matches) mismatches.push({ field, expected, actual });
    }
  });

  const shipping = objectValue(snapshot.order.data.shipping);
  const freight = Number(shipping.value || 0);
  const expectedCommercialTotal =
    (composition.products.reduce((sum, item) => sum + item.vProdCents - item.vDescCents, 0) +
      composition.vOutroCents) /
      100 +
    freight;
  if (Math.abs(expectedCommercialTotal - document.totals.invoice) > 0.005)
    mismatches.push({
      field: 'total.valorPedidoCalculado',
      expected: expectedCommercialTotal,
      actual: document.totals.invoice,
    });

  const orderCustomer = objectValue(snapshot.order.data.customerData);
  const fiscalCustomer = objectValue(snapshot.fiscalInputs?.customer);
  const selectedTaxId = normalizeTaxId(
    String(
      snapshot.emissionRequest.recipientTaxId ??
        orderCustomer.cpfCnpj ??
        fiscalCustomer.cpfCnpj ??
        ''
    )
  );
  const resolvedTaxId = normalizeTaxId(document.recipient.cpfCnpj);
  if (selectedTaxId && selectedTaxId !== resolvedTaxId)
    mismatches.push({ field: 'cliente.CPF_CNPJ', expected: selectedTaxId, actual: resolvedTaxId || '(ausente)' });
  const orderCustomerName = String(orderCustomer.fullName || orderCustomer.name || '').trim();
  if (orderCustomerName && orderCustomerName !== document.recipient.name)
    mismatches.push({ field: 'cliente.nome', expected: orderCustomerName, actual: document.recipient.name });
  const orderCustomerId = String(snapshot.order.data.customerId || orderCustomer.id || '');
  const fiscalCustomerId = String(fiscalCustomer.id || '');
  if (orderCustomerId && fiscalCustomerId && orderCustomerId !== fiscalCustomerId)
    mismatches.push({ field: 'cliente.id', expected: orderCustomerId, actual: fiscalCustomerId });
  if (
    snapshot.emissionRequest.finalConsumer !== undefined &&
    document.operation.finalConsumer !== (snapshot.emissionRequest.finalConsumer ? '1' : '0')
  )
    mismatches.push({
      field: 'operacao.consumidorFinal',
      expected: snapshot.emissionRequest.finalConsumer ? '1' : '0',
      actual: document.operation.finalConsumer,
    });
  if (
    snapshot.emissionRequest.freightMode !== undefined &&
    document.operation.freightMode !== snapshot.emissionRequest.freightMode
  )
    mismatches.push({
      field: 'transporte.modalidadeFrete',
      expected: snapshot.emissionRequest.freightMode,
      actual: document.operation.freightMode,
    });

  const sourceTotal = Number(objectValue(snapshot.order.data.paymentsSummary).totalOrderValue);
  if (Number.isFinite(sourceTotal) && Math.abs(sourceTotal - document.totals.invoice) > 0.005)
    mismatches.push({ field: 'total.valorPedido', expected: sourceTotal, actual: document.totals.invoice });

  if (mismatches.length) throw new FiscalXmlAuditError(mismatches);
}

/** Compares every business and fiscal XML value with the immutable resolved snapshot and verifies XMLDSig. */
export function assertSignedFiscalXmlMatchesSnapshot(
  snapshot: FiscalSnapshotCandidate,
  document: FiscalDocument,
  xml: string,
  identity: { series: string | number; number: number; accessKey: string; issuedAt: string },
  expectedCertificatePem?: string
): void {
  assertFiscalDocumentMatchesCommercialSnapshot(snapshot, document);
  assertNfeSignature(xml, expectedCertificatePem);

  const parseErrors: string[] = [];
  const parsed = new DOMParser({
    errorHandler: {
      error: (message) => parseErrors.push(message),
      fatalError: (message) => parseErrors.push(message),
    },
  }).parseFromString(xml, 'application/xml');
  if (parseErrors.length || !parsed.documentElement)
    throw new Error(`XML fiscal inválido: ${parseErrors.join('; ') || 'raiz ausente'}`);
  const infNfes = allDescendants(parsed.documentElement, 'infNFe');
  if (infNfes.length !== 1) throw new Error('XML fiscal precisa conter um único infNFe.');
  const infNfe = infNfes[0];
  const ide = child(infNfe, 'ide');
  const issuer = child(infNfe, 'emit');
  const recipient = child(infNfe, 'dest');
  const totals = child(child(infNfe, 'total'), 'ICMSTot');
  const mismatches: FiscalXmlAuditMismatch[] = [];

  addTextMismatch(mismatches, 'infNFe.Id', `NFe${identity.accessKey}`, infNfe.getAttribute('Id') || '');
  addTextMismatch(mismatches, 'ide.cUF', '41', text(ide, 'cUF'));
  addTextMismatch(mismatches, 'ide.cNF', identity.accessKey.slice(35, 43), text(ide, 'cNF'));
  addTextMismatch(mismatches, 'ide.mod', document.model, text(ide, 'mod'));
  addTextMismatch(mismatches, 'ide.tpAmb', String(document.environment), text(ide, 'tpAmb'));
  addTextMismatch(mismatches, 'ide.serie', String(identity.series), text(ide, 'serie'));
  addTextMismatch(mismatches, 'ide.nNF', String(identity.number), text(ide, 'nNF'));
  addTextMismatch(mismatches, 'ide.dhEmi', identity.issuedAt, text(ide, 'dhEmi'));
  addTextMismatch(mismatches, 'ide.tpNF', document.operation.direction === 'outbound' ? '1' : '0', text(ide, 'tpNF'));
  addTextMismatch(mismatches, 'ide.finNFe', document.operation.purpose, text(ide, 'finNFe'));
  addTextMismatch(mismatches, 'ide.idDest', document.operation.destination, text(ide, 'idDest'));
  addTextMismatch(mismatches, 'ide.indFinal', document.operation.finalConsumer, text(ide, 'indFinal'));
  addTextMismatch(mismatches, 'ide.indPres', document.operation.presence, text(ide, 'indPres'));
  addTextMismatch(mismatches, 'ide.natOp', document.operation.natureOfOperation, text(ide, 'natOp'));
  addTextMismatch(mismatches, 'ide.cMunFG', document.issuer.municipalityCode, text(ide, 'cMunFG'));
  addTextMismatch(mismatches, 'ide.tpImp', document.model === '65' ? '4' : '1', text(ide, 'tpImp'));
  addTextMismatch(mismatches, 'ide.tpEmis', '1', text(ide, 'tpEmis'));
  addTextMismatch(mismatches, 'ide.cDV', identity.accessKey[43], text(ide, 'cDV'));
  addTextMismatch(mismatches, 'ide.procEmi', '0', text(ide, 'procEmi'));
  addTextMismatch(mismatches, 'ide.verProc', 'MoranteHub_1.0', text(ide, 'verProc'));

  addTextMismatch(mismatches, 'emit.CNPJ', document.issuer.cnpj, text(issuer, 'CNPJ'), normalizeTaxId);
  addTextMismatch(mismatches, 'emit.xNome', document.issuer.name, text(issuer, 'xNome'));
  addTextMismatch(mismatches, 'emit.IE', document.issuer.ie, text(issuer, 'IE'), normalizeTaxId);
  addTextMismatch(mismatches, 'emit.CRT', document.issuer.crt, text(issuer, 'CRT'));
  compareAddress(mismatches, 'emit.enderEmit', child(issuer, 'enderEmit'), document.issuer.address);

  const recipientTaxId = normalizeTaxId(document.recipient.cpfCnpj);
  const actualRecipientTaxId = normalizeTaxId(text(recipient, 'CNPJ') || text(recipient, 'CPF'));
  const recipientExpected = document.model !== '65' || Boolean(recipientTaxId);
  if (!recipientExpected && recipient)
    mismatches.push({ field: 'dest', expected: '(ausente)', actual: '(presente)' });
  if (recipientExpected && !recipient)
    mismatches.push({ field: 'dest', expected: '(presente)', actual: '(ausente)' });
  if (recipientExpected) {
    const expectedRecipientTag = recipientTaxId
      ? recipientTaxId.length === 11
        ? 'CPF'
        : 'CNPJ'
      : '';
    const actualRecipientTag = text(recipient, 'CNPJ')
      ? 'CNPJ'
      : text(recipient, 'CPF')
        ? 'CPF'
        : '';
    addTextMismatch(mismatches, 'dest.tipoDocumento', expectedRecipientTag, actualRecipientTag);
    addTextMismatch(mismatches, 'dest.CNPJ/CPF', recipientTaxId, actualRecipientTaxId);
    addTextMismatch(
      mismatches,
      'dest.xNome',
      getHomologationRecipientName({
        model: document.model,
        environment: document.environment,
        recipientName: document.recipient.name,
      }),
      text(recipient, 'xNome')
    );
    addTextMismatch(mismatches, 'dest.indIEDest', document.model === '65' ? '9' : document.recipient.ieIndicator, text(recipient, 'indIEDest'));
    addOptionalTextMismatch(
      mismatches,
      'dest.IE',
      document.model === '65' || document.recipient.ieIndicator === '2' ? undefined : document.recipient.ie,
      text(recipient, 'IE')
    );
    compareAddress(mismatches, 'dest.enderDest', child(recipient, 'enderDest'), document.recipient.address);
  }

  const transport = child(infNfe, 'transp');
  addTextMismatch(mismatches, 'transp.modFrete', document.operation.freightMode, text(transport, 'modFrete'));
  const transporter = document.operation.transporter;
  const actualTransporter = child(transport, 'transporta');
  const emptyHomeDeliveryGroup =
    document.model === '65' && document.operation.presence === '4' && actualTransporter && !children(actualTransporter).length;
  if (!transporter && actualTransporter && !emptyHomeDeliveryGroup)
    mismatches.push({ field: 'transp.transporta', expected: '(ausente)', actual: '(presente)' });
  if (transporter) {
    const expectedDocumentTag = transporter.cnpj ? 'CNPJ' : 'CPF';
    const actualDocumentTag = text(actualTransporter, 'CNPJ')
      ? 'CNPJ'
      : text(actualTransporter, 'CPF')
        ? 'CPF'
        : '';
    addTextMismatch(mismatches, 'transp.transporta.tipoDocumento', expectedDocumentTag, actualDocumentTag);
    addOptionalTextMismatch(
      mismatches,
      `transp.transporta.${expectedDocumentTag === 'CNPJ' ? 'CPF' : 'CNPJ'}`,
      undefined,
      text(actualTransporter, expectedDocumentTag === 'CNPJ' ? 'CPF' : 'CNPJ')
    );
    addTextMismatch(mismatches, 'transp.transporta.CNPJ/CPF', transporter.cnpj || transporter.cpf || '', text(actualTransporter, 'CNPJ') || text(actualTransporter, 'CPF'), normalizeTaxId);
    addTextMismatch(mismatches, 'transp.transporta.xNome', transporter.name, text(actualTransporter, 'xNome'));
    addOptionalTextMismatch(mismatches, 'transp.transporta.IE', transporter.ie, text(actualTransporter, 'IE'));
    addOptionalTextMismatch(mismatches, 'transp.transporta.xEnder', transporter.address, text(actualTransporter, 'xEnder'));
    addOptionalTextMismatch(mismatches, 'transp.transporta.xMun', transporter.city, text(actualTransporter, 'xMun'));
    addOptionalTextMismatch(mismatches, 'transp.transporta.UF', transporter.uf, text(actualTransporter, 'UF'));
  }

  const details = childElements(infNfe, 'det');
  if (details.length !== document.items.length)
    mismatches.push({ field: 'infNFe.det.count', expected: document.items.length, actual: details.length });
  document.items.forEach((item, index) => {
    const detail = details[index];
    if (detail) compareItem(mismatches, item, detail, document.environment, document.model);
  });

  const totalFields = [
    ['vBC', document.totals.icmsBase],
    ['vICMS', document.totals.icms],
    ['vICMSDeson', document.totals.icmsExempt],
    ['vFCP', document.totals.fcp],
    ['vBCST', document.totals.icmsStBase],
    ['vST', document.totals.icmsSt],
    ['vFCPST', document.totals.fcpSt],
    ['vFCPSTRet', document.totals.fcpStRetained],
    ['vProd', document.totals.products],
    ['vFrete', document.totals.freight],
    ['vSeg', document.totals.insurance],
    ['vDesc', document.totals.discount],
    ['vII', document.totals.ii],
    ['vIPI', document.totals.ipi],
    ['vIPIDevol', document.totals.ipiReturned],
    ['vPIS', document.totals.pis],
    ['vCOFINS', document.totals.cofins],
    ['vOutro', document.totals.otherExpenses],
    ['vNF', document.totals.invoice],
  ] as const;
  for (const [xmlName, expected] of totalFields)
    addNumberMismatch(mismatches, `total.ICMSTot.${xmlName}`, expected, text(totals, xmlName));

  const paymentDetails = childElements(child(infNfe, 'pag'), 'detPag');
  if (paymentDetails.length !== document.payments.length)
    mismatches.push({ field: 'pag.detPag.count', expected: document.payments.length, actual: paymentDetails.length });
  document.payments.forEach((payment, index) => {
    const actual = paymentDetails[index];
    if (!actual) return;
    const prefix = `pag.detPag[${index + 1}]`;
    addOptionalTextMismatch(mismatches, `${prefix}.indPag`, payment.paymentIndicator, text(actual, 'indPag'));
    addTextMismatch(mismatches, `${prefix}.tPag`, payment.methodCode, text(actual, 'tPag'));
    addOptionalTextMismatch(mismatches, `${prefix}.xPag`, payment.methodCode === '99' ? payment.description : undefined, text(actual, 'xPag'));
    addNumberMismatch(mismatches, `${prefix}.vPag`, payment.amount, text(actual, 'vPag'));
    addOptionalTextMismatch(mismatches, `${prefix}.dPag`, payment.paymentDate, text(actual, 'dPag'));
    const expectedCard = payment.card;
    const actualCard = child(actual, 'card');
    if (!expectedCard && actualCard)
      mismatches.push({ field: `${prefix}.card`, expected: '(ausente)', actual: '(presente)' });
    if (expectedCard) {
      addTextMismatch(mismatches, `${prefix}.card.tpIntegra`, expectedCard.integrationType, text(actualCard, 'tpIntegra'));
      addOptionalTextMismatch(mismatches, `${prefix}.card.CNPJ`, expectedCard.acquirerCnpj, text(actualCard, 'CNPJ'));
      addOptionalTextMismatch(mismatches, `${prefix}.card.tBand`, expectedCard.brand, text(actualCard, 'tBand'));
      addOptionalTextMismatch(mismatches, `${prefix}.card.cAut`, expectedCard.authorization, text(actualCard, 'cAut'));
    }
  });
  if (document.totals.change > 0)
    addNumberMismatch(mismatches, 'pag.vTroco', document.totals.change, text(child(infNfe, 'pag'), 'vTroco'));
  else addOptionalTextMismatch(mismatches, 'pag.vTroco', undefined, text(child(infNfe, 'pag'), 'vTroco'));

  const expectedInstallments = document.model === '55' ? document.billingInstallments || [] : [];
  const actualInstallments = childElements(child(infNfe, 'cobr'), 'dup');
  if (actualInstallments.length !== expectedInstallments.length)
    mismatches.push({
      field: 'cobr.dup.count',
      expected: expectedInstallments.length,
      actual: actualInstallments.length,
    });
  expectedInstallments.forEach((installment, index) => {
    const actual = actualInstallments[index];
    if (!actual) return;
    const prefix = `cobr.dup[${index + 1}]`;
    addTextMismatch(mismatches, `${prefix}.nDup`, installment.number, text(actual, 'nDup'));
    addOptionalTextMismatch(mismatches, `${prefix}.dVenc`, installment.dueDate, text(actual, 'dVenc'));
    addNumberMismatch(mismatches, `${prefix}.vDup`, installment.amount, text(actual, 'vDup'));
  });

  const expectedReferences =
    snapshot.order.data.referencedAccessKeys && Array.isArray(snapshot.order.data.referencedAccessKeys)
      ? snapshot.order.data.referencedAccessKeys.map(String)
      : [];
  const actualReferences = allDescendants(infNfe, 'refNFe').map((node) => node.textContent?.trim() || '');
  for (const expected of expectedReferences) {
    if (!actualReferences.includes(expected))
      mismatches.push({ field: 'ide.NFref.refNFe', expected, actual: actualReferences.join(', ') || '(ausente)' });
  }
  for (const actual of actualReferences) {
    if (!expectedReferences.includes(actual))
      mismatches.push({ field: 'ide.NFref.refNFe', expected: '(ausente)', actual });
  }

  if (document.model === '65') {
    const supplemental = child(parsed.documentElement, 'infNFeSupl');
    const expectedQrCode = `http://www.fazenda.pr.gov.br/nfce/qrcode?p=${identity.accessKey}|3|${document.environment}`;
    addTextMismatch(mismatches, 'infNFeSupl.qrCode', expectedQrCode, text(supplemental, 'qrCode'));
    addTextMismatch(mismatches, 'infNFeSupl.urlChave', 'http://www.fazenda.pr.gov.br/nfce/consulta', text(supplemental, 'urlChave'));
  } else if (child(parsed.documentElement, 'infNFeSupl')) {
    mismatches.push({ field: 'infNFeSupl', expected: '(ausente)', actual: '(presente)' });
  }

  if (mismatches.length) throw new FiscalXmlAuditError(mismatches);
}
