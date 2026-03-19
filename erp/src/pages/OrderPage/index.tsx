import CustomerData from "./CustomerData";
import ItemsTable from "./ItemsTable";
import PaymentsTable from "./PaymentsTable";
import ShippingData from "./ShippingData";
import MapRoute from "../App/SalesOrder/ShippingComponents/MapRoute";
import { useEffect, useRef } from "react";
import { stringifyFullAddress, formatToBRDate } from "../utils/formatters";

const OrderPage = () => {
    const storedOrder = sessionStorage.getItem('order');
    const order = storedOrder ? JSON.parse(storedOrder) : null;
    const printCalled = useRef(false);

    const handleMapReady = () => {
        if (printCalled.current) return;
        printCalled.current = true;
        // Small delay to ensure image renders in DOM before print
        setTimeout(() => window.print(), 300);
    };

    const isDeliveryOrder = !!order?.shipping && order.shipping.deliveryMethod !== 'pickup';
    const hasMapData = isDeliveryOrder && (order.shipping.routeGeoJSON || order.shipping.destinationCoords);

    useEffect(() => {
        // If no map to render, print immediately
        if (!hasMapData) {
            const timer = setTimeout(() => window.print(), 300);
            return () => clearTimeout(timer);
        }
        // Otherwise, print is triggered by handleMapReady
    }, []);


    return (
        <div className="flex flex-col gap-4 text-slate-900 dark:text-slate-100 [&_tr_th]:bg-slate-200 dark:[&_tr_th]:bg-slate-800 
            [&_input]:px-2 [&_input]:bg-white dark:[&_input]:bg-slate-900 transition-colors duration-300">
            <div className="flex justify-between font-black uppercase tracking-widest text-[10px] text-slate-500">
                <div>Vendedor: <span className="text-slate-900 dark:text-slate-100">{order.seller}</span></div>
                <div>Data de emissão: <span className="text-slate-900 dark:text-slate-100">{formatToBRDate(order.date)}</span></div>
            </div>
            <div>
                <h1 className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2">OBSERVAÇÕES SOBRE A ENTREGA</h1>
                <div className="min-h-[50px] border-2 border-red-500/50 dark:border-red-900/50 p-4 rounded-2xl bg-red-50/30 dark:bg-red-900/10 text-sm flex flex-wrap gap-2 items-start">
                    {order.observation ? order.observation.split(';').filter((t: string) => t.trim() !== "").map((tag: string, i: number) => (
                        <span key={i} className="px-3 py-1 bg-red-100 dark:bg-red-900/40 text-[12px] font-bold rounded-lg border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 capitalize">
                            {tag}
                        </span>
                    )) : ""}
                </div>
            </div>
            <CustomerData customerData={order.customerData} isPickup={order.shipping?.deliveryMethod === 'pickup'} />
            <ItemsTable items={order.items} summary={order.itemsSummary} />

            {/* Route Map — only for delivery orders with route data */}
            {isDeliveryOrder && order.shipping?.destinationCoords && (
                <div className="w-full h-80 my-4 border border-slate-200 rounded-3xl overflow-hidden">
                    <MapRoute
                        destinationCoords={order.shipping.destinationCoords}
                        routeGeoJSON={order.shipping.routeGeoJSON}
                        onIdle={handleMapReady}
                    />
                </div>
            )}

            <div className="flex flex-row justify-around gap-6">
                <ShippingData shipping={order.shipping} />

                <PaymentsTable
                    payments={order.payments}
                    summary={order.paymentsSummary}
                />

            </div>
        </div>
    )
};

export default OrderPage;
