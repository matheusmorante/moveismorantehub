import type { ApprovedFiscalRuleSet } from './fiscalCore';
import {
  parseHmlCsosnConfiguration,
  resolveItemCsosn,
  type HmlCsosnConfiguration,
} from './csosnPolicy';
import { ZERO_OWN_ICMS_CSOSNS } from '../../shared-utils/fiscalIcmsGroups';
import { parseFiscalItemSelections } from '../../shared-utils/fiscalItemSelections';
import type {
  FiscalAddress,
  FiscalDecisionTrace,
  FiscalDocument,
  FiscalJsonValue,
  FiscalSnapshotCandidate,
  ReconciledFiscalTotals,
} from './fiscalSnapshot';

export const HML_TECHNICAL_RULESET_VERSION = 'HML_TECHNICAL_V1';

type SavedDecision = {
  scope?: { model?: string; operation?: string; issuerCrt?: string };
  pis?: { cst?: string; base?: number; rate?: number; value?: number };
  cofins?: { cst?: string; base?: number; rate?: number; value?: number };
  confirmedAt?: string;
  confirmedBy?: string;
  productionApproved?: boolean;
};

const record = (value: unknown): Record<string, FiscalJsonValue> => {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('Dado sintético fiscal ausente.');
  return value as Record<string, FiscalJsonValue>;
};
const string = (value: unknown, field: string): string => {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${field} ausente.`);
  return value.trim();
};
const digits = (value: unknown, size: number, field: string): string => {
  const result = string(value, field).replace(/\D/g, '');
  if (result.length !== size) throw new Error(`${field} inválido.`);
  return result;
};
const amount = (value: unknown, field: string): number => {
  if (
    typeof value !== 'number' ||
    !Number.isFinite(value) ||
    value <= 0 ||
    Math.abs(value * 100 - Math.round(value * 100)) > 0.000001
  )
    throw new Error(`${field} deve ser positivo e em centavos.`);
  return value;
};
const address = (value: Record<string, FiscalJsonValue>, prefix: string): FiscalAddress => ({
  street: string(value[`${prefix}Logradouro`], 'Logradouro'),
  number: string(value[`${prefix}Numero`], 'Número'),
  district: string(value[`${prefix}Bairro`], 'Bairro'),
  municipalityCode: digits(value[`${prefix}CMun`], 7, 'Código IBGE'),
  municipality: string(value[`${prefix}XMun`], 'Município'),
  uf: string(value[`${prefix}UF`], 'UF'),
  postalCode: digits(value[`${prefix}CEP`], 8, 'CEP'),
});

/** This deliberately narrow fixture is engineering test data, never a fiscal approval. */
export function createHmlTechnicalRuleSet(
  snapshot: FiscalSnapshotCandidate,
  savedDecision: SavedDecision,
  csosnConfiguration: HmlCsosnConfiguration
): ApprovedFiscalRuleSet {
  if (snapshot.emissionRequest.environment !== 2)
    throw new Error('PRODUCTION_FISCAL_RULESET_REQUIRED');
  parseHmlCsosnConfiguration(csosnConfiguration);
  if (
    savedDecision.productionApproved !== false ||
    savedDecision.scope?.model !== '55' ||
    savedDecision.scope?.operation !== 'normal_sale' ||
    savedDecision.scope?.issuerCrt !== '1' ||
    !savedDecision.confirmedBy ||
    !savedDecision.confirmedAt ||
    !Number.isFinite(Date.parse(savedDecision.confirmedAt)) ||
    savedDecision.pis?.cst !== '99' ||
    savedDecision.cofins?.cst !== '99' ||
    [savedDecision.pis, savedDecision.cofins].some(
      (tax) => tax?.base !== 0 || tax.rate !== 0 || tax.value !== 0
    )
  )
    throw new Error('Decisão persistida de PIS/COFINS para HML indisponível.');
  const issuerCnpj = digits(snapshot.issuerProfile.companyCnpj, 14, 'CNPJ do emitente');
  if (snapshot.issuerProfile.companyCRT !== '1' || snapshot.issuerProfile.companyUF !== 'PR')
    throw new Error('Regra HML exige emitente Simples Nacional no Paraná.');

  return {
    version: HML_TECHNICAL_RULESET_VERSION,
    approvedBy: 'operator_instruction_hml_technical_only',
    approvedAt: savedDecision.confirmedAt,
    effectiveFrom: savedDecision.confirmedAt,
    issuerCnpj,
    technicalHomologationOnly: true,
    determine: (facts, hash): FiscalDocument => {
      const data = facts.order.data;
      const runId = string(data.testRunId, 'Identificador de teste');
      if (
        !/^TEST_AUT_[0-9a-f-]{36}$/i.test(runId) ||
        facts.order.id !== runId ||
        data.fiscalScenario !== HML_TECHNICAL_RULESET_VERSION ||
        facts.order.type !== 'sale' ||
        facts.order.status !== 'draft' ||
        facts.order.deleted !== true ||
        data.deleted !== true ||
        !Array.isArray(data.payments) ||
        data.payments.length !== 0
      )
        throw new Error(
          'HML exige pedido sintético em rascunho, excluído dos indicadores e sem pagamentos operacionais.'
        );
      const items = data.items;
      const payments = data.fiscalTestPayments;
      if (
        !Array.isArray(items) ||
        items.length !== 1 ||
        !Array.isArray(payments) ||
        payments.length !== 1
      )
        throw new Error('HML técnico exige um item e um pagamento sintéticos.');
      const item = record(items[0]);
      if (Object.keys(facts.emissionRequest.itemCsosnOverrides || {}).some((key) => key !== '1'))
        throw new Error('Escolha de CSOSN referencia item inexistente no cenário HML.');
      const fiscal = item.fiscal ? record(item.fiscal) : {};
      const selections = parseFiscalItemSelections(facts.emissionRequest.itemFiscalSelections);
      if (Object.keys(selections).some((key) => key !== '1'))
        throw new Error('Seleção fiscal referencia item inexistente.');
      const selected = selections['1'];
      const csosn = resolveItemCsosn({
        configuration: csosnConfiguration,
        environment: 2,
        issuerCrt: String(facts.issuerProfile.companyCRT),
        manual: facts.emissionRequest.itemCsosnOverrides?.['1'],
        saved: typeof fiscal.cst === 'string' ? fiscal.cst : undefined,
      });
      if (!ZERO_OWN_ICMS_CSOSNS.includes(csosn.csosn))
        throw new Error(
          `CSOSN ${csosn.csosn} exige regra específica e grupos tributários ainda não disponíveis neste cenário HML.`
        );
      const origin =
        selected?.origem ??
        (fiscal.origem === undefined || fiscal.origem === '' ? '0' : String(fiscal.origem));
      if (!/^[0-8]$/.test(origin)) throw new Error('Origem fiscal inválida no item HML.');
      const payment = record(payments[0]);
      if (
        item.isTemporaryProduct !== true ||
        item.productId ||
        item.unitDiscount !== 0 ||
        item.discountType ||
        Number(item.quantity) !== 1 ||
        String(payment.method).toLowerCase() !== 'pix'
      )
        throw new Error('Produto temporário sem estoque, sem desconto e PIX são obrigatórios.');
      const price = amount(item.unitPrice, 'Preço sintético');
      if (amount(payment.amount, 'Pagamento sintético') !== price)
        throw new Error('Pagamento sintético não reconcilia com o item.');
      const customer = record(data.customerData);
      if (
        customer.id ||
        customer.cpfCnpj !== '12345678909' ||
        !String(customer.fullName || '').includes('TEST_AUT_') ||
        !String(item.description || '').includes('TEST_AUT_')
      )
        throw new Error('Produto e destinatário devem identificar o teste.');
      const recipientAddress = address(record(customer.fiscalAddress), '');
      if (
        recipientAddress.uf !== 'PR' ||
        recipientAddress.street !== 'RUA TESTE' ||
        recipientAddress.number !== '10' ||
        recipientAddress.district !== 'CENTRO' ||
        recipientAddress.municipalityCode !== '4105805' ||
        recipientAddress.municipality !== 'COLOMBO' ||
        recipientAddress.postalCode !== '83410270'
      )
        throw new Error('Fixture HML exige endereço sintético fixo no PR.');
      const issuer = facts.issuerProfile as Record<string, FiscalJsonValue>;
      const issuerAddress = address(issuer, 'company');
      const trace: FiscalDecisionTrace = {
        decisionId: 'hml-technical-single-item',
        ruleSetVersion: HML_TECHNICAL_RULESET_VERSION,
        effectiveAt: savedDecision.confirmedAt!,
        inputFacts: { testRunId: runId, issuerCrt: '1', environment: 2 },
        result: {
          model: '55',
          cfop: '5102',
          csosn: csosn.csosn,
          csosnSource: csosn.source,
          csosnConfigurationVersion: csosnConfiguration.version,
          pisCst: '99',
          cofinsCst: '99',
        },
        reason:
          'Fixture técnica sintética: venda interna, sem substituição tributária, sem frete ou desconto.',
        approver: 'operator_instruction_hml_technical_only',
      };
      const totals: ReconciledFiscalTotals = {
        icmsBase: 0,
        products: price,
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
        invoice: price,
        payment: price,
        change: 0,
      };
      return {
        snapshotHash: hash,
        ruleSetVersion: HML_TECHNICAL_RULESET_VERSION,
        model: '55',
        environment: 2,
        issuer: {
          cnpj: issuerCnpj,
          name: string(issuer.companyName, 'Razão social'),
          ie: digits(
            issuer.companyIE,
            String(issuer.companyIE || '').replace(/\D/g, '').length,
            'IE'
          ),
          crt: '1',
          municipalityCode: issuerAddress.municipalityCode,
          address: issuerAddress,
        },
        recipient: {
          name: string(customer.fullName, 'Destinatário'),
          cpfCnpj: digits(customer.cpfCnpj, 11, 'CPF sintético'),
          ieIndicator: '9',
          address: recipientAddress,
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
        items: [
          {
            itemNumber: 1,
            product: {
              code: runId.slice(0, 30),
              description: string(item.description, 'Produto sintético'),
              gtin: 'SEM GTIN',
              quantity: 1,
              unitValue: price,
              gross: price,
              discount: 0,
              freight: 0,
              insurance: 0,
              otherExpenses: 0,
            },
            classification: {
              ncm: selected?.ncm ?? '94036000',
              origin,
              cfop: selected?.cfop ?? '5102',
              cest: selected?.cest || undefined,
              unit: 'UN',
            },
            taxes: [
              {
                group: 'ICMS',
                codeSystem: 'CSOSN',
                code: csosn.csosn,
                values: { vICMS: 0 },
                decisionId: trace.decisionId,
              },
              {
                group: 'PIS',
                codeSystem: 'CST',
                code: '99',
                values: { vBC: 0, pPIS: 0, vPIS: 0 },
                decisionId: trace.decisionId,
              },
              {
                group: 'COFINS',
                codeSystem: 'CST',
                code: '99',
                values: { vBC: 0, pCOFINS: 0, vCOFINS: 0 },
                decisionId: trace.decisionId,
              },
            ],
            decisions: [trace],
          },
        ],
        payments: [{ methodCode: '17', amount: price, decision: trace }],
        totals,
        decisions: [trace],
      };
    },
  };
}
