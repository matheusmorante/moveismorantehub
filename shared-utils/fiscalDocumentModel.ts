import { recipientTaxIdKind } from './recipientTaxId';

/** Paraná retail policy. Logistics and recipient PF/PJ never select a model alone. */
export const FISCAL_MODEL_POLICY_VERSION = 'PR_RETAIL_2026_10';
export type FiscalModelReason = 'RETAIL_FINAL_CONSUMER_IN_STATE' | 'INTERSTATE_OPERATION' |
  'RESALE' | 'TAX_CREDIT_REQUIRED' | 'RETURN' | 'TRANSFER' | 'SHIPMENT' | 'GOODS_RETURN' |
  'EXPORT' | 'IMPORT' | 'PUBLIC_ADMINISTRATION' | 'OTHER_FISCAL_REQUIREMENT' | 'VALUE_LIMIT';
export const fiscalModelReasonLabels: Record<FiscalModelReason, string> = {
  RETAIL_FINAL_CONSUMER_IN_STATE: 'Venda varejista para consumidor final dentro do Paraná.',
  INTERSTATE_OPERATION: 'Operação interestadual.', RESALE: 'Mercadoria destinada à revenda ou a adquirente que não é consumidor final.',
  TAX_CREDIT_REQUIRED: 'Operação que exige documento apto a crédito fiscal.', RETURN: 'Devolução de mercadoria.',
  TRANSFER: 'Transferência de mercadoria.', SHIPMENT: 'Remessa de mercadoria.', GOODS_RETURN: 'Retorno de mercadoria.',
  EXPORT: 'Exportação.', IMPORT: 'Importação.', PUBLIC_ADMINISTRATION: 'Exigência fiscal da operação com Administração Pública.',
  OTHER_FISCAL_REQUIREMENT: 'Características fiscais da operação exigem NF-e.', VALUE_LIMIT: 'Valor igual ou superior ao limite de R$ 200.000 para NFC-e.',
};
export type FiscalModelDecision = {
  status: 'ready'; model: '55' | '65'; reasonCode: FiscalModelReason;
  reasons: FiscalModelReason[]; reason: string; policyVersion: string; finalConsumer: boolean;
} | { status: 'blocked'; reason: string; policyVersion: string };
export type FiscalModelFacts = {
  issuerUf?: string; recipientUf?: string; finalConsumer?: boolean;
  operationType?: string; purpose?: string; total?: number; cfops?: string[];
  requiresTaxCredit?: boolean; publicAdministrationRequirement?: boolean; otherFiscalRequirement?: boolean;
};
const retailCfops = new Set(['5101','5102','5103','5104','5115','5405','5656','5667','5933']);
const specialOperations: Record<string, FiscalModelReason> = {
  return: 'RETURN', transfer: 'TRANSFER', shipment: 'SHIPMENT', goods_return: 'GOODS_RETURN',
  export: 'EXPORT', import: 'IMPORT', assistance: 'SHIPMENT',
};
export function resolveFiscalDocumentModel(facts: FiscalModelFacts): FiscalModelDecision {
  const reasons: FiscalModelReason[] = [];
  const add = (reason: FiscalModelReason) => { if (!reasons.includes(reason)) reasons.push(reason); };
  const special = specialOperations[facts.operationType || ''];
  if (special) add(special);
  if (facts.purpose === '4') add('RETURN');
  if (facts.purpose && facts.purpose !== '1' && facts.purpose !== '4') add('OTHER_FISCAL_REQUIREMENT');
  if (facts.recipientUf === 'EX') add('EXPORT');
  if (facts.issuerUf && facts.recipientUf && facts.issuerUf !== facts.recipientUf && facts.recipientUf !== 'EX') add('INTERSTATE_OPERATION');
  if (facts.finalConsumer === false) add('RESALE');
  if (facts.requiresTaxCredit) add('TAX_CREDIT_REQUIRED');
  if (facts.publicAdministrationRequirement) add('PUBLIC_ADMINISTRATION');
  if (facts.otherFiscalRequirement) add('OTHER_FISCAL_REQUIREMENT');
  if (facts.total !== undefined && facts.total >= 200000) add('VALUE_LIMIT');
  for (const rawCfop of facts.cfops || []) {
    const cfop = rawCfop.replace(/\D/g, '');
    if (/^[67]/.test(cfop)) add(cfop.startsWith('7') ? 'EXPORT' : 'INTERSTATE_OPERATION');
    else if (cfop && !retailCfops.has(cfop)) add('OTHER_FISCAL_REQUIREMENT');
  }
  if (!special && !['sale','showroom'].includes(facts.operationType || 'sale')) add('OTHER_FISCAL_REQUIREMENT');
  const blocked = (reason: string): FiscalModelDecision => ({status:'blocked', reason, policyVersion:FISCAL_MODEL_POLICY_VERSION});
  if (typeof facts.finalConsumer !== 'boolean') return blocked('Informe se o adquirente é consumidor final.');
  if (reasons.length) return {status:'ready', model:'55', reasonCode:reasons[0], reasons,
    reason:reasons.map((r) => fiscalModelReasonLabels[r]).join(' '), policyVersion:FISCAL_MODEL_POLICY_VERSION,
    finalConsumer:facts.finalConsumer === true};
  if (facts.issuerUf !== 'PR') return blocked('A política de NFC-e está definida somente para emitente do Paraná.');
  if (!facts.recipientUf) return blocked('Informe a UF do destinatário ou do local da operação.');
  if (facts.recipientUf !== 'PR') return blocked('Confirme a UF da operação fiscal.');
  return {status:'ready', model:'65', reasonCode:'RETAIL_FINAL_CONSUMER_IN_STATE', reasons:['RETAIL_FINAL_CONSUMER_IN_STATE'],
    reason:fiscalModelReasonLabels.RETAIL_FINAL_CONSUMER_IN_STATE, policyVersion:FISCAL_MODEL_POLICY_VERSION, finalConsumer:true};
}
export function isSameFiscalModelDecision(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (!a || !b || typeof a !== 'object' || typeof b !== 'object') return false;
  const da = a as Record<string, unknown>;
  const db = b as Record<string, unknown>;
  if (da.status !== db.status || da.policyVersion !== db.policyVersion) return false;
  if (da.status === 'blocked') return da.reason === db.reason;
  return (
    da.model === db.model &&
    da.reasonCode === db.reasonCode &&
    da.reason === db.reason &&
    da.finalConsumer === db.finalConsumer &&
    Array.isArray(da.reasons) &&
    Array.isArray(db.reasons) &&
    da.reasons.length === (db.reasons as unknown[]).length &&
    da.reasons.every((val, idx) => val === (db.reasons as unknown[])[idx])
  );
}
export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const object = (value: unknown): Record<string, unknown> => (isRecord(value) ? value : {});
export function getFiscalRecipientAddress(order: unknown): Record<string, unknown> {
  const data = object(order); const shipping = object(data.shipping); const customer = object(data.customerData);
  const raw = shipping.deliveryMethod === 'delivery' ? shipping.deliveryAddress || customer.fullAddress || customer.address
    : customer.fullAddress || customer.address;
  if (typeof raw === 'string') { try { return object(JSON.parse(raw)); } catch { return {}; } }
  return object(raw);
}
/** Adapter shared by order UI and backend snapshots. No fiscal model is accepted from the browser. */
export function resolveOrderFiscalModel(order: unknown, options: {issuerUf?: string; finalConsumer?: boolean; recipientAddress?: unknown} = {}): FiscalModelDecision {
  const data = object(order); const context = object(data.fiscalContext); const shipping = object(data.shipping);
  const address = options.recipientAddress ? object(options.recipientAddress) : getFiscalRecipientAddress(data);
  const issuerUf = options.issuerUf ?? 'PR';
  const recipientUf = String(address.state || address.uf || (shipping.deliveryMethod === 'pickup' ? issuerUf : '')).toUpperCase();
  const items = Array.isArray(data.items) ? data.items : [];
  return resolveFiscalDocumentModel({ issuerUf, recipientUf,
    finalConsumer:options.finalConsumer ?? (typeof context.finalConsumer === 'boolean' ? context.finalConsumer : undefined),
    operationType:String(context.operationType || data.orderType || 'sale'), purpose:context.purpose as string | undefined,
    total:object(data.paymentsSummary).totalOrderValue as number | undefined,
    cfops:items.filter((item) => object(item).itemType !== 'service').map((item) => String(object(object(item).fiscal).cfop || '')),
    requiresTaxCredit:context.requiresTaxCredit === true, publicAdministrationRequirement:context.publicAdministrationRequirement === true,
    otherFiscalRequirement:context.otherFiscalRequirement === true || context.recipientIeIndicator === '1',
  });
}
export function fiscalPresence(
  model: '55' | '65',
  deliveryMethod?: string,
  presence?: string
): string {
  if (model === '65') {
    if (deliveryMethod === 'delivery') return '4';
    if (deliveryMethod === 'pickup' && presence === '4') return '1';
    return presence || '1';
  }
  if (deliveryMethod === 'delivery' && !['2', '3', '9'].includes(presence || '')) return '9';
  if (deliveryMethod === 'pickup' && presence === '4') return '1';
  return presence || (deliveryMethod === 'delivery' ? '9' : '1');
}

