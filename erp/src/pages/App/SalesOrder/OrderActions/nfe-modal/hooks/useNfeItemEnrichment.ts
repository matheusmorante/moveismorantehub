import { useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import type Order from '@/pages/types/order.type';
import { prepareHmlItemCsosns } from '@/pages/utils/nfe/csosnConfigurationService';
import {
  isHmlInterstateMatrixBlock,
  safeFiscalIssueMessage,
} from '@/pages/utils/nfe/fiscalIssuePresentation';
import { getSettings } from '@/pages/utils/settingsService';
import { withNfeEmissionStage } from '../../../../../../../../src/telemetry/nfeEmissionPerformance';
import { getCfopDefinition } from '../../../../../../../../shared-utils/fiscalCfopModel';
import { resolveEffectiveRecipientIeIndicator } from '../../../../../../../../shared-utils/recipientIeIndicator';
import { resolveItemFiscalCfopContext } from '../domain/itemFiscalCfopContext';
import type { NfeItemFiscal, NfeItemWithFiscal } from '../NfeItemsSection';
import { draftKey } from '../types/nfeEmission.types';
import {
  hasFiscalItemSnapshot,
  hasPersistedAuthorizedInvoice,
  ORDER_ITEM_FISCAL_SNAPSHOT_VERSION,
} from '../../../../../../../../shared-utils/orderItemFiscalSnapshot';

export interface UseNfeItemEnrichmentProps {
  order: Order | null;
  environment: 1 | 2;
  finalConsumer?: boolean;
  recipientIeIndicator?: '1' | '2' | '9';
  model?: '55' | '65';
  manualFiscalFields: React.MutableRefObject<Map<string, Record<number, Partial<NfeItemFiscal>>>>;
}

export function useNfeItemEnrichment({
  order,
  environment,
  finalConsumer,
  recipientIeIndicator,
  model,
  manualFiscalFields,
}: UseNfeItemEnrichmentProps) {
  const [nfeItems, setNfeItems] = useState<NfeItemWithFiscal[]>([]);
  const [isLoadingFiscalData, setIsLoadingFiscalData] = useState(Boolean(order?.id && order.items));
  const [fiscalPreparationError, setFiscalPreparationError] = useState<string | null>(null);

  const orderRef = useRef(order);
  orderRef.current = order;
  const orderId = order?.id;

  // The full source item covers NCM/CEST/origin/source/ST/quantity/value and future
  // tax characteristics; identification and physical addresses are independent axes.
  const fiscalDependencySignature = JSON.stringify([
    environment,
    model,
    finalConsumer,
    recipientIeIndicator,
    getSettings().companyUF,
    order?.orderType,
    order?.fiscalContext,
    order?.customerData,
    order?.shipping,
    (order?.items || []).filter((item) => item.itemType !== 'service'),
  ]);
  const previousDependenciesRef = useRef<{ key: string; signature: string } | null>(null);
  const previousCfopScopeRef = useRef<string | null>(null);

  useEffect(() => {
    const currentOrder = orderRef.current;
    if (!currentOrder?.items) {
      setNfeItems([]);
      setIsLoadingFiscalData(false);
      setFiscalPreparationError(null);
      return;
    }

    const settings = getSettings();
    const dependencyKey = `${currentOrder.id}:${environment}`;
    const dependenciesChanged =
      previousDependenciesRef.current?.key === dependencyKey &&
      previousDependenciesRef.current.signature !== fiscalDependencySignature;
    previousDependenciesRef.current = { key: dependencyKey, signature: fiscalDependencySignature };
    if (dependenciesChanged) {
      const key = draftKey(currentOrder, environment);
      const choices = manualFiscalFields.current.get(key);
      if (choices)
        manualFiscalFields.current.set(
          key,
          Object.fromEntries(
            Object.entries(choices).map(([index, fields]) => {
              const classification = { ...fields };
              delete classification.cfop;
              delete classification.cst;
              return [index, classification];
            })
          )
        );
    }
    const defaultFiscal = settings.fiscalDefaults || {};
    const fiscalContext = (
      currentOrder as Order & {
        data?: { fiscalContext?: { recipientIeIndicator?: string } };
      }
    ).data?.fiscalContext;
    const effectiveRecipientIeIndicator = resolveEffectiveRecipientIeIndicator({
      selected: recipientIeIndicator,
      persisted:
        currentOrder.fiscalContext?.recipientIeIndicator ||
        fiscalContext?.recipientIeIndicator,
      customer: currentOrder.customerData?.ieIndicator,
      ie: currentOrder.customerData?.ie,
    });
    const cfopContext = resolveItemFiscalCfopContext({
      order: currentOrder,
      issuerUf: settings.companyUF,
      configuredCfop: defaultFiscal.cfop,
      recipientIeIndicator: effectiveRecipientIeIndicator,
    });
    const { operationScope, suggestedInitialCfop, compatibleCfop } = cfopContext;
    const scopeSignature = `${operationScope.destination || 'unknown'}:${operationScope.operationUf || ''}`;
    const scopeChanged =
      previousCfopScopeRef.current !== null && previousCfopScopeRef.current !== scopeSignature;
    previousCfopScopeRef.current = scopeSignature;
    let isMounted = true;
    setIsLoadingFiscalData(true);
    setFiscalPreparationError(null);

    const productItems = currentOrder.items.filter((item) => item.itemType !== 'service');
    const emissionDraftByIndex = new Map<number, Partial<NfeItemFiscal>>();
    const emissionEnvironmentKey = environment === 1 ? '1' : '2';
    const savedEmissionItems = hasPersistedAuthorizedInvoice(currentOrder)
      ? []
      : currentOrder.nfeDraft?.[emissionEnvironmentKey]?.items || [];
    const usedDraftIndices = new Set<number>();
    productItems.forEach((item, itemIndex) => {
      let draftIndex = item.orderItemId
        ? savedEmissionItems.findIndex(
            (draft, index) => !usedDraftIndices.has(index) && draft.orderItemId === item.orderItemId
          )
        : -1;
      if (draftIndex < 0 && (item.productId || item.variationId)) {
        draftIndex = savedEmissionItems.findIndex(
          (draft, index) =>
            !usedDraftIndices.has(index) &&
            draft.productId === (item.fiscalSnapshotProductId || item.productId) &&
            (draft.variationId || undefined) ===
              (item.fiscalSnapshotVariationId || item.variationId || undefined)
        );
      }
      if (draftIndex < 0 && savedEmissionItems[itemIndex] && !usedDraftIndices.has(itemIndex)) {
        draftIndex = itemIndex;
      }
      if (draftIndex < 0) return;
      usedDraftIndices.add(draftIndex);
      emissionDraftByIndex.set(itemIndex, savedEmissionItems[draftIndex].fiscal);
    });
    const manualChoices = manualFiscalFields.current.get(draftKey(currentOrder, environment));
    const persistedCsosnByIndex = productItems.map((item, index) => {
      const candidates = [
        emissionDraftByIndex.get(index)?.cst,
        item.fiscal?.cst,
        manualChoices?.[index]?.cst,
      ];
      return candidates.find((value) => typeof value === 'string' && value.trim()) as
        | string
        | undefined;
    });
    const shouldPrepareHmlCsosn =
      environment === 2 &&
      model === '55' &&
      ['1', '2'].includes(operationScope.destination || '') &&
      persistedCsosnByIndex.some((csosn) => !csosn);
    let invalidatedCfop = false;
    const fallbackItems: NfeItemWithFiscal[] = productItems.map((item, index) => {
      const savedFiscal = {
        ...item.fiscal,
        ...emissionDraftByIndex.get(index),
      };
      const sourceCfopDefinition = getCfopDefinition(savedFiscal?.cfop || '');
      const savedCfop = dependenciesChanged ? '' : compatibleCfop(savedFiscal?.cfop);
      if (savedFiscal?.cfop && !savedCfop) invalidatedCfop = true;
      return {
        ...item,
        isUnregistered: !item.productId,
        fiscal: {
          ncm: savedFiscal?.ncm || '',
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
    setNfeItems(fallbackItems);

    const unsnapshottedItems = productItems.flatMap((item, index) =>
      hasFiscalItemSnapshot(item) ? [] : [index + 1]
    );
    if (unsnapshottedItems.length > 0) {
      setFiscalPreparationError(
        `Os dados fiscais dos itens ${unsnapshottedItems.join(', ')} não estão completos. Feche e reabra a emissão para tentar novamente.`
      );
      setIsLoadingFiscalData(false);
      return () => {
        isMounted = false;
      };
    }

    const enrichItems = async () => {
      try {
        const csosnPromise =
          shouldPrepareHmlCsosn
            ? withNfeEmissionStage('csosn_prepare', () =>
                prepareHmlItemCsosns(String(currentOrder.id))
              ).then(
                (preparedCsosns) => ({
                  preparedCsosns,
                  error: null as string | null,
                }),
                (error: unknown) => ({
                  preparedCsosns: [] as Awaited<ReturnType<typeof prepareHmlItemCsosns>>,
                  error:
                    error instanceof Error ? error.message : 'Configuração fiscal indisponível.',
                })
              )
            : Promise.resolve({
                preparedCsosns: [] as Awaited<ReturnType<typeof prepareHmlItemCsosns>>,
                error: null as string | null,
              });

        const csosnResult = await csosnPromise;
        const preparedCsosns = csosnResult.preparedCsosns;
        let preparationError = csosnResult.error;
        const snapshotResults = productItems.map((item, index) => {
          const draftFiscal = emissionDraftByIndex.get(index);
          return {
            item,
            draftFiscal,
            snapshotFiscal: item.fiscal || {},
          };
        });

        const enrichedList: NfeItemWithFiscal[] = [];
        for (const [index, { item, snapshotFiscal, draftFiscal }] of snapshotResults.entries()) {
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
          enrichedList.push({
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
                  ? compatibleCfop(draftFiscal?.cfop || savedFiscal?.cfop)
                  : '') ||
                (!dependenciesChanged ? compatibleCfop(snapshotFiscal?.cfop) : '') ||
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
                draftFiscal?.merchandiseOrigin || savedFiscal?.merchandiseOrigin ||
                snapshotFiscal?.merchandiseOrigin ||
                sourceCfopDefinition?.merchandiseOrigin,
              isOwnProduction:
                draftFiscal?.isOwnProduction ?? savedFiscal?.isOwnProduction ??
                snapshotFiscal?.isOwnProduction ??
                sourceCfopDefinition?.isOwnProduction,
              hasSt:
                draftFiscal?.hasSt ?? savedFiscal?.hasSt ??
                draftFiscal?.isSt ?? savedFiscal?.isSt ??
                snapshotFiscal?.hasSt ??
                snapshotFiscal?.isSt ??
                sourceCfopDefinition?.isSt,
              isSt:
                savedFiscal?.isSt ??
                snapshotFiscal?.isSt ??
                sourceCfopDefinition?.isSt,
            },
          });
          const manual = manualFiscalFields.current.get(draftKey(currentOrder, environment))?.[
            index
          ];
          if (manual !== undefined) {
            enrichedList[index].fiscal = {
              ...enrichedList[index].fiscal,
              ...manual,
              ...(manual.cst !== undefined ? { csosnSource: 'manual' } : {}),
            };
          }
          if (enrichedList[index].fiscal.cfop && !compatibleCfop(enrichedList[index].fiscal.cfop)) {
            enrichedList[index].fiscal.cfop = '';
            invalidatedCfop = true;
          }
        }

        if (isMounted) {
          setNfeItems(enrichedList);
          setFiscalPreparationError(preparationError);
          setIsLoadingFiscalData(false);
          if (scopeChanged && invalidatedCfop)
            toast.info('O local da operação mudou; o CFOP anterior foi removido e revalidado.');
          if (preparationError && !isHmlInterstateMatrixBlock(preparationError))
            toast.error(
              safeFiscalIssueMessage(preparationError, 'A preparação fiscal não foi concluída.')
            );
        }
      } catch (error) {
        if (isMounted) {
          setNfeItems(fallbackItems);
          const message =
            error instanceof Error
              ? error.message
              : 'Falha ao preparar os dados fiscais dos itens.';
          setFiscalPreparationError(message);
          setIsLoadingFiscalData(false);
          toast.error(message);
        }
      }
    };

    enrichItems();

    return () => {
      isMounted = false;
    };
  }, [
    orderId,
    fiscalDependencySignature,
    model,
    order?.nfeDraft,
    environment,
    recipientIeIndicator,
    manualFiscalFields,
  ]);

  const handleUpdateItemFiscal = (index: number, updates: Partial<NfeItemFiscal>) => {
    const currentOrder = orderRef.current;
    const settings = getSettings();
    const defaultFiscal = settings.fiscalDefaults || {};
    const cfopContext = resolveItemFiscalCfopContext({
      order: currentOrder,
      issuerUf: settings.companyUF,
      configuredCfop: defaultFiscal.cfop,
      recipientIeIndicator,
    });
    const { compatibleCfop, defaultCfop, defaultCst } = cfopContext;

    const classificationChanged = (['ncm', 'cest', 'origem'] as const).some(
      (field) => updates[field] !== undefined && updates[field] !== nfeItems[index]?.fiscal[field]
    );
    const currentItem = nfeItems[index];
    const resolvedCfop =
      updates.cfop !== undefined
        ? updates.cfop
        : classificationChanged
          ? compatibleCfop(currentItem?.fiscal?.cfop) || defaultCfop
          : currentItem?.fiscal?.cfop;
    const resolvedCst =
      updates.cst !== undefined
        ? updates.cst
        : classificationChanged
          ? currentItem?.fiscal?.cst || defaultCst
          : currentItem?.fiscal?.cst;

    const resolvedUpdates: Partial<NfeItemFiscal> = {
      ...updates,
      ...(resolvedCfop !== undefined ? { cfop: resolvedCfop } : {}),
      ...(resolvedCst !== undefined ? { cst: resolvedCst } : {}),
      ...(updates.cst !== undefined ? { csosnSource: 'manual' as const } : {}),
    };
    if (order) {
      const key = draftKey(order, environment);
      const existing = manualFiscalFields.current.get(key) || {};
      manualFiscalFields.current.set(key, {
        ...existing,
        [index]: { ...existing[index], ...resolvedUpdates },
      });
    }
    setNfeItems((prev) =>
      prev.map((item, idx) => {
        if (idx !== index) return item;
        return {
          ...item,
          fiscal: {
            ...item.fiscal,
            ...resolvedUpdates,
            ...(!classificationChanged && updates.cst !== undefined
              ? { csosnSource: 'manual' }
              : {}),
          },
        };
      })
    );
  };

  const handleBatchUpdateItems = (updated: NfeItemWithFiscal[]) => {
    const currentOrder = orderRef.current;
    const settings = getSettings();
    const defaultFiscal = settings.fiscalDefaults || {};
    const cfopContext = resolveItemFiscalCfopContext({
      order: currentOrder,
      issuerUf: settings.companyUF,
      configuredCfop: defaultFiscal.cfop,
      recipientIeIndicator,
    });
    const { compatibleCfop, defaultCfop, defaultCst } = cfopContext;

    const key = order ? draftKey(order, environment) : '';
    const choices = { ...manualFiscalFields.current.get(key) };
    const resolved = updated.map((item, index) => {
      const classificationChanged = (['ncm', 'cest', 'origem'] as const).some(
        (field) => item.fiscal[field] !== nfeItems[index]?.fiscal[field]
      );
      if (classificationChanged) {
        item = {
          ...item,
          fiscal: {
            ...item.fiscal,
            cfop: compatibleCfop(item.fiscal.cfop) || defaultCfop,
            cst: item.fiscal.cst || defaultCst,
          },
        };
      }
      const changed = item.fiscal.cst !== nfeItems[index]?.fiscal.cst;
      const changedFields = Object.fromEntries(
        (['ncm', 'cfop', 'origem', 'cest', 'cst'] as const)
          .filter((field) => item.fiscal[field] !== nfeItems[index]?.fiscal[field])
          .map((field) => [field, item.fiscal[field]])
      );
      choices[index] = { ...choices[index], ...changedFields };
      return {
        ...item,
        fiscal: {
          ...item.fiscal,
          ...(!classificationChanged && changed ? { csosnSource: 'manual' as const } : {}),
        },
      };
    });
    if (order) manualFiscalFields.current.set(key, choices);
    setNfeItems(resolved);
  };

  return {
    nfeItems,
    isLoadingFiscalData,
    fiscalPreparationError,
    handleUpdateItemFiscal,
    handleBatchUpdateItems,
  };
}
