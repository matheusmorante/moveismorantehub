import { createHash } from 'node:crypto';
import { validateCsosn } from './csosnPolicy';
import { assertFiscalSelectionIntegrity } from './fiscalSelectionIntegrity';
import { resolveOrderFiscalModel, getFiscalRecipientAddress, isSameFiscalModelDecision } from '../../shared-utils/fiscalDocumentModel';
import type {
  FiscalDocument,
  FiscalDocumentResolution,
  FiscalSnapshotCandidate,
  ReconciledFiscalTotals,
} from './fiscalSnapshot';

/** A rule set is supplied by trusted backend code after fiscal approval. Saved UI defaults are not rules. */
export type ApprovedFiscalRuleSet = {
  version: string;
  approvedBy: string;
  approvedAt: string;
  effectiveFrom: string;
  effectiveUntil?: string;
  issuerCnpj: string;
  technicalHomologationOnly?: true;
  determine: (snapshot: FiscalSnapshotCandidate, snapshotHash: string) => FiscalDocument;
};

const amountFields: ReadonlyArray<keyof ReconciledFiscalTotals> = [
  'icmsBase',
  'products',
  'discount',
  'freight',
  'insurance',
  'otherExpenses',
  'icms',
  'icmsExempt',
  'fcp',
  'icmsStBase',
  'icmsSt',
  'fcpSt',
  'fcpStRetained',
  'ii',
  'ipi',
  'ipiReturned',
  'pis',
  'cofins',
  'invoice',
  'payment',
  'change',
];

function cents(value: unknown, field: string): number {
  if (
    typeof value !== 'number' ||
    !Number.isFinite(value) ||
    value < 0 ||
    Math.abs(value * 100 - Math.round(value * 100)) > 0.000001
  ) {
    throw new Error(`${field} deve ser valor monetário explícito, não negativo e em centavos.`);
  }
  return Math.round(value * 100);
}