export const NFCE_RECIPIENT_IDENTIFICATION_LIMIT = 10_000;

export type FiscalRecipientRequirementReason =
  | 'NFE_MODEL_55_DOMESTIC_NORMAL_SALE'
  | 'NFCE_AMOUNT_LIMIT'
  | 'NFCE_NON_PRESENT_OPERATION'
  | 'NFCE_HOME_DELIVERY'
  | 'SPECIAL_FISCAL_OPERATION';

export type FiscalRecipientRequirementDecision = {
  supported: boolean;
  documentRequired: boolean;
  addressRequired: boolean;
  documentType: 'CPF' | 'CNPJ' | 'CPF/CNPJ';
  reasonCodes: FiscalRecipientRequirementReason[];
  message: string | null;
};

export type FiscalRecipientRequirementFacts = {
  model: '55' | '65';
  presence: string;
  total: number;
  personType?: string;
  recipientTaxId?: string;
  operationScope: 'NORMAL_DOMESTIC_SALE' | 'SPECIAL_OR_FOREIGN_OPERATION';
};

/**
 * Official recipient-identification matrix for the supported Paraná retail
 * path. Special/foreign operations intentionally require their own fiscal
 * ruleset instead of inheriting model 55's domestic-sale rule.
 */
export function decideFiscalRecipientRequirements(
  facts: FiscalRecipientRequirementFacts
): FiscalRecipientRequirementDecision {
  const knownPersonType = facts.personType === 'PF' || facts.personType === 'PJ'
    ? facts.personType
    : undefined;
  const documentType = knownPersonType === 'PF'
    ? 'CPF'
    : knownPersonType === 'PJ'
      ? 'CNPJ'
      : recipientTaxIdKind(facts.recipientTaxId || '') || 'CPF/CNPJ';
  const unsupported = (reason = 'Esta operação precisa de uma matriz fiscal específica aprovada.'): FiscalRecipientRequirementDecision => ({
    supported: false,
    documentRequired: false,
    addressRequired: false,
    documentType,
    reasonCodes: ['SPECIAL_FISCAL_OPERATION'],
    message: reason,
  });

  if (facts.operationScope !== 'NORMAL_DOMESTIC_SALE') return unsupported();
  if (!Number.isFinite(facts.total) || facts.total < 0)
    return unsupported('Total fiscal inválido; confirme o valor da operação antes da emissão.');

  if (facts.model === '55') {
    return {
      supported: true,
      documentRequired: true,
      addressRequired: true,
      documentType,
      reasonCodes: ['NFE_MODEL_55_DOMESTIC_NORMAL_SALE'],
      message: `A NF-e modelo 55 desta venda doméstica exige ${documentType} do destinatário.`,
    };
  }

  if (!['1', '2', '3', '4', '5', '9'].includes(facts.presence))
    return unsupported('Indicador de presença ausente ou inválido para a NFC-e.');

  const nonPresent = ['2', '3', '4', '9'].includes(facts.presence);
  const amountLimit = facts.total >= NFCE_RECIPIENT_IDENTIFICATION_LIMIT;
  const reasonCodes: FiscalRecipientRequirementReason[] = [];
  if (amountLimit) reasonCodes.push('NFCE_AMOUNT_LIMIT');
  if (nonPresent) reasonCodes.push('NFCE_NON_PRESENT_OPERATION');
  if (facts.presence === '4') reasonCodes.push('NFCE_HOME_DELIVERY');

  const documentRequired = amountLimit || nonPresent;
  const message = !documentRequired
    ? null
    : facts.presence === '4'
      ? `Como este pedido será entregue no endereço do cliente, o ${documentType} do destinatário é obrigatório para a NFC-e.`
      : nonPresent
        ? `Esta operação NFC-e não presencial exige o ${documentType} do destinatário e o respectivo endereço.`
        : `Esta NFC-e tem valor igual ou superior a R$ ${NFCE_RECIPIENT_IDENTIFICATION_LIMIT.toLocaleString('pt-BR')}; informe o ${documentType} do destinatário.`;

  return {
    supported: true,
    documentRequired,
    addressRequired: nonPresent,
    documentType,
    reasonCodes,
    message,
  };
}

/** Compatibility facade; new fiscal paths use the full centralized decision. */
export function fiscalRecipientRequirements(model: '55' | '65', presence?: string, total?: number) {
  const decision = decideFiscalRecipientRequirements({
    model,
    presence: presence || (model === '55' ? '1' : ''),
    total: total ?? 0,
    operationScope: 'NORMAL_DOMESTIC_SALE',
  });
  return { documentRequired: decision.documentRequired, addressRequired: decision.addressRequired };
}
