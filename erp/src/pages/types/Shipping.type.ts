type Shipping = {
    value: number,
    distance?: number,
    deliveryMethod: 'delivery' | 'pickup',
    orderType: string,
    scheduling: {
        date: string,
        time: string, // legacy/display
        startTime?: string, // HH:mm
        endTime?: string,   // HH:mm
        type: 'fixed' | 'range'
    },
    destinationCoords?: [number, number], // [lng, lat] (GeoJSON/MapLibre format)
    routeGeoJSON?: any, // GeoJSON geometry from routing API
    autoCalculateValue?: boolean,
    useCustomerAddress?: boolean,
    deliveryAddress?: {
        cep: string,
        street: string,
        number: string,
        complement: string,
        observation: string,
        neighborhood: string,
        city: string,
        state?: string
    }
};

export default Shipping;