import { DOMParser } from '@xmldom/xmldom';
import { SignedXml } from 'xml-crypto';

export type FiscalXmlEnvironment = 1 | 2;

export interface FiscalXmlItemExpectation {
  code: string;
  description?: string;
  homologationDescription?: string;
  ncm: string;
  cest?: string | null;
  cfop: string;
  origin: string;
  csosn?: string;
  cst?: string;
  quantity: number;
  unitPrice: number;
  productTotal?: number;
  discount?: number;
  freight?: number;
  icmsBase?: number;
  icmsRate?: number;
  taxBase?: number;
  icms?: number;
  pisBase?: number;
  pisRate?: number;
  pis?: number;
  cofinsBase?: number;
  cofinsRate?: number;
  cofins?: number;
}

export interface FiscalXmlAddressExpectation {
  street?: string;
  number?: string;
  complement?: string;
  neighborhood?: string;
  municipalityCode?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  countryCode?: string;
  country?: string;
}

export interface FiscalXmlSnapshotExpectation {
  model: '55' | '65';
  environment: FiscalXmlEnvironment;
  operation: 'sale' | 'return';
  number?: number | string;
  series?: number | string;
  accessKey?: string;
  finality?: string;
  issuerTaxId?: string;
  issuerName?: string;
  issuerAddress?: FiscalXmlAddressExpectation;
  recipientTaxId?: string;
  recipientName?: string;
  recipientAddress?: FiscalXmlAddressExpectation;
  referenceAccessKey?: string;
  freightMode?: string;
  items: FiscalXmlItemExpectation[];
  totals: {
    products: number;
    icmsBase?: number;
    discount?: number;
    freight?: number;
    icms?: number;
    icmsExempt?: number;
    icmsStBase?: number;
    icmsSt?: number;
    insurance?: number;
    importTax?: number;
    ipi?: number;
    pisBase?: number;
    pis?: number;
    cofinsBase?: number;
    cofins?: number;
    other?: number;
    estimatedTaxes?: number;
    invoice: number;
  };
}

export interface FiscalXmlMismatch {
  field: string;
  expected: string | number;
  actual: string | number;
}

export class FiscalXmlSnapshotMismatchError extends Error {
  readonly mismatches: FiscalXmlMismatch[];

  constructor(mismatches: FiscalXmlMismatch[]) {
    const detail = mismatches
      .map(({ field, expected, actual }) => `${field}: esperado ${expected}; encontrado ${actual}`)
      .join('\n');
    super(`O XML fiscal diverge do snapshot confirmado pela interface:\n${detail}`);
    this.name = 'FiscalXmlSnapshotMismatchError';
    this.mismatches = mismatches;
  }
}

type XmlElement = Element;

function localName(element: XmlElement): string {
  return (element.localName || element.tagName).split(':').at(-1) || '';
}

function children(element: XmlElement): XmlElement[] {
  return Array.from(element.childNodes).filter(
    (node): node is XmlElement => node.nodeType === 1
  );
}

function firstChild(element: XmlElement | null, name: string): XmlElement | null {
  if (!element) return null;
  return children(element).find((child) => localName(child) === name) || null;
}

function descendants(element: XmlElement | Document, name: string): XmlElement[] {
  const found: XmlElement[] = [];
  const visit = (node: XmlElement) => {
    if (localName(node) === name) found.push(node);
    for (const child of children(node)) visit(child);
  };
  if (element.nodeType === 9) {
    const documentElement = (element as Document).documentElement;
    if (documentElement) visit(documentElement);
  } else {
    visit(element as XmlElement);
  }
  return found;
}

function text(element: XmlElement | null, childName: string): string {
  return firstChild(element, childName)?.textContent?.trim() || '';
}

function descendantText(element: XmlElement | null, name: string): string {
  return (element && descendants(element, name)[0]?.textContent?.trim()) || '';
}

function numeric(value: string): number | null {
  if (!value || !/^-?\d+(?:\.\d+)?$/.test(value)) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizedTaxId(value: string): string {
  return value.replace(/\D/g, '');
}

function compareText(
  mismatches: FiscalXmlMismatch[],
  field: string,
  expected: string | undefined,
  actual: string
) {
  if (expected !== undefined && expected !== actual) {
    mismatches.push({ field, expected, actual: actual || '(ausente)' });
  }
}

function compareTaxId(
  mismatches: FiscalXmlMismatch[],
  field: string,
  expected: string | undefined,
  actual: string
) {
  if (
    expected !== undefined &&
    normalizedTaxId(expected) !== normalizedTaxId(actual)
  ) {
    mismatches.push({
      field,
      expected: normalizedTaxId(expected),
      actual: normalizedTaxId(actual) || '(ausente)',
    });
  }
}

function compareAddress(
  mismatches: FiscalXmlMismatch[],
  field: string,
  element: XmlElement | null,
  expected: FiscalXmlAddressExpectation | undefined
): void {
  if (!expected) return;
  const fields: Array<[keyof FiscalXmlAddressExpectation, string]> = [
    ['street', 'xLgr'],
    ['number', 'nro'],
    ['complement', 'xCpl'],
    ['neighborhood', 'xBairro'],
    ['municipalityCode', 'cMun'],
    ['city', 'xMun'],
    ['state', 'UF'],
    ['postalCode', 'CEP'],
    ['countryCode', 'cPais'],
    ['country', 'xPais'],
  ];
  for (const [key, xmlName] of fields) {
    compareText(mismatches, `${field}.${xmlName}`, expected[key], text(element, xmlName));
  }
}

function compareNumber(
  mismatches: FiscalXmlMismatch[],
  field: string,
  expected: number | undefined,
  actualText: string,
  tolerance = 0.005
) {
  if (expected === undefined) return;
  const actual = numeric(actualText);
  if (actual === null || Math.abs(actual - expected) > tolerance) {
    mismatches.push({
      field,
      expected,
      actual: actual === null ? actualText || '(ausente)' : actual,
    });
  }
}

/**
 * Compares the signed XML shown after the UI transmission with a small, independent
 * snapshot built from the values entered and confirmed in the form.
 */
export function assertFiscalXmlMatchesSnapshot(
  xml: string,
  expected: FiscalXmlSnapshotExpectation
): void {
  const parseErrors: string[] = [];
  const document = new DOMParser({
    onError: (level, message) => {
      if (level === 'error' || level === 'fatalError') parseErrors.push(message);
    },
  }).parseFromString(xml, 'application/xml');

  if (parseErrors.length || !document.documentElement) {
    throw new Error(`XML fiscal inválido: ${parseErrors.join('; ') || 'raiz ausente'}`);
  }

  const infNfe = descendants(document, 'infNFe')[0];
  if (!infNfe) throw new Error('XML fiscal inválido: elemento infNFe ausente.');

  const ide = firstChild(infNfe, 'ide');
  const issuer = firstChild(infNfe, 'emit');
  const recipient = firstChild(infNfe, 'dest');
  const issuerAddress = firstChild(issuer, 'enderEmit');
  const recipientAddress = firstChild(recipient, 'enderDest');
  const transport = firstChild(infNfe, 'transp');
  const total = firstChild(firstChild(infNfe, 'total'), 'ICMSTot');
  const mismatches: FiscalXmlMismatch[] = [];

  compareText(mismatches, 'ide.mod', expected.model, text(ide, 'mod'));
  compareText(
    mismatches,
    'ide.tpAmb',
    String(expected.environment),
    text(ide, 'tpAmb')
  );
  compareNumber(mismatches, 'ide.nNF', typeof expected.number === 'number' ? expected.number : undefined, text(ide, 'nNF'), 0);
  compareText(mismatches, 'ide.nNF', typeof expected.number === 'string' ? expected.number : undefined, text(ide, 'nNF'));
  compareNumber(mismatches, 'ide.serie', typeof expected.series === 'number' ? expected.series : undefined, text(ide, 'serie'), 0);
  compareText(mismatches, 'ide.serie', typeof expected.series === 'string' ? expected.series : undefined, text(ide, 'serie'));
  if (expected.accessKey !== undefined) {
    const actualAccessKey = (infNfe.getAttribute('Id') || '').replace(/^NFe/, '');
    compareText(mismatches, 'infNFe.Id', expected.accessKey, actualAccessKey);
  }
  compareText(mismatches, 'ide.finNFe', expected.finality, text(ide, 'finNFe'));
  compareTaxId(
    mismatches,
    'emit.CNPJ/CPF',
    expected.issuerTaxId,
    text(issuer, 'CNPJ') || text(issuer, 'CPF')
  );
  compareText(mismatches, 'emit.xNome', expected.issuerName, text(issuer, 'xNome'));
  compareAddress(mismatches, 'emit.enderEmit', issuerAddress, expected.issuerAddress);
  compareTaxId(
    mismatches,
    'dest.CNPJ/CPF',
    expected.recipientTaxId,
    text(recipient, 'CNPJ') || text(recipient, 'CPF')
  );
  compareText(mismatches, 'dest.xNome', expected.recipientName, text(recipient, 'xNome'));
  compareAddress(mismatches, 'dest.enderDest', recipientAddress, expected.recipientAddress);
  compareText(mismatches, 'transp.modFrete', expected.freightMode, text(transport, 'modFrete'));

  const direction = text(ide, 'tpNF');
  compareText(
    mismatches,
    'ide.tpNF',
    expected.operation === 'return' ? '0' : '1',
    direction
  );

  if (expected.referenceAccessKey !== undefined) {
    const references = descendants(infNfe, 'refNFe').map((node) => node.textContent?.trim() || '');
    if (!references.includes(expected.referenceAccessKey)) {
      mismatches.push({
        field: 'ide.NFref.refNFe',
        expected: expected.referenceAccessKey,
        actual: references.join(', ') || '(ausente)',
      });
    }
  }

  const details = descendants(infNfe, 'det');
  if (details.length !== expected.items.length) {
    mismatches.push({ field: 'infNFe.det.count', expected: expected.items.length, actual: details.length });
  }

  expected.items.forEach((item, index) => {
    const detail = details[index];
    const prefix = `det[${index + 1}]`;
    if (!detail) {
      mismatches.push({ field: `${prefix}.prod`, expected: item.code, actual: '(ausente)' });
      return;
    }

    const product = firstChild(detail, 'prod');
    const taxes = firstChild(detail, 'imposto');
    const icms = firstChild(taxes, 'ICMS');
    const pis = firstChild(taxes, 'PIS');
    const cofins = firstChild(taxes, 'COFINS');
    const expectedDescription =
      expected.environment === 2 && item.homologationDescription !== undefined
        ? item.homologationDescription
        : item.description;
    compareText(mismatches, `${prefix}.prod.cProd`, item.code, text(product, 'cProd'));
    compareText(mismatches, `${prefix}.prod.xProd`, expectedDescription, text(product, 'xProd'));
    compareText(mismatches, `${prefix}.prod.NCM`, item.ncm, text(product, 'NCM'));
    compareText(mismatches, `${prefix}.prod.CEST`, item.cest ?? undefined, text(product, 'CEST'));
    if (item.cest === null && text(product, 'CEST')) {
      mismatches.push({ field: `${prefix}.prod.CEST`, expected: '(ausente)', actual: text(product, 'CEST') });
    }
    compareText(mismatches, `${prefix}.prod.CFOP`, item.cfop, text(product, 'CFOP'));
    compareText(mismatches, `${prefix}.imposto.ICMS.orig`, item.origin, descendantText(icms, 'orig'));
    compareText(mismatches, `${prefix}.imposto.ICMS.CSOSN`, item.csosn, descendantText(icms, 'CSOSN'));
    compareText(mismatches, `${prefix}.imposto.ICMS.CST`, item.cst, descendantText(icms, 'CST'));
    compareNumber(mismatches, `${prefix}.prod.qCom`, item.quantity, text(product, 'qCom'), 0.000001);
    compareNumber(mismatches, `${prefix}.prod.vUnCom`, item.unitPrice, text(product, 'vUnCom'));
    compareNumber(mismatches, `${prefix}.prod.vProd`, item.productTotal, text(product, 'vProd'));
    compareNumber(mismatches, `${prefix}.prod.vDesc`, item.discount, text(product, 'vDesc'));
    compareNumber(mismatches, `${prefix}.prod.vFrete`, item.freight, text(product, 'vFrete'));
    compareNumber(mismatches, `${prefix}.imposto.ICMS.vBC`, item.icmsBase ?? item.taxBase, descendantText(icms, 'vBC'));
    compareNumber(mismatches, `${prefix}.imposto.ICMS.pICMS`, item.icmsRate, descendantText(icms, 'pICMS'));
    compareNumber(mismatches, `${prefix}.imposto.ICMS.vICMS`, item.icms, descendantText(icms, 'vICMS'));
    compareNumber(mismatches, `${prefix}.imposto.PIS.vBC`, item.pisBase, descendantText(pis, 'vBC'));
    compareNumber(mismatches, `${prefix}.imposto.PIS.pPIS`, item.pisRate, descendantText(pis, 'pPIS'));
    compareNumber(mismatches, `${prefix}.imposto.PIS.vPIS`, item.pis, descendantText(pis, 'vPIS'));
    compareNumber(mismatches, `${prefix}.imposto.COFINS.vBC`, item.cofinsBase, descendantText(cofins, 'vBC'));
    compareNumber(mismatches, `${prefix}.imposto.COFINS.pCOFINS`, item.cofinsRate, descendantText(cofins, 'pCOFINS'));
    compareNumber(mismatches, `${prefix}.imposto.COFINS.vCOFINS`, item.cofins, descendantText(cofins, 'vCOFINS'));
  });

  compareNumber(mismatches, 'total.ICMSTot.vBC', expected.totals.icmsBase, text(total, 'vBC'));
  compareNumber(mismatches, 'total.ICMSTot.vProd', expected.totals.products, text(total, 'vProd'));
  compareNumber(mismatches, 'total.ICMSTot.vDesc', expected.totals.discount, text(total, 'vDesc'));
  compareNumber(mismatches, 'total.ICMSTot.vFrete', expected.totals.freight, text(total, 'vFrete'));
  compareNumber(mismatches, 'total.ICMSTot.vICMS', expected.totals.icms, text(total, 'vICMS'));
  compareNumber(mismatches, 'total.ICMSTot.vICMSDeson', expected.totals.icmsExempt, text(total, 'vICMSDeson'));
  compareNumber(mismatches, 'total.ICMSTot.vBCST', expected.totals.icmsStBase, text(total, 'vBCST'));
  compareNumber(mismatches, 'total.ICMSTot.vST', expected.totals.icmsSt, text(total, 'vST'));
  compareNumber(mismatches, 'total.ICMSTot.vSeg', expected.totals.insurance, text(total, 'vSeg'));
  compareNumber(mismatches, 'total.ICMSTot.vII', expected.totals.importTax, text(total, 'vII'));
  compareNumber(mismatches, 'total.ICMSTot.vIPI', expected.totals.ipi, text(total, 'vIPI'));
  compareNumber(mismatches, 'total.ICMSTot.vPIS', expected.totals.pis, text(total, 'vPIS'));
  compareNumber(mismatches, 'total.ICMSTot.vCOFINS', expected.totals.cofins, text(total, 'vCOFINS'));
  compareNumber(mismatches, 'total.ICMSTot.vOutro', expected.totals.other, text(total, 'vOutro'));
  compareNumber(mismatches, 'total.ICMSTot.vTotTrib', expected.totals.estimatedTaxes, text(total, 'vTotTrib'));
  compareNumber(mismatches, 'total.ICMSTot.vNF', expected.totals.invoice, text(total, 'vNF'));

  if (mismatches.length) throw new FiscalXmlSnapshotMismatchError(mismatches);
  assertFiscalXmlSignatureValid(xml);
}

/** Verifies the XMLDSig over infNFe using the X.509 certificate embedded in KeyInfo. */
export function assertFiscalXmlSignatureValid(xml: string): void {
  const parseErrors: string[] = [];
  const document = new DOMParser({
    onError: (level, message) => {
      if (level === 'error' || level === 'fatalError') parseErrors.push(message);
    },
  }).parseFromString(xml, 'application/xml');
  if (parseErrors.length || !document.documentElement) {
    throw new Error(`XML assinado inválido: ${parseErrors.join('; ') || 'raiz ausente'}`);
  }

  const signatures = descendants(document, 'Signature');
  const infNfe = descendants(document, 'infNFe')[0];
  const signature = signatures[0];
  if (signatures.length !== 1 || !signature || !infNfe) {
    throw new Error('XML fiscal deve conter uma assinatura XMLDSig para o elemento infNFe.');
  }
  const elementId = infNfe.getAttribute('Id');
  const references = descendants(signature, 'Reference');
  if (
    !elementId ||
    references.length !== 1 ||
    references[0].getAttribute('URI') !== `#${elementId}` ||
    !descendantText(signature, 'SignatureValue') ||
    !descendantText(signature, 'X509Certificate')
  ) {
    throw new Error('Assinatura fiscal incompleta ou sem referência ao infNFe desta nota.');
  }

  const verifier = new SignedXml({ getCertFromKeyInfo: SignedXml.getCertFromKeyInfo });
  verifier.loadSignature(signature);
  if (!verifier.checkSignature(xml)) {
    throw new Error('A assinatura XMLDSig não confere com o conteúdo final do XML fiscal.');
  }
}
