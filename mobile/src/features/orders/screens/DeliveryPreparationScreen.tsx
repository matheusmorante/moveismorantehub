import React from 'react';
import { ScrollView, View } from 'react-native';
import { formatFullAddress, formatOrderCode } from '../../../utils/orderUtils';
import { getFulfillmentLabels } from '../domain/orderStatusPresentation';
import { DeliveryHeader } from '../components/delivery/DeliveryHeader';
import { DeliveryPreparationStep } from '../components/delivery/DeliveryPreparationStep';
import { DeliveryRouteStep } from '../components/delivery/DeliveryRouteStep';
import { DeliveryServiceStep } from '../components/delivery/DeliveryServiceStep';
import { UnattendedModal } from '../components/delivery/UnattendedModal';
import { DeliveryQuickContactBar } from '../components/delivery/DeliveryQuickContactBar';
import { CancelDeliveryConfirmModal } from '../components/delivery/CancelDeliveryConfirmModal';
import { DeliveryStepProgressIndicator } from '../components/delivery/DeliveryStepProgressIndicator';
import { DeliveryStartConfirmModal } from '../components/delivery/DeliveryStartConfirmModal';

import {
  DeliveryPreparationScreenProps,
  DeliveryResponsibleItem,
} from './delivery-preparation/deliveryPreparation.types';
import { styles } from './delivery-preparation/deliveryPreparation.styles';
import { useDeliveryStaff } from './delivery-preparation/useDeliveryStaff';
import { useDeliveryFlowActions } from './delivery-preparation/useDeliveryFlowActions';

export type { DeliveryPreparationScreenProps, DeliveryResponsibleItem };

/**
 * Tela do Fluxo de Entrega (1. Preparação -> 2. Em Rota -> 3. Em Atendimento).
 * Refatorada sob os princípios de Single Responsibility (SRP) e Clean Architecture,
 * com desacoplamento de responsabilidades entre hooks e visualização.
 */
export function DeliveryPreparationScreen({
  order,
  isDarkMode,
  onBack,
  userProfile,
}: DeliveryPreparationScreenProps) {
  const fulfillmentLabels = getFulfillmentLabels({
    ...order,
    shipping: {
      ...order.shipping,
      deliveryMethod: order.shipping?.deliveryMethod || 'delivery',
    },
  });

  // 1. Gerenciamento de Colaboradores e Responsáveis pela Entrega
  const {
    responsibles,
    availableStaff,
    handleAddResponsible,
    handleRemoveResponsible,
  } = useDeliveryStaff({ order, userProfile });

  // 2. Orquestração do Ciclo de Vida e Ações do Fluxo
  const {
    deliveryData,
    checklist,
    checked,
    handleToggleChecklist,
    payments,
    setPayments,
    saving,
    cancelling,
    showUnattendedModal,
    setShowUnattendedModal,
    showCancelModal,
    setShowCancelModal,
    showStartConfirmModal,
    setShowStartConfirmModal,
    isInService,
    isInTransit,
    isInProgress,
    currentStep,
    headerTitle,
    paymentsConfirmed,
    handleConfirmStartRoute,
    handleArriveAtDestination,
    handleFinishDelivery,
    handleConfirmUnattended,
    handleStepBackToPreparation,
    handleStepBackToRoute,
    handleConfirmCancelDelivery,
  } = useDeliveryFlowActions({
    order,
    userProfile,
    responsibles,
    onBack,
    fulfillmentSuccessMessage: fulfillmentLabels.successMessage,
  });

  const customer = deliveryData.customerData || {};
  const fullAddress = formatFullAddress(deliveryData.shipping || {}, customer);
  const items =
    deliveryData.items || order.items || deliveryData.assistanceItems || order.assistance_items || [];

  return (
    <View style={[styles.container, isDarkMode && styles.dark]}>
      {/* Cabeçalho Padronizado do Fluxo de Entrega */}
      <DeliveryHeader
        title={headerTitle}
        orderId={order.id}
        orderCode={formatOrderCode(order)}
        isDarkMode={isDarkMode}
        isInProgress={isInProgress}
        onBack={() => onBack()}
        onCancelDelivery={() => setShowCancelModal(true)}
        cancelling={cancelling}
      />

      {/* Barra de Contato Rápido (Cliente e Vendedor) */}
      <DeliveryQuickContactBar order={order} isDarkMode={isDarkMode} />

      {/* Indicador Informativo da Etapa Atual (1 -> 2 -> 3) */}
      <DeliveryStepProgressIndicator currentStep={currentStep} isDarkMode={isDarkMode} />

      <ScrollView contentContainerStyle={styles.content}>
        {isInService ? (
          <DeliveryServiceStep
            order={order}
            items={items}
            customer={customer}
            fullAddress={fullAddress}
            isDarkMode={isDarkMode}
            arrivedAt={deliveryData.deliveryArrivedAt || deliveryData.deliveryStartedAt}
            onOpenUnattendedModal={() => setShowUnattendedModal(true)}
            onFinishDelivery={handleFinishDelivery}
            onStepBackToRoute={handleStepBackToRoute}
            finishing={saving}
            payments={payments}
            onPaymentsChange={setPayments}
            paymentsConfirmed={paymentsConfirmed}
          />
        ) : isInTransit ? (
          <DeliveryRouteStep
            order={order}
            customer={customer}
            fullAddress={fullAddress}
            isDarkMode={isDarkMode}
            startedAt={deliveryData.deliveryStartedAt}
            onArriveAtDestination={handleArriveAtDestination}
            onStepBackToPreparation={handleStepBackToPreparation}
            loading={saving}
          />
        ) : (
          <DeliveryPreparationStep
            order={order}
            customer={customer}
            fullAddress={fullAddress}
            checklist={checklist}
            checked={checked}
            onToggleChecklist={handleToggleChecklist}
            responsibles={responsibles}
            onAddResponsible={handleAddResponsible}
            onRemoveResponsible={handleRemoveResponsible}
            availableStaff={availableStaff}
            userProfile={userProfile}
            onStartDelivery={() => setShowStartConfirmModal(true)}
            saving={saving}
            isDarkMode={isDarkMode}
          />
        )}
      </ScrollView>

      {/* Modais de Confirmação e Registro */}
      <DeliveryStartConfirmModal
        visible={showStartConfirmModal}
        orderNumber={formatOrderCode(order)}
        customerName={customer.fullName || 'Cliente'}
        responsibles={responsibles}
        loading={saving}
        isDarkMode={isDarkMode}
        onConfirm={handleConfirmStartRoute}
        onCancel={() => setShowStartConfirmModal(false)}
      />

      <UnattendedModal
        visible={showUnattendedModal}
        onClose={() => setShowUnattendedModal(false)}
        onConfirm={handleConfirmUnattended}
        isDarkMode={isDarkMode}
        customerName={customer.fullName || 'Cliente'}
      />

      <CancelDeliveryConfirmModal
        visible={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        onConfirm={handleConfirmCancelDelivery}
        loading={cancelling}
        isDarkMode={isDarkMode}
        orderNumber={formatOrderCode(order)}
      />
    </View>
  );
}
