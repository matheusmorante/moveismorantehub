type Shipping = {
    value: number,
    distance?: number,
    durationMinutes?: number,
    deliveryMethod: 'delivery' | 'pickup',
    noAddress?: boolean,
    orderType: string,
    scheduling: {
        date: string,
        endDate?: string,   // final do período se dateType for 'range'
        dateType?: 'fixed' | 'range',
        time: string, // legacy/display
        startTime?: string, // HH:mm
        endTime?: string,   // HH:mm
        type: 'fixed' | 'range',
        notInformed?: boolean
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
        state?: string,
        housingType?: string
    }
};

export default Shipping;