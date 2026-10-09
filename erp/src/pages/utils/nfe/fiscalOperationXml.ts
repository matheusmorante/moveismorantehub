import { DOMParser, XMLSerializer } from '@xmldom/xmldom';
import type { Element } from '@xmldom/xmldom';
import type { AppSettings } from '../settingsService';
import { calculateMod11CheckDigit } from './nfeAccessKey';
import { buildEmitXml, buildIdeXml, escapeXml } from './xml/xmlEmitterBlock';
import {
  getReturnCfopOptionsForSourceItem,
  getFiscalFormXmlDefaults,
  getFiscalFormRules,
  validateReturnTaxScenario,
  ESTORNO_NATURE_OF_OPERATION,
  type FiscalFormScenario,
  type FiscalReturnMethod,
} from '../../../../../shared-utils/fiscalOperationContext';
import { ESTORNO_FALLBACK_CFOPS } from './fiscalCfopResolution';

type FiscalEnvironment = 1 | 2;
type FiscalOperationKind = 'estorno' | 'return';

export interface ReviewedFiscalOperationLine {
  originalItemNumber: number;
  originalProductCode?: string;
  originalDescription?: string;
  originalNcm?: string;
  originalCfop?: string;
  originalTaxesXml?: string;
  originalUnitValue?: number;
  billedQuantity: number;
  originalGrossValue: number;
  originalDiscountValue: number;
  quantity: number;
  grossValue: number;
  discountValue: number;
  cfop: string;
  /** Product and tax blocks are explicitly reviewed for this operation, not the sale blocks. */
  productXml: string;
  taxesXml: string;
}

export interface ReviewedFiscalOperationXmlInput {
  kind: FiscalOperationKind;
  returnMethod?: FiscalReturnMethod;
  returnScenario?: FiscalFormScenario;
  environment: FiscalEnvironment;
  originalEnvironment: FiscalEnvironment;
  originalStatus: 'autorizada' | 'homologada';
  originalProtocol: string;
  originalAccessKey: string;
  accessKey: string;
  randomCode: string;
  checkDigit: number;
  nfeNumber: number;
  series: string;
  issuedAt: string;
  settings: AppSettings;
  natureOfOperation: string;
  /** The original sale's destination indicator, preserved for an estorno. */
  destinationIndicator?: 1 | 2 | 3;
  originalOperationType?: 0 | 1;
  /** Reviewed destination; never filled with the sale builder's placeholder address. */
  recipientXml: string;
  totalsXml: string;
  transportXml: string;
  paymentXml: string;
  reason?: string;
  periodAdjustmentText?: string;
  lines: ReviewedFiscalOperationLine[];
}

const namespace = 'http://www.portalfiscal.inf.br/nfe';

function parseBlock(xml: string, expected: string): Element {
  if (!xml || /<!DOCTYPE|<!ENTITY|<\?/i.test(xml)) throw new Error(`Bloco ${expected} inválido.`);
  let parseError = '';
  const onParseError = (level: string, message: string) => {
    if (level === 'warning' && message.includes('errorHandler') && message.includes('deprecated'))
      return;
    parseError ||= message;
  };
  const document = new DOMParser({
    errorHandler: onParseError,
  }).parseFromString(`<wrapper xmlns="${namespace}">${xml}</wrapper>`, 'application/xml');
  if (parseError || !document?.documentElement)
    throw new Error(`Bloco ${expected} não é XML válido.`);
  const children = Array.from(document.documentElement.childNodes);
  const elements = children.filter((child) => child.nodeType === 1) as Element[];
  if (
    elements.length !== 1 ||
    children.some((child) => child.nodeType === 3 && child.textContent?.trim())
  ) {
    throw new Error(`Bloco ${expected} deve conter apenas um elemento.`);
  }
  const element = elements[0];
  if (
    element.localName !== expected ||
    (element.namespaceURI && element.namespaceURI !== namespace)
  ) {
    throw new Error(`Esperado bloco ${expected}.`);
  }
  return element;
}

function directText(element: Element, name: string): string {
  const child = Array.from(element.childNodes).find(
    (node) => node.nodeType === 1 && (node as Element).localName === name
  );
  return child?.textContent?.trim() || '';
}

function decimal(value: string, field: string): number {
  if (!/^\d{1,13}(?:\.\d{1,4})?$/.test(value))
    throw new Error(`${field} inválido na revisão fiscal.`);
  return Number(value);
}

function assertMoney(actual: number, expected: number, field: string): void {
  if (!Number.isFinite(expected) || expected < 0 || Math.abs(actual - expected) > 0.005) {
    throw new Error(`${field} diverge das quantidades e valores conferidos.`);
  }
}