function required(value: unknown, field: string): string {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${field} não informado.`);
  return value.trim();
}

function equalAmount(actual: number, expected: number, field: string): void {
  if (actual !== expected) throw new Error(`${field} não reconcilia com os itens ou pagamentos.`);
}

export function fiscalSnapshotHash(snapshot: FiscalSnapshotCandidate): string {
  if (snapshot.persistedHash) {
    if (!/^[0-9a-f]{64}$/.test(snapshot.persistedHash))
      throw new Error('Hash fiscal persistido inválido.');
    return snapshot.persistedHash;
  }
  return createHash('sha256').update(JSON.stringify(snapshot)).digest('hex');
}

/** Structural and monetary gate; tax classification remains the approved matrix's responsibility. */
export function validateFiscalDocument(
  snapshot: FiscalSnapshotCandidate,
  document: FiscalDocument,
  ruleSet: ApprovedFiscalRuleSet
): void {
  if (
    document.snapshotHash !== fiscalSnapshotHash(snapshot) ||
    document.ruleSetVersion !== ruleSet.version ||
    document.environment !== snapshot.emissionRequest.environment ||
    document.issuer.cnpj.replace(/\D/g, '') !== ruleSet.issuerCnpj.replace(/\D/g, '') ||
    document.issuer.cnpj.replace(/\D/g, '') !==
      String(snapshot.issuerProfile.companyCnpj || '').replace(/\D/g, '')
  ) {
    throw new Error(
      'Documento fiscal não corresponde ao snapshot, ambiente, emitente ou regra aprovada.'
    );
  }
  if (!['55', '65'].includes(document.model) || !document.items.length || !document.payments.length)
    throw new Error('Modelo, itens ou pagamentos fiscais ausentes.');
  if (ruleSet.version === 'HML_NORMAL_SALE_V2') {
    const customer = snapshot.fiscalInputs?.customer as Record<string, unknown> | undefined;
    const decision = resolveOrderFiscalModel({ ...snapshot.order.data, orderType: snapshot.order.type,
      paymentsSummary: { totalOrderValue: document.totals.invoice },
      items: document.items.map((item) => ({ fiscal: { cfop: item.classification.cfop } })),
    }, { issuerUf: String(snapshot.issuerProfile.companyUF || ''), finalConsumer: snapshot.emissionRequest.finalConsumer,
      recipientAddress: getFiscalRecipientAddress({ ...snapshot.order.data, customerData: { fullAddress: customer?.address } }) });
    if (decision.status !== 'ready' || decision.model !== document.model ||
        decision.finalConsumer !== (document.operation.finalConsumer === '1') ||
        !isSameFiscalModelDecision(decision, document.modelDecision))
      throw new Error('Modelo fiscal diverge dos fatos e da política de varejo.');
  }
  required(document.issuer.name, 'Razão social');
  required(document.issuer.ie, 'IE do emitente');
  required(document.issuer.crt, 'CRT do emitente');
  required(document.recipient.name, 'Destinatário');
  required(document.operation.natureOfOperation, 'Natureza da operação');
  const traceIds = new Set(document.decisions.map((trace) => trace.decisionId));
  if (
    !document.decisions.length ||
    traceIds.size !== document.decisions.length ||
    document.decisions.some(
      (trace) =>
        trace.ruleSetVersion !== ruleSet.version ||
        trace.approver !== ruleSet.approvedBy ||
        !trace.reason ||
        !trace.effectiveAt
    )
  ) {
    throw new Error('Trilha fiscal incompleta ou sem vínculo com a regra aprovada.');
  }

  const totals = document.totals;
  assertFiscalSelectionIntegrity(snapshot, document);
  for (const field of amountFields) cents(totals[field], `Total ${field}`);
  const sums = {
    icmsBase: 0,
    products: 0,
    discount: 0,
    freight: 0,
    insurance: 0,
    otherExpenses: 0,
    icms: 0,
    ipi: 0,
    pis: 0,
    cofins: 0,
  };
  for (const [index, item] of document.items.entries()) {
    if (
      item.itemNumber !== index + 1 ||
      !item.decisions.length ||
      item.decisions.some((trace) => !traceIds.has(trace.decisionId))
    )
      throw new Error(`Item fiscal ${index + 1} sem ordem ou decisão rastreável.`);
    required(item.product.code, `Código do item ${index + 1}`);
    required(item.product.description, `Descrição do item ${index + 1}`);
    required(item.classification.cfop, `CFOP do item ${index + 1}`);
    required(item.classification.ncm, `NCM do item ${index + 1}`);
    required(item.classification.origin, `Origem do item ${index + 1}`);
    required(item.classification.unit, `Unidade do item ${index + 1}`);
    if (
      !Number.isFinite(item.product.quantity) ||
      item.product.quantity <= 0 ||
      !Number.isFinite(item.product.unitValue) ||
      item.product.unitValue <= 0
    )
      throw new Error(`Quantidade ou preço inválido no item ${index + 1}.`);
    const gross = cents(item.product.gross, `Bruto do item ${index + 1}`);
    if (Math.abs(gross - Math.round(item.product.quantity * item.product.unitValue * 100)) > 1)
      throw new Error(`Bruto do item ${index + 1} diverge de quantidade × preço.`);
    for (const field of ['gross', 'discount', 'freight', 'insurance', 'otherExpenses'] as const) {
      sums[field === 'gross' ? 'products' : field] += cents(
        item.product[field],
        `${field} do item ${index + 1}`
      );
    }
    if (cents(item.product.discount, 'Desconto') > gross)
      throw new Error(`Desconto do item ${index + 1} excede seu valor bruto.`);
    for (const group of ['ICMS', 'PIS', 'COFINS'] as const) {
      const matches = item.taxes.filter((tax) => tax.group === group);
      if (matches.length !== 1 || !traceIds.has(matches[0].decisionId))
        throw new Error(`Item ${index + 1} exige exatamente um grupo ${group} decidido.`);
      if (group === 'ICMS' && matches[0].codeSystem === 'CSOSN')
        validateCsosn(matches[0].code, document.issuer.crt);
      if (group === 'ICMS' && matches[0].codeSystem === 'CST' && document.issuer.crt === '1')
        throw new Error(
          'Emitente CRT 1 exige CSOSN; CST de regime normal não pode substituir a escolha.'
        );
      const valueKey = group === 'ICMS' ? 'vICMS' : group === 'PIS' ? 'vPIS' : 'vCOFINS';
      sums[group.toLowerCase() as 'icms' | 'pis' | 'cofins'] += cents(
        matches[0].values[valueKey],
        `${group} do item ${index + 1}`
      );
      if (group === 'ICMS' && matches[0].codeSystem === 'CST' && matches[0].code === '00')
        sums.icmsBase += cents(matches[0].values.vBC, `Base ICMS do item ${index + 1}`);
    }
    const ipi = item.taxes.filter((tax) => tax.group === 'IPI');
    if (ipi.length > 1 || (ipi.length === 1 && !traceIds.has(ipi[0].decisionId)))
      throw new Error(`IPI do item ${index + 1} ambíguo.`);
    if (ipi.length) sums.ipi += cents(ipi[0].values.vIPI, `IPI do item ${index + 1}`);
    if (item.taxes.some((tax) => !['ICMS', 'PIS', 'COFINS', 'IPI'].includes(tax.group)))
      throw new Error(`Grupo fiscal ainda sem serialização suportada no item ${index + 1}.`);
  }
  for (const field of Object.keys(sums) as Array<keyof typeof sums>)
    equalAmount(cents(totals[field], `Total ${field}`), sums[field], `Total ${field}`);
  const invoice =
    sums.products - sums.discount + sums.freight + sums.insurance + sums.otherExpenses + sums.ipi;
  equalAmount(cents(totals.invoice, 'Valor da nota'), invoice, 'Valor da nota');
  const payments = document.payments.reduce((sum, payment) => {
    required(payment.methodCode, 'Meio de pagamento');
    if (!traceIds.has(payment.decision.decisionId))
      throw new Error('Pagamento sem decisão fiscal rastreável.');
    return sum + cents(payment.amount, 'Valor do pagamento');
  }, 0);
  equalAmount(cents(totals.payment, 'Total pago'), payments, 'Total pago');
  equalAmount(payments, invoice + cents(totals.change, 'Troco'), 'Pagamentos e troco');
  for (const field of [
    'icmsExempt',
    'fcp',
    'icmsStBase',
    'icmsSt',
    'fcpSt',
    'fcpStRetained',
    'ii',
    'ipiReturned',
  ] as const) {
    if (totals[field] !== 0)
      throw new Error(`${field} exige suporte fiscal específico antes da emissão.`);
  }
}

export function determineWithApprovedRules(
  snapshot: FiscalSnapshotCandidate,
  ruleSet?: ApprovedFiscalRuleSet
): FiscalDocumentResolution {
  if (!ruleSet)
    return {
      status: 'blocked',
      blockers: [
        {
          code: 'APPROVED_FISCAL_RULESET_REQUIRED',
          scope: 'document',
          message:
            'A matriz de determinação fiscal aprovada ainda não está configurada. Nenhum modelo, CFOP ou tributo será presumido.',
        },
      ],
    };
  if (ruleSet.technicalHomologationOnly && snapshot.emissionRequest.environment !== 2)
    return {
      status: 'blocked',
      blockers: [
        {
          code: 'PRODUCTION_FISCAL_RULESET_REQUIRED',
          scope: 'document',
          message: 'A regra técnica de homologação nunca pode emitir em produção.',
        },
      ],
    };
  const issued = Date.parse(snapshot.capturedAt);
  if (
    !ruleSet.version ||
    !ruleSet.approvedBy ||
    !/^\d{14}$/.test(ruleSet.issuerCnpj.replace(/\D/g, '')) ||
    !Number.isFinite(Date.parse(ruleSet.approvedAt)) ||
    !Number.isFinite(Date.parse(ruleSet.effectiveFrom)) ||
    (ruleSet.effectiveUntil !== undefined &&
      !Number.isFinite(Date.parse(ruleSet.effectiveUntil))) ||
    !Number.isFinite(issued) ||
    Date.parse(ruleSet.approvedAt) > issued ||
    issued < Date.parse(ruleSet.effectiveFrom) ||
    (ruleSet.effectiveUntil && issued >= Date.parse(ruleSet.effectiveUntil))
  )
    return {
      status: 'blocked',
      blockers: [
        {
          code: 'FISCAL_RULESET_NOT_APPLICABLE',
          scope: 'document',
          message: 'A matriz fiscal não está aprovada ou vigente para esta emissão.',
        },
      ],
    };
  try {
    const document = ruleSet.determine(snapshot, fiscalSnapshotHash(snapshot));
    validateFiscalDocument(snapshot, document, ruleSet);
    return { status: 'ready', document };
  } catch (error) {
    return {
      status: 'blocked',
      blockers: [
        {
          code: 'FISCAL_DOCUMENT_INCOMPLETE',
          scope: 'document',
          message: error instanceof Error ? error.message : 'Determinação fiscal incompleta.',
        },
      ],
    };
  }
}
