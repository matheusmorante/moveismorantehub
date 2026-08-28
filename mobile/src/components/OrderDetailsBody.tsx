import React, { useEffect, useState } from 'react';
import { ScrollView } from 'react-native';
import { supabase } from '../services/supabaseClient';
import { getOrderTotalValue } from '../utils/orderUtils';
import { isAssemblyInternalType, isAssemblyOutsideType } from '../utils/aiSummaryHelper';
import { OrderDeliveryStartFooter } from './order-details/OrderDeliveryStartFooter';
import { buildOrderObservations, OrderObservationLabels } from './order-details/OrderObservationLabels';
import { AddressSection, CustomerSection, ItemsSection, OrderTypeBadges } from './order-details/OrderDetailsSections';
import { getPendingPaymentTotal, OrderPaymentSection } from './order-details/OrderPaymentSection';

interface Props { order: any; isDarkMode: boolean; onStartDelivery?: () => void; canStartDelivery: boolean }

export function OrderDetailsBody({ order, isDarkMode, onStartDelivery, canStartDelivery }: Props) {
  const [handlingOptions, setHandlingOptions] = useState<any[]>([]);
  useEffect(() => {
    supabase.from('settings').select('*').limit(1).then(({ data }) => {
      const settings = data?.[0]?.data || data?.[0] || {};
      setHandlingOptions([...(settings.deliveryHandlingOptions || []), ...(settings.pickupHandlingOptions || [])]);
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
  const assistance = String(order.order_type || data.orderType || '').toLowerCase() === 'assistance';
  const handling = String(data.handlingType || data.handling || data.deliveryType || shipping.handlingType || shipping.handling || order.handling || '');
  const outside = isAssemblyOutsideType(handling, handlingOptions) || items.some((item: any) => isAssemblyOutsideType(String(item.handlingType || item.handling || ''), handlingOptions));
  const internal = isAssemblyInternalType(handling, handlingOptions) || items.some((item: any) => isAssemblyInternalType(String(item.handlingType || item.handling || ''), handlingOptions));

  return <ScrollView style={{ flex: 1, paddingHorizontal: 16, paddingTop: 16 }} contentContainerStyle={{ gap: 16, paddingBottom: 160 }}>
    <OrderTypeBadges assistance={assistance} pickup={pickup} internal={internal} outside={outside} />
    <OrderObservationLabels observations={buildOrderObservations(order)} dark={isDarkMode} />
    <CustomerSection customer={customer} dark={isDarkMode} />
    <AddressSection shipping={shipping} customer={customer} schedule={schedule} order={order} dark={isDarkMode} />
    <ItemsSection items={items} total={getOrderTotalValue(order)} pendingTotal={getPendingPaymentTotal(payments)} dark={isDarkMode} />
    <OrderPaymentSection payments={payments} fallbackMethod={data.paymentMethod || data.payment_method} dark={isDarkMode} />
    <OrderDeliveryStartFooter order={order} onStart={onStartDelivery} allowed={canStartDelivery} />
  </ScrollView>;
}
