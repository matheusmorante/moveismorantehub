import type { composeServiceFiscalValues } from '../../../erp/src/pages/utils/nfe/serviceFiscalComposition';
import type { FiscalCfopOrderScope } from '../../../shared-utils/fiscalCfopModel';
import type { FiscalModelDecision } from '../../../shared-utils/fiscalDocumentModel';
import { ZERO_OWN_ICMS_CSOSNS } from '../../../shared-utils/fiscalIcmsGroups';
import { type HmlCsosnConfiguration, resolveItemCsosn } from '../csosnPolicy';
import type {
  DeterminedFiscalItem,
  FiscalDecisionTrace,
  FiscalSnapshotCandidate,
} from '../fiscalSnapshot';
import { HML_NORMAL_SALE_RULESET_VERSION } from './constants';
import { obj, required } from './values';

type ReadyFiscalModelDecision = Extract<FiscalModelDecision, { status: 'ready' }>;

export function determineHmlNormalSaleItems(params: {
  snapshot: FiscalSnapshotCandidate;
  composition: ReturnType<typeof composeServiceFiscalValues>;
  selections: Record<string, any>;
  expectedCfop: string;
  snapshotScope: FiscalCfopOrderScope;
  contribution: Record<string, any>;
  modelDecision: ReadyFiscalModelDecision;
  configuration: HmlCsosnConfiguration;
  code: string;
  freight: number;
}) {
  const {
    snapshot,
    composition,
    selections,
    expectedCfop,
    snapshotScope,
    contribution,
    modelDecision,
    configuration,
    code,
    freight,
  } = params;
  const catalog = obj(obj(snapshot.fiscalInputs).products);
  const allowedSavedCfops = ['5102', '6102', '6108'];
  const traces: FiscalDecisionTrace[] = composition.products.map(({ item }, index) => {
    const selected = selections[String(index + 1)];
    const saved = (item as any).fiscal || {};
    const productFiscal = catalog[item.productId || ''] || {};
    for (const fiscal of [saved, productFiscal]) {
      if (
        (fiscal.cfop && !allowedSavedCfops.includes(fiscal.cfop)) ||
        ['icmsPercent', 'pisPercent', 'cofinsPercent', 'ipiPercent'].some(
          (field) => Number(fiscal[field] || 0) !== 0
        )
      )
        throw new Error(
          'Exceção tributária do pedido/cadastro exige matriz específica; os dados não foram substituídos.'
        );
    }
    const csosn = resolveItemCsosn({
      configuration,
      environment: 2,
      issuerCrt: '1',
      manual: snapshot.emissionRequest.itemCsosnOverrides?.[String(index + 1)],
      catalog: productFiscal.cst,
    });
    if (selected.csosn !== csosn.csosn)
      throw new Error('CSOSN confirmado diverge da escolha fiscal preparada.');
    if (selected.cfop === '6933' || selected.cfop === '5933')
      throw new Error(
        `CFOP ${selected.cfop} pertence a prestação de serviço (ISSQN) e não pode ser aplicado a venda de mercadoria.`
      );
    if (!ZERO_OWN_ICMS_CSOSNS.includes(csosn.csosn) || selected.cfop !== expectedCfop)
      throw new Error(
        `CSOSN ou CFOP escolhido exige matriz fiscal específica (esperado CFOP ${expectedCfop} para operação ${snapshotScope.scope === 'internal' ? 'interna' : 'interestadual'}); nenhuma escolha foi substituída.`
      );
    const isSupportedContributionCst = (cst?: string) =>
      !cst || cst === contribution.pis.cst || cst === '49' || cst === '99';
    if (
      !isSupportedContributionCst(saved.pisCst) ||
      !isSupportedContributionCst(saved.cofinsCst) ||
      !isSupportedContributionCst(productFiscal.pisCst) ||
      !isSupportedContributionCst(productFiscal.cofinsCst)
    )
      throw new Error('Exceção de PIS/COFINS exige regra específica.');
    return {
      decisionId: `hml-real-item-${index + 1}`,
      ruleSetVersion: HML_NORMAL_SALE_RULESET_VERSION,
      effectiveAt: contribution.confirmedAt,
      inputFacts: {
        orderId: snapshot.order.id,
        itemNumber: index + 1,
        environment: 2,
        issuerCrt: '1',
        recipientMunicipalitySource: 'IBGE',
        recipientMunicipalityCode: code,
      },
      result: {
        ...selected,
        csosnSource: csosn.source,
        configurationVersion: configuration.version,
        pisCst: contribution.pis.cst,
        cofinsCst: contribution.cofins.cst,
        modelDecision,
      },
      reason: modelDecision.reason,
      approver: 'operator_instruction_real_orders_hml_only',
    };
  });
  const determinedItems = composition.products.map(
    ({ item, vProdCents, vDescCents }, index): DeterminedFiscalItem => {
      const selected = selections[String(index + 1)];
      return {
        itemNumber: index + 1,
        product: {
          code: String(item.productId || item.orderItemId || `ITEM-${index + 1}`).slice(0, 60),
          description: required(item.description, 'Descrição comercial'),
          gtin: 'SEM GTIN',
          quantity: item.quantity,
          unitValue: vProdCents / 100 / item.quantity,
          gross: vProdCents / 100,
          discount: vDescCents / 100,
          freight: index === 0 ? freight / 100 : 0,
          insurance: 0,
          otherExpenses: index === 0 ? composition.vOutroCents / 100 : 0,
        },
        classification: {
          ncm: selected.ncm,
          cfop: selected.cfop,
          origin: selected.origem,
          cest: selected.cest || undefined,
          unit: 'UN',
        },
        taxes: [
          {
            group: 'ICMS' as const,
            codeSystem: 'CSOSN' as const,
            code: selected.csosn,
            values: { vICMS: 0 },
            decisionId: traces[index].decisionId,
          },
          {
            group: 'PIS' as const,
            codeSystem: 'CST' as const,
            code: contribution.pis.cst,
            values: {
              vBC: contribution.pis.base,
              pPIS: contribution.pis.rate,
              vPIS: contribution.pis.value,
            },
            decisionId: traces[index].decisionId,
          },
          {
            group: 'COFINS' as const,
            codeSystem: 'CST' as const,
            code: contribution.cofins.cst,
            values: {
              vBC: contribution.cofins.base,
              pCOFINS: contribution.cofins.rate,
              vCOFINS: contribution.cofins.value,
            },
            decisionId: traces[index].decisionId,
          },
        ],
        decisions: [traces[index]],
      };
    }
  );
  const products = composition.products.reduce((sum, item) => sum + item.vProdCents, 0);
  const discount = composition.products.reduce((sum, item) => sum + item.vDescCents, 0);
  const invoice = products - discount + freight + composition.vOutroCents;
  return { traces, determinedItems, products, discount, invoice };
}
