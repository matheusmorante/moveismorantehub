import Order from "../types/order.type";

/**
 * Mantém no pedido uma cópia independente do endereço usado na entrega.
 * Assim, alterações futuras no cadastro do cliente não mudam pedidos antigos.
 */
export const withOrderAddressSnapshot = (order: Order): Order => {
    const shipping = order.shipping;
    const usesCustomerAddress = shipping.useCustomerAddress !== false;
    const noAddress = Boolean(
        shipping.noAddress || (usesCustomerAddress && order.customerData?.noAddress)
    );

    const selectedAddress = usesCustomerAddress
        ? order.customerData?.fullAddress
        : shipping.deliveryAddress;

    return {
        ...order,
        customerData: {
            ...order.customerData,
            fullAddress: { ...order.customerData.fullAddress },
        },
        shipping: {
            ...shipping,
            noAddress,
            deliveryAddress: noAddress || !selectedAddress
                ? undefined
                : { ...selectedAddress },
        },
    };
};
