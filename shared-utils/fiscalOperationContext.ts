import {
  getCfopDefinition,
  listActiveCfopOptions,
  type FiscalCfopItemType,
  type FiscalCfopMerchandiseOrigin,
  type FiscalCfopScope,
  type FiscalModelType,
} from './fiscalCfopModel';

export type FiscalOperationContext = 'normal_sale' | 'return' | 'estorno';

export interface FiscalFormScenario {
  scope?: FiscalCfopScope;
  merchandiseOrigin?: FiscalCfopMerchandiseOrigin;
  isSt?: boolean;
  itemType?: FiscalCfopItemType;
  returnMethod?: 'store_delivery' | 'store_collection';
}

export interface FiscalFormRules {
  context: FiscalOperationContext;
  visibleFields: readonly string[];
  readOnlyFields: readonly string[];
  hiddenFields: readonly string[];
  requiredFields: readonly string[];
  allowedModels: readonly FiscalModelType[];
  allowedFinalidades: readonly number[];
  allowedCfops: ReturnType<typeof listActiveCfopOptions>;
  allowedPaymentOptions: readonly { value: string; label: string }[];
  allowedTransportModes: readonly { value: string; label: string }[];
  natureOptions: readonly { value: string; label: string }[];
  fixedValues: Readonly<Record<string, string | number>>;
  taxReviewMode: 'normal' | 'proportional_original_only' | 'zero_amounts_only' | 'not_applicable';
}

export interface FiscalFormXmlDefaults {
  natureOfOperation: string;
  paymentXml: string;
  transportXml: string;
}

/** Builds fixed XML blocks from the same policy consumed by the UI and server validators. */
export function getFiscalFormXmlDefaults(rules: FiscalFormRules): FiscalFormXmlDefaults | null {
  if (rules.context !== 'return') return null;
  const natureOfOperation = rules.natureOptions[0]?.value || '';
  const tPag = String(rules.fixedValues.tPag || '');
  const vPag = String(rules.fixedValues.vPag || '');
  const modFrete = String(rules.fixedValues.modFrete || '');
  if (!natureOfOperation || !tPag || !vPag || !modFrete || !rules.allowedTransportModes.length) {
    return null;
  }
  return {
    natureOfOperation,
    paymentXml: `<pag><detPag><tPag>${tPag}</tPag><vPag>${vPag}</vPag></detPag></pag>`,
    transportXml: `<transp><modFrete>${modFrete}</modFrete></transp>`,
  };
}

export const RETURN_TAX_MATRIX_REQUIRED_MESSAGE =
  'A tributação da NF-e original contém bases ou valores diferentes de zero; a matriz fiscal de devolução correspondente ainda não foi aprovada.';

function hasNonZeroTaxAmount(xml: string, excludeCommercialTotals = false): boolean {
  const commercialTotals = new Set(['vProd', 'vFrete', 'vSeg', 'vDesc', 'vOutro', 'vNF']);
  const valuePattern = /<(?:[\w.-]+:)?(v[a-z][\w.-]*|q(?:bc|selo)[\w.-]*)\b[^>]*>\s*([+-]?(?:\d+)(?:\.\d+)?)\s*<\/(?:[\w.-]+:)?\1>/gi;
  for (const match of xml.matchAll(valuePattern)) {
    if (excludeCommercialTotals && commercialTotals.has(match[1])) continue;
    const numericValue = Number(match[2]);
    if (!Number.isFinite(numericValue) || Math.abs(numericValue) > 0.0000001) return true;
  }
  return false;
}

/** No non-zero tax bases/amounts are transmitted until that return tax scenario has an approved matrix. */
export function validateReturnTaxScenario(
  sourceInvoiceXml: string,
  sourceTaxesXml: string
): string | null {
  if (hasNonZeroTaxAmount(sourceTaxesXml)) return RETURN_TAX_MATRIX_REQUIRED_MESSAGE;
  const totals = sourceInvoiceXml.match(
    /<(?:[\w.-]+:)?ICMSTot\b[^>]*>[\s\S]*?<\/(?:[\w.-]+:)?ICMSTot>/i
  )?.[0];
  if (totals && hasNonZeroTaxAmount(totals, true)) return RETURN_TAX_MATRIX_REQUIRED_MESSAGE;
  return null;
}

export function isSourceTaxedWithSt(taxesXml: string, originalCfop: string): boolean {
  if (/<(?:\w+:)?(?:ICMSSN500|ICMS10|ICMS30|ICMS70|ICMS90|ICMSPart|ICMSST)\b/i.test(taxesXml))
    return true;
  const sourceCfop = getCfopDefinition(originalCfop);
  return Boolean(sourceCfop?.isSt);
}

export function getReturnCfopOptionsForSourceItem(
  originalCfop: string,
  taxesXml: string
): ReturnType<typeof listActiveCfopOptions> {
  const sourceCfop = getCfopDefinition(originalCfop);
  if (!sourceCfop || sourceCfop.direction !== 'outbound' || sourceCfop.itemType !== 'product')
    return [];
  return getFiscalFormRules('return', {
    scope: 'internal',
    itemType: 'product',
    returnMethod: 'store_delivery',
    merchandiseOrigin: sourceCfop.merchandiseOrigin,
    isSt: isSourceTaxedWithSt(taxesXml, originalCfop),
  }).allowedCfops;
}

