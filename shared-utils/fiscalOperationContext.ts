import {
  getCfopDefinition,
  listActiveCfopOptions,
  type FiscalCfopItemType,
  type FiscalCfopMerchandiseOrigin,
  type FiscalCfopScope,
  type FiscalModelType,
} from './fiscalCfopModel';

export type FiscalOperationContext = 'normal_sale' | 'return' | 'estorno';
export type FiscalReturnMethod = 'CLIENT_DELIVERED' | 'COMPANY_PICKUP';
export type FiscalRuleCategory =
  | 'SEFAZ_REQUIRED'
  | 'FISCAL_RULE'
  | 'PROJECT_POLICY'
  | 'UNSUPPORTED_BY_ERP'
  | 'TEMPORARY_BLOCK';

export interface FiscalFormScenario {
  scope?: FiscalCfopScope;
  issuerUf?: string;
  recipientUf?: string;
  merchandiseOrigin?: FiscalCfopMerchandiseOrigin;
  isSt?: boolean;
  itemType?: FiscalCfopItemType;
  returnMethod?: FiscalReturnMethod;
  recipientFiscalStatus?: 'taxpayer' | 'non_taxpayer' | 'unknown';
  isFinalConsumer?: boolean;
  taxRegime?: string;
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
  availability: 'READY' | 'UNSUPPORTED_BY_ERP' | 'TEMPORARY_BLOCK';
  blockCategory?: FiscalRuleCategory;
  blockReason?: string;
  taxReviewMode: 'normal' | 'proportional_original_only' | 'source_zero_only_until_matrix' | 'not_applicable';
}

export interface FiscalFormXmlDefaults {
  natureOfOperation: string;
  paymentXml: string;
  transportXml: string;
}

