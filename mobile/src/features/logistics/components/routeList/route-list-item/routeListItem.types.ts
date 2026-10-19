import { DeliveryRouteItem } from '../../../hooks/useDeliveryRoute';

export interface RouteListItemProps {
  item: DeliveryRouteItem;
  onSelect: (item: DeliveryRouteItem) => void;
  onStartDelivery: (item: DeliveryRouteItem) => void;
  onViewOrder: (item: DeliveryRouteItem) => void;
  isDarkMode?: boolean;
}
