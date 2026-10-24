import React from 'react';
import { formatOrderCode } from '../../../../utils/orderUtils';
import { DeliveryStartConfirmModal } from '../../components/delivery/DeliveryStartConfirmModal';
import { UnattendedModal } from '../../components/delivery/UnattendedModal';
import { CancelDeliveryConfirmModal } from '../../components/delivery/CancelDeliveryConfirmModal';
import { DeliveryResponsibleItem } from './deliveryPreparation.types';
import type { LocalDeliveryProofMetadata } from '../../services/deliveryProofRules';

export interface DeliveryPreparationModalsProps {
  order: any;
  customer: any;
  responsibles: DeliveryResponsibleItem[];
  isDarkMode: boolean;
  saving?: boolean;
  loading?: boolean;
  cancelling?: boolean;
  showStartConfirmModal: boolean;
  onCloseStartConfirmModal: () => void;
  onConfirmStartRoute: () => void;
  gpsEnabled: boolean;
  checkingGps?: boolean;
  enablingGps?: boolean;
  onEnableGps: () => Promise<boolean>;
  showUnattendedModal: boolean;
  unattendedVariant?: 'preparation' | 'arrival';
  onCloseUnattendedModal: () => void;
  onConfirmUnattended: (
    reason: string,
    notes: string,
    proofUrls: string[],
    proofMetadata?: LocalDeliveryProofMetadata[]
  ) => Promise<void>;
  showCancelModal: boolean;
  onCloseCancelModal: () => void;
  onConfirmCancelDelivery: () => void;
}

/**
 * Agrupador dos Modais do Fluxo de Entrega (SRP).
 * Desacopla da tela principal a instanciação dos modais de Início de Rota, Insucesso e Cancelamento.
 */
export const DeliveryPreparationModals: React.FC<DeliveryPreparationModalsProps> = ({
  order,
  customer,
  responsibles,
  isDarkMode,
  saving = false,
  loading = false,
  cancelling = false,
  showStartConfirmModal,
  onCloseStartConfirmModal,
  onConfirmStartRoute,
  gpsEnabled,
  checkingGps = false,
  enablingGps = false,
  onEnableGps,
  showUnattendedModal,
  unattendedVariant = 'arrival',
  onCloseUnattendedModal,
  onConfirmUnattended,
  showCancelModal,
  onCloseCancelModal,
  onConfirmCancelDelivery,
}) => {
  const orderCode = formatOrderCode(order);
  const customerName = customer?.fullName || 'Cliente';
  const isActionLoading = saving || loading;

  return (
    <>
      <DeliveryStartConfirmModal
        visible={showStartConfirmModal}
        orderNumber={orderCode}
        customerName={customerName}
        responsibles={responsibles}
        loading={isActionLoading}
        isDarkMode={isDarkMode}
        gpsEnabled={gpsEnabled}
        checkingGps={checkingGps}
        enablingGps={enablingGps}
        onConfirm={onConfirmStartRoute}
        onEnableGps={onEnableGps}
        onCancel={onCloseStartConfirmModal}
      />

      <UnattendedModal
        key={unattendedVariant}
        variant={unattendedVariant}
        visible={showUnattendedModal}
        onClose={onCloseUnattendedModal}
        onConfirm={onConfirmUnattended}
        isDarkMode={isDarkMode}
        customerName={customerName}
      />

      <CancelDeliveryConfirmModal
        visible={showCancelModal}
        onClose={onCloseCancelModal}
        onConfirm={onConfirmCancelDelivery}
        loading={cancelling}
        isDarkMode={isDarkMode}
        orderNumber={orderCode}
      />
    </>
  );
};
