import type Order from '../types/order.type';
import type FullAddress from '../types/fullAddress.type';

/** Resolve o endereço de destino selecionado no pedido de venda. */
export const getEffectiveOrderDeliveryAddress = (
  order: Pick<Order, 'customerData' | 'shipping'>
): FullAddress | undefined =>
  order.shipping?.useCustomerAddress === false
    ? order.shipping.deliveryAddress
    : order.customerData?.fullAddress;

/** Retorna apenas a URL manual da rota; endereço sem link não gera URL automaticamente. */
export const getEffectiveOrderDeliveryMapUrl = (
  order: Pick<Order, 'customerData' | 'shipping'>
): string => {
  if (order.shipping?.noAddress || order.shipping?.deliveryMethod === 'pickup') return '';

  const address = getEffectiveOrderDeliveryAddress(order) as
    | (FullAddress & { googleMapsUrl?: string; mapsLink?: string })
    | undefined;
  const value = address?.mapsUrl || address?.googleMapsUrl || address?.mapsLink || '';
  return value.trim();
};
