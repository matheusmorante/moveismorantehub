import { useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import type Order from '@/pages/types/order.type';
import { prepareHmlItemCsosns } from '@/pages/utils/nfe/csosnConfigurationService';
import { getFullProduct } from '@/pages/utils/productService';
import { getSettings } from '@/pages/utils/settingsService';
import type { NfeItemFiscal, NfeItemWithFiscal } from '../NfeItemsSection';
import { draftKey } from '../types/nfeEmission.types';

export interface UseNfeItemEnrichmentProps {
  order: Order | null;
  environment: 1 | 2;
  manualFiscalFields: React.MutableRefObject<Map<string, Record<number, Partial<NfeItemFiscal>>>>;
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

  const itemsSignature = (order?.items || [])
    .filter((item) => item.itemType !== 'service')
    .map(
      (item) =>
        `${item.orderItemId || ''}:${item.productId || ''}:${item.variationId || ''}:${item.fiscal?.ncm || ''}:${item.fiscal?.cst || ''}:${item.quantity || ''}`
    )
    .join('|');

  useEffect(() => {
    const currentOrder = orderRef.current;
    if (!currentOrder || !currentOrder.items) {
      setNfeItems([]);
      setIsLoadingFiscalData(false);
      setFiscalPreparationError(null);
      return;
    }

    const settings = getSettings();
    const defaultFiscal = settings.fiscalDefaults || {};

    let isMounted = true;
    setIsLoadingFiscalData(true);
    setFiscalPreparationError(null);

    const productItems = currentOrder.items.filter((item) => item.itemType !== 'service');
    const fallbackItems: NfeItemWithFiscal[] = productItems.map((item) => {
      const savedFiscal = item.fiscal;
      return {
        ...item,
        isUnregistered: !item.productId,
        fiscal: {
          ncm: savedFiscal?.ncm || '',
          cest: savedFiscal?.cest || '',
          cfop: savedFiscal?.cfop || defaultFiscal.cfop || '5102',
          cst: savedFiscal?.cst || defaultFiscal.cst || '103',
          origem: savedFiscal?.origem || defaultFiscal.origem || '0',
        },
      };
    });
    setNfeItems(fallbackItems);

    const enrichItems = async () => {
      try {
        let preparedCsosns: Awaited<ReturnType<typeof prepareHmlItemCsosns>> = [];
        let preparationError: string | null = null;
        if (environment === 2) {
          try {
            preparedCsosns = await prepareHmlItemCsosns(String(currentOrder.id));
          } catch (error) {
            preparationError =
              error instanceof Error ? error.message : 'Configuração fiscal indisponível.';
          }
        }

        const catalogPromises = productItems.map(async (item) => {
          if (!item.productId) return { item, catalogFiscal: undefined };
          try {
            const fullProd = await getFullProduct(item.productId);
            const variation = item.variationId
              ? fullProd?.variations?.find((candidate) => candidate.id === item.variationId)
              : undefined;
            const catalogFiscal = {
              ncm: variation?.fiscal?.ncm || fullProd?.fiscal?.ncm,
              cest: variation?.fiscal?.cest || fullProd?.fiscal?.cest,
              cfop: variation?.fiscal?.cfop || fullProd?.fiscal?.cfop,
              cst: variation?.fiscal?.cst || fullProd?.fiscal?.cst,
              origem: variation?.fiscal?.origem || fullProd?.fiscal?.origem,
            };
            return { item, catalogFiscal };
          } catch (err) {
            console.warn(
              `[useNfeItemEnrichment] Falha ao consultar catálogo do produto ${item.productId}:`,
              err
            );
            return { item, catalogFiscal: undefined };
          }
        });
        const catalogResults = await Promise.all(catalogPromises);

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
              cfop: savedFiscal?.cfop || catalogFiscal?.cfop || fallbackItems[index].fiscal.cfop,
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
        }

        if (isMounted) {
          setNfeItems(enrichedList);
          setFiscalPreparationError(preparationError);
          setIsLoadingFiscalData(false);
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
  }, [orderId, itemsSignature, environment]);

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