/** Builds fixed XML blocks from the same policy consumed by the UI and server validators. */
export function getFiscalFormXmlDefaults(rules: FiscalFormRules): FiscalFormXmlDefaults | null {
  if (rules.context !== 'return') return null;
  if (rules.availability !== 'READY') return null;
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
  'Este cenário de devolução ainda não tem matriz tributária aprovada no ERP. A emissão permanece bloqueada sem alterar ou zerar os dados tributários da NF-e original.';

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
  taxesXml: string,
  scope?: FiscalCfopScope
): ReturnType<typeof listActiveCfopOptions> {
  const sourceCfop = getCfopDefinition(originalCfop);
  if (!sourceCfop || sourceCfop.direction !== 'outbound' || sourceCfop.itemType !== 'product')
    return [];
  if (scope && sourceCfop.scope !== scope) return [];
  return getFiscalFormRules('return', {
    scope: scope || sourceCfop.scope,
    itemType: 'product',
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
const RETURN_TRANSPORT_BY_METHOD: Readonly<
  Record<FiscalReturnMethod, { value: string; label: string }>
> = {
  CLIENT_DELIVERED: {
    value: '4',
    label: 'Transporte próprio por conta do destinatário (cliente trouxe à loja)',
  },
  COMPANY_PICKUP: {
    value: '3',
    label: 'Transporte próprio por conta do emitente (coleta da empresa)',
  },
};
const RETURN_NATURE = [{ value: 'Devolução de mercadoria', label: 'Devolução de mercadoria' }] as const;

function scenarioScope(scenario: FiscalFormScenario): FiscalCfopScope | null {
  if (scenario.issuerUf !== undefined || scenario.recipientUf !== undefined) {
    const issuerUf = String(scenario.issuerUf || '').trim().toUpperCase();
    const recipientUf = String(scenario.recipientUf || '').trim().toUpperCase();
    if (!/^[A-Z]{2}$/.test(issuerUf) || !/^[A-Z]{2}$/.test(recipientUf)) return null;
    if (recipientUf === 'EX') return 'foreign';
    return issuerUf === recipientUf ? 'internal' : 'interstate';
  }
  return scenario.scope || null;
}

function returnAvailability(
  scope: FiscalCfopScope | null,
  scenario: FiscalFormScenario
): Pick<FiscalFormRules, 'availability' | 'blockCategory' | 'blockReason'> {
  if (!scenario.returnMethod) {
    return {
      availability: 'UNSUPPORTED_BY_ERP',
      blockCategory: 'UNSUPPORTED_BY_ERP',
      blockReason: 'O método de retorno não está persistido no pedido de devolução.',
    };
  }
  if (!scope) {
    return {
      availability: 'UNSUPPORTED_BY_ERP',
      blockCategory: 'UNSUPPORTED_BY_ERP',
      blockReason: 'Não foi possível determinar as UFs e o escopo fiscal da devolução.',
    };
  }
  if (scope === 'interstate') {
    return {
      availability: 'TEMPORARY_BLOCK',
      blockCategory: 'TEMPORARY_BLOCK',
      blockReason: 'A matriz fiscal de devolução interestadual ainda não foi aprovada e testada no ERP.',
    };
  }
  if (scope === 'foreign') {
    return {
      availability: 'UNSUPPORTED_BY_ERP',
      blockCategory: 'UNSUPPORTED_BY_ERP',
      blockReason: 'O fluxo de devolução para o exterior ainda não está implementado no ERP.',
    };
  }
  if (scenario.recipientFiscalStatus === 'taxpayer') {
    return {
      availability: 'UNSUPPORTED_BY_ERP',
      blockCategory: 'UNSUPPORTED_BY_ERP',
      blockReason: 'O ERP ainda não implementa a matriz de devolução para destinatário contribuinte do ICMS.',
    };
  }
  if (scenario.recipientFiscalStatus === 'unknown') {
    return {
      availability: 'UNSUPPORTED_BY_ERP',
      blockCategory: 'UNSUPPORTED_BY_ERP',
      blockReason: 'A condição do destinatário na NF-e original não está determinada pelo ERP.',
    };
  }
  if (scenario.isFinalConsumer === false) {
    return {
      availability: 'UNSUPPORTED_BY_ERP',
      blockCategory: 'UNSUPPORTED_BY_ERP',
      blockReason: 'O ERP ainda não implementa a matriz de devolução para destinatário que não seja consumidor final.',
    };
  }
  return { availability: 'READY' };
}

/** Shared UI and server policy. Unsupported fiscal scenarios intentionally expose no choices. */
export function getFiscalFormRules(
  context: FiscalOperationContext,
  scenario: FiscalFormScenario = {}
): FiscalFormRules {
  if (context === 'return') {
    const scope = scenarioScope(scenario);
    const transport = scenario.returnMethod
      ? RETURN_TRANSPORT_BY_METHOD[scenario.returnMethod]
      : null;
    const availability = returnAvailability(scope, scenario);
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
      allowedCfops: scope
        ? listActiveCfopOptions({
            direction: 'inbound',
            scope,
            model: '55',
            itemType: scenario.itemType || 'product',
            operationType: 'customer_return',
            merchandiseOrigin: scenario.merchandiseOrigin,
            isSt: scenario.isSt,
          })
        : [],
      allowedPaymentOptions: PAYMENT_WITHOUT_PAYMENT,
      allowedTransportModes: transport ? [transport] : [],
      natureOptions: RETURN_NATURE,
      fixedValues: {
        finalidade: 4,
        tpNF: 0,
        ...(scope ? { idDest: scope === 'internal' ? 1 : scope === 'interstate' ? 2 : 3 } : {}),
        indFinal: 1,
        indIEDest: 9,
        indPres: 0,
        tPag: '90',
        vPag: '0.00',
        ...(transport ? { modFrete: transport.value } : {}),
      },
      ...availability,
      taxReviewMode: 'source_zero_only_until_matrix',
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
      availability: 'READY',
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
    availability: 'READY',
    taxReviewMode: 'normal',
  };
}
