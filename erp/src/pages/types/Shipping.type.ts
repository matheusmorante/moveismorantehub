import FullAddress from './fullAddress.type';

type Shipping = {
  value: number;
  freightMode?: '0' | '1' | '2' | '3' | '4' | '9';
  transporter?: {
    cnpj?: string;
    cpf?: string;
    name: string;
    ie?: string;
    address?: string;
    city?: string;
    uf?: string;
  };
  distance?: number;
  durationMinutes?: number;
  deliveryMethod: 'delivery' | 'pickup';
  noAddress?: boolean;
  orderType: string;
  scheduling: {
    date: string;
    endDate?: string; // final do período se dateType for 'range'
    dateType?: 'fixed' | 'range';
    time: string; // legacy/display
    startTime?: string; // HH:mm
    endTime?: string; // HH:mm
    type: 'fixed' | 'range';
    notInformed?: boolean;
    pendingScheduling?: boolean;
    immediatePickup?: boolean;
  };
  destinationCoords?: [number, number]; // [lng, lat] (GeoJSON/MapLibre format)
  routeGeoJSON?: any; // GeoJSON geometry from routing API
  autoCalculateValue?: boolean;
  useCustomerAddress?: boolean;
  /** Indica se é necessário ligar para o cliente antes da entrega. */
  callBeforeDelivery?: boolean;
  /** Indica se a equipe deve levar máquina de cartão para a entrega. */
  bringCardMachine?: boolean;
  /** Indica se é necessário ligar para o cliente ao chegar no endereço. */
  callOnArrival?: boolean;
  /** Snapshot do endereço efetivamente usado quando o pedido foi salvo. */
  deliveryAddress?: FullAddress;
  deliveryResponsibles?: Array<{ id?: string; name: string; role?: string }>;
  deliveryResponsibleName?: string;
};

export default Shipping;
