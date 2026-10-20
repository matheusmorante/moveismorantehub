import React from 'react';
import { View, Modal } from 'react-native';
import { OrderDetailsBody } from '../OrderDetailsBody';
import { DeliveryPreparationScreen } from '../../features/orders/screens/DeliveryPreparationScreen';
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
  const {
    detailedOrder,
    preparingDelivery,
    setPreparingDelivery,
    canStartDelivery,
    topInset,
  } = useOrderDetailsModal({ order, userRole });

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
              if (started) onClose();
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
                onStartDelivery={() => setPreparingDelivery(true)}
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
