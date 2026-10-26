import type { DeliveryRouteItem } from '../../hooks/useDeliveryRoute';
import { resolveDeliveryStep } from '../../../orders/screens/delivery-preparation/deliveryFlowStepRules';

export interface DeliveryTimelineMarker {
  label: string;
  color: string;
}

const deliveryStages: Record<number, { label: string; light: string; dark: string }> = {
  1: { label: 'Preparação', light: '#D97706', dark: '#fdba74' },
  2: { label: 'Em rota', light: '#2563EB', dark: '#93c5fd' },
  3: { label: 'Chegada', light: '#7C3AED', dark: '#c4b5fd' },
  4: { label: 'Atendimento', light: '#16A34A', dark: '#86efac' },
};

export const getDeliveryTimelineMarker = (
  item: DeliveryRouteItem,
  isDarkMode = false
): DeliveryTimelineMarker => {
  if (item.activityType === 'delivery') {
    const orderData = item.order?.order_data || {};
    const deliveryStep = resolveDeliveryStep({
      ...orderData,
      deliveryStatus: orderData.deliveryStatus ?? item.status,
    }).currentStep;
    const step = item.status === 'completed' ? 4 : deliveryStep;
    const stage = deliveryStages[step] || deliveryStages[1];
    return { label: stage.label, color: isDarkMode ? stage.dark : stage.light };
  }

  const statusMarkers: Record<string, { label: string; light: string; dark: string }> = {
    pending: { label: 'Agendada', light: '#64748b', dark: '#94a3b8' },
    in_progress: { label: 'Em andamento', light: '#2563EB', dark: '#93c5fd' },
    arrived: { label: 'Chegada', light: '#7C3AED', dark: '#c4b5fd' },
    in_service: { label: 'Atendimento', light: '#16A34A', dark: '#86efac' },
    completed: { label: 'Concluída', light: '#16A34A', dark: '#86efac' },
    unattended: { label: 'Falhou', light: '#DC2626', dark: '#fca5a5' },
  };
  const marker = statusMarkers[item.status] || statusMarkers.pending;
  return { label: marker.label, color: isDarkMode ? marker.dark : marker.light };
};
