import { useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import type Order from '@/pages/types/order.type';
import { prepareHmlItemCsosns } from '@/pages/utils/nfe/csosnConfigurationService';
import {
  getProductsFiscalData,
  type ProductFiscalData,
} from '@/pages/utils/productService/productFiscalDataService';
import { getSettings } from '@/pages/utils/settingsService';
import {
  resolveFiscalCfopOrderScope,
  validateItemCfopMatch,
} from '../../../../../../../../shared-utils/fiscalCfopModel';
import { withNfeEmissionStage } from '../../../../../../../../src/telemetry/nfeEmissionPerformance';
import type { NfeItemFiscal, NfeItemWithFiscal } from '../NfeItemsSection';
import { draftKey } from '../types/nfeEmission.types';

export interface UseNfeItemEnrichmentProps {
  order: Order | null;
  environment: 1 | 2;
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

  const itemsSignature = (order?.items || [])
    .filter((item) => item.itemType !== 'service')
    .map(
      (item) =>
        `${item.orderItemId || ''}:${item.productId || ''}:${item.variationId || ''}:${item.fiscal?.ncm || ''}:${item.fiscal?.cfop || ''}:${item.fiscal?.cst || ''}:${item.quantity || ''}`
    )
    .join('|');
  const orderCustomerData = order?.customerData as unknown as
    | Record<string, unknown>
    | undefined;
  const operationLocationSignature = order
    ? [
        order.shipping?.deliveryMethod || '',
        order.shipping?.useCustomerAddress === false ? 'custom' : 'customer',
        JSON.stringify(order.shipping?.deliveryAddress || null),
        JSON.stringify((order.shipping as Record<string, unknown> | undefined)?.pickupAddress || null),
        JSON.stringify(orderCustomerData?.fullAddress || orderCustomerData?.address || null),
      ].join('|')
    : '';
  const previousCfopScopeRef = useRef<string | null>(null);

  useEffect(() => {
    const currentOrder = orderRef.current;
    if (!currentOrder || !currentOrder.items) {
      fiscalLookupRef.current = null;
      setNfeItems([]);
      setIsLoadingFiscalData(false);
      setFiscalPreparationError(null);
      return;
    }

    const settings = getSettings();
    const defaultFiscal = settings.fiscalDefaults || {};
    const shipping = (currentOrder.shipping as Record<string, unknown> | undefined) || {};
    const customerData = (currentOrder.customerData as Record<string, unknown> | undefined) || {};
    const operationScope = resolveFiscalCfopOrderScope({
      issuerUf: settings.companyUF,
      deliveryMethod: currentOrder.shipping?.deliveryMethod,
      shipping,
      customerAddress: customerData.fullAddress || customerData.address,
    });
    const scopeSignature = `${operationScope.destination || 'unknown'}:${operationScope.operationUf || ''}`;
    const scopeChanged =
      previousCfopScopeRef.current !== null && previousCfopScopeRef.current !== scopeSignature;
    previousCfopScopeRef.current = scopeSignature;
    const suggestedInitialCfop =
      environment === 2 && operationScope.destination === '1' ? '5102' : '';
    const compatibleCfop = (candidate: unknown): string => {
      if (typeof candidate !== 'string' || !candidate || !operationScope.destination) return '';
      return validateItemCfopMatch({
        cfop: candidate,
        destination: operationScope.destination,
        model: '55',
        direction: 'outbound',
        itemType: 'product',
        operationType: 'sale',
      }).valid
        ? candidate
        : '';
    };

    let isMounted = true;
    setIsLoadingFiscalData(true);
    setFiscalPreparationError(null);

    const productItems = currentOrder.items.filter((item) => item.itemType !== 'service');
    let invalidatedCfop = false;
    const fallbackItems: NfeItemWithFiscal[] = productItems.map((item) => {
      const savedFiscal = item.fiscal;
      const savedCfop = compatibleCfop(savedFiscal?.cfop);
      if (savedFiscal?.cfop && !savedCfop) invalidatedCfop = true;
      return {
        ...item,
        isUnregistered: !item.productId,
        fiscal: {
          ncm: savedFiscal?.ncm || '',
          cest: savedFiscal?.cest || '',
          cfop: savedCfop || suggestedInitialCfop,
          cst: savedFiscal?.cst || defaultFiscal.cst || '103',
          origem: savedFiscal?.origem || defaultFiscal.origem || '0',
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
        const fiscalDataPromise = fiscalLookup.promise.then((productData) => {
          const missingItemNumbers = productItems.flatMap((item, index) =>
            item.productId && !productData.has(item.productId) ? [index + 1] : []
          );
          if (missingItemNumbers.length) {
            throw new MissingFiscalProductsError(missingItemNumbers, productData);
          }
          return productData;
        }).then(
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
          environment === 2
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
                    error instanceof Error
                      ? error.message
                      : 'Configuração fiscal indisponível.',
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
          enrichedList.push({
            ...fallbackItems[index],
            fiscal: {
              ncm: catalogFiscal?.ncm || savedFiscal?.ncm || fallbackItems[index].fiscal.ncm,
              cest: savedFiscal?.cest || catalogFiscal?.cest || fallbackItems[index].fiscal.cest,
              cfop:
                compatibleCfop(savedFiscal?.cfop) ||
                compatibleCfop(catalogFiscal?.cfop) ||
                (operationScope.destination === '1' &&
                environment === 2 &&
                preparedCsosn?.cfop === '5102'
                  ? '5102'
                  : '') ||
                fallbackItems[index].fiscal.cfop,
              cst: preparedCsosn?.csosn || savedFiscal?.cst || catalogFiscal?.cst || '103',
              csosnSource: preparedCsosn?.source,
              origem:
                savedFiscal?.origem || catalogFiscal?.origem || fallbackItems[index].fiscal.origem,
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
          if (
            enrichedList[index].fiscal.cfop &&
            !compatibleCfop(enrichedList[index].fiscal.cfop)
          ) {
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
          if (preparationError) toast.error(preparationError);
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
  }, [orderId, itemsSignature, operationLocationSignature, environment, manualFiscalFields]);

  const handleUpdateItemFiscal = (index: number, updates: Partial<NfeItemFiscal>) => {
    if (order) {
      const key = draftKey(order, environment);
      const existing = manualFiscalFields.current.get(key) || {};
      manualFiscalFields.current.set(key, {
        ...existing,
        [index]: { ...existing[index], ...updates },
      });
    }
    setNfeItems((prev) =>
      prev.map((item, idx) => {
        if (idx !== index) return item;
        return {
          ...item,
          fiscal: {
            ...item.fiscal,
            ...updates,
            ...(updates.cst !== undefined ? { csosnSource: 'manual' } : {}),
          },
        };
      })
    );
  };

  const handleBatchUpdateItems = (updated: NfeItemWithFiscal[]) => {
    const key = order ? draftKey(order, environment) : '';
    const choices = { ...manualFiscalFields.current.get(key) };
    const resolved = updated.map((item, index) => {
      const changed = item.fiscal.cst !== nfeItems[index]?.fiscal.cst;
      const changedFields = Object.fromEntries(
        (['ncm', 'cfop', 'origem', 'cest', 'cst'] as const)
          .filter((field) => item.fiscal[field] !== nfeItems[index]?.fiscal[field])
          .map((field) => [field, item.fiscal[field]])
      );
      choices[index] = { ...choices[index], ...changedFields };
      return {
        ...item,
        fiscal: { ...item.fiscal, ...(changed ? { csosnSource: 'manual' as const } : {}) },
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
