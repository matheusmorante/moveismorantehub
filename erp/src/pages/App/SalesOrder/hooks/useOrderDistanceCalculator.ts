import { useState, useRef, useCallback } from 'react';
import { toast } from 'react-toastify';
import { autoCalculateRouteDistance } from '@/pages/utils/maps';
import { calculateFreightByDistance } from '@/pages/utils/shippingPricing';
import Shipping from '@/pages/types/Shipping.type';
import CustomerData from '@/pages/types/customerData.type';

const getAddressKey = (address: any) => [address?.street, address?.number,
    address?.neighborhood, address?.city, address?.state, address?.cep,
    address?.mapsUrl, address?.googleMapsUrl, address?.mapsLink]
    .map(value => String(value || '').trim().toLocaleLowerCase()).join('|');

export function useOrderDistanceCalculator(
    shipping: Shipping,
    customerData: CustomerData,
    setShipping: React.Dispatch<React.SetStateAction<Shipping>>
) {
    const [isCalculatingDistance, setIsCalculatingDistance] = useState(false);
    const lastCalculatedAddressRef = useRef<string>("");
    const calculatingAddressRef = useRef<string>("");
    const requestIdRef = useRef(0);

    const handleAutoCalculateDistance = useCallback(async (customAddress?: any, options: { silentSuccess?: boolean } = {}) => {
        const addressObj = customAddress || (
            shipping.useCustomerAddress === false && shipping.deliveryAddress
                ? shipping.deliveryAddress
                : customerData.fullAddress
        );

        if (!shipping.useCustomerAddress && !customAddress && !shipping.deliveryAddress?.cep && !shipping.deliveryAddress?.street) {
            toast.warn("Preencha o endereço de entrega para calcular a distância.");
            return;
        }

        if (!addressObj) {
            toast.warn("Endereço não informado.");
            return;
        }

        if (!addressObj.street && !addressObj.neighborhood && !addressObj.city && !addressObj.cep &&
            !addressObj.mapsUrl && !addressObj.googleMapsUrl && !addressObj.mapsLink) {
            toast.warn("Preencha ao menos a rua, bairro ou cidade para calcular a distância.");
            return;
        }

        const addressKey = getAddressKey(addressObj);
        if (lastCalculatedAddressRef.current === addressKey) return;
        if (calculatingAddressRef.current === addressKey) return;
        calculatingAddressRef.current = addressKey;
        const requestId = ++requestIdRef.current;

        setIsCalculatingDistance(true);
        try {
            let failureReason = '';
            const routeResult = await autoCalculateRouteDistance(addressObj, reason => { failureReason = reason; });
            const distance = routeResult?.distanceKm;
            if (distance !== null && distance !== undefined && !isNaN(distance)) {
                if (requestId !== requestIdRef.current) return;
                lastCalculatedAddressRef.current = addressKey;
                const calculatedFreight = calculateFreightByDistance(distance);
                setShipping(prev => ({
                    ...prev,
                    distance,
                    autoCalculateValue: true,
                    durationMinutes: routeResult?.durationMinutes,
                    destinationCoords: routeResult?.destinationCoords,
                    routeGeoJSON: routeResult?.routeGeoJSON,
                    value: prev.autoCalculateValue === false ? prev.value : calculatedFreight,
                }));
                if (!options.silentSuccess) {
                    toast.success(`Distância calculada: ${distance.toFixed(1)} km (Frete: R$ ${calculatedFreight.toFixed(2)})`);
                }
            } else {
                const requiresManualDistance = /quota|limit|over_query_limit|over_daily_limit|bloquead|cota/i.test(failureReason);
                toast.warn(
                    requiresManualDistance
                        ? "Não foi possível calcular automaticamente. Consulte a distância manualmente e informe a distância e o valor do frete na aba Logística."
                        : "Não foi possível calcular a rota automaticamente. Confira o endereço ou informe a distância manualmente na aba Logística."
                );
            }
        } catch (error) {
            if (requestId !== requestIdRef.current) return;
            console.error("Erro ao calcular distância:", error);
            toast.warn("Não foi possível calcular a rota automaticamente. Consulte a distância manualmente e informe a distância e o valor do frete na aba Logística.");
        } finally {
            if (calculatingAddressRef.current === addressKey) calculatingAddressRef.current = "";
            if (requestId === requestIdRef.current) setIsCalculatingDistance(false);
        }
    }, [shipping.useCustomerAddress, shipping.deliveryAddress, customerData.fullAddress, setShipping]);

    return {
        isCalculatingDistance,
        lastCalculatedAddressRef,
        handleAutoCalculateDistance,
    };
}
