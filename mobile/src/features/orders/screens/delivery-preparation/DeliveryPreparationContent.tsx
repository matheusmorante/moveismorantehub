import React from 'react';
import { ScrollView } from 'react-native';
import {
  DeliveryPreparationStep,
  DeliveryRouteStep,
  DeliveryArrivalStep,
  DeliveryServiceStep,
} from '../../components/delivery';
import { DeliveryResponsibleItem } from './deliveryPreparation.types';
import { styles } from './deliveryPreparation.styles';

export interface DeliveryPreparationContentProps {
  isInArrival: boolean;
  isInService: boolean;
  isInTransit: boolean;
  order: any;
  items: any[];
  customer: any;
  fullAddress: string;
  isDarkMode: boolean;
  deliveryData: any;
  payments: any[];
  onPaymentsChange: (payments: any[]) => void;
  onOpenUnattendedModal: () => void;
  checklist: any[];
  checked: Record<string, boolean>;
  onToggleChecklist: (id: string) => void;
  responsibles: DeliveryResponsibleItem[];
  onAddResponsible: (responsible: DeliveryResponsibleItem) => void;
  onRemoveResponsible: (index: number) => void;
  availableStaff: any[];
  userProfile?: any;
}

/**
 * Renderizador de Conteúdo das Etapas do Fluxo de Entrega (SRP).
 * Comuta entre:
 * - Etapa 1: Preparação
 * - Etapa 2: Em Rota
 * - Etapa 3: Chegada (No Local)
 * - Etapa 4: Em Atendimento
 */
export const DeliveryPreparationContent: React.FC<DeliveryPreparationContentProps> = ({
  isInArrival,
  isInService,
  isInTransit,
  order,
  items,
  customer,
  fullAddress,
  isDarkMode,
  deliveryData,
  payments,
  onPaymentsChange,
  onOpenUnattendedModal,
  checklist,
  checked,
  onToggleChecklist,
  responsibles,
  onAddResponsible,
  onRemoveResponsible,
  availableStaff,
  userProfile,
}) => {
  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={[
        styles.content,
        { paddingBottom: 24 },
        isInArrival && styles.arrivalContent,
      ]}
    >
      {isInService ? (
        <DeliveryServiceStep
          order={order}
          items={items}
          customer={customer}
          fullAddress={fullAddress}
          isDarkMode={isDarkMode}
          arrivedAt={deliveryData.deliveryArrivedAt || deliveryData.deliveryStartedAt}
          payments={payments}
          onPaymentsChange={onPaymentsChange}
        />
      ) : isInArrival ? (
        <DeliveryArrivalStep
          order={order}
          isDarkMode={isDarkMode}
          onOpenUnattendedModal={onOpenUnattendedModal}
        />
      ) : isInTransit ? (
        <DeliveryRouteStep
          order={order}
          customer={customer}
          fullAddress={fullAddress}
          isDarkMode={isDarkMode}
          startedAt={deliveryData.deliveryStartedAt}
        />
      ) : (
        <DeliveryPreparationStep
          order={order}
          customer={customer}
          fullAddress={fullAddress}
          checklist={checklist}
          checked={checked}
          onToggleChecklist={onToggleChecklist}
          responsibles={responsibles}
          onAddResponsible={onAddResponsible}
          onRemoveResponsible={onRemoveResponsible}
          availableStaff={availableStaff}
          userProfile={userProfile}
          onOpenUnattendedModal={onOpenUnattendedModal}
          isDarkMode={isDarkMode}
        />
      )}
    </ScrollView>
  );
};
