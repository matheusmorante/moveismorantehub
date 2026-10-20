import type { Item as OrderItem } from '@/pages/types/items.type';
import { getCfopDefinition } from '../../../../../../../../../shared-utils/fiscalCfopModel';
import type { NfeItemFiscal, NfeItemWithFiscal } from '../../NfeItemsSection';
import { type DraftItemLike, invertIfReversalCfop } from './itemDraftMatcher';

export interface BuildFallbackItemsParams {
  productItems: OrderItem[];
  emissionDraftByIndex: Map<number, Partial<NfeItemFiscal>>;
  otherEnvDraft: DraftItemLike[];
  operationScope: { destination?: string | null };
  compatibleCfop: (cfop?: string | null) => string;
  suggestedInitialCfop: string;
  dependenciesChanged: boolean;
  defaultFiscal: { origem?: string };
  model?: '55' | '65';
}

export interface BuildFallbackItemsResult {
  fallbackItems: NfeItemWithFiscal[];
  invalidatedCfop: boolean;
}

export function buildEnrichmentFallbackItems({
  productItems,
  emissionDraftByIndex,
  otherEnvDraft,
  operationScope,
  compatibleCfop,
  suggestedInitialCfop,
  dependenciesChanged,
  defaultFiscal,
  model,
}: BuildFallbackItemsParams): BuildFallbackItemsResult {
  let invalidatedCfop = false;

  const fallbackItems: NfeItemWithFiscal[] = productItems.map((item, index) => {
    const savedFiscal = {
      ...item.fiscal,
      ...emissionDraftByIndex.get(index),
    };
    const normalizedFiscalCfop = invertIfReversalCfop(savedFiscal?.cfop, operationScope.destination);
    const sourceCfopDefinition = getCfopDefinition(normalizedFiscalCfop || '');
    const savedCfop = dependenciesChanged ? '' : compatibleCfop(normalizedFiscalCfop);
    if (savedFiscal?.cfop && !savedCfop) invalidatedCfop = true;

    let effectiveNcm = savedFiscal?.ncm || '';
    if (!effectiveNcm && otherEnvDraft.length > 0) {
      const otherMatch = otherEnvDraft.find(
        (d) =>
          d.fiscal?.ncm &&
          (d.orderItemId === item.orderItemId ||
            d.productId === (item.fiscalSnapshotProductId || item.productId) ||
            (d as any).code === item.code)
      );
      if (otherMatch?.fiscal?.ncm) effectiveNcm = otherMatch.fiscal.ncm;
    }

    return {
      ...item,
      isUnregistered: !item.productId,
      fiscal: {
        ncm: effectiveNcm,
        cest: savedFiscal?.cest || '',
        commercialUnit: savedFiscal?.commercialUnit,
        taxableUnit: savedFiscal?.taxableUnit,
        cfop: savedCfop || suggestedInitialCfop,
        cst: (!dependenciesChanged && savedFiscal?.cst) || (model === '65' ? '' : '103'),
        origem: savedFiscal?.origem || defaultFiscal.origem || '0',
        merchandiseOrigin:
          savedFiscal?.merchandiseOrigin || sourceCfopDefinition?.merchandiseOrigin,
        isOwnProduction:
          savedFiscal?.isOwnProduction ?? sourceCfopDefinition?.isOwnProduction,
        hasSt: savedFiscal?.hasSt ?? savedFiscal?.isSt ?? sourceCfopDefinition?.isSt,
        isSt: savedFiscal?.isSt ?? sourceCfopDefinition?.isSt,
      },
    };
  });

  return { fallbackItems, invalidatedCfop };
}
