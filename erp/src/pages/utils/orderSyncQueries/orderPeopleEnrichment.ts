import Order from '../../types/order.type';
import { supabase } from '@/pages/utils/supabaseConfig';

export const isValidOrderRow = (row: any) =>
  row?.id != null &&
  ((row.order_data &&
    typeof row.order_data === 'object' &&
    !Array.isArray(row.order_data) &&
    Object.keys(row.order_data).length > 0) ||
    row.order_number != null ||
    row.status != null);

export const enrichOrdersWithPeopleOrigins = async (orders: Order[]): Promise<Order[]> => {
  if (!orders || orders.length === 0) return [];

  const customerIds = Array.from(new Set(orders.map((o) => o.customerData?.id).filter(Boolean)));
  const peopleOrigins: Record<string, string> = {};
  const peopleById: Record<string, { phone?: string; address?: unknown; full_address?: unknown }> =
    {};

  if (customerIds.length > 0) {
    try {
      const { data: peopleData } = await supabase
        .from('people')
        .select('id, full_name, marketing_origin, phone, address, full_address')
        .in('id', customerIds);

      if (peopleData) {
        peopleData.forEach((p: any) => {
          const origin = p.marketing_origin || '';
          if (p.id) peopleOrigins[String(p.id)] = origin;
          if (p.full_name) peopleOrigins[String(p.full_name).trim().toLowerCase()] = origin;
          if (p.id) peopleById[String(p.id)] = p;
        });
      }
    } catch (e) {
      console.error('[OrdersSync] Erro ao buscar origens escopadas de pessoas:', e);
    }
  }

  return orders.map((rawData) => {
    const cInfo = rawData.customerData;
    const person = cInfo?.id ? peopleById[String(cInfo.id)] : undefined;
    let legacyMarketingOrig: string | undefined = undefined;
    if (cInfo?.id && peopleOrigins[String(cInfo.id)]) {
      legacyMarketingOrig = peopleOrigins[String(cInfo.id)];
    } else if (cInfo?.fullName && peopleOrigins[String(cInfo.fullName).trim().toLowerCase()]) {
      legacyMarketingOrig = peopleOrigins[String(cInfo.fullName).trim().toLowerCase()];
    }

    if (legacyMarketingOrig === 'paid') {
      rawData.marketingOrigin = 'paid';
    } else if (
      legacyMarketingOrig &&
      (!rawData.marketingOrigin ||
        rawData.marketingOrigin === 'organic' ||
        rawData.marketingOrigin === 'Direto na Loja')
    ) {
      rawData.marketingOrigin = legacyMarketingOrig;
    }

    if (rawData.marketingOrigin === 'Direto na Loja') rawData.marketingOrigin = 'organic';
    if (rawData.marketingOrigin === 'Tráfego Pago') rawData.marketingOrigin = 'paid';

    // Pedidos históricos podem ter sido normalizados sem o snapshot de contato.
    // Recompomos somente lacunas a partir do cliente vinculado; dados já congelados
    // no pedido sempre prevalecem para preservar o histórico da venda.
    if (person && cInfo) {
      let personAddress: any = person.address ?? person.full_address;
      if (typeof personAddress === 'string') {
        try {
          personAddress = JSON.parse(personAddress);
        } catch {
          personAddress = undefined;
        }
      }

      const hasAddress = (value: any) =>
        Boolean(
          value &&
            typeof value === 'object' &&
            (String(value.street || value.address || '').trim() ||
              String(value.city || '').trim() ||
              String(value.cep || value.zipCode || '').trim())
        );
      const needsPhone =
        !cInfo.noPhone && !String(cInfo.phone || '').trim() && String(person.phone || '').trim();
      const needsAddress =
        !cInfo.noAddress && !hasAddress(cInfo.fullAddress) && hasAddress(personAddress);

      if (needsPhone || needsAddress) {
        rawData.customerData = {
          ...cInfo,
          ...(needsPhone ? { phone: String(person.phone).trim() } : {}),
          ...(needsAddress ? { fullAddress: personAddress } : {}),
        };

        if (
          rawData.shipping?.useCustomerAddress !== false &&
          needsAddress &&
          !hasAddress(rawData.shipping.deliveryAddress)
        ) {
          rawData.shipping = { ...rawData.shipping, deliveryAddress: personAddress };
        }
      }
    }

    return rawData;
  });
};
