import { DeliveryRouteItem } from '../../../hooks/useDeliveryRoute';

export interface NextDeliveryCardProps {
  currentDelivery: DeliveryRouteItem | null;
  nextDelivery: DeliveryRouteItem | null;
  selectedDelivery?: DeliveryRouteItem | null;
  allCompleted: boolean;
  onCloseCard?: () => void;
  onStartDelivery: (item: DeliveryRouteItem) => void;
  onViewOrder: (item: DeliveryRouteItem) => void;
  onRegisterService?: (item: DeliveryRouteItem) => void;
  isDarkMode?: boolean;
}
