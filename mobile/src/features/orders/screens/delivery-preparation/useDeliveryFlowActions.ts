import { useState, useMemo, useCallback } from 'react';
import { Alert } from 'react-native';
import { formatOrderCode } from '../../../../utils/orderUtils';
import {
  broadcastMyLocation,
  stopDeliveringBroadcast,
} from '../../../../services/teamLocationService';
import { buildDeliveryChecklist } from '../../utils/deliveryChecklist';
import { flattenFormErrors, useZodForm } from '../../../../hooks/useZodForm';
import {
  deliveryRouteFormSchema,
  deliveryFinishFormSchema,
} from '../../../../../../shared-utils/operationsFormSchemas';
import { deliveryFlowService } from '../../services/deliveryFlowService';
import {
  DeliveryResponsibleItem,
  UseDeliveryFlowActionsOptions,
  UseDeliveryFlowActionsReturn,
} from './deliveryPreparation.types';
import { useDeliveryModals } from './useDeliveryModals';
import {
  resolveDeliveryStep,
  resolveInitialDeliveryPayments,
  isDeliveryChecklistComplete as checkChecklistComplete,
  areDeliveryPaymentsPaid,
} from './deliveryFlowStepRules';

/**
 * Hook orquestrador do fluxo de entrega (SRP & Clean Architecture).
 * Gerencia o estado de interface, formulários Zod, validações de saída
 * e delega persistência para o `deliveryFlowService`.
 */
