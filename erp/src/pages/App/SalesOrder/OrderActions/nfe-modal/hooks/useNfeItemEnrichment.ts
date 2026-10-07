import { useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import type Order from '@/pages/types/order.type';
import { prepareHmlItemCsosns } from '@/pages/utils/nfe/csosnConfigurationService';
import {
  isHmlInterstateMatrixBlock,
  safeFiscalIssueMessage,
} from '@/pages/utils/nfe/fiscalIssuePresentation';
import {
  getProductsFiscalData,
  type ProductFiscalData,
} from '@/pages/utils/productService/productFiscalDataService';
import { getSettings } from '@/pages/utils/settingsService';
import { withNfeEmissionStage } from '../../../../../../../../src/telemetry/nfeEmissionPerformance';
import { getCfopDefinition } from '../../../../../../../../shared-utils/fiscalCfopModel';
import { resolveEffectiveRecipientIeIndicator } from '../../../../../../../../shared-utils/recipientIeIndicator';
import { resolveItemFiscalCfopContext } from '../domain/itemFiscalCfopContext';
import type { NfeItemFiscal, NfeItemWithFiscal } from '../NfeItemsSection';
import { draftKey } from '../types/nfeEmission.types';

export interface UseNfeItemEnrichmentProps {
  order: Order | null;
  environment: 1 | 2;
  finalConsumer?: boolean;
  recipientIeIndicator?: '1' | '2' | '9';
  recipientTaxId?: string;
  model?: '55' | '65';
  manualFiscalFields: React.MutableRefObject<Map<string, Record<number, Partial<NfeItemFiscal>>>>;
}

class MissingFiscalProductsError extends Error {
  constructor(
    readonly itemNumbers: number[],
    readonly productData: Map<string, ProductFiscalData>
  ) {
    super(
      `Dados fiscais atuais não encontrados para o(s) item(ns): ${itemNumbers.join(', ')}. Atualize o cadastro antes de transmitir.`
    );
  }
}

export function useNfeItemEnrichment({
  order,
  environment,
  finalConsumer,
  recipientIeIndicator,
  recipientTaxId,
  model,
  manualFiscalFields,
}: UseNfeItemEnrichmentProps) {
  const [nfeItems, setNfeItems] = useState<NfeItemWithFiscal[]>([]);
  const [isLoadingFiscalData, setIsLoadingFiscalData] = useState(Boolean(order?.id && order.items));
  const [fiscalPreparationError, setFiscalPreparationError] = useState<string | null>(null);

  const orderRef = useRef(order);
  orderRef.current = order;
  const orderId = order?.id;
  const fiscalLookupRef = useRef<{
    key: string;
    promise: Promise<Map<string, ProductFiscalData>>;
  } | null>(null);

  // The full source item covers NCM/CEST/origin/source/ST/quantity/value and future
  // tax characteristics; identification and physical addresses are independent axes.
  const fiscalDependencySignature = JSON.stringify([
    environment,
    model,
    finalConsumer,
    recipientIeIndicator,
    recipientTaxId,
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
      fiscalLookupRef.current = null;
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
      fiscalLookupRef.current = null;
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
    let invalidatedCfop = false;
    const fallbackItems: NfeItemWithFiscal[] = productItems.map((item) => {
      const savedFiscal = item.fiscal;
      const sourceCfopDefinition = getCfopDefinition(savedFiscal?.cfop || '');
      const savedCfop = dependenciesChanged ? '' : compatibleCfop(savedFiscal?.cfop);
      if (savedFiscal?.cfop && !savedCfop) invalidatedCfop = true;
      return {
        ...item,
        isUnregistered: !item.productId,
        fiscal: {
          ncm: savedFiscal?.ncm || '',
          cest: savedFiscal?.cest || '',
          cfop: savedCfop || suggestedInitialCfop,
          cst: (!dependenciesChanged && savedFiscal?.cst) || '103',
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

    const enrichItems = async () => {
      try {
        const productIds = Array.from(
          new Set(productItems.map((item) => item.productId).filter((id): id is string => !!id))
        );
        const fiscalLookupKey = `${currentOrder.id}:${productIds.join(',')}`;
        let fiscalLookup = fiscalLookupRef.current;
        if (!fiscalLookup || fiscalLookup.key !== fiscalLookupKey) {
          const promise = withNfeEmissionStage(
            'fiscal_enrichment',
            () => getProductsFiscalData(productIds, { useCache: false }),
            { product_count: productIds.length }
          );
          fiscalLookup = { key: fiscalLookupKey, promise };
          fiscalLookupRef.current = fiscalLookup;
          void promise.catch(() => {
            if (fiscalLookupRef.current === fiscalLookup) fiscalLookupRef.current = null;
          });
        }
        const fiscalDataPromise = fiscalLookup.promise
          .then((productData) => {
            const missingItemNumbers = productItems.flatMap((item, index) =>
              item.productId && !productData.has(item.productId) ? [index + 1] : []
            );
            if (missingItemNumbers.length) {
              throw new MissingFiscalProductsError(missingItemNumbers, productData);
            }
            return productData;
          })
          .then(
            (productData) => ({
              productData,
              error: null as string | null,
            }),
            (error: unknown) => ({
              productData:
                error instanceof MissingFiscalProductsError
                  ? error.productData
                  : new Map<string, ProductFiscalData>(),
              error:
                error instanceof Error
                  ? error.message
                  : 'Falha ao consultar os dados fiscais atuais do catálogo.',
            })
          );

        const csosnPromise =
          environment === 2 && ['1', '2'].includes(operationScope.destination || '')
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

        const [fiscalDataResult, csosnResult] = await Promise.all([
          fiscalDataPromise,
          csosnPromise,
        ]);
        const catalogByProductId = fiscalDataResult.productData;
        const preparedCsosns = csosnResult.preparedCsosns;
        const preparationErrors = [fiscalDataResult.error, csosnResult.error].filter(
          (message): message is string => Boolean(message)
        );
        let preparationError = preparationErrors.length ? preparationErrors.join(' ') : null;
        const catalogResults = productItems.map((item) => {
          const product = item.productId ? catalogByProductId.get(item.productId) : undefined;
          const variation = item.variationId ? product?.variations?.[item.variationId] : undefined;
          return {
            item,
            catalogFiscal: {
              ncm: variation?.ncm || product?.ncm,
              cest: variation?.cest || product?.cest,
              cfop: variation?.cfop || product?.cfop,
              cst: variation?.cst || product?.cst,
              origem: variation?.origem || product?.origem,
              merchandiseOrigin: variation?.merchandiseOrigin || product?.merchandiseOrigin,
              isOwnProduction: variation?.isOwnProduction ?? product?.isOwnProduction,
              hasSt: variation?.hasSt ?? product?.hasSt,
              isSt: variation?.isSt ?? product?.isSt,
            },
          };
        });

        const enrichedList: NfeItemWithFiscal[] = [];
        for (const [index, { item, catalogFiscal }] of catalogResults.entries()) {
          const preparedCsosn = preparedCsosns.find((entry) => entry.itemNumber === index + 1);
          if (environment === 2 && !preparedCsosn && !preparationError) {
            preparationError = `CSOSN do item ${index + 1} não foi preparado no servidor.`;
          }
          const savedFiscal = item.fiscal;
          const sourceCfopDefinition = getCfopDefinition(
            catalogFiscal?.cfop || savedFiscal?.cfop || ''
          );
          enrichedList.push({
            ...fallbackItems[index],
            fiscal: {
              ncm: catalogFiscal?.ncm || savedFiscal?.ncm || fallbackItems[index].fiscal.ncm,
              cest: savedFiscal?.cest || catalogFiscal?.cest || fallbackItems[index].fiscal.cest,
              cfop:
                (!dependenciesChanged ? compatibleCfop(savedFiscal?.cfop) : '') ||
                (!dependenciesChanged ? compatibleCfop(catalogFiscal?.cfop) : '') ||
                (preparedCsosn?.cfop ? compatibleCfop(preparedCsosn.cfop) : '') ||
                suggestedInitialCfop ||
                fallbackItems[index].fiscal.cfop ||
                (operationScope.destination === '1' ? '5102' : '6102'),
              cst:
                preparedCsosn?.csosn ||
                (!dependenciesChanged && savedFiscal?.cst) ||
                catalogFiscal?.cst ||
                '103',
              csosnSource: preparedCsosn?.source,
              origem:
                savedFiscal?.origem || catalogFiscal?.origem || fallbackItems[index].fiscal.origem,
              merchandiseOrigin:
                savedFiscal?.merchandiseOrigin ||
                catalogFiscal?.merchandiseOrigin ||
                sourceCfopDefinition?.merchandiseOrigin,
              isOwnProduction:
                savedFiscal?.isOwnProduction ??
                catalogFiscal?.isOwnProduction ??
                sourceCfopDefinition?.isOwnProduction,
              hasSt:
                savedFiscal?.hasSt ??
                savedFiscal?.isSt ??
                catalogFiscal?.hasSt ??
                catalogFiscal?.isSt ??
                sourceCfopDefinition?.isSt,
              isSt:
                savedFiscal?.isSt ??
                catalogFiscal?.isSt ??
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
  }, [orderId, fiscalDependencySignature, environment, recipientIeIndicator, manualFiscalFields]);

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
