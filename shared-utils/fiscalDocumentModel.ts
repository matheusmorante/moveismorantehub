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
  presence?: string,
  hasRecipientDoc?: boolean
): string {
  if (model === '65') {
    // Na NFC-e modelo 65, se o consumidor NÃO tem identificação CPF/CNPJ,
    // a presença nunca pode ser '4' (a SEFAZ rejeita com 787).
    // Permanece como presencial ('1').
    if (hasRecipientDoc === false) return '1';
    if (presence) return (presence === '4' && !hasRecipientDoc) ? '1' : presence;
    return (deliveryMethod === 'delivery' && Boolean(hasRecipientDoc)) ? '4' : '1';
  }
  return presence || (deliveryMethod === 'delivery' ? '9' : '1');
}
export function fiscalRecipientRequirements(model: '55' | '65', presence?: string, total?: number) {
  const isValueLimitNfce = model === '65' && typeof total === 'number' && total >= 10000;
  // Na NFC-e (modelo 65), CPF/CNPJ NÃO é obrigatório pela SEFAZ abaixo de R$ 10.000
  const documentRequired = model === '55' || isValueLimitNfce;
  const isDelivery = presence === '4';
  const nonPresent = presence ? !['1', '5'].includes(presence) : false;
  const addressRequired = model === '55' || (model === '65' && isDelivery) || nonPresent;
  return { documentRequired, addressRequired };
}
