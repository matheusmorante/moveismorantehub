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
import { resolveEffectiveRecipientIeIndicator } from '../../../../../../../../shared-utils/recipientIeIndicator';
import { resolveItemFiscalCfopContext } from '../domain/itemFiscalCfopContext';
import type { NfeItemFiscal, NfeItemWithFiscal } from '../NfeItemsSection';
import { draftKey } from '../types/nfeEmission.types';
import { hasFiscalItemSnapshot } from '../../../../../../../../shared-utils/orderItemFiscalSnapshot';
import {
  type UseNfeItemEnrichmentProps,
  type UseNfeItemEnrichmentReturn,
  resolveEmissionDraftByIndex,
  buildEnrichmentFallbackItems,
  backfillMissingNcmFromPriorDocuments,
  mergeEnrichedItems,
  computeSingleItemFiscalUpdate,
  computeBatchItemFiscalUpdates,
} from './item-enrichment';

export type { UseNfeItemEnrichmentProps, UseNfeItemEnrichmentReturn };

export function useNfeItemEnrichment({
  order,
  environment,
  finalConsumer,
  recipientIeIndicator,
  model,
  manualFiscalFields,
}: UseNfeItemEnrichmentProps): UseNfeItemEnrichmentReturn {
  const [nfeItems, setNfeItems] = useState<NfeItemWithFiscal[]>([]);
  const [isLoadingFiscalData, setIsLoadingFiscalData] = useState(Boolean(order?.id && order.items));
  const [fiscalPreparationError, setFiscalPreparationError] = useState<string | null>(null);

  const orderRef = useRef(order);
  orderRef.current = order;
  const orderId = order?.id;

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
      if (choices) {
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
    const emissionEnvironmentKey = environment === 1 ? '1' : '2';
    const otherEnvironmentKey = environment === 1 ? '2' : '1';
    const currentEnvDraft = currentOrder.nfeDraft?.[emissionEnvironmentKey]?.items || [];
    const otherEnvDraft = currentOrder.nfeDraft?.[otherEnvironmentKey]?.items || [];
    const savedEmissionItems = currentEnvDraft.length > 0 ? currentEnvDraft : otherEnvDraft;

    const emissionDraftByIndex = resolveEmissionDraftByIndex(productItems, savedEmissionItems);

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

    const { fallbackItems, invalidatedCfop: fallbackInvalidatedCfop } = buildEnrichmentFallbackItems({
      productItems,
      emissionDraftByIndex,
      otherEnvDraft,
      operationScope,
      compatibleCfop,
      suggestedInitialCfop,
      dependenciesChanged,
      defaultFiscal,
      model,
    });
    let invalidatedCfop = fallbackInvalidatedCfop;
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
        const initialPreparationError = csosnResult.error;

        if (currentOrder.id) {
          await backfillMissingNcmFromPriorDocuments(currentOrder.id, productItems, fallbackItems);
        }

        const {
          enrichedList,
          preparationError,
          invalidatedCfop: mergeInvalidatedCfop,
        } = mergeEnrichedItems({
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
        });

        if (mergeInvalidatedCfop) invalidatedCfop = true;

        if (isMounted) {
          setNfeItems(enrichedList);
          setFiscalPreparationError(preparationError);
          setIsLoadingFiscalData(false);
          if (scopeChanged && invalidatedCfop) {
            toast.info('O local da operação mudou; o CFOP anterior foi removido e revalidado.');
          }
          if (preparationError && !isHmlInterstateMatrixBlock(preparationError)) {
            toast.error(
              safeFiscalIssueMessage(preparationError, 'A preparação fiscal não foi concluída.')
            );
          }
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

    void enrichItems();

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

    const { resolvedUpdates, classificationChanged } = computeSingleItemFiscalUpdate(
      nfeItems[index],
      updates,
      cfopContext
    );

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

    const key = order ? draftKey(order, environment) : '';
    const initialChoices = manualFiscalFields.current.get(key) || {};

    const { resolvedItems, updatedChoices } = computeBatchItemFiscalUpdates(
      nfeItems,
      updated,
      cfopContext,
      initialChoices
    );

    if (order) manualFiscalFields.current.set(key, updatedChoices);
    setNfeItems(resolvedItems);
  };

  return {
    nfeItems,
    isLoadingFiscalData,
    fiscalPreparationError,
    handleUpdateItemFiscal,
    handleBatchUpdateItems,
  };
}
