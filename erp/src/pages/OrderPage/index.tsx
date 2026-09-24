import { useEffect } from "react";
import OrderPrintDocument from "./OrderPrintDocument";

const OrderPage = () => {
    const storedOrder = sessionStorage.getItem('order');
    const order = storedOrder ? JSON.parse(storedOrder) : null;
    const queryParams = new URLSearchParams(window.location.search);
    const isBudget = queryParams.get('type') === 'budget' || order?.orderType === 'budget';
    const isSilent = queryParams.get('silent') === '1';

    const allObs: string[] = [];
    if (order?.observation) allObs.push(...splitNoticeTags(order.observation));
    if (order?.shipping?.deliveryAddress?.observation) {
        allObs.push(...splitNoticeTags(order.shipping.deliveryAddress.observation));
    }
    const tags = allObs.filter((t: string) => t.trim() !== "");

    const addr = order?.customerData?.fullAddress || {};
    const hasAnyAddress = !!(addr.street || addr.neighborhood || addr.city);
    // Hide shipping data column if budget AND no address OR any shipping value/distance info
    const showShippingColumn = !isBudget || 
                               hasAnyAddress || 
                               !!order.shipping?.distance || 
                               (order.shipping?.value ?? 0) > 0;

    const hasPayments = order?.payments && order.payments.length > 0;

    useEffect(() => {
        if (order && !isSilent) {
            const timer = setTimeout(() => window.print(), 500);
            return () => clearTimeout(timer);
        }
    }, [order, isSilent]);

    if (!order) return null;

    return <OrderPrintDocument order={order} isBudget={isBudget} />;
};

export default OrderPage;

