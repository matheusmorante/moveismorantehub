import type { OrderItem } from '@/pages/types/order.type';
import { getCfopDefinition } from '../../../../../../../../../shared-utils/fiscalCfopModel';
import { ORDER_ITEM_FISCAL_SNAPSHOT_VERSION } from '../../../../../../../../../shared-utils/orderItemFiscalSnapshot';
import type { NfeItemFiscal, NfeItemWithFiscal } from '../NfeItemsSection';
import { invertIfReversalCfop } from './itemDraftMatcher';

export interface PreparedCsosnItem {
  itemNumber: number;
  csosn?: string;
  cfop?: string;
  source?: string;
}

export interface MergeEnrichedItemsParams {
  productItems: OrderItem[];
  fallbackItems: NfeItemWithFiscal[];
  preparedCsosns: PreparedCsosnItem[];
  persistedCsosnByIndex: (string | undefined)[];
  emissionDraftByIndex: Map<number, Partial<NfeItemFiscal>>;
  manualChoices?: Record<number, Partial<NfeItemFiscal>>;
  dependenciesChanged: boolean;
  operationScope: { destination?: string | null };
  compatibleCfop: (cfop?: string | null) => string;
  suggestedInitialCfop: string;
  shouldPrepareHmlCsosn: boolean;
  initialPreparationError: string | null;
  model?: '55' | '65';
}

export interface MergeEnrichedItemsResult {
  enrichedList: NfeItemWithFiscal[];
  preparationError: string | null;
  invalidatedCfop: boolean;
}

export function mergeEnrichedItems({
  productItems,
  fallbackItems,
  preparedCsosns,
  persistedCsosnByIndex,
  emissionDraftByIndex,
  manualChoices,
  dependenciesChanged,
  operationScope,
  compatibleCfop,
  suggestedInitialCfop,
  shouldPrepareHmlCsosn,
  initialPreparationError,
  model,
}: MergeEnrichedItemsParams): MergeEnrichedItemsResult {
  let preparationError = initialPreparationError;
  let invalidatedCfop = false;
  const enrichedList: NfeItemWithFiscal[] = [];

  for (let index = 0; index < productItems.length; index++) {
    const item = productItems[index];
    const draftFiscal = emissionDraftByIndex.get(index);
    const snapshotFiscal = item.fiscal || {};
    const preparedCsosn = preparedCsosns.find((entry) => entry.itemNumber === index + 1);

    if (
      shouldPrepareHmlCsosn &&
      !persistedCsosnByIndex[index] &&
      !preparedCsosn &&
      !preparationError
    ) {
      preparationError = `CSOSN do item ${index + 1} não foi preparado no servidor.`;
    }

    const savedFiscal = item.fiscal;
    const sourceCfopDefinition = getCfopDefinition(
      snapshotFiscal?.cfop || savedFiscal?.cfop || ''
    );

    const enrichedItem: NfeItemWithFiscal = {
      ...fallbackItems[index],
      fiscalSnapshotVersion: ORDER_ITEM_FISCAL_SNAPSHOT_VERSION,
      ...(item.fiscalSnapshotProductId || item.productId
        ? { fiscalSnapshotProductId: item.fiscalSnapshotProductId || item.productId }
        : {}),
      ...(item.fiscalSnapshotVariationId || item.variationId
        ? { fiscalSnapshotVariationId: item.fiscalSnapshotVariationId || item.variationId }
        : {}),
      fiscal: {
        ncm: draftFiscal?.ncm || savedFiscal?.ncm || fallbackItems[index].fiscal.ncm,
        cest: draftFiscal?.cest || savedFiscal?.cest || fallbackItems[index].fiscal.cest,
        commercialUnit: draftFiscal?.commercialUnit || savedFiscal?.commercialUnit || 'UN',
        taxableUnit: draftFiscal?.taxableUnit || savedFiscal?.taxableUnit || 'UN',
        cfop:
          (!dependenciesChanged
            ? compatibleCfop(
                invertIfReversalCfop(
                  draftFiscal?.cfop || savedFiscal?.cfop,
                  operationScope.destination
                )
              )
            : '') ||
          (!dependenciesChanged
            ? compatibleCfop(
                invertIfReversalCfop(snapshotFiscal?.cfop, operationScope.destination)
              )
            : '') ||
          (preparedCsosn?.cfop ? compatibleCfop(preparedCsosn.cfop) : '') ||
          suggestedInitialCfop ||
          fallbackItems[index].fiscal.cfop ||
          (operationScope.destination === '1' ? '5102' : '6102'),
        cst:
          preparedCsosn?.csosn ||
          (!dependenciesChanged && (draftFiscal?.cst || savedFiscal?.cst)) ||
          snapshotFiscal?.cst ||
          (model === '65' ? '' : '103'),
        csosnSource: preparedCsosn?.source,
        origem: draftFiscal?.origem || savedFiscal?.origem || fallbackItems[index].fiscal.origem,
        merchandiseOrigin:
          draftFiscal?.merchandiseOrigin ||
          savedFiscal?.merchandiseOrigin ||
          snapshotFiscal?.merchandiseOrigin ||
          sourceCfopDefinition?.merchandiseOrigin,
        isOwnProduction:
          draftFiscal?.isOwnProduction ??
          savedFiscal?.isOwnProduction ??
          snapshotFiscal?.isOwnProduction ??
          sourceCfopDefinition?.isOwnProduction,
        hasSt:
          draftFiscal?.hasSt ??
          savedFiscal?.hasSt ??
          draftFiscal?.isSt ??
          savedFiscal?.isSt ??
          snapshotFiscal?.hasSt ??
          snapshotFiscal?.isSt ??
          sourceCfopDefinition?.isSt,
        isSt:
          savedFiscal?.isSt ??
          snapshotFiscal?.isSt ??
          sourceCfopDefinition?.isSt,
      },
    };

    const manual = manualChoices?.[index];
    if (manual !== undefined) {
      enrichedItem.fiscal = {
        ...enrichedItem.fiscal,
        ...manual,
        ...(manual.cst !== undefined ? { csosnSource: 'manual' } : {}),
      };
    }

    if (enrichedItem.fiscal.cfop && !compatibleCfop(enrichedItem.fiscal.cfop)) {
      enrichedItem.fiscal.cfop = '';
      invalidatedCfop = true;
    }

    enrichedList.push(enrichedItem);
  }

  return { enrichedList, preparationError, invalidatedCfop };
}