export function useDeliveryFlowActions({
  order,
  userProfile,
  responsibles,
  onBack,
  fulfillmentSuccessMessage,
}: UseDeliveryFlowActionsOptions): UseDeliveryFlowActionsReturn {
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  // 1. Modais de Confirmação e Registro
  const {
    showUnattendedModal,
    setShowUnattendedModal,
    showCancelModal,
    setShowCancelModal,
    showStartConfirmModal,
    setShowStartConfirmModal,
  } = useDeliveryModals();

  // 2. Dados do Pedido e Pagamentos
  const [deliveryData, setDeliveryData] = useState(() => order.order_data || order);
  const [payments, setPayments] = useState<any[]>(() => resolveInitialDeliveryPayments(order));

  // 3. Checklist e Validação de Conclusão
  const checklist = useMemo(() => buildDeliveryChecklist(order), [order]);
  const isChecklistComplete = useMemo(
    () => checkChecklistComplete(checklist, checked),
    [checklist, checked]
  );

  // 4. Formulários Validados com Zod (Regra 5 do MoranteHub)
  const routeForm = useZodForm(deliveryRouteFormSchema, {
    orderId: String(order.id || ''),
    checklist: checklist.map((item) => ({ ...item, checked: Boolean(checked[item.id]) })),
    responsibles,
  });

  const finishForm = useZodForm(deliveryFinishFormSchema, {
    orderId: String(order.id || ''),
    payments,
  });

  // 5. Estado Derivado da Etapa Atual (Domain Rules)
  const data = deliveryData;
  const { currentStep, headerTitle, isInArrival, isInService, isInTransit, isInProgress } = useMemo(
    () => resolveDeliveryStep(data),
    [data]
  );
  const paymentsConfirmed = useMemo(() => areDeliveryPaymentsPaid(payments), [payments]);

  // Sincronizador de compatibilidade com referências mutáveis externas
  const syncOrderSnapshot = useCallback(
    (updatedData: any, newStatus?: string) => {
      if (order && typeof order === 'object') {
        order.order_data = updatedData;
        if (newStatus) {
          order.status = newStatus;
        }
      }
    },
    [order]
  );

  // 6. Iniciar Rota (com validação Zod, guarda de checklist e serviço de persistência)
  const handleStartRoute = useCallback(async () => {
    if (saving) return;
    if (!isChecklistComplete) {
      Alert.alert(
        'Checklist incompleto',
        'Por favor, confira e marque todos os itens do checklist antes de iniciar a rota.'
      );
      return;
    }
    return routeForm.validateAndRun(
      {
        orderId: String(order.id || ''),
        checklist: checklist.map((item) => ({ ...item, checked: Boolean(checked[item.id]) })),
        responsibles,
      },
      async (values) => {
        setSaving(true);
        try {
          const { updatedData } = await deliveryFlowService.startRoute({
            orderId: values.orderId,
            currentData: data,
            checklist: values.checklist,
            responsibles,
            userProfileId: userProfile?.id,
          });

          syncOrderSnapshot(updatedData);
          setDeliveryData(updatedData);

          if (userProfile?.id) {
            void broadcastMyLocation(userProfile, null, true, true, {
              id: order.id,
              code: formatOrderCode(order),
            });
          }
        } catch (error: any) {
          Alert.alert('Erro ao iniciar rota', error?.message || 'Falha na operação.');
        } finally {
          setSaving(false);
        }
      },
      (errors) => Alert.alert('Revise a entrega', Object.values(flattenFormErrors(errors))[0])
    );
  }, [
    saving,
    isChecklistComplete,
    routeForm,
    order,
    checklist,
    checked,
    responsibles,
    data,
    userProfile,
    syncOrderSnapshot,
  ]);

  const handleConfirmStartRoute = useCallback(async () => {
    setShowStartConfirmModal(false);
    await handleStartRoute();
  }, [handleStartRoute, setShowStartConfirmModal]);

  // 7. Chegada no Destino (Etapa 2 -> Etapa 3)
  const handleArriveAtDestination = useCallback(async () => {
    if (saving) return;
    setSaving(true);
    try {
      const { updatedData } = await deliveryFlowService.arriveAtDestination({
        orderId: order.id,
        currentData: data,
      });

      syncOrderSnapshot(updatedData);
      setDeliveryData(updatedData);
    } catch (error: any) {
      Alert.alert('Erro', error?.message || 'Falha ao registrar chegada.');
    } finally {
      setSaving(false);
    }
  }, [saving, data, order.id, syncOrderSnapshot]);

  // 8. Iniciar Atendimento (Etapa 3 -> Etapa 4)
  const handleStartService = useCallback(async () => {
    if (saving) return;
    setSaving(true);
    try {
      const { updatedData } = await deliveryFlowService.startService({
        orderId: order.id,
        currentData: data,
      });

      syncOrderSnapshot(updatedData);
      setDeliveryData(updatedData);
    } catch (error: any) {
      Alert.alert('Erro', error?.message || 'Falha ao iniciar atendimento.');
    } finally {
      setSaving(false);
    }
  }, [saving, data, order.id, syncOrderSnapshot]);

  // 9. Finalizar Entrega (Etapa 4 -> Conclusão)
  const handleFinishDelivery = useCallback(async () => {
    if (saving) return;
    if (!paymentsConfirmed) {
      Alert.alert(
        'Pagamento pendente',
        'Confirme todos os pagamentos como pagos antes de finalizar a entrega.'
      );
      return;
    }
    return finishForm.validateAndRun(
      { orderId: String(order.id || ''), payments },
      async (values) => {
        setSaving(true);
        try {
          const { updatedData } = await deliveryFlowService.finishDelivery({
            orderId: values.orderId,
            currentData: data,
            payments: values.payments,
          });

          syncOrderSnapshot(updatedData, 'fulfilled');
          setDeliveryData(updatedData);

          if (userProfile?.id) {
            void stopDeliveringBroadcast(userProfile.id);
          }

          Alert.alert('🎉 Entrega Finalizada!', fulfillmentSuccessMessage, [
            { text: 'OK', onPress: () => onBack(true) },
          ]);
        } catch (error: any) {
          Alert.alert('Erro ao finalizar', error?.message || 'Falha ao concluir entrega.');
        } finally {
          setSaving(false);
        }
      },
      (errors) => Alert.alert('Revise a entrega', Object.values(flattenFormErrors(errors))[0])
    );
  }, [
    saving,
    paymentsConfirmed,
    finishForm,
    order.id,
    payments,
    data,
    userProfile,
    fulfillmentSuccessMessage,
    onBack,
    syncOrderSnapshot,
  ]);

  // 9. Insucesso / Não Atendido
  const handleConfirmUnattended = useCallback(
    async (reason: string, notes: string, proofUrls: string[]) => {
      try {
        const { updatedData } = await deliveryFlowService.recordUnattended({
          orderId: order.id,
          currentData: data,
          reason,
          notes,
          proofUrls,
        });

        syncOrderSnapshot(updatedData);
        setDeliveryData(updatedData);
        setShowUnattendedModal(false);

        if (userProfile?.id) {
          void stopDeliveringBroadcast(userProfile.id);
        }

        Alert.alert('Insucesso Registrado', `O não atendimento foi registrado (${reason}).`, [
          { text: 'OK', onPress: () => onBack(true) },
        ]);
      } catch (error: any) {
        Alert.alert('Erro', error?.message || 'Falha ao registrar insucesso.');
      }
    },
    [data, order.id, userProfile, onBack, setShowUnattendedModal, syncOrderSnapshot]
  );

  // 10. Retroceder Etapa 2 -> 1
  const handleStepBackToPreparation = useCallback(async () => {
    if (saving) return;
    setSaving(true);
    try {
      const { updatedData } = await deliveryFlowService.stepBackToPreparation(order.id, data);

      syncOrderSnapshot(updatedData);
      setDeliveryData(updatedData);

      if (userProfile?.id) {
        void stopDeliveringBroadcast(userProfile.id);
      }
    } catch (error: any) {
      Alert.alert('Erro', error?.message || 'Falha ao retroceder etapa.');
    } finally {
      setSaving(false);
    }
  }, [saving, data, order.id, userProfile, syncOrderSnapshot]);

  // 12. Retroceder Etapa 3 -> 2 (Chegada -> Em Rota)
  const handleStepBackToRoute = useCallback(async () => {
    if (saving) return;
    setSaving(true);
    try {
      const { updatedData } = await deliveryFlowService.stepBackToRoute(order.id, data);

      syncOrderSnapshot(updatedData);
      setDeliveryData(updatedData);
    } catch (error: any) {
      Alert.alert('Erro', error?.message || 'Falha ao retroceder etapa.');
    } finally {
      setSaving(false);
    }
  }, [saving, data, order.id, syncOrderSnapshot]);

  // 13. Retroceder Etapa 4 -> 3 (Em Atendimento -> Chegada)
  const handleStepBackToArrival = useCallback(async () => {
    if (saving) return;
    setSaving(true);
    try {
      const { updatedData } = await deliveryFlowService.stepBackToArrival(order.id, data);

      syncOrderSnapshot(updatedData);
      setDeliveryData(updatedData);
    } catch (error: any) {
      Alert.alert('Erro', error?.message || 'Falha ao retroceder etapa.');
    } finally {
      setSaving(false);
    }
  }, [saving, data, order.id, syncOrderSnapshot]);

  // 14. Cancelar Entrega
  const handleConfirmCancelDelivery = useCallback(async () => {
    setCancelling(true);
    try {
      const { updatedData } = await deliveryFlowService.cancelDelivery(order.id, data);

      setShowCancelModal(false);

      if (userProfile?.id) {
        void stopDeliveringBroadcast(userProfile.id);
      }

      syncOrderSnapshot(updatedData, 'scheduled');
      setDeliveryData(updatedData);

      onBack(true);
    } catch (err: any) {
      setShowCancelModal(false);
      Alert.alert('Erro', err?.message || 'Falha ao cancelar entrega');
    } finally {
      setCancelling(false);
    }
  }, [data, order.id, userProfile, onBack, setShowCancelModal, syncOrderSnapshot]);

  const handleToggleChecklist = useCallback((id: string) => {
    setChecked((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  return {
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
    handleStartRoute,
    handleConfirmStartRoute,
    handleArriveAtDestination,
    handleStartService,
    handleFinishDelivery,
    handleConfirmUnattended,
    handleStepBackToPreparation,
    handleStepBackToRoute,
    handleStepBackToArrival,
    handleConfirmCancelDelivery,
  };
}
