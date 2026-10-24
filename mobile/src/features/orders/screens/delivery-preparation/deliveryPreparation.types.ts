import React from 'react';
import type { LocalDeliveryProofMetadata } from '../../services/deliveryProofRules';

export interface DeliveryResponsibleItem {
  id?: string;
  name: string;
  role?: string;
}

export interface AvailableStaffMember {
  id: string;
  fullName: string;
  role?: string;
}

export interface DeliveryPreparationScreenProps {
  order: any;
  isDarkMode: boolean;
  onBack: (started?: boolean) => void;
  userProfile?: any;
}

export interface UseDeliveryFlowActionsOptions {
  order: any;
  userProfile?: any;
  responsibles: DeliveryResponsibleItem[];
  onBack: (started?: boolean) => void;
  fulfillmentSuccessMessage: string;
}

export interface UseDeliveryFlowActionsReturn {
  // Estado e dados do pedido
  deliveryData: any;
  currentStep: number;
  headerTitle: string;
  isInArrival: boolean;
  isInService: boolean;
  isInTransit: boolean;
  isInProgress: boolean;

  // Checklist
  checklist: any[];
  checked: Record<string, boolean>;
  handleToggleChecklist: (id: string) => void;
  isChecklistComplete: boolean;

  // Pagamentos
  payments: any[];
  setPayments: React.Dispatch<React.SetStateAction<any[]>>;
  paymentsConfirmed: boolean;

  // Estado de carregamento
  saving: boolean;
  cancelling: boolean;

  // Modais
  showUnattendedModal: boolean;
  setShowUnattendedModal: (show: boolean) => void;
  showCancelModal: boolean;
  setShowCancelModal: (show: boolean) => void;
  showStartConfirmModal: boolean;
  setShowStartConfirmModal: (show: boolean) => void;

  // Ações de fluxo (workflow handlers)
  handleStartRoute: () => Promise<void>;
  handleConfirmStartRoute: () => Promise<void>;
  handleArriveAtDestination: () => Promise<void>;
  handleStartService: () => Promise<void>;
  handleFinishDelivery: () => Promise<void>;
  handleConfirmUnattended: (
    reason: string,
    notes: string,
    proofUrls: string[],
    proofMetadata?: LocalDeliveryProofMetadata[]
  ) => Promise<void>;
  handleStepBackToPreparation: () => Promise<void>;
  handleStepBackToRoute: () => Promise<void>;
  handleStepBackToArrival: () => Promise<void>;
  handleConfirmCancelDelivery: () => Promise<void>;
}