function assertQuantity(actual: number, expected: number, field: string): void {
  if (!Number.isFinite(expected) || expected <= 0 || Math.abs(actual - expected) > 0.00005) {
    throw new Error(`${field} diverge da quantidade conferida.`);
  }
}

function blockXml(xml: string, expected: string): string {
  return new XMLSerializer().serializeToString(parseBlock(xml, expected));
}

export function normalizeReviewedFiscalBlock(
  xml: string,
  expected: 'prod' | 'imposto' | 'dest' | 'total' | 'transp' | 'pag'
): string {
  return blockXml(xml, expected);
}

/** Structural preview only. XSD validation and fiscal authorization are separate mandatory gates. */
export function buildReviewedFiscalOperationXml(input: ReviewedFiscalOperationXmlInput): string {
  const expectedStatus = input.environment === 1 ? 'autorizada' : 'homologada';
  if (
    input.originalEnvironment !== input.environment ||
    input.originalStatus !== expectedStatus ||
    !/^\d{15}$/.test(input.originalProtocol || '') ||
    !/^\d{44}$/.test(input.originalAccessKey) ||
    calculateMod11CheckDigit(input.originalAccessKey.slice(0, 43)) !==
      Number(input.originalAccessKey[43])
  ) {
    throw new Error('NF-e original não autorizada e protocolada no ambiente selecionado.');
  }
  if (
    !/^\d{44}$/.test(input.accessKey) ||
    !/^\d{8}$/.test(input.randomCode) ||
    calculateMod11CheckDigit(input.accessKey.slice(0, 43)) !== Number(input.accessKey[43]) ||
    input.accessKey.slice(20, 22) !== '55' ||
    input.accessKey.slice(35, 43) !== input.randomCode ||
    input.accessKey[34] !== '1' ||
    input.checkDigit !== Number(input.accessKey[43]) ||
    !Number.isInteger(input.nfeNumber) ||
    input.nfeNumber <= 0 ||
    input.accessKey.slice(25, 34) !== String(input.nfeNumber).padStart(9, '0') ||
    input.accessKey.slice(22, 25) !== String(Number(input.series)).padStart(3, '0')
  ) {
    throw new Error('Chave, série ou número da NF-e revisada são inconsistentes.');
  }
  const issuedAt = new Date(input.issuedAt);
  if (
    !Number.isFinite(issuedAt.valueOf()) ||
    !/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}-\d{2}:\d{2}/.test(input.issuedAt) ||
    input.accessKey.slice(2, 6) !== `${input.issuedAt.slice(2, 4)}${input.issuedAt.slice(5, 7)}`
  ) {
    throw new Error('Data de emissão incompatível com a chave fiscal.');
  }
  const settings = input.settings;
  const cnpj = String(settings.companyCnpj || '').replace(/\D/g, '');
  if (
    cnpj.length !== 14 ||
    input.accessKey.slice(6, 20) !== cnpj ||
    input.originalAccessKey.slice(6, 20) !== cnpj ||
    !String(settings.companyName || '').trim() ||
    !String(settings.companyIE || '').trim() ||
    !/^\d{8}$/.test(String(settings.companyCEP || '').replace(/\D/g, '')) ||
    !/^\d{7}$/.test(String(settings.companyCMun || '')) ||
    settings.companyUF !== 'PR' ||
    !String(settings.companyLogradouro || '').trim() ||
    !String(settings.companyNumero || '').trim() ||
    !String(settings.companyBairro || '').trim() ||
    !String(settings.companyXMun || '').trim()
  ) {
    throw new Error('Cadastro fiscal do emitente incompleto ou diferente da chave de acesso.');
  }
  if (!input.natureOfOperation?.trim() || input.natureOfOperation.length > 60) {
    throw new Error('Natureza da operação fiscal deve ser conferida.');
  }
  if (
    input.kind === 'estorno' &&
    (input.natureOfOperation !== ESTORNO_NATURE_OF_OPERATION ||
      ![1, 2, 3].includes(Number(input.destinationIndicator)) ||
      ![0, 1].includes(Number(input.originalOperationType)))
  ) {
    throw new Error('Estorno requer natureza, tpNF e indicador de destino fiscal da nota original.');
  }
  if (input.kind === 'estorno' && (!input.reason || input.reason.trim().length < 15)) {
    throw new Error('Estorno requer justificativa específica.');
  }
  if (
    input.kind === 'estorno' &&
    Array.from(String(input.periodAdjustmentText || '')).length > 1200
  ) {
    throw new Error('A revisão de diferenças e acréscimos excede o limite fiscal.');
  }
  if (!input.lines.length || input.lines.length > 990)
    throw new Error('Operação fiscal sem itens conferidos.');

  const recipient = parseBlock(input.recipientXml, 'dest');
  if (
    !directText(recipient, 'xNome') ||
    (!directText(recipient, 'CPF') && !directText(recipient, 'CNPJ'))
  ) {
    throw new Error('Destinatário/remetente fiscal precisa ser conferido e identificado.');
  }
  const returnRules = getFiscalFormRules('return', {
    ...(input.returnScenario || { returnMethod: input.returnMethod }),
  });
  const returnXmlDefaults = getFiscalFormXmlDefaults(returnRules);
  if (input.kind === 'return') {
    const recipientAddress = Array.from(recipient.childNodes).find(
      (node) => node.nodeType === 1 && (node as Element).localName === 'enderDest'
    ) as Element | undefined;
    const recipientUf = recipientAddress ? directText(recipientAddress, 'UF').toUpperCase() : '';
    if (
      !returnRules.allowedModels.includes('55') ||
      !returnXmlDefaults ||
      !returnRules.allowedTransportModes.length ||
      input.natureOfOperation !== returnXmlDefaults.natureOfOperation ||
      !returnRules.allowedModels.includes(input.originalAccessKey.slice(20, 22) as '55' | '65') ||
      recipientUf !== String(settings.companyUF).toUpperCase() ||
      directText(recipient, 'indIEDest') !== String(returnRules.fixedValues.indIEDest)
    ) {
      throw new Error('Cenário de devolução incompatível com as regras fiscais habilitadas.');
    }
  }

  let grossTotal = 0;
  let discountTotal = 0;
  const originalItems = new Set<number>();
  const details = input.lines
    .map((line, index) => {
      if (
        !Number.isInteger(line.originalItemNumber) ||
        line.originalItemNumber < 1 ||
        originalItems.has(line.originalItemNumber) ||
        !Number.isFinite(line.billedQuantity) ||
        line.billedQuantity <= 0 ||
        !Number.isFinite(line.quantity) ||
        line.quantity <= 0 ||
        line.quantity > line.billedQuantity ||
        !(
          /^[12]\d{3}$/.test(line.cfop) ||
          (input.kind === 'estorno' &&
            ESTORNO_FALLBACK_CFOPS.includes(line.cfop as (typeof ESTORNO_FALLBACK_CFOPS)[number]))
        )
      ) {
        throw new Error(
          `Item ${index + 1}: origem, quantidade ou CFOP interno de entrada inválido.`
        );
      }
      if (input.kind === 'return') {
        const taxScenarioError = validateReturnTaxScenario('', line.originalTaxesXml || '');
        if (taxScenarioError) throw new Error(taxScenarioError);
        const allowedCfops = getReturnCfopOptionsForSourceItem(
          line.originalCfop || '',
          line.originalTaxesXml || ''
        );
        if (!allowedCfops.some((option) => option.value === line.cfop)) {
          throw new Error(`Item ${index + 1}: CFOP incompatível com a devolução e a tributação original.`);
        }
      }
      const proportionalGross =
        Math.round((line.originalGrossValue * 100 * line.quantity) / line.billedQuantity) / 100;
      const proportionalDiscount =
        Math.round((line.originalDiscountValue * 100 * line.quantity) / line.billedQuantity) / 100;
      assertMoney(line.grossValue, proportionalGross, `Valor proporcional do item ${index + 1}`);
      assertMoney(
        line.discountValue,
        proportionalDiscount,
        `Desconto proporcional do item ${index + 1}`
      );
      originalItems.add(line.originalItemNumber);
      const product = parseBlock(line.productXml, 'prod');
      const taxes = parseBlock(line.taxesXml, 'imposto');
      if (directText(product, 'CFOP') !== line.cfop) {
        throw new Error(`Item ${index + 1}: CFOP do produto não conferido.`);
      }
      if (!/^\d{8}$/.test(directText(product, 'NCM'))) {
        throw new Error(`Item ${index + 1}: NCM do produto deve ter 8 dígitos.`);
      }
      if (line.originalProductCode && directText(product, 'cProd') !== line.originalProductCode) {
        throw new Error(
          `Item ${index + 1}: código do produto deve preservar o documento fiscal original.`
        );
      }
      if (line.originalDescription && directText(product, 'xProd') !== line.originalDescription) {
        throw new Error(
          `Item ${index + 1}: descrição do produto deve preservar o documento fiscal original.`
        );
      }
      if (line.originalNcm && directText(product, 'NCM') !== line.originalNcm) {
        throw new Error(
          `Item ${index + 1}: NCM do produto deve preservar o documento fiscal original.`
        );
      }
      if (
        line.originalUnitValue !== undefined &&
        Math.abs(decimal(directText(product, 'vUnCom'), 'vUnCom') - line.originalUnitValue) > 0.0001
      ) {
        throw new Error(
          `Item ${index + 1}: preço unitário do produto deve preservar o documento fiscal original.`
        );
      }
      assertQuantity(
        decimal(directText(product, 'qCom'), 'qCom'),
        line.quantity,
        `Quantidade do item ${index + 1}`
      );
      assertMoney(
        decimal(directText(product, 'vProd'), 'vProd'),
        line.grossValue,
        `Valor bruto do item ${index + 1}`
      );
      assertMoney(
        decimal(directText(product, 'vDesc') || '0', 'vDesc'),
        line.discountValue,
        `Desconto do item ${index + 1}`
      );
      if (line.discountValue > line.grossValue || !taxes.getElementsByTagName('ICMS').length) {
        throw new Error(`Item ${index + 1}: desconto ou tributos não conferidos.`);
      }
      grossTotal += line.grossValue;
      discountTotal += line.discountValue;
      const reference =
        input.kind === 'return'
          ? `<DFeReferenciado><chaveAcesso>${input.originalAccessKey}</chaveAcesso><nItem>${line.originalItemNumber}</nItem></DFeReferenciado>`
          : '';
      const serializedProduct = new XMLSerializer().serializeToString(product);
      const serializedTaxes = new XMLSerializer().serializeToString(taxes);
      return `<det nItem="${index + 1}">${serializedProduct}${serializedTaxes}${reference}</det>`;
    })
    .join('');

  const totals = parseBlock(input.totalsXml, 'total');
  const icmsTotal = Array.from(totals.childNodes).find(
    (node) => node.nodeType === 1 && (node as Element).localName === 'ICMSTot'
  ) as Element | undefined;
  if (!icmsTotal) throw new Error('Totais fiscais ICMSTot não conferidos.');
  assertMoney(decimal(directText(icmsTotal, 'vProd'), 'vProd'), grossTotal, 'Total bruto');
  assertMoney(
    decimal(directText(icmsTotal, 'vDesc'), 'vDesc'),
    discountTotal,
    'Total de descontos'
  );
  decimal(directText(icmsTotal, 'vNF'), 'vNF');
  const transport = blockXml(input.transportXml, 'transp');
  const payment = blockXml(input.paymentXml, 'pag');
  if (input.kind === 'return') {
    if (!returnXmlDefaults) {
      throw new Error('Não há blocos fiscais aprovados para o retorno desta devolução.');
    }
    const fixedPayment = normalizeReviewedFiscalBlock(
      returnXmlDefaults.paymentXml,
      'pag'
    );
    const fixedTransport = normalizeReviewedFiscalBlock(
      returnXmlDefaults.transportXml,
      'transp'
    );
    if (
      normalizeReviewedFiscalBlock(input.paymentXml, 'pag') !== fixedPayment ||
      normalizeReviewedFiscalBlock(input.transportXml, 'transp') !== fixedTransport
    ) {
      throw new Error('Pagamento e transporte fiscal não correspondem ao contexto da devolução.');
    }
  }
  const estornoInfAdFisco = [
    input.reason?.trim(),
    input.periodAdjustmentText?.trim(),
    'Nota Fiscal emitida de acordo com inciso VII do caput do art. 298 do RICMS',
  ]
    .filter(Boolean)
    .join(' ');
  const information =
    input.kind === 'estorno'
      ? `<infAdic><infAdFisco>${escapeXml(estornoInfAdFisco)}</infAdFisco></infAdic>`
      : `<infAdic><infCpl>Devolucao referente a NF-e ${input.originalAccessKey}; itens e quantidades identificados por item.</infCpl></infAdic>`;
  const ide = buildIdeXml({
    accessKey: input.accessKey,
    randomCode: input.randomCode,
    checkDigit: input.checkDigit,
    nfeNumber: input.nfeNumber,
    series: input.series,
    model: '55',
    environment: input.environment,
    dhEmi: input.issuedAt,
    natureOfOperation: input.natureOfOperation,
    operationType:
      input.kind === 'estorno' ? (input.originalOperationType === 1 ? 0 : 1) : 0,
    finalidade: input.kind === 'estorno' ? 3 : 4,
    destinationIndicator: input.kind === 'estorno' ? input.destinationIndicator! : 1,
    presenceIndicator: 0,
    municipalityCode: settings.companyCMun,
    referencedAccessKey: input.kind === 'estorno' ? input.originalAccessKey : undefined,
  });
  return `<?xml version="1.0" encoding="UTF-8"?><NFe xmlns="${namespace}"><infNFe Id="NFe${input.accessKey}" versao="4.00">${ide}${buildEmitXml(settings)}${new XMLSerializer().serializeToString(recipient)}${details}${new XMLSerializer().serializeToString(totals)}${transport}${payment}${information}</infNFe></NFe>`;
}