export function suggestReturnCfopForSourceItem(
  originalCfop: string,
  taxesXml: string,
  configuredCfop?: string | null
): string | null {
  const options = getReturnCfopOptionsForSourceItem(originalCfop, taxesXml);
  const configured = String(configuredCfop || '').replace(/\D/g, '');
  if (configured && options.some((option) => option.value === configured)) return configured;
  const sourceDefinition = getCfopDefinition(originalCfop);
  const defaultCode = isSourceTaxedWithSt(taxesXml, originalCfop)
    ? '1411'
    : sourceDefinition?.merchandiseOrigin === 'own_production'
      ? '1201'
      : '1202';
  return options.some((option) => option.value === defaultCode) ? defaultCode : null;
}

const PAYMENT_WITHOUT_PAYMENT = [{ value: '90', label: 'Sem pagamento' }] as const;
const NO_ADDITIONAL_TRANSPORT = [{ value: '9', label: 'Sem transporte fiscal adicional' }] as const;
const RETURN_NATURE = [{ value: 'Devolução de mercadoria', label: 'Devolução de mercadoria' }] as const;

/** Shared UI and server policy. Unsupported fiscal scenarios intentionally expose no choices. */
export function getFiscalFormRules(
  context: FiscalOperationContext,
  scenario: FiscalFormScenario = {}
): FiscalFormRules {
  if (context === 'return') {
    const hasSupportedReturnTransport = scenario.returnMethod === 'store_delivery';
    const supportedInternalScenario = scenario.scope === 'internal' && hasSupportedReturnTransport;
    return {
      context,
      visibleFields: [
        'origin',
        'purpose',
        'operation',
        'originalDocumentReference',
        'stockEffect',
        'natureOfOperation',
        'environment',
        'recipient',
        'items',
        'cfop',
        'taxes',
        'transport',
        'payment',
        'additionalInformation',
        'totals',
        'originalItemReference',
        'reviewConfirmations',
        'productionConfirmation',
      ],
      readOnlyFields: [
        'purpose',
        'model',
        'environment',
        'natureOfOperation',
        'recipient',
        'totals',
        'items',
        'payment',
        'transport',
        'originalDocumentReference',
        'originalItemReference',
        'additionalInformation',
        'stockEffect',
      ],
      hiddenFields: ['salePaymentMethods', 'normalPurposeOptions', 'estornoReason'],
      requiredFields: [
        'origin',
        'purpose',
        'model',
        'environment',
        'operation',
        'cfop',
        'recipient',
        'items',
        'taxes',
        'transport',
        'payment',
        'additionalInformation',
        'natureOfOperation',
        'totals',
        'originalDocumentReference',
        'originalItemReference',
        'reviewConfirmations',
      ],
      allowedModels: ['55'],
      allowedFinalidades: [4],
      allowedCfops: supportedInternalScenario
        ? listActiveCfopOptions({
            direction: 'inbound',
            scope: 'internal',
            model: '55',
            itemType: scenario.itemType || 'product',
            operationType: 'customer_return',
            merchandiseOrigin: scenario.merchandiseOrigin,
            isSt: scenario.isSt,
          })
        : [],
      allowedPaymentOptions: PAYMENT_WITHOUT_PAYMENT,
      allowedTransportModes: hasSupportedReturnTransport ? NO_ADDITIONAL_TRANSPORT : [],
      natureOptions: RETURN_NATURE,
      fixedValues: {
        finalidade: 4,
        tpNF: 0,
        idDest: 1,
        indFinal: 1,
        indIEDest: 9,
        indPres: 0,
        tPag: '90',
        vPag: '0.00',
        ...(hasSupportedReturnTransport ? { modFrete: '9' } : {}),
      },
      taxReviewMode: 'zero_amounts_only',
    };
  }

  if (context === 'estorno') {
    return {
      context,
      visibleFields: [
        'origin',
        'purpose',
        'operation',
        'natureOfOperation',
        'originalDocumentReference',
        'stockEffect',
        'reviewConfirmations',
        'productionConfirmation',
        'reason',
        'environment',
        'recipient',
        'items',
        'taxes',
        'transport',
        'payment',
        'totals',
      ],
      readOnlyFields: ['purpose', 'model', 'environment', 'items', 'originalDocumentReference'],
      hiddenFields: ['salePaymentMethods', 'recipientSelection', 'transportSelection'],
      requiredFields: ['origin', 'purpose', 'model', 'environment', 'items', 'reason'],
      allowedModels: ['55'],
      allowedFinalidades: [3],
      allowedCfops: [],
      allowedPaymentOptions: [],
      allowedTransportModes: [],
      natureOptions: [],
      fixedValues: { finalidade: 3, tpNF: 0 },
      taxReviewMode: 'proportional_original_only',
    };
  }

  return {
    context,
    visibleFields: ['all'],
    readOnlyFields: [],
    hiddenFields: [],
    requiredFields: ['origin', 'purpose', 'model', 'environment', 'recipient', 'items', 'payment'],
    allowedModels: ['55', '65'],
    allowedFinalidades: [1],
    allowedCfops: [],
    allowedPaymentOptions: [],
    allowedTransportModes: [],
    natureOptions: [],
    fixedValues: { finalidade: 1 },
    taxReviewMode: 'normal',
  };
}
