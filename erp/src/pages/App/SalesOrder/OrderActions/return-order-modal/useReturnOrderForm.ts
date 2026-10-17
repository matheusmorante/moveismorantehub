import { useState, useRef } from 'react';
import { toast } from 'react-toastify';
import type { Item } from '../../../../types/items.type';
import type Order from '../../../../types/order.type';
import type Shipping from '../../../../types/Shipping.type';
import {
  automaticallyTransmitReturnFiscalDocuments,
  getAutomaticReturnFiscalEmissionNotice,
} from '../../../FiscalDocuments/services/automaticReturnFiscalEmissionService';
import {
  type AvailableInvoiceLine,
  allocateReturnQuantityAcrossInvoices,
} from '../../../../utils/nfe/invoiceLineSnapshot';
import { formatOrderCode } from '../../../../utils/orderCode';
import { saveOrder } from '../../../../utils/orderHistoryService';
import { getReturnLineKey, type ReturnQuantityRecord } from '../../../../utils/returnQuantityRules';
import { type ReturnFormTab } from '../components/ReturnFormTabs';
import { isIdentifiedTestArtifact } from '../../../../../../../shared-utils/testArtifactPolicy';
import { createLinkedReturnFormSchema } from '../../../../../../../shared-utils/returnFormSchemas';
import { flattenFormErrors, useZodForm } from '@/hooks/useZodForm';
import { EMPTY_SCHEDULING } from './types';

const startAutomaticReturnFiscalTransmission = (returnOrderId: string) => {
  void automaticallyTransmitReturnFiscalDocuments(returnOrderId)
    .then((result) => {
      const notice = getAutomaticReturnFiscalEmissionNotice(result);
      if (notice) toast[notice.tone](notice.message);
    })
    .catch((error: unknown) => {
      console.error('Pedido de devolução salvo; emissão fiscal automática pendente:', error);
      toast.warning(
        'O pedido de devolução foi registrado. A transmissão automática da NF-e precisa ser retomada na área fiscal.'
      );
    });
};

interface UseReturnOrderFormParams {
  order: Order;
  returnableQuantities: Record<string, number>;
  returnsLoaded: boolean;
  returnDataError: string | null;
  fiscalCapacityLines: AvailableInvoiceLine[];
  fiscalCapacityLoaded: boolean;
  fiscalCapacityError: string | null;
  hasAuthorizedInvoice: boolean;
  priorReturnsRef: React.MutableRefObject<ReturnQuantityRecord[]>;
  onSuccess: (id: string) => void;
}

