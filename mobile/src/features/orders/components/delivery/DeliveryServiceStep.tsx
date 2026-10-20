import React from 'react';
import { View } from 'react-native';
import { DeliveryPaymentSection } from './DeliveryPaymentSection';
import { DeliveryServiceBanner } from './service/DeliveryServiceBanner';
import { DeliveryServiceCustomerCard } from './service/DeliveryServiceCustomerCard';
import { DeliveryServiceProductsCard } from './service/DeliveryServiceProductsCard';
import { styles } from './service/deliveryServiceStep.styles';

interface Props {
  order: any;
  items: any[];
  customer?: any;
  fullAddress?: string;
  isDarkMode: boolean;
  arrivedAt: string;
  onOpenUnattendedModal?: () => void;
  onFinishDelivery?: () => void;
  onStepBackToRoute?: () => void;
  finishing?: boolean;
  payments: any[];
  onPaymentsChange: (payments: any[]) => void;
  paymentsConfirmed?: boolean;
}

/**
 * Etapa 4 do Fluxo de Entrega: No Local • Em Atendimento.
 * Modularizado e desacoplado respeitando os princípios de SRP e Clean Architecture.
 * As ações de transição foram alocadas no rodapé fixo `DeliveryStepActionFooter`.
 */
export const DeliveryServiceStep: React.FC<Props> = ({
  order,
  items,
  customer: customCustomer,
  fullAddress: customAddress,
  isDarkMode,
  arrivedAt,
  payments,
  onPaymentsChange,
}) => {
  const data = order.order_data || order;
  const customer = customCustomer || data.customerData || {};
  const fullAddress = customAddress || data.shipping?.address || '';

  return (
    <View style={styles.container}>
      {/* 1. Banner Em Atendimento com horário de chegada */}
      <DeliveryServiceBanner arrivedAt={arrivedAt} isDarkMode={isDarkMode} />

      {/* 2. Cartão do Cliente, Endereço e Botão GPS */}
      <DeliveryServiceCustomerCard
        order={order}
        customer={customer}
        fullAddress={fullAddress}
        isDarkMode={isDarkMode}
      />

      {/* 3. Lista e Conferência dos Itens a Entregar */}
      <DeliveryServiceProductsCard items={items} isDarkMode={isDarkMode} />

      {/* 4. Seção de Confirmação e Gestão de Pagamentos */}
      <DeliveryPaymentSection
        payments={payments}
        onChange={onPaymentsChange}
        isDarkMode={isDarkMode}
      />
    </View>
  );
};
