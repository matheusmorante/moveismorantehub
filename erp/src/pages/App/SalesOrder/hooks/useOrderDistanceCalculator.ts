import { useState, useRef, useCallback } from 'react';
import { toast } from 'react-toastify';
import { autoCalculateRouteDistance } from '../../../utils/maps';
import { calculateFreightByDistance } from '../../../utils/shippingPricing';
import Shipping from '../../../types/Shipping.type';
import CustomerData from '../../../types/customerData.type';

export function useOrderDistanceCalculator(
    shipping: Shipping,
    customerData: CustomerData,
    setShipping: React.Dispatch<React.SetStateAction<Shipping>>
) {
    const [isCalculatingDistance, setIsCalculatingDistance] = useState(false);
    const lastCalculatedAddressRef = useRef<string>("");

    const handleAutoCalculateDistance = useCallback(async (customAddress?: any) => {
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

        const currentAddrStr = `${addressObj.street || ''}, ${addressObj.number || ''}, ${addressObj.neighborhood || ''}, ${addressObj.city || ''}, ${addressObj.cep || ''}`;
        if (currentAddrStr.trim() === ", , , ," || (!addressObj.street && !addressObj.neighborhood && !addressObj.city && !addressObj.cep)) {
            toast.warn("Preencha ao menos a rua, bairro ou cidade para calcular a distância.");
            return;
        }

        setIsCalculatingDistance(true);
        try {
            const routeResult = await autoCalculateRouteDistance(addressObj);
            const distance = routeResult?.distanceKm;
            if (distance !== null && distance !== undefined && !isNaN(distance)) {
                lastCalculatedAddressRef.current = currentAddrStr;
                const calculatedFreight = calculateFreightByDistance(distance);
                setShipping(prev => ({
                    ...prev,
                    distance: distance,
                    value: calculatedFreight,
                    durationMinutes: routeResult?.durationMinutes,
                    destinationCoords: routeResult?.destinationCoords,
                    routeGeoJSON: routeResult?.routeGeoJSON,
                    autoCalculateValue: true
                }));
                toast.success(`Distância calculada: ${distance.toFixed(1)} km (Frete: R$ ${calculatedFreight.toFixed(2)})`);
            } else {
                toast.error("Não foi possível calcular a rota para o endereço informado.");
            }
        } catch (error) {
            console.error("Erro ao calcular distância:", error);
            toast.error("Erro ao calcular a distância da rota.");
        } finally {
            setIsCalculatingDistance(false);
        }
    }, [shipping.useCustomerAddress, shipping.deliveryAddress, customerData.fullAddress, setShipping]);

    return {
        isCalculatingDistance,
        lastCalculatedAddressRef,
        handleAutoCalculateDistance,
    };
}
