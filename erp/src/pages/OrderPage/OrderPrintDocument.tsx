import React from 'react';
import CustomerData from './CustomerData';
import ItemsTable from './ItemsTable';
import PaymentsTable from './PaymentsTable';
import ShippingData from './ShippingData';
import OrderHeader from './OrderHeader';
import OrderSubHeader from './OrderSubHeader';
import OrderOperationalNotices from './OrderOperationalNotices';
import BudgetPaymentConditions from './BudgetPaymentConditions';
import BudgetTermsAndConditions from './BudgetTermsAndConditions';
import OrderPrintStyles from './OrderPrintStyles';
import { splitNoticeTags } from '../utils/noticeTags';
import Order from '@/pages/types/order.type';
import {
  getEffectiveOrderDeliveryAddress,
  getEffectiveOrderDeliveryMapUrl,
} from '@/pages/utils/orderDeliveryAddress';
import { calcItemsSummary } from '@/pages/utils/calculations';

interface OrderPrintDocumentProps {
  order: Order;
  isBudget?: boolean;
  isOperationInfo?: boolean;
}

const scopeOrderToSelectedOperation = (order: Order): Order => {
  const context = order.operationContext;
  if (!context) return order;

  const shipping = order.shipping;
  const appointments = shipping.scheduling?.appointments || [];
  const operationIndex = context.operationNumber - 1;
  const appointment =
    appointments.find((entry) => entry.id === context.appointmentId) || appointments[operationIndex];
  if (!appointment) return order;

  const useCustomerAddress = appointment.useCustomerAddress ??
    (operationIndex === 0 ? shipping.useCustomerAddress !== false : true);
  const deliveryAddress = appointment.deliveryAddress ??
    (operationIndex === 0 && shipping.useCustomerAddress === false ? shipping.deliveryAddress : undefined);
  const items = Array.isArray(appointment.itemIds)
    ? order.items.flatMap((item) => {
        const itemId = item.orderItemId;
        if (!itemId || !appointment.itemIds.includes(itemId)) return [];
        const handling = appointment.itemHandlings?.[itemId];
        return [{
          ...item,
          quantity: appointment.itemQuantities?.[itemId] ?? item.quantity,
          ...(handling
            ? {
                handlingType: handling.handlingType,
                assemblyResponsible: handling.assemblyResponsible ?? item.assemblyResponsible,
              }
            : {}),
        }];
      })
    : order.items;

  return {
    ...order,
    items,
    shipping: {
      ...shipping,
      deliveryMethod: appointment.deliveryMethod ?? shipping.deliveryMethod,
      value: appointment.freightValue ?? (operationIndex === 0 ? shipping.value : 0),
      distance: appointment.distance ?? (operationIndex === 0 ? shipping.distance : undefined),
      durationMinutes: appointment.durationMinutes ??
        (operationIndex === 0 ? shipping.durationMinutes : undefined),
      useCustomerAddress,
      deliveryAddress,
      callBeforeDelivery: appointment.notices?.callBeforeDelivery ??
        (operationIndex === 0 ? shipping.callBeforeDelivery : undefined),
      bringCardMachine: appointment.notices?.bringCardMachine ??
        (operationIndex === 0 ? shipping.bringCardMachine : undefined),
      callOnArrival: appointment.notices?.callOnArrival ??
        (operationIndex === 0 ? shipping.callOnArrival : undefined),
      scheduling: {
        ...appointment.scheduling,
        appointments: [appointment],
      },
    },
  };
};

