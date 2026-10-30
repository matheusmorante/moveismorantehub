import React from 'react';
import { View, Modal } from 'react-native';
import { OrderDetailsBody } from '../OrderDetailsBody';
import { DeliveryPreparationScreen } from '../../features/orders/screens/DeliveryPreparationScreen';
import { deliveryFlowService } from '../../features/orders/services/deliveryFlowService';
import {
  useOrderDetailsModal,
  OrderDetailsModalHeader,
  styles,
} from './order-details';

interface Props {
  order: any;
  onClose: () => void;
  isDarkMode: boolean;
  userRole?: string;
  userProfile?: any;
}

/**
 * Modal de Detalhes do Pedido Mobile.
 * Refatorado com base nos princípios de SRP, Clean Architecture e desacoplamento de responsabilidades.
 * - Gerenciamento de dados e permissões: useOrderDetailsModal
 * - Apresentação de cabeçalho e status: OrderDetailsModalHeader + orderDetailsPresentation
 * - Estilos desacoplados: orderDetailsModal.styles
 */
export const OrderDetailsModal: React.FC<Props> = ({
  order,
  onClose,
  isDarkMode,
  userRole,
  userProfile,
}) => {
  const preparationStartRequestedOrderRef = React.useRef<string | null>(null);
  const {
    detailedOrder,
    preparingDelivery,
    setPreparingDelivery,
    canStartDelivery,
    topInset,
  } = useOrderDetailsModal({ order, userRole });

  const markPreparationStarted = React.useCallback(
    (targetOrder: any, currentData?: Record<string, any>) => {
      if (!targetOrder?.id || preparationStartRequestedOrderRef.current === targetOrder.id) return;
      preparationStartRequestedOrderRef.current = targetOrder.id;
      void deliveryFlowService.startPreparation(
        targetOrder.id,
        currentData || targetOrder.order_data || targetOrder.orderData || {}
      );
    },
    []
  );

  React.useEffect(() => {
    if (!order?._openDeliveryPreparation || !order?.id) return;
    markPreparationStarted(order);
  }, [markPreparationStarted, order?.id, order?._openDeliveryPreparation]);

  const handleStartDelivery = () => {
    markPreparationStarted(order, detailedOrder?.order_data || detailedOrder?.orderData);
    setPreparingDelivery(true);
  };

  if (!order) return null;

  return (
    <Modal
      visible={Boolean(order)}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <View
        style={[
          styles.modalContainer,
          { paddingTop: topInset },
          isDarkMode && styles.modalContainerDark,
        ]}
      >
        {preparingDelivery ? (
          <DeliveryPreparationScreen
            order={detailedOrder}
            isDarkMode={isDarkMode}
            userProfile={userProfile}
            onBack={(started) => {
              setPreparingDelivery(false);
              if (started || order?._openDeliveryPreparation) onClose();
            }}
          />
        ) : (
          <>
            <OrderDetailsModalHeader
              order={detailedOrder}
              isDarkMode={isDarkMode}
              onClose={onClose}
            />

            <View style={{ flex: 1 }}>
              <OrderDetailsBody
                order={detailedOrder}
                isDarkMode={isDarkMode}
                canStartDelivery={canStartDelivery}
                onStartDelivery={handleStartDelivery}
                onViewDelivery={() => setPreparingDelivery(true)}
              />
            </View>
          </>
        )}
      </View>
    </Modal>
  );
};

export default OrderDetailsModal;
