import Shipping from "../../../types/Shipping.type";
import { useState } from "react";

const useShipping = (initialDeliveryMethod: 'delivery' | 'pickup' = 'delivery') => {
    const [shipping, setShipping] =
        useState<Shipping>(
            {
                value: 0,
                deliveryMethod: initialDeliveryMethod,
                orderType: '',
                scheduling: {
                    date: "",
                    endDate: "",
                    dateType: "fixed",
                    time: "",
                    startTime: "",
                    endTime: "",
                    type: "range"
                },
                autoCalculateValue: true,
                useCustomerAddress: true,
                noAddress: false,
                deliveryAddress: {
                    cep: '',
                    street: '',
                    number: '',
                    complement: '',
                    observation: '',
                    neighborhood: '',
                    city: '',
                    state: 'PR'
                }
            }
        );

    return { shipping, setShipping }
};

export default useShipping