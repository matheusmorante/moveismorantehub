import { normalizeReviewedFiscalBlock } from '../../../erp/src/pages/utils/nfe/fiscalOperationXml';
import { parseAuthorizedInvoiceLines } from '../../../erp/src/pages/utils/nfe/invoiceLineSnapshot';
import { assertNfeSignature } from '../fiscalXmlAudit';

export type Environment = 1 | 2;

export function brazilTimestamp(now = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value || '';
  const local = Date.UTC(
    Number(value('year')),
    Number(value('month')) - 1,
    Number(value('day')),
    Number(value('hour')),
    Number(value('minute')),
    Number(value('second'))
  );
  const offsetMinutes = Math.round((local - now.getTime()) / 60_000);
  const sign = offsetMinutes < 0 ? '-' : '+';
  const offset = Math.abs(offsetMinutes);
  return `${value('year')}-${value('month')}-${value('day')}T${value('hour')}:${value('minute')}:${value('second')}${sign}${String(Math.floor(offset / 60)).padStart(2, '0')}:${String(offset % 60).padStart(2, '0')}`;
}

export function readTag(xml: string, tag: string): string | null {
  return xml.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([^<]*)</${tag}>`, 'i'))?.[1]?.trim() || null;
}

export function extractXmlBlock(xml: string, tag: string): string {
  const prefix = '(?:[\\w.-]+:)?';
  return (
    xml.match(new RegExp(`<${prefix}${tag}\\b[^>]*>[\\s\\S]*?<\\/${prefix}${tag}>`, 'i'))?.[0] || ''
  );
}

export function asFiscalSettings(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const record = value as Record<string, unknown>;
  const nested = record.data;
  return nested && typeof nested === 'object' && !Array.isArray(nested)
    ? (nested as Record<string, unknown>)
    : record;
}

export function getPersistableItems(
  signedXml: string,
  draftLines: Array<Record<string, unknown>>
) {
  const parsed = parseAuthorizedInvoiceLines(signedXml);
  if (parsed.length !== draftLines.length) {
    throw new Error('Os itens do XML assinado diferem dos itens revisados.');
  }
  return parsed.map((item) => {
    const line = draftLines.find(
      (candidate) => Number(candidate.fiscal_item_number) === item.invoiceItemNumber
    );
    if (!line || !line.reviewed_product_xml || !line.reviewed_taxes_xml || !line.reviewed_cfop) {
      throw new Error(`Item ${item.invoiceItemNumber} não possui revisão fiscal persistida.`);
    }
    if (
      normalizeReviewedFiscalBlock(item.productXml, 'prod') !==
        normalizeReviewedFiscalBlock(String(line.reviewed_product_xml), 'prod') ||
      normalizeReviewedFiscalBlock(item.taxesXml, 'imposto') !==
        normalizeReviewedFiscalBlock(String(line.reviewed_taxes_xml), 'imposto')
    ) {
      throw new Error(
        `XML assinado diverge da revisão fiscal do item ${item.invoiceItemNumber}.`
      );
    }
    return {
      draft_line_id: String(line.id),
      item_number: item.invoiceItemNumber,
      product_code: item.productCode,
      description: item.description,
      quantity: item.billedQuantity,
      unit_value: item.unitValue,
      gross_value: item.grossValue,
      discount_value: item.discountValue,
      product_xml: String(line.reviewed_product_xml),
      taxes_xml: String(line.reviewed_taxes_xml),
    };
  });
}

export function assertDraftXmlMatchesReview(input: {
  signedXml: string;
  certificatePem: string;
  draft: { operation_kind: string };
  review: Record<string, unknown>;
  lines: Array<Record<string, unknown>>;
  originalById: Map<string, Record<string, unknown>>;
  sourceAccessKey: string;
  environment: Environment;
  accessKey: string;
  series: string;
  number: number;
  sourceOperationType: number;
  sourceDestinationIndicator: number;
}) {
  const {
    signedXml,
    certificatePem,
    draft,
    review,
    lines,
    originalById,
    sourceAccessKey,
    environment,
    accessKey,
    series,
    number,
    sourceOperationType,
    sourceDestinationIndicator,
  } = input;
  assertNfeSignature(signedXml, certificatePem);
  const blocks = [
    ['dest', 'recipient_xml'],
    ['total', 'totals_xml'],
    ['transp', 'transport_xml'],
    ['pag', 'payment_xml'],
  ] as const;
  for (const [tag, reviewField] of blocks) {
    const expected = normalizeReviewedFiscalBlock(String(review[reviewField] || ''), tag);
    const actual = normalizeReviewedFiscalBlock(extractXmlBlock(signedXml, tag), tag);
    if (actual !== expected) {
      throw new Error(`XML assinado diverge da prévia fiscal no campo ${tag}.`);
    }
  }

  const expectedIdentity: Record<string, string> = {
    mod: '55',
    tpAmb: String(environment),
    serie: String(Number(series)),
    nNF: String(number),
    finNFe: draft.operation_kind === 'return' ? '4' : '3',
    tpNF:
      draft.operation_kind === 'return' || sourceOperationType === 1
        ? '0'
        : '1',
    idDest: draft.operation_kind === 'return' ? '1' : String(sourceDestinationIndicator),
  };
  if (!signedXml.includes(`Id="NFe${accessKey}"`)) {
    throw new Error('XML assinado diverge da chave de acesso reservada.');
  }
  for (const [tag, expected] of Object.entries(expectedIdentity)) {
    if (readTag(extractXmlBlock(signedXml, 'ide'), tag) !== expected) {
      throw new Error(`XML assinado diverge da identidade fiscal em ide.${tag}.`);
    }
  }
  if (!signedXml.includes(`<tpAmb>${environment}</tpAmb>`)) {
    throw new Error('XML assinado diverge do ambiente fiscal selecionado.');
  }

  const invoiceLines = getPersistableItems(
    signedXml,
    lines as Array<Record<string, unknown>>
  );
  if (draft.operation_kind === 'return') {
    const actualReferences = [
      ...signedXml.matchAll(/<DFeReferenciado>([\s\S]*?)<\/DFeReferenciado>/g),
    ].map(([, block]) => ({
      accessKey: readTag(block, 'chaveAcesso'),
      itemNumber: Number(readTag(block, 'nItem')),
    }));
    const expectedReferences = lines.map((line) => {
      const original = originalById.get(String(line.original_document_item_id || ''));
      return Number(original?.item_number);
    });
    if (
      actualReferences.length !== lines.length ||
      actualReferences.some(
        (reference, index) =>
          reference.accessKey !== sourceAccessKey ||
          reference.itemNumber !== expectedReferences[index]
      ) ||
      invoiceLines.length !== lines.length ||
      /<NFref\b/.test(signedXml)
    ) {
      throw new Error('Referências fiscais dos itens da devolução divergem das alocações revisadas.');
    }
  } else {
    const ide = extractXmlBlock(signedXml, 'ide');
    const references = [...ide.matchAll(/<refNFe>([0-9]{6}[A-Z0-9]{12}[0-9]{26})<\/refNFe>/g)].map(
      ([, key]) => key
    );
    if (
      references.length !== 1 ||
      references[0] !== sourceAccessKey ||
      /<DFeReferenciado\b/.test(signedXml)
    ) {
      throw new Error('XML de estorno deve referenciar somente a chave fiscal original.');
    }
  }
}