export const OrderPrintDocument: React.FC<OrderPrintDocumentProps> = ({
  order,
  isBudget = false,
  isOperationInfo = false,
}) => {
  const isSalesDocument = !isBudget && !isOperationInfo &&
    (order.orderType === 'sale' || order.orderType === 'showroom');
  const isLogisticsPrint = isSalesDocument || isOperationInfo;
  const documentOrder = isOperationInfo ? scopeOrderToSelectedOperation(order) : order;
  const allObs: string[] = [];
  if (!isLogisticsPrint && order?.observation) allObs.push(...splitNoticeTags(order.observation));
  if (!isLogisticsPrint && order?.shipping?.deliveryAddress?.observation) {
    allObs.push(...splitNoticeTags(order.shipping.deliveryAddress.observation));
  }
  const tagByNormalizedText = new Map<string, string>();
  allObs.forEach((tag) => {
    const normalized = tag.trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR');
    if (normalized && !tagByNormalizedText.has(normalized)) tagByNormalizedText.set(normalized, tag.trim());
  });
  const tags = [...tagByNormalizedText.values()];
  const printableCustomerData = {
    ...documentOrder.customerData,
    fullAddress: getEffectiveOrderDeliveryAddress(documentOrder) || {},
  };
  const addr = printableCustomerData.fullAddress || {};
  const hasAnyAddress = !!(addr.street || addr.neighborhood || addr.city);
  const showShippingColumn =
    !isBudget || hasAnyAddress || !!documentOrder.shipping?.distance || (documentOrder.shipping?.value ?? 0) > 0;

  const hasPayments = documentOrder?.payments && documentOrder.payments.length > 0;
  const isPickup = documentOrder.shipping?.deliveryMethod === 'pickup';
  const itemsSummary = isOperationInfo ? calcItemsSummary(documentOrder.items || []) : documentOrder.itemsSummary;

  return (
    <div className="flex flex-col gap-2 text-slate-900 bg-white min-h-screen px-4 py-2 font-sans transition-colors duration-300">
      <OrderHeader order={documentOrder} isBudget={isBudget} />
      {!isOperationInfo && !isSalesDocument && <OrderSubHeader seller={documentOrder.seller} isBudget={isBudget} />}
      {!isLogisticsPrint && <OrderOperationalNotices tags={tags} isBudget={isBudget} />}

      <CustomerData
        customerData={printableCustomerData}
        isPickup={isPickup}
        noAddress={documentOrder.shipping?.noAddress}
        isOperationInfo={isOperationInfo}
        hideAddress={isSalesDocument || isOperationInfo}
      />

      <div className={isOperationInfo ? 'mt-1' : 'mt-4'}>
        <div className="text-[11px] font-black uppercase tracking-widest text-slate-400 mb-2 ml-2 flex items-center gap-2">
          {isOperationInfo ? 'ITENS' : 'ESPECIFICAÇÕES DOS ITENS'}
        </div>
        <ItemsTable
          items={documentOrder.items}
          summary={itemsSummary}
          compact={isOperationInfo}
          deliveryMethod={isOperationInfo ? documentOrder.shipping?.deliveryMethod : undefined}
        />
      </div>

      <div
        className={`grid ${isSalesDocument || isOperationInfo ? 'grid-cols-1' : showShippingColumn ? 'grid-cols-2' : 'grid-cols-1'} gap-4 ${isOperationInfo ? 'mt-1 pt-0' : 'mt-6 pt-4'} ${isOperationInfo ? '' : 'border-t-2 border-slate-100'}`}
      >
        {showShippingColumn && (
          <div className="space-y-2">
            {!isBudget && (isSalesDocument || isOperationInfo || !isPickup) && (
              <div className="text-[11px] font-black uppercase tracking-widest text-slate-400 ml-2">
                {isSalesDocument || isOperationInfo ? 'LOGÍSTICA' : isPickup ? 'DETALHES DA RETIRADA' : 'DETALHES DA ENTREGA'}
              </div>
            )}
            <div className="bg-white rounded-3xl overflow-hidden">
              <ShippingData
                shipping={documentOrder.shipping}
                isBudget={isBudget}
                itemsTotalValue={documentOrder.itemsSummary?.itemsTotalValue}
                routeUrl={isBudget ? '' : getEffectiveOrderDeliveryMapUrl(documentOrder)}
                customerAddress={documentOrder.customerData?.fullAddress}
                isOperationInfo={isOperationInfo}
                isSalesDocument={isSalesDocument}
                operationNumber={documentOrder.operationContext?.operationNumber}
                legacyNoticeTags={splitNoticeTags(documentOrder.observation)}
              />
            </div>
          </div>
        )}

        {isBudget ? (
          <BudgetPaymentConditions />
        ) : (
          hasPayments && (
            <div className="space-y-2">
              <div className="text-[11px] font-black uppercase tracking-widest text-slate-400 ml-2">
                PAGAMENTOS
              </div>
              <div className="bg-white rounded-3xl overflow-hidden">
                <PaymentsTable
                  payments={documentOrder.payments}
                  summary={documentOrder.paymentsSummary}
                  plainStatus
                />
              </div>
            </div>
          )
        )}
      </div>

      {isBudget && <BudgetTermsAndConditions />}

      {!isOperationInfo && (
        <div className="mt-auto pt-8 pb-4 text-center">
          <p className="text-[10px] font-bold text-slate-300 uppercase tracking-[0.4em]">
            Móveis Morante - Qualidade e Confiança
          </p>
        </div>
      )}

      <OrderPrintStyles />
    </div>
  );
};

export default OrderPrintDocument;
