import { useState, useRef, useCallback, useEffect } from 'react';
import { toast } from 'react-toastify';
import { autoCalculateRouteDistance, type RouteResult } from '@/pages/utils/maps';
import { calculateFreightByDistance } from '@/pages/utils/shippingPricing';
import Shipping from '@/pages/types/Shipping.type';
import CustomerData from '@/pages/types/customerData.type';
import { flattenFormErrors, useZodForm } from '@/hooks/useZodForm';
import { routeAddressFormSchema, routeDistanceResultSchema } from '../../../../../../shared-utils/routeFormSchemas';
import { withTimeout } from '../../../../../../shared-utils/withTimeout';
import type { z } from 'zod';

const getAddressKey = (input: unknown) => {
  const address = input && typeof input === 'object' ? input as Record<string, unknown> : {};
  return JSON.stringify([
    ...['street', 'number', 'city', 'state', 'mapsUrl', 'googleMapsUrl', 'mapsLink', 'placeId']
      .map((field) => typeof address[field] === 'string' ? address[field].trim().toLocaleLowerCase() : ''),
    Array.isArray(address.coords) && address.coords.every((value) => typeof value === 'number') ? address.coords : null,
  ]);
};
type Lookup = { key: string; request: Promise<RouteResult | null>; reason: { current: string } };

export function useOrderDistanceCalculator(
  shipping: Shipping,
  customerData: CustomerData,
  setShipping: React.Dispatch<React.SetStateAction<Shipping>>,
) {
  const [isCalculatingDistance, setIsCalculatingDistance] = useState(false);
  const lastCalculatedAddressRef = useRef('');
  const lookupRef = useRef<Lookup | null>(null);
  const requestIdRef = useRef(0);
  const initialAddress = shipping.useCustomerAddress === false ? shipping.deliveryAddress : customerData.fullAddress;
  const { validateValues } = useZodForm(routeAddressFormSchema, (initialAddress || {}) as z.input<typeof routeAddressFormSchema>);
  const sourceKey = getAddressKey(initialAddress);
  const previousSourceKeyRef = useRef(sourceKey);
  const requestedKeyRef = useRef('');
  useEffect(() => {
    if (previousSourceKeyRef.current === sourceKey) return;
    previousSourceKeyRef.current = sourceKey;
    if (requestedKeyRef.current !== sourceKey) {
      requestIdRef.current += 1;
      setIsCalculatingDistance(false);
    }
  }, [sourceKey]);
  useEffect(() => () => { requestIdRef.current += 1; }, []);
  const cancelPendingDistanceCalculation = useCallback(() => {
    requestIdRef.current += 1;
    requestedKeyRef.current = '';
    lastCalculatedAddressRef.current = '';
    setIsCalculatingDistance(false);
  }, []);

  const handleAutoCalculateDistance = useCallback(
    async (customAddress?: unknown, options: { silentSuccess?: boolean } = {}) => {
      const requestId = ++requestIdRef.current;
      const input = customAddress || (shipping.useCustomerAddress === false ? shipping.deliveryAddress : customerData.fullAddress);
      requestedKeyRef.current = getAddressKey(input);
      const address = await validateValues((input || {}) as z.input<typeof routeAddressFormSchema>, (errors) => {
        if (requestId === requestIdRef.current) toast.warn(Object.values(flattenFormErrors(errors))[0]);
      });
      if (requestId !== requestIdRef.current) return;
      if (!address) { setIsCalculatingDistance(false); return; }
      if (!customAddress && shipping.useCustomerAddress === false && !address.street && !address.cep &&
        !address.coords && !address.mapsUrl && !address.googleMapsUrl && !address.mapsLink && !address.placeId) {
        setIsCalculatingDistance(false);
        toast.warn('Preencha o endereço de entrega para calcular a distância.');
        return;
      }
      const addressKey = getAddressKey(address);
      if (lastCalculatedAddressRef.current === addressKey) { setIsCalculatingDistance(false); return; }
      setIsCalculatingDistance(true);
      let lookup: Lookup | null = null;
      try {
        lookup = lookupRef.current?.key === addressKey ? lookupRef.current : null;
        if (!lookup) {
          const reason = { current: '' };
          lookup = { key: addressKey, reason, request: autoCalculateRouteDistance(address, (message) => { reason.current = message; }) };
          lookupRef.current = lookup;
        }
        const result = await withTimeout(lookup.request, 15_000, null, 'pedido:calcular-distancia');
        if (requestId !== requestIdRef.current) return;
        const parsed = routeDistanceResultSchema.safeParse(result);
        if (!parsed.success) {
          const reason = lookup.reason.current;
          const isQuota = /quota|limit|over_query_limit|over_daily_limit|resource_exhausted|bloquead|cota/i.test(reason);
          const isNotFound = /não encontrou|zero_results|not_found|recusou/i.test(reason);

          if (isQuota) {
            toast.warn('Cota do Google Maps esgotada. Informe a distância manualmente.');
          } else if (isNotFound) {
            toast.warn('Endereço não localizado no mapa. Informe a distância manualmente.');
          } else {
            toast.warn('Não foi possível calcular a rota. Informe a distância manualmente.');
          }
          return;
        }
        const route = parsed.data;
        const freight = calculateFreightByDistance(route.distanceKm);
        if (!Number.isFinite(freight) || freight < 0) {
          toast.warn('Cálculo de frete inválido. Informe o valor manualmente.');
          return;
        }
        lastCalculatedAddressRef.current = addressKey;
        setShipping((previous) => ({ ...previous, distance: route.distanceKm, autoCalculateValue: true,
          durationMinutes: route.durationMinutes, destinationCoords: route.destinationCoords,
          routeGeoJSON: route.routeGeoJSON, value: freight,
        }));
        if (!options.silentSuccess) toast.success('Distância calculada: ' + route.distanceKm.toFixed(1) + ' km (Frete: R$ ' + freight.toFixed(2) + ')');
      } catch {
        if (requestId === requestIdRef.current) {
          toast.warn('Não foi possível calcular a rota. Informe a distância manualmente.');
        }
      } finally {
        if (lookup && lookupRef.current === lookup) lookupRef.current = null;
        if (requestId === requestIdRef.current) setIsCalculatingDistance(false);
      }
    },
    [shipping.useCustomerAddress, shipping.deliveryAddress, customerData.fullAddress, setShipping, validateValues],
  );
  return { isCalculatingDistance, lastCalculatedAddressRef, handleAutoCalculateDistance, cancelPendingDistanceCalculation };
}
