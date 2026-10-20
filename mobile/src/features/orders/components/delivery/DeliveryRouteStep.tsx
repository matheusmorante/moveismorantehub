import React from 'react';
import { View } from 'react-native';
import { DeliveryRouteBanner } from './route/DeliveryRouteBanner';
import { DeliveryRouteCustomerCard } from './route/DeliveryRouteCustomerCard';
import { styles } from './route/deliveryRouteStep.styles';

interface Props {
  order: any;
  customer: any;
  fullAddress: string;
  isDarkMode: boolean;
  startedAt: string;
  onArriveAtDestination?: () => void;
  onStepBackToPreparation?: () => void;
  loading?: boolean;
}

/**
 * Etapa 2 do Fluxo de Entrega: Em Rota (Deslocamento).
 * Modularizado e desacoplado respeitando os princípios de SRP e Clean Architecture.
 * As ações de transição foram alocadas no rodapé fixo `DeliveryStepActionFooter`.
 */
export const DeliveryRouteStep: React.FC<Props> = ({
  order,
  customer,
  fullAddress,
  isDarkMode,
  startedAt,
}) => {
  return (
    <View style={styles.container}>
      {/* 1. Banner Em Rota */}
      <DeliveryRouteBanner startedAt={startedAt} isDarkMode={isDarkMode} />

      {/* 2. Cartão do Cliente e Endereço */}
      <DeliveryRouteCustomerCard
        order={order}
        customer={customer}
        fullAddress={fullAddress}
        isDarkMode={isDarkMode}
      />
    </View>
  );
};
