import { expect, it } from 'vitest';
import { initialHmlCsosnConfiguration } from '../../../../../../api/nfe/csosnPolicy';
import { resolveFiscalDocument } from '../../../../../../api/nfe/fiscalSnapshot';
import { serializeFiscalDocument } from '../../../../../../api/nfe/fiscalXmlSerializer';
import { createHmlNormalSaleRuleSet } from '../../../../../../api/nfe/hmlNormalSaleRuleSet';
import {
  INTERSTATE_OUTBOUND_FISCAL_MATRIX_RULES,
  type InterstateOutboundFiscalMatrixFacts,
  type InterstateOutboundFiscalMatrixRule,
  resolveInterstateOutboundFiscalMatrix,
} from '../../../../../../api/nfe/interstateOutboundFiscalMatrix';
import { NORMAL_SALE_RULESET_VERSION } from '../../../../../../api/nfe/normalSaleRuleSet';
import { resolveOrderFiscalModel } from '../../../../../../shared-utils/fiscalDocumentModel';
import { generateNfeAccessKey } from '../nfeAccessKey';
import { makeInterstateFacts } from './fixtures/fiscalCfopMatrix.fixtures';

type InterstateOutboundFiscalMatrixFiscalContextXmlDependencies = {
  facts: InterstateOutboundFiscalMatrixFacts;
  completeRule: (id?: string) => InterstateOutboundFiscalMatrixRule;
};

export function registerInterstateOutboundFiscalMatrixFiscalContextXmlCase({
  facts,
  completeRule,
}: InterstateOutboundFiscalMatrixFiscalContextXmlDependencies): void {
  it('prova FiscalContext → resolução sintética → XML sem promover regra interestadual real', async () => {
    const input = makeInterstateFacts({ recipientUf: 'SC', cfop: '6102' });
    input.capturedAt = facts.effectiveAt;
    input.emissionRequest.recipientTaxId = '11222333000181';
    input.fiscalInputs!.customer = {
      ...(input.fiscalInputs!.customer as Record<string, unknown>),
      personType: 'PJ',
      cpfCnpj: '11222333000181',
    };
    input.order.data.fiscalContext = {
      recipientIeIndicator: '1',
      finalConsumer: true,
      purpose: '1',
    };
    const interstateModelDecision = resolveOrderFiscalModel(input.order.data, {
      issuerUf: 'PR',
      finalConsumer: true,
      recipientAddress: { state: 'SC' },
    });
    if (interstateModelDecision.status !== 'ready')
      throw new Error('Fixture interestadual exige NF-e.');
    const internal = makeInterstateFacts({ recipientUf: 'PR', cfop: '5102' });
    internal.fiscalInputs!.contributionDecisions = {
      '65': {
        scope: { model: '65', operation: 'normal_sale', issuerCrt: '1' },
        pis: { cst: '99', base: 0, rate: 0, value: 0 },
        cofins: { cst: '99', base: 0, rate: 0, value: 0 },
        confirmedAt: '2026-09-01T00:00:00Z',
        confirmedBy: 'TEST_UNIT_NFCE65_DECISION',
      },
    };
    const internalRules = await createHmlNormalSaleRuleSet(
      internal,
      initialHmlCsosnConfiguration()
    );
    const base = resolveFiscalDocument(internal, internalRules);
    if (base.status !== 'ready') throw new Error('Fixture interna inválida');
    const selected = resolveInterstateOutboundFiscalMatrix(facts, [completeRule()]);
    if (selected.status !== 'approved') throw new Error('Fixture de seletor inválida');
    const version = NORMAL_SALE_RULESET_VERSION;
    const traces = base.document.decisions.map((trace) => ({
      ...trace,
      ruleSetVersion: version,
      reason: `TEST_ONLY ${selected.ruleId}`,
      approver: 'TEST_ONLY',
    }));
    const rules = {
      ...internalRules,
      version,
      approvedBy: 'TEST_ONLY',
      determine: (_snapshot: unknown, hash: string) => ({
        ...base.document,
        model: '55' as const,
        snapshotHash: hash,
        ruleSetVersion: version,
        modelDecision: interstateModelDecision,
        recipient: {
          ...base.document.recipient,
          personType: 'PJ' as const,
          cpfCnpj: '11222333000181',
          ieIndicator: '1',
          ie: '123456789',
          address: {
            ...base.document.recipient.address!,
            uf: 'SC',
            municipalityCode: '4209102',
            municipality: 'Joinville',
          },
        },
        operation: { ...base.document.operation, destination: '2', finalConsumer: '1' as const },
        decisions: traces,
        payments: base.document.payments.map((payment) => ({
          ...payment,
          decision: { ...payment.decision, ruleSetVersion: version, approver: 'TEST_ONLY' },
        })),
        items: base.document.items.map((item) => ({
          ...item,
          classification: {
            ...item.classification,
            cfop: selected.rule.treatment.cfop!,
            origin: facts.productOrigin,
          },
          taxes: item.taxes.map((tax) =>
            tax.group === 'ICMS' ? { ...tax, code: selected.rule.treatment.csosn! } : tax
          ),
          decisions: item.decisions.map((trace) => ({
            ...trace,
            ruleSetVersion: version,
            approver: 'TEST_ONLY',
          })),
        })),
      }),
    };
    const resolved = resolveFiscalDocument(input, rules);
    if (resolved.status !== 'ready') throw new Error(JSON.stringify(resolved.blockers));
    const key = generateNfeAccessKey({
      ufCode: '41',
      yearMonth: '2610',
      cnpj: '44512248000107',
      model: '55',
      series: 1,
      number: 1,
      emissionType: '1',
      randomCode: '12345678',
    });
    const xml = serializeFiscalDocument(input, resolved.document, rules, {
      accessKey: key.accessKey,
      series: 1,
      number: 1,
      issuedAt: '2026-10-06T09:00:00-03:00',
    });
    for (const value of [
      '<idDest>2</idDest>',
      '<indFinal>1</indFinal>',
      '<indIEDest>1</indIEDest>',
      '<CFOP>6102</CFOP>',
      '<ICMSSN102><orig>0</orig><CSOSN>102</CSOSN>',
    ])
      expect(xml).toContain(value);
    for (const value of ['<ICMSUFDest>', '<vICMSST>', '<pFCP>', '<pFCPST>'])
      expect(xml).not.toContain(value);
    expect(INTERSTATE_OUTBOUND_FISCAL_MATRIX_RULES.some((rule) => rule.status === 'APPROVED')).toBe(
      false
    );
  });
}
