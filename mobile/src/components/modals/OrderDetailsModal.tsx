import React from 'react';
import { View, Modal, Text, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { OrderDetailsBody } from '../OrderDetailsBody';
import { DeliveryPreparationScreen } from '../../features/orders/screens/DeliveryPreparationScreen';
import { deliveryFlowService } from '../../features/orders/services/deliveryFlowService';
import { prepareIndependentDelivery } from '../../features/orders/services/deliveryOperationService';
import { getIndependentOperationId } from '../../features/orders/services/deliveryOperationState';
import { hasSeparateFulfillments } from '../../../../shared-utils/fulfillmentScheduleGuard';
import { isServerConfirmedOrderDetails } from '../../services/orderDetailsReadService';
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
  const [startingOperation, setStartingOperation] = React.useState(false);
  const {
    detailedOrder,
    setDetailedOrder,
    preparingDelivery,
    setPreparingDelivery,
    canStartDelivery,
    topInset,
    detailsLoading, detailsError, retryDetails,
  } = useOrderDetailsModal({ order, userRole });

  const markPreparationStarted = React.useCallback(
    (targetOrder: any, currentData?: Record<string, any>, reuseConfirmedServerSnapshot = false) => {
      if (getIndependentOperationId(targetOrder)) return;
      const source = targetOrder?._sourceOrderData || targetOrder?.order_data || targetOrder;
      if (hasSeparateFulfillments(source?.shipping?.scheduling, source?.items)) return;
      if (!targetOrder?.id || preparationStartRequestedOrderRef.current === targetOrder.id) return;
      preparationStartRequestedOrderRef.current = targetOrder.id;
      const confirmedRemoteSnapshot =
        reuseConfirmedServerSnapshot && isServerConfirmedOrderDetails(targetOrder)
          ? {
              orderData: targetOrder.order_data || targetOrder.orderData || {},
              deliveryStatus: targetOrder.delivery_status ?? null,
            }
          : undefined;
      void deliveryFlowService.startPreparation(
        targetOrder.id,
        confirmedRemoteSnapshot ? {} : currentData || targetOrder.order_data || targetOrder.orderData || {},
        confirmedRemoteSnapshot
      ).catch(() => { preparationStartRequestedOrderRef.current = null; });
    },
    []
  );

  React.useEffect(() => {
    if (!order?._openDeliveryPreparation || !detailedOrder?.id || detailsLoading || detailsError) return;
    markPreparationStarted(detailedOrder, undefined, true);
  }, [markPreparationStarted, detailedOrder, order?._openDeliveryPreparation, detailsLoading, detailsError]);

  const handleStartDelivery = async () => {
    if (detailsLoading || detailsError || startingOperation) return;
    const targetOrder = detailedOrder || order;
    const source = targetOrder?._sourceOrderData || targetOrder?.order_data || targetOrder;
    if (!getIndependentOperationId(targetOrder) && hasSeparateFulfillments(source?.shipping?.scheduling, source?.items)) {
      Alert.alert('Selecione uma operação', 'Abra a operação desejada na lista de Operações para iniciar a entrega.');
      return;
    }
    if (getIndependentOperationId(targetOrder)) {
      setStartingOperation(true);
      try {
        const prepared = await prepareIndependentDelivery(targetOrder);
        setDetailedOrder(prepared);
        setPreparingDelivery(true);
      } catch (error: any) {
        Alert.alert('Não foi possível iniciar a operação', error?.message || 'Atualize o pedido e tente novamente.');
      } finally {
        setStartingOperation(false);
      }
      return;
    }
    const nestedData =
      targetOrder?.order_data && typeof targetOrder.order_data === 'object'
        ? targetOrder.order_data
        : targetOrder?.orderData && typeof targetOrder.orderData === 'object'
          ? targetOrder.orderData
          : null;
    const currentData = nestedData || {};
    const preparationStartedAt =
      currentData.deliveryPreparationStartedAt ||
      targetOrder?.deliveryPreparationStartedAt ||
      new Date().toISOString();
    const updatedData = { ...currentData, deliveryPreparationStartedAt: preparationStartedAt };
    const updatedOrder = {
      ...targetOrder,
      deliveryPreparationStartedAt: preparationStartedAt,
      ...(nestedData ? { order_data: updatedData } : {}),
    };

    setDetailedOrder(updatedOrder);
    markPreparationStarted(targetOrder, updatedData);
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
        {detailsLoading || detailsError ? (
          <>
            <OrderDetailsModalHeader order={detailedOrder} isDarkMode={isDarkMode} onClose={onClose} />
            <View style={{ padding: 24, gap: 12 }}>
              {detailsLoading && <ActivityIndicator color="#2563eb" />}
              <Text style={{ color: isDarkMode ? '#e2e8f0' : '#334155' }}>{detailsLoading ? 'Carregando pedido…' : detailsError}</Text>
              {detailsError ? <TouchableOpacity onPress={retryDetails} accessibilityRole="button"><Text style={{ color: '#2563eb' }}>Tentar novamente</Text></TouchableOpacity> : null}
            </View>
          </>
        ) : preparingDelivery ? (
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
