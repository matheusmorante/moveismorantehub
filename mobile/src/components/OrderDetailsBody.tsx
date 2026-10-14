import React, { useEffect, useState } from 'react';
import { ScrollView } from 'react-native';
import { supabase } from '../services/supabaseClient';
import { getOrderTotalValue } from '../utils/orderUtils';
import { isAssemblyInternalType, isAssemblyOutsideType } from '../utils/aiSummaryHelper';
import { OrderDeliveryStartFooter } from './order-details/OrderDeliveryStartFooter';
import {
  buildOrderObservations,
  OrderObservationLabels,
} from './order-details/OrderObservationLabels';
import {
  AddressSection,
  CustomerSection,
  ItemsSection,
  OrderTypeBadges,
} from './order-details/OrderDetailsSections';
import { getPendingPaymentTotal, OrderPaymentSection } from './order-details/OrderPaymentSection';

interface Props {
  order: any;
  isDarkMode: boolean;
  onStartDelivery?: () => void;
  canStartDelivery?: boolean;
  onViewDelivery?: () => void;
}

export function OrderDetailsBody({
  order,
  isDarkMode,
  onStartDelivery,
  canStartDelivery = true,
  onViewDelivery,
}: Props) {
  const [handlingOptions, setHandlingOptions] = useState<any[]>([]);
  useEffect(() => {
    supabase
      .from('settings')
      .select('*')
      .limit(1)
      .then(({ data }) => {
        const settings = data?.[0]?.data || data?.[0] || {};
        setHandlingOptions([
          ...(settings.deliveryHandlingOptions || []),
          ...(settings.pickupHandlingOptions || []),
        ]);
      });
  }, []);
  if (!order) return null;

  const data = order.order_data || order;
  const customer = data.customerData || data.customer || {};
  const shipping = data.shipping || {};
  const items = data.items || order.items || data.assistanceItems || order.assistance_items || [];
  const schedule = shipping.scheduling || data.schedule || {};
  const payments = Array.isArray(data.payments) ? data.payments : [];
  const deliveryMethod = String(shipping.deliveryMethod || data.deliveryMethod || '').toLowerCase();
  const pickup = /pickup|retirada/.test(deliveryMethod);
  const assistance =
    String(order.order_type || data.orderType || '').toLowerCase() === 'assistance';
  const handling = String(
    data.handlingType ||
      data.handling ||
      data.deliveryType ||
      shipping.handlingType ||
      shipping.handling ||
      order.handling ||
      ''
  );
  const outside =
    isAssemblyOutsideType(handling, handlingOptions) ||
    items.some((item: any) =>
      isAssemblyOutsideType(String(item.handlingType || item.handling || ''), handlingOptions)
    );
  const internal =
    isAssemblyInternalType(handling, handlingOptions) ||
    items.some((item: any) =>
      isAssemblyInternalType(String(item.handlingType || item.handling || ''), handlingOptions)
    );

  const seller = data.seller || order.seller || data.sellerName || data.sellerData?.fullName;
  const totalValue = getOrderTotalValue(order);
  const itemsSummary = data.itemsSummary || order.items_summary || {};
  const shippingValue = Number(shipping.value || data.shippingValue || order.shipping_value || 0);
  const paymentsSummary = data.paymentsSummary || order.payments_summary || {};
  const totalPaid =
    paymentsSummary.totalAmountPaid != null ? Number(paymentsSummary.totalAmountPaid) : undefined;
  const amountRemaining =
    paymentsSummary.amountRemaining != null ? Number(paymentsSummary.amountRemaining) : undefined;

  const isReturn =
    String(order.order_type || data.orderType || '').toLowerCase() === 'return';

  return (
    <ScrollView
      style={{ flex: 1, paddingHorizontal: 16, paddingTop: 16 }}
      contentContainerStyle={{ gap: 16, paddingBottom: 160 }}
    >
      <OrderTypeBadges
        isReturn={isReturn}
        assistance={assistance}
        pickup={pickup}
        internal={internal}
        outside={outside}
      />

      <OrderObservationLabels observations={buildOrderObservations(order)} dark={isDarkMode} />
      <CustomerSection customer={customer} seller={seller} dark={isDarkMode} />
      <AddressSection
        shipping={shipping}
        customer={customer}
        schedule={schedule}
        order={order}
        isPickup={pickup}
        dark={isDarkMode}
      />
      <ItemsSection
        items={items}
        handlingOptions={handlingOptions}
        itemsSummary={itemsSummary}
        shippingValue={shippingValue}
        total={totalValue}
        dark={isDarkMode}
      />
      <OrderPaymentSection
        payments={payments}
        fallbackMethod={data.paymentMethod || data.payment_method}
        totalPaid={totalPaid}
        amountRemaining={amountRemaining}
        totalOrderValue={totalValue}
        dark={isDarkMode}
      />
      <OrderDeliveryStartFooter
        order={order}
        onStart={onStartDelivery}
        onViewDelivery={onViewDelivery}
        allowed={canStartDelivery}
      />
    </ScrollView>
  );
}
