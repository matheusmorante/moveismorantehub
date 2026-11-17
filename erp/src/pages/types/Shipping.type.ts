import FullAddress from './fullAddress.type';

type Scheduling = {
  date: string;
  endDate?: string;
  dateType?: 'fixed' | 'range';
  time: string;
  startTime?: string;
  endTime?: string;
  type: 'fixed' | 'range';
  notInformed?: boolean;
  pendingScheduling?: boolean;
  immediatePickup?: boolean;
  alternatives?: Array<{
    id: string;
    date: string;
    endDate?: string;
    dateType?: 'fixed' | 'range';
    time: string;
    startTime?: string;
    endTime?: string;
    type: 'fixed' | 'range';
  }>;
  scheduleMode?: 'defined' | 'alternatives';
};

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
  scheduling: Scheduling & {
    appointments?: Array<{
      id: string;
      itemIds: string[];
      itemQuantities?: Record<string, number>;
      deliveryMethod?: 'delivery' | 'pickup';
      /** Quando falso, a operação usa o endereço alternativo salvo abaixo. */
      useCustomerAddress?: boolean;
      deliveryAddress?: FullAddress;
      freightValue?: number;
      distance?: number;
      durationMinutes?: number;
      destinationCoords?: [number, number];
      routeGeoJSON?: any;
      itemHandlings?: Record<string, {
        handlingType: string;
        assemblyResponsible?: 'Nossa equipe' | 'Montador terceirizado' | '';
      }>;
      /** Avisos e instruções exclusivos desta operação. */
      notices?: {
        callBeforeDelivery?: boolean;
        bringCardMachine?: boolean;
        callOnArrival?: boolean;
        instructions?: string;
      };
      scheduling: Scheduling;
    }>;
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
