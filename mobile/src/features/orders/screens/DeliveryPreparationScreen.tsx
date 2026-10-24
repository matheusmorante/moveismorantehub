import React, { useCallback, useEffect, useState } from 'react';
import { AppState, Text, TouchableOpacity, View } from 'react-native';
import { AlertTriangle } from 'lucide-react-native';
import { formatFullAddress, formatOrderCode } from '../../../utils/orderUtils';
import { getFulfillmentLabels } from '../domain/orderStatusPresentation';
import {
  getLocationAccessStatus,
  requestLocationAccess,
  type LocationAccessStatus,
} from '../../../services/locationService';
import {
  DeliveryHeader,
  DeliveryStepActionFooter,
  DeliveryQuickContactBar,
  DeliveryStepProgressIndicator,
} from '../components/delivery';

import {
  DeliveryPreparationScreenProps,
  DeliveryResponsibleItem,
  deliveryPreparationStyles as styles,
  useDeliveryStaff,
  useDeliveryFlowActions,
  DeliveryPreparationContent,
  DeliveryPreparationModals,
} from './delivery-preparation';

export type { DeliveryPreparationScreenProps, DeliveryResponsibleItem };

/**
 * Tela do Fluxo de Entrega:
 * 1. Preparação -> 2. Em Rota -> 3. Chegada (No Local) -> 4. Em Atendimento.
 * Refatorada sob os princípios de Single Responsibility (SRP) e Clean Architecture.
 * - Orquestração de pessoal: useDeliveryStaff
 * - Ciclo de vida e ações: useDeliveryFlowActions
 * - Renderização de etapas: DeliveryPreparationContent
 * - Modais isolados: DeliveryPreparationModals
 * - Ações ancoradas na zona segura inferior: DeliveryStepActionFooter
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
    isInArrival,
    isInService,
    isInTransit,
    isInProgress,
    currentStep,
    headerTitle,
    paymentsConfirmed,
    isChecklistComplete,
    handleConfirmStartRoute,
    handleArriveAtDestination,
    handleStartService,
    handleFinishDelivery,
    handleConfirmUnattended,
    handleStepBackToPreparation,
    handleStepBackToRoute,
    handleStepBackToArrival,
    handleConfirmCancelDelivery,
  } = useDeliveryFlowActions({
    order,
    userProfile,
    responsibles,
    onBack,
    fulfillmentSuccessMessage: fulfillmentLabels.successMessage,
  });

  const [locationAccess, setLocationAccess] = useState<LocationAccessStatus | null>(null);
  const [checkingLocation, setCheckingLocation] = useState(false);
  const [enablingLocation, setEnablingLocation] = useState(false);
  const gpsEnabled = Boolean(
    locationAccess && locationAccess.permissionGranted && locationAccess.servicesEnabled
  );

  const refreshLocationAccess = useCallback(async () => {
    setCheckingLocation(true);
    const status = await getLocationAccessStatus();
    setLocationAccess(status);
    setCheckingLocation(false);
    return status;
  }, []);

  const handleEnableGps = useCallback(async () => {
    setEnablingLocation(true);
    try {
      const status = await requestLocationAccess();
      setLocationAccess(status);
      return status.permissionGranted && status.servicesEnabled;
    } finally {
      setEnablingLocation(false);
    }
  }, []);

  const handleOpenStartConfirmModal = useCallback(async () => {
    await refreshLocationAccess();
    setShowStartConfirmModal(true);
  }, [refreshLocationAccess, setShowStartConfirmModal]);

  const handleConfirmStartRouteWithGps = useCallback(async () => {
    const status = await refreshLocationAccess();
    if (!status.permissionGranted || !status.servicesEnabled) {
      await handleEnableGps();
      return;
    }
    await handleConfirmStartRoute();
  }, [handleConfirmStartRoute, handleEnableGps, refreshLocationAccess]);

  useEffect(() => {
    let active = true;
    const check = async () => {
      const status = await getLocationAccessStatus();
      if (active) setLocationAccess(status);
    };

    void check();
    const shouldMonitorGps = currentStep > 1 || showStartConfirmModal;
    if (!shouldMonitorGps) {
      return () => {
        active = false;
      };
    }

    const interval = setInterval(() => void check(), 5000);
    const appStateSubscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void check();
    });

    return () => {
      active = false;
      clearInterval(interval);
      appStateSubscription.remove();
    };
  }, [currentStep, showStartConfirmModal]);

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

      {currentStep > 1 && locationAccess && !gpsEnabled && (
        <View style={[styles.gpsWarning, isDarkMode && styles.gpsWarningDark]}>
          <AlertTriangle size={16} color={isDarkMode ? '#fbbf24' : '#b45309'} />
          <Text style={[styles.gpsWarningText, isDarkMode && styles.gpsWarningTextDark]}>
            {locationAccess.permissionGranted
              ? 'GPS desligado. Habilite novamente para compartilhar sua localização.'
              : 'Acesso à localização desligado. Habilite novamente para compartilhar sua localização.'}
          </Text>
          <TouchableOpacity
            onPress={() => void handleEnableGps()}
            disabled={enablingLocation}
            accessibilityRole="button"
            accessibilityLabel="Habilitar GPS"
            style={styles.gpsWarningAction}
          >
            <Text style={styles.gpsWarningActionText}>
              {enablingLocation ? 'Ativando…' : 'Habilitar'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Barra de Contato Rápido (Cliente e Vendedor) */}
      <DeliveryQuickContactBar order={order} isDarkMode={isDarkMode} />

      {/* Indicador Informativo da Etapa Atual (1 -> 2 -> 3 -> 4) */}
      <DeliveryStepProgressIndicator currentStep={currentStep} isDarkMode={isDarkMode} />

      {/* Renderizador Modular do Conteúdo da Etapa Atual (1, 2, 3 ou 4) */}
      <DeliveryPreparationContent
        isInArrival={isInArrival}
        isInService={isInService}
        isInTransit={isInTransit}
        order={order}
        items={items}
        customer={customer}
        fullAddress={fullAddress}
        isDarkMode={isDarkMode}
        deliveryData={deliveryData}
        payments={payments}
        onPaymentsChange={setPayments}
        onOpenUnattendedModal={() => setShowUnattendedModal(true)}
        checklist={checklist}
        checked={checked}
        onToggleChecklist={handleToggleChecklist}
        responsibles={responsibles}
        onAddResponsible={handleAddResponsible}
        onRemoveResponsible={handleRemoveResponsible}
        availableStaff={availableStaff}
        userProfile={userProfile}
      />

      {/* Ações de Transição Fixas no Rodapé (Ancoradas na Zona Segura, sem sobrepor botões do celular) */}
      <DeliveryStepActionFooter
        currentStep={currentStep}
        isDarkMode={isDarkMode}
        loading={saving}
        isChecklistComplete={isChecklistComplete}
        paymentsConfirmed={paymentsConfirmed}
        onStartDelivery={handleOpenStartConfirmModal}
        onArriveAtDestination={handleArriveAtDestination}
        onStepBackToPreparation={handleStepBackToPreparation}
        onStartService={handleStartService}
        onStepBackToRoute={handleStepBackToRoute}
        onFinishDelivery={handleFinishDelivery}
        onStepBackToArrival={handleStepBackToArrival}
      />

      {/* Modais de Confirmação e Registro Desacoplados */}
      <DeliveryPreparationModals
        order={order}
        customer={customer}
        responsibles={responsibles}
        loading={saving}
        cancelling={cancelling}
        isDarkMode={isDarkMode}
        showStartConfirmModal={showStartConfirmModal}
        onCloseStartConfirmModal={() => setShowStartConfirmModal(false)}
        onConfirmStartRoute={handleConfirmStartRouteWithGps}
        gpsEnabled={gpsEnabled}
        checkingGps={checkingLocation}
        enablingGps={enablingLocation}
        onEnableGps={handleEnableGps}
        showUnattendedModal={showUnattendedModal}
        unattendedVariant={
          !isInArrival && !isInService && !isInTransit ? 'preparation' : 'arrival'
        }
        onCloseUnattendedModal={() => setShowUnattendedModal(false)}
        onConfirmUnattended={handleConfirmUnattended}
        showCancelModal={showCancelModal}
        onCloseCancelModal={() => setShowCancelModal(false)}
        onConfirmCancelDelivery={handleConfirmCancelDelivery}
      />
    </View>
  );
}

export default DeliveryPreparationScreen;