export const useReturnOrderForm = ({
  order,
  returnableQuantities,
  returnsLoaded,
  returnDataError,
  fiscalCapacityLines,
  fiscalCapacityLoaded,
  fiscalCapacityError,
  hasAuthorizedInvoice,
  priorReturnsRef,
  onSuccess,
}: UseReturnOrderFormParams) => {
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [returnUnitPrices, setReturnUnitPrices] = useState<Record<string, number>>({});
  const [collectAtAddress, setCollectAtAddress] = useState<boolean | null>(null);
  const [scheduling, setScheduling] = useState<Shipping['scheduling']>(EMPTY_SCHEDULING);
  const [observations, setObservations] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<ReturnFormTab>('items');
  const [returnRequestId] = useState(() => crypto.randomUUID());
  const submittingRef = useRef(false);

  const form = useZodForm(
    createLinkedReturnFormSchema(order.items, priorReturnsRef.current),
    { items: [], collectAtAddress: false, scheduling, observations }
  );

  const selectedTotal = order.items.reduce((total, item, index) => {
    const itemId = getReturnLineKey(item, index);
    const qty = quantities[itemId] || 0;
    const unitPrice =
      returnUnitPrices[itemId] !== undefined ? returnUnitPrices[itemId] : item.unitPrice;
    return total + qty * unitPrice;
  }, 0);

  const toggleItem = (id: string, max: number, defaultUnitPrice: number) => {
    setQuantities((current) => {
      if (current[id] !== undefined) {
        const next = { ...current };
        delete next[id];
        return next;
      }
      return { ...current, [id]: max };
    });
    setReturnUnitPrices((current) => {
      if (current[id] !== undefined) {
        const next = { ...current };
        delete next[id];
        return next;
      }
      return { ...current, [id]: defaultUnitPrice };
    });
  };

  const updateQuantity = (id: string, quantity: number) =>
    setQuantities((current) => ({ ...current, [id]: quantity }));

  const updateUnitPrice = (id: string, unitPrice: number) =>
    setReturnUnitPrices((current) => ({ ...current, [id]: unitPrice }));

  const generateReturn = async () => {
    if (submittingRef.current) return;
    if (returnDataError) return toast.error(returnDataError);
    if (!returnsLoaded || !fiscalCapacityLoaded)
      return toast.warning('Aguarde a conferência do saldo devolvível.');
    if (hasAuthorizedInvoice && fiscalCapacityError)
      return toast.error(`Não foi possível validar a NF-e de origem: ${fiscalCapacityError}`);
    if (!Object.keys(quantities).length)
      return toast.warning('Selecione pelo menos um item para devolver.');
    if (
      order.items.some(
        (item, index) =>
          (quantities[getReturnLineKey(item, index)] || 0) >
          (returnableQuantities[getReturnLineKey(item, index)] || 0)
      )
    ) {
      return toast.error('Uma quantidade excede o saldo ainda disponível para devolução.');
    }
    if (collectAtAddress === null)
      return toast.warning(
        'Informe se a devolução foi entregue na loja ou se será coletada no endereço.'
      );

    const items = order.items.reduce<Item[]>((selected, item) => {
      const originalOrderItemIndex = order.items.indexOf(item);
      const itemId = getReturnLineKey(item, originalOrderItemIndex);
      const quantity = quantities[itemId];
      if (quantity === undefined) return selected;

      const returnedUnitPrice =
        returnUnitPrices[itemId] !== undefined ? returnUnitPrices[itemId] : item.unitPrice;
      const returnedTotalValue = quantity * returnedUnitPrice;
      const originalUnitPrice = item.unitPrice;
      const originalTotalValue = quantity * originalUnitPrice;

      selected.push({
        ...item,
        quantity,
        originalOrderItemIndex,
        returnedQuantity: quantity,
        unitPrice: returnedUnitPrice,
        returnedUnitPrice,
        returnedTotalValue,
        originalUnitPrice,
        originalTotalValue,
      });
      return selected;
    }, []);

    await form.validateAndRun(
      {
        items,
        collectAtAddress,
        scheduling: collectAtAddress ? scheduling : EMPTY_SCHEDULING,
        observations,
      },
      async (validatedValues) => {
        const validatedItems = validatedValues.items as Item[];
        const total = validatedItems.reduce(
          (sum, item) => sum + (item.returnedTotalValue ?? item.quantity * item.unitPrice),
          0
        );
        let fiscalAllocations: Order['fiscalReturnAllocations'] = [];
        if (hasAuthorizedInvoice) {
          try {
            fiscalAllocations = allocateReturnQuantityAcrossInvoices(
              validatedItems.map((item, returnItemIndex) => ({
                returnItemIndex,
                originalOrderItemIndex: Number(item.originalOrderItemIndex),
                productId: item.productId,
                code: item.code,
                description: item.description,
                quantity: Number(item.returnedQuantity || item.quantity),
              })),
              fiscalCapacityLines
            );
          } catch (error: any) {
            return toast.error(
              error.message || 'Não foi possível vincular todos os itens às NF-e autorizadas.'
            );
          }
        }
        const originalSoldTotal = validatedItems.reduce(
          (sum, item) =>
            sum +
            (item.originalTotalValue ?? item.quantity * (item.originalUnitPrice ?? item.unitPrice)),
          0
        );
        const isCompleteReturn = order.items.every(
          (item, index) =>
            (validatedItems.find((selected) => selected.originalOrderItemIndex === index)?.quantity || 0) >=
            (returnableQuantities[getReturnLineKey(item, index)] || 0)
        );

        const returnOrder: Order = {
          ...order,
          id: undefined,
          orderIndex: undefined,
          orderNumber: undefined,
          orderType: 'return',
          status: validatedValues.collectAtAddress ? 'scheduled' : 'fulfilled',
          returnMethod: validatedValues.collectAtAddress ? 'store_collection' : 'store_delivery',
          returnStockProcessed: false,
          date: new Date().toISOString(),
          items: validatedItems,
          linkedOrderId: order.id,
          returnRequestId,
          fiscalReturnAllocations: fiscalAllocations,
          linkedOrderCode: formatOrderCode(order),
          returnedTotalAmount: total,
          originalSoldTotal: originalSoldTotal,
          returnKind: isCompleteReturn ? 'complete' : 'partial',
          observation: `Devolução vinculada ao pedido #${formatOrderCode(order)}. ${order.observation || ''}`,
          collectionObservation: validatedValues.collectAtAddress
            ? validatedValues.observations.join('\n')
            : undefined,
          itemsSummary: {
            totalQuantity: validatedItems.reduce((sum, item) => sum + item.quantity, 0),
            itemsSubtotal: total,
            totalFixedDiscount: 0,
            itemsTotalValue: total,
            totalItemsCost: validatedItems.reduce(
              (sum, item) => sum + item.quantity * (item.costPrice || 0),
              0
            ),
          },
          shipping: {
            ...order.shipping,
            deliveryMethod: validatedValues.collectAtAddress ? order.shipping.deliveryMethod : 'pickup',
            scheduling: validatedValues.scheduling,
          },
          payments: [],
          paymentsSummary: {
            totalPaymentsFee: 0,
            totalOrderValue: total,
            totalPaid: 0,
            totalAmountPaid: 0,
            amountRemaining: total,
          },
        };

        submittingRef.current = true;
        setSubmitting(true);
        try {
          const id = await saveOrder(returnOrder);
          toast.success('Pedido de devolução gerado com sucesso!');
          if (
            !validatedValues.collectAtAddress &&
            hasAuthorizedInvoice &&
            !isIdentifiedTestArtifact(returnOrder)
          ) {
            startAutomaticReturnFiscalTransmission(id);
          }
          onSuccess(id);
        } catch (error: unknown) {
          console.error('Erro ao gerar devolução:', error);
          toast.error('Erro ao processar devolução.');
        } finally {
          submittingRef.current = false;
          setSubmitting(false);
        }
      },
      (errors) => toast.error(Object.values(flattenFormErrors(errors))[0])
    );
  };

  return {
    quantities,
    returnUnitPrices,
    collectAtAddress,
    setCollectAtAddress,
    scheduling,
    setScheduling,
    observations,
    setObservations,
    submitting,
    activeTab,
    setActiveTab,
    selectedTotal,
    toggleItem,
    updateQuantity,
    updateUnitPrice,
    generateReturn,
  };
};
