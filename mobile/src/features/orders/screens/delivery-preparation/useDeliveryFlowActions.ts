import { useState, useMemo, useCallback, useRef } from 'react';
import { Alert } from 'react-native';
import { formatOrderCode } from '../../../../utils/orderUtils';
import {
  broadcastInitialDeliveryStatus,
  stopDeliveringBroadcast,
} from '../../../../services/logistics/teamLocationService';
import { buildDeliveryChecklist } from '../../utils/deliveryChecklist';
import { flattenFormErrors, useZodForm } from '../../../../hooks/useZodForm';
import {
  deliveryRouteFormSchema,
  deliveryFinishFormSchema,
} from '../../../../../../shared-utils/operationsFormSchemas';
import { deliveryFlowService } from '../../services/deliveryFlowService';
import { saveDeliveryOperation } from '../../services/deliveryOperationService';
import { getIndependentOperationId, projectOperationOrder } from '../../services/deliveryOperationState';
import { DELIVERY_OPERATION_FIELDS } from '../../../../../../shared-utils/orderAppointmentOccurrences';
import type { SyncEventType } from '../../../../services/offline/offlineTypes';
import type { LocalDeliveryProofMetadata } from '../../services/deliveryProofRules';
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
  const [routeStartError, setRouteStartError] = useState<string | null>(null);

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
  const operationId = getIndependentOperationId(order);
  const sourceData = useRef<Record<string, any>>(order._sourceOrderData || order.order_data || order);
  const originalPayments = useRef(sourceData.current.__sharedPaymentSnapshot ?? null);
  const operationPendingSync = useRef(false);

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
        if (operationId) {
          sourceData.current = updatedData;
          const occurrence = projectOperationOrder(order, updatedData);
          order._sourceOrderData = updatedData;
          order.order_data = occurrence.order_data;
          order.delivery_status = occurrence.delivery_status;
          if (updatedData.status === 'fulfilled') order.status = 'fulfilled';
          setDeliveryData(occurrence.order_data);
          return occurrence.order_data;
        }
        order.order_data = updatedData;
        if (newStatus) {
          order.status = newStatus;
        }
      }
      setDeliveryData(updatedData);
      return updatedData;
    },
    [order, operationId]
  );

  const saveOperation = useCallback(async (
    type: SyncEventType, patch: Record<string, unknown>, nextPayments?: Array<Record<string, unknown>>
  ) => {
    if (!operationId) throw new Error('Operação não identificada.');
    const { updatedData, pendingSync } = await saveDeliveryOperation({
      orderId: String(order.id), operationId, currentData: sourceData.current, type, patch,
      ...(nextPayments ? { payments: nextPayments, expectedPayments: originalPayments.current } : {}),
    });
    operationPendingSync.current = pendingSync;
    return syncOrderSnapshot(updatedData);
  }, [operationId, order.id, syncOrderSnapshot]);

  const canStopLocation = useCallback(() => !operationId || !userProfile?.id ||
    !Object.entries(sourceData.current.deliveryOperations || {}).some(([id, value]: [string, any]) =>
      id !== operationId && ['in_progress', 'arrived', 'in_service'].includes(value?.deliveryStatus) &&
      (value?.deliveryResponsibleId === userProfile.id || value?.deliveryResponsibles?.some((person: any) => person.id === userProfile.id))
    ), [operationId, userProfile?.id]);

  // 6. Iniciar deslocamento (com validação Zod, guarda de checklist e serviço de persistência)
  const handleStartRoute = useCallback(async (): Promise<boolean> => {
    if (saving) return false;
    setRouteStartError(null);
    if (!isChecklistComplete) {
      setRouteStartError('Confira todos os itens do checklist antes de iniciar o deslocamento.');
      return false;
    }
    try {
      const started = await routeForm.validateAndRun(
        {
          orderId: String(order.id || ''),
          checklist: checklist.map((item) => ({ ...item, checked: Boolean(checked[item.id]) })),
          responsibles,
        },
        async (values) => {
          setSaving(true);
          try {
            const responsibleName = responsibles.map((person) => person.name).join(', ');
            const updatedData = operationId
              ? await saveOperation('DELIVERY_START_ROUTE', {
                  deliveryStatus: 'in_progress', deliveryStartedAt: new Date().toISOString(),
                  deliveryPreparationStartedAt: null, deliveryChecklist: values.checklist,
                  deliveryResponsibles: responsibles, deliveryResponsibleName: responsibleName,
                  deliveryResponsibleId: responsibles[0]?.id || userProfile?.id || null,
                })
              : syncOrderSnapshot((await deliveryFlowService.startRoute({
                  orderId: values.orderId, currentData: data, checklist: values.checklist,
                  responsibles, userProfileId: userProfile?.id,
                })).updatedData);

            if (userProfile?.id && updatedData.deliveryResponsibleId === userProfile.id) {
              void broadcastInitialDeliveryStatus(userProfile, {
                id: order.id,
                code: formatOrderCode(order),
              });
            }

            return true;
          } catch (error: any) {
            setRouteStartError(error?.message || 'Não foi possível iniciar o deslocamento.');
            return false;
          } finally {
            setSaving(false);
          }
        },
        (errors) => {
          setRouteStartError(
            Object.values(flattenFormErrors(errors))[0] || 'Revise os dados da entrega.'
          );
        }
      );
      return started === true;
    } catch (error: any) {
      setRouteStartError(error?.message || 'Não foi possível iniciar o deslocamento.');
      return false;
    }
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
    operationId,
    saveOperation,
  ]);

  const handleConfirmStartRoute = useCallback(async () => {
    const started = await handleStartRoute();
    if (started) setShowStartConfirmModal(false);
  }, [handleStartRoute, setShowStartConfirmModal]);

  const clearRouteStartError = useCallback(() => setRouteStartError(null), []);

  // 7. Chegada no Destino (Etapa 2 -> Etapa 3)
  const handleArriveAtDestination = useCallback(async () => {
    if (saving) return;
    setSaving(true);
    try {
      if (operationId) await saveOperation('DELIVERY_ARRIVE_DESTINATION', {
        deliveryStatus: 'arrived', deliveryArrivedAt: new Date().toISOString(),
      });
      else syncOrderSnapshot((await deliveryFlowService.arriveAtDestination({ orderId: order.id, currentData: data })).updatedData);
    } catch (error: any) {
      Alert.alert('Erro', error?.message || 'Falha ao registrar chegada.');
    } finally {
      setSaving(false);
    }
  }, [saving, data, order.id, syncOrderSnapshot, operationId, saveOperation]);

  // 8. Iniciar Atendimento (Etapa 3 -> Etapa 4)
  const handleStartService = useCallback(async () => {
    if (saving) return;
    setSaving(true);
    try {
      if (operationId) await saveOperation('DELIVERY_START_SERVICE', {
        deliveryStatus: 'in_service', deliveryServiceStartedAt: new Date().toISOString(),
      });
      else syncOrderSnapshot((await deliveryFlowService.startService({ orderId: order.id, currentData: data })).updatedData);
    } catch (error: any) {
      Alert.alert('Erro', error?.message || 'Falha ao iniciar atendimento.');
    } finally {
      setSaving(false);
    }
  }, [saving, data, order.id, syncOrderSnapshot, operationId, saveOperation]);

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
    await finishForm.validateAndRun(
      { orderId: String(order.id || ''), payments },
      async (values) => {
        setSaving(true);
        try {
          if (operationId) await saveOperation('DELIVERY_FINISH', {
            deliveryStatus: 'completed', deliveryFinishedAt: new Date().toISOString(),
          }, values.payments);
          else syncOrderSnapshot((await deliveryFlowService.finishDelivery({
            orderId: values.orderId, currentData: data, payments: values.payments,
          })).updatedData, 'fulfilled');

          if (userProfile?.id && canStopLocation()) {
            await stopDeliveringBroadcast(userProfile.id);
          }

          Alert.alert('🎉 Entrega Finalizada!', operationId
            ? operationPendingSync.current ? 'Operação registrada no aparelho e aguardando sincronização.' : 'Operação de entrega concluída.'
            : fulfillmentSuccessMessage, [
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
    operationId,
    saveOperation,
    canStopLocation,
  ]);

  // 9. Insucesso / Não Atendido
  const handleConfirmUnattended = useCallback(
    async (
      reason: string,
      notes: string,
      proofUrls: string[],
      proofMetadata?: LocalDeliveryProofMetadata[]
    ) => {
      try {
        if (operationId) await saveOperation('DELIVERY_UNATTENDED', {
          deliveryStatus: 'unattended', unattendedAt: new Date().toISOString(),
          unattendedReason: reason, unattendedNotes: notes,
          unattendedProofUrl: proofUrls[0] || '', unattendedProofUrls: proofUrls,
          ...(proofMetadata?.length ? { unattendedProofMetadata: proofMetadata } : {}),
        });
        else syncOrderSnapshot((await deliveryFlowService.recordUnattended({
          orderId: order.id, currentData: data, reason, notes, proofUrls, proofMetadata,
        })).updatedData);
        setShowUnattendedModal(false);

        if (userProfile?.id && canStopLocation()) {
          void stopDeliveringBroadcast(userProfile.id);
        }

        Alert.alert('Insucesso Registrado', `O não atendimento foi registrado (${reason}).`, [
          { text: 'OK', onPress: () => onBack(true) },
        ]);
      } catch (error: any) {
        Alert.alert('Erro', error?.message || 'Falha ao registrar insucesso.');
      }
    },
    [data, order.id, userProfile, onBack, setShowUnattendedModal, syncOrderSnapshot, operationId, saveOperation, canStopLocation]
  );

  // 10. Retroceder Etapa 2 -> 1
  const handleStepBackToPreparation = useCallback(async () => {
    if (saving) return;
    setSaving(true);
    try {
      if (operationId) await saveOperation('DELIVERY_STEP_BACK', {
        deliveryStatus: null, deliveryPreparationStartedAt: new Date().toISOString(),
        deliveryStartedAt: null, deliveryArrivedAt: null, deliveryServiceStartedAt: null,
      });
      else syncOrderSnapshot((await deliveryFlowService.stepBackToPreparation(order.id, data)).updatedData);

      if (userProfile?.id && canStopLocation()) {
        void stopDeliveringBroadcast(userProfile.id);
      }
    } catch (error: any) {
      Alert.alert('Erro', error?.message || 'Falha ao retroceder etapa.');
    } finally {
      setSaving(false);
    }
  }, [saving, data, order.id, userProfile, syncOrderSnapshot, operationId, saveOperation, canStopLocation]);

  // 12. Retroceder Etapa 3 -> 2 (Chegada -> Deslocamento)
  const handleStepBackToRoute = useCallback(async () => {
    if (saving) return;
    setSaving(true);
    try {
      if (operationId) await saveOperation('DELIVERY_STEP_BACK', {
        deliveryStatus: 'in_progress', deliveryPreparationStartedAt: data.deliveryPreparationStartedAt || null,
        deliveryStartedAt: data.deliveryStartedAt || null, deliveryArrivedAt: null, deliveryServiceStartedAt: null,
      });
      else syncOrderSnapshot((await deliveryFlowService.stepBackToRoute(order.id, data)).updatedData);
    } catch (error: any) {
      Alert.alert('Erro', error?.message || 'Falha ao retroceder etapa.');
    } finally {
      setSaving(false);
    }
  }, [saving, data, order.id, syncOrderSnapshot, operationId, saveOperation]);

  // 13. Retroceder Etapa 4 -> 3 (Em Atendimento -> Chegada)
  const handleStepBackToArrival = useCallback(async () => {
    if (saving) return;
    setSaving(true);
    try {
      if (operationId) await saveOperation('DELIVERY_STEP_BACK', {
        deliveryStatus: 'arrived', deliveryPreparationStartedAt: data.deliveryPreparationStartedAt || null,
        deliveryStartedAt: data.deliveryStartedAt || null, deliveryArrivedAt: data.deliveryArrivedAt || null,
        deliveryServiceStartedAt: null,
      });
      else syncOrderSnapshot((await deliveryFlowService.stepBackToArrival(order.id, data)).updatedData);
    } catch (error: any) {
      Alert.alert('Erro', error?.message || 'Falha ao retroceder etapa.');
    } finally {
      setSaving(false);
    }
  }, [saving, data, order.id, syncOrderSnapshot, operationId, saveOperation]);

  // 14. Cancelar Entrega
  const handleConfirmCancelDelivery = useCallback(async () => {
    setCancelling(true);
    try {
      if (operationId) await saveOperation('DELIVERY_CANCEL', Object.fromEntries(
        DELIVERY_OPERATION_FIELDS.map((key) => [key, null])
      ));
      else syncOrderSnapshot((await deliveryFlowService.cancelDelivery(order.id, data)).updatedData, 'scheduled');

      setShowCancelModal(false);

      if (userProfile?.id && canStopLocation()) {
        void stopDeliveringBroadcast(userProfile.id);
      }

      onBack(true);
    } catch (err: any) {
      setShowCancelModal(false);
      Alert.alert('Erro', err?.message || 'Falha ao cancelar entrega');
    } finally {
      setCancelling(false);
    }
  }, [data, order.id, userProfile, onBack, setShowCancelModal, syncOrderSnapshot, operationId, saveOperation, canStopLocation]);

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
    routeStartError,
    clearRouteStartError,
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
