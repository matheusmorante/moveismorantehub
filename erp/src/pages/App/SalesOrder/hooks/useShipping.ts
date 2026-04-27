import Shipping from "../../../types/Shipping.type";
import { useState } from "react";
import { getSettings } from '@/pages/utils/settingsService';

const useShipping = (initialDeliveryMethod: 'delivery' | 'pickup' = 'delivery') => {
    const settings = getSettings();
    const options = initialDeliveryMethod === 'delivery' ? settings.deliveryHandlingOptions : settings.pickupHandlingOptions;
    const defaultHandling = options.length > 0 ? options[0].label : '';

    const [shipping, setShipping] =
        useState<Shipping>(
            {
                value: 0,
                deliveryMethod: initialDeliveryMethod,
                orderType: defaultHandling,
                scheduling: {
                    date: "",
                    endDate: "",
                    dateType: "fixed",
                    time: "",
                    startTime: "",
                    endTime: "",
                    type: "range"
                },
                autoCalculateValue: false,
                useCustomerAddress: true,
                noAddress: false,
                deliveryAddress: {
                    cep: '',
                    street: '',
                    number: '',
                    complement: '',
                    observation: '',
                    neighborhood: '',
                    city: ''
                }
            }
        );

    return { shipping, setShipping }
};

export default useShipping