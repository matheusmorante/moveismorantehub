import type { composeServiceFiscalValues } from '../../../erp/src/pages/utils/nfe/serviceFiscalComposition';
import type { FiscalCfopOrderScope } from '../../../shared-utils/fiscalCfopModel';
import type { FiscalModelDecision } from '../../../shared-utils/fiscalDocumentModel';
import { ZERO_OWN_ICMS_CSOSNS } from '../../../shared-utils/fiscalIcmsGroups';
import { validateCsosn } from '../csosnPolicy';
import type {
  DeterminedFiscalItem,
  FiscalDecisionTrace,
  FiscalSnapshotCandidate,
} from '../fiscalSnapshot';
import type { ResolvedSimplesNormalSaleContribution } from '../simplesNormalSaleContribution';
import { obj, required } from './values';

type ReadyFiscalModelDecision = Extract<FiscalModelDecision, { status: 'ready' }>;

export function determineNormalSaleItems(params: {
  snapshot: FiscalSnapshotCandidate;
  composition: ReturnType<typeof composeServiceFiscalValues>;
  selections: Record<string, any>;
  expectedCfop: string;
  snapshotScope: FiscalCfopOrderScope;
  contribution: ResolvedSimplesNormalSaleContribution;
  modelDecision: ReadyFiscalModelDecision;
  ruleSetVersion: string;
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
    ruleSetVersion,
    code,
    freight,
  } = params;
  const catalog = obj(obj(snapshot.fiscalInputs).products);
  const allowedSavedCfops = ['5102', '6102', '6108'];
  const traces: FiscalDecisionTrace[] = composition.products.map(({ item }, index) => {
    const selected = selections[String(index + 1)];
    const itemRecord = item as any;
    const saved = itemRecord.fiscal || {};
    const productFiscal = catalog[item.productId || ''] || {};
    const ownProduction =
      itemRecord.merchandiseOrigin === 'own_production' ||
      saved.merchandiseOrigin === 'own_production' ||
      productFiscal.merchandiseOrigin === 'own_production' ||
      itemRecord.isOwnProduction === true ||
      saved.isOwnProduction === true ||
      productFiscal.isOwnProduction === true;
    const hasSt = [
      itemRecord.hasSt,
      itemRecord.isSt,
      saved.hasSt,
      saved.isSt,
      productFiscal.hasSt,
      productFiscal.isSt,
    ].find((value) => typeof value === 'boolean');
    if (expectedCfop === '5102' && (ownProduction || hasSt === true))
      throw new Error(
        'Venda normal interna de produção própria ou com ST exige matriz fiscal específica aprovada.'
      );
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
    const override = snapshot.emissionRequest.itemCsosnOverrides?.[String(index + 1)];
    const csosn = validateCsosn(selected.csosn, String(snapshot.issuerProfile.companyCRT));
    if (override !== undefined && override !== csosn)
      throw new Error('CSOSN confirmado diverge da escolha fiscal preparada.');
    if (selected.cfop === '6933' || selected.cfop === '5933')
      throw new Error(
        `CFOP ${selected.cfop} pertence a prestação de serviço (ISSQN) e não pode ser aplicado a venda de mercadoria.`
      );
    if (!ZERO_OWN_ICMS_CSOSNS.includes(csosn) || selected.cfop !== expectedCfop)
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
      decisionId: `normal-sale-item-${index + 1}`,
      ruleSetVersion,
      effectiveAt: contribution.confirmedAt,
      inputFacts: {
        orderId: snapshot.order.id,
        itemNumber: index + 1,
        environment: snapshot.emissionRequest.environment,
        issuerCrt: '1',
        recipientMunicipalitySource: 'IBGE',
        recipientMunicipalityCode: code,
      },
      result: {
        ...selected,
        csosnSource: 'confirmed_item_selection',
        contributionDecisionId: contribution.decisionId,
        contributionDecisionModel: contribution.model,
        ...(contribution.sourceUrl ? { contributionSourceUrl: contribution.sourceUrl } : {}),
        pisCst: contribution.pis.cst,
        cofinsCst: contribution.cofins.cst,
        modelDecision,
      },
      reason: modelDecision.reason,
      approver: contribution.confirmedBy,
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
