import { useState, useMemo, useCallback } from 'react';
import { Alert } from 'react-native';
import { supabase } from '../../../../services/supabaseClient';
import { formatOrderCode } from '../../../../utils/orderUtils';
import { offlineSyncManager } from '../../../../services/offline/offlineSyncManager';
import {
  broadcastMyLocation,
  stopDeliveringBroadcast,
} from '../../../../services/teamLocationService';
import { buildDeliveryChecklist } from '../../utils/deliveryChecklist';
import { areDeliveryPaymentsPaid } from '../../components/delivery/DeliveryPaymentSection';
import { flattenFormErrors, useZodForm } from '../../../../hooks/useZodForm';
import {
  deliveryRouteFormSchema,
  deliveryFinishFormSchema,
} from '../../../../../../shared-utils/operationsFormSchemas';
import { DeliveryResponsibleItem } from './deliveryPreparation.types';

interface UseDeliveryFlowActionsOptions {
  order: any;
  userProfile?: any;
  responsibles: DeliveryResponsibleItem[];
  onBack: (started?: boolean) => void;
  fulfillmentSuccessMessage: string;
}

export function useDeliveryFlowActions({
  order,
  userProfile,
  responsibles,
  onBack,
  fulfillmentSuccessMessage,
}: UseDeliveryFlowActionsOptions) {
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  // Modais
  const [showUnattendedModal, setShowUnattendedModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showStartConfirmModal, setShowStartConfirmModal] = useState(false);

  // Dados do pedido e pagamentos
  const [deliveryData, setDeliveryData] = useState(() => order.order_data || order);
  const [payments, setPayments] = useState<any[]>(() => {
    const data = order.order_data || order;
    if (Array.isArray(data.payments) && data.payments.length) return data.payments;
    const amount = Number(data.paymentsSummary?.totalOrderValue || data.totalValue || 0);
    return [
      { method: data.paymentMethod || 'Pix', amount, status: 'Pendente', fee: 0, feeType: 'fixed' },
    ];
  });

  const checklist = useMemo(() => buildDeliveryChecklist(order), [order]);

  const routeForm = useZodForm(deliveryRouteFormSchema, {
    orderId: String(order.id || ''),
    checklist: checklist.map((item) => ({ ...item, checked: Boolean(checked[item.id]) })),
    responsibles,
  });

  const finishForm = useZodForm(deliveryFinishFormSchema, {
    orderId: String(order.id || ''),
    payments,
  });

  const data = deliveryData;
  const deliveryStatus = data.deliveryStatus;
  const isInService = deliveryStatus === 'in_service' || Boolean(data.deliveryArrivedAt);
  const isInTransit =
    (deliveryStatus === 'in_progress' || Boolean(data.deliveryStartedAt)) && !isInService;
  const isInProgress = isInTransit || isInService;
  const paymentsConfirmed = areDeliveryPaymentsPaid(payments);
  const currentStep = isInService ? 3 : isInTransit ? 2 : 1;
  const headerTitle = isInService ? 'Em Atendimento' : isInTransit ? 'Em Rota' : 'Preparar Saída';

  // 1. Iniciar Rota (com validação Zod e persistência)
  const handleStartRoute = useCallback(async () => {
    if (saving) return;
    return routeForm.validateAndRun(
      {
        orderId: String(order.id || ''),
        checklist: checklist.map((item) => ({ ...item, checked: Boolean(checked[item.id]) })),
        responsibles,
      },
      async (values) => {
        setSaving(true);
        const now = new Date().toISOString();
        const primaryResponsible = responsibles[0];
        const responsibleName = responsibles.map((r) => r.name).join(', ');
        const payload = {
          deliveryStatus: 'in_progress',
          deliveryStartedAt: now,
          deliveryChecklist: values.checklist,
          deliveryResponsibles: responsibles,
          deliveryResponsibleName: responsibleName,
          deliveryResponsibleId: primaryResponsible?.id || userProfile?.id || null,
        };
        const updatedData = {
          ...data,
          ...payload,
        };

        order.order_data = updatedData;
        setDeliveryData(updatedData);

        try {
          await supabase
            .from('orders')
            .update({
              delivery_status: 'in_progress',
              delivery_started_at: now,
              order_data: updatedData,
              updated_at: now,
            })
            .eq('id', order.id);
        } catch (dbErr) {
          console.warn('[useDeliveryFlowActions] Falha na persistência direta do pedido:', dbErr);
        }

        await offlineSyncManager.recordEvent('DELIVERY_START_ROUTE', 'order', values.orderId, payload);

        if (userProfile?.id) {
          void broadcastMyLocation(userProfile, null, true, true, {
            id: order.id,
            code: formatOrderCode(order),
          });
        }

        setSaving(false);
        Alert.alert(
          'Em Rota',
          `A saída para entrega foi registrada.\nResponsável(is): ${responsibleName}.\nSua localização agora está visível para a equipe.`
        );
      },
      (errors) => Alert.alert('Revise a entrega', Object.values(flattenFormErrors(errors))[0])
    );
  }, [
    saving,
    routeForm,
    order,
    checklist,
    checked,
    responsibles,
    data,
    userProfile,
  ]);

  const handleConfirmStartRoute = useCallback(async () => {
    setShowStartConfirmModal(false);
    await handleStartRoute();
  }, [handleStartRoute]);

  // 2. Chegada no Destino
  const handleArriveAtDestination = useCallback(async () => {
    if (saving) return;
    setSaving(true);
    const now = new Date().toISOString();
    const payload = {
      deliveryStatus: 'in_service',
      deliveryArrivedAt: now,
    };
    const updatedData = {
      ...data,
      ...payload,
    };

    order.order_data = updatedData;
    setDeliveryData(updatedData);

    await offlineSyncManager.recordEvent('DELIVERY_ARRIVE_DESTINATION', 'order', order.id, payload);

    setSaving(false);
    Alert.alert('Chegada Confirmada', 'Você está no local do cliente.');
  }, [saving, data, order]);

  // 3. Finalizar Entrega
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
        const now = new Date().toISOString();
        const paidAmount = values.payments.reduce(
          (total, payment) => total + Number(payment.amount || 0),
          0
        );
        const totalValue = Number(data.paymentsSummary?.totalOrderValue || paidAmount);
        const payload = {
          payments: values.payments,
          paymentsSummary: {
            ...data.paymentsSummary,
            totalOrderValue: totalValue,
            totalPaid: paidAmount,
            totalAmountPaid: paidAmount,
            amountRemaining: Math.max(0, totalValue - paidAmount),
          },
          status: 'fulfilled',
          deliveryStatus: 'completed',
          deliveryFinishedAt: now,
        };
        const updatedData = {
          ...data,
          ...payload,
        };

        order.status = 'fulfilled';
        order.order_data = updatedData;
        setDeliveryData(updatedData);

        await offlineSyncManager.recordEvent('DELIVERY_FINISH', 'order', values.orderId, payload);

        if (userProfile?.id) {
          void stopDeliveringBroadcast(userProfile.id);
        }

        setSaving(false);
        Alert.alert('🎉 Entrega Finalizada!', fulfillmentSuccessMessage, [
          { text: 'OK', onPress: () => onBack(true) },
        ]);
      },
      (errors) => Alert.alert('Revise a entrega', Object.values(flattenFormErrors(errors))[0])
    );
  }, [
    saving,
    paymentsConfirmed,
    finishForm,
    order,
    payments,
    data,
    userProfile,
    fulfillmentSuccessMessage,
    onBack,
  ]);

  // 4. Insucesso / Não Atendido
  const handleConfirmUnattended = useCallback(
    async (reason: string, notes: string, proofUrls: string[]) => {
      const now = new Date().toISOString();
      const payload = {
        deliveryStatus: 'unattended',
        unattendedReason: reason,
        unattendedNotes: notes,
        unattendedProofUrl: proofUrls[0] || '',
        unattendedProofUrls: proofUrls,
        unattendedAt: now,
      };
      const updatedData = {
        ...data,
        ...payload,
      };

      order.order_data = updatedData;
      setDeliveryData(updatedData);
      setShowUnattendedModal(false);

      await offlineSyncManager.recordEvent('DELIVERY_UNATTENDED', 'order', order.id, payload);

      if (userProfile?.id) {
        void stopDeliveringBroadcast(userProfile.id);
      }

      Alert.alert('Insucesso Registrado', `O não atendimento foi registrado (${reason}).`, [
        { text: 'OK', onPress: () => onBack(true) },
      ]);
    },
    [data, order, userProfile, onBack]
  );

  // Retroceder Etapa 2 -> 1
  const handleStepBackToPreparation = useCallback(async () => {
    if (saving) return;
    setSaving(true);
    const updatedData = { ...data };
    delete updatedData.deliveryStatus;
    delete updatedData.deliveryStartedAt;

    order.order_data = updatedData;
    setDeliveryData(updatedData);

    await offlineSyncManager.recordEvent('DELIVERY_STEP_BACK', 'order', order.id, updatedData);

    if (userProfile?.id) {
      void stopDeliveringBroadcast(userProfile.id);
    }

    setSaving(false);
    Alert.alert('Etapa Retrocedida', 'O pedido voltou para a etapa de Preparação e Conferência.');
  }, [saving, data, order, userProfile]);

  // Retroceder Etapa 3 -> 2
  const handleStepBackToRoute = useCallback(async () => {
    if (saving) return;
    setSaving(true);
    const updatedData = {
      ...data,
      deliveryStatus: 'in_progress',
    };
    delete updatedData.deliveryArrivedAt;

    order.order_data = updatedData;
    setDeliveryData(updatedData);

    await offlineSyncManager.recordEvent('DELIVERY_STEP_BACK', 'order', order.id, updatedData);

    setSaving(false);
    Alert.alert('Etapa Retrocedida', 'O status voltou para Em Rota.');
  }, [saving, data, order]);

  // Cancelar Entrega
  const handleConfirmCancelDelivery = useCallback(async () => {
    setCancelling(true);
    try {
      const now = new Date().toISOString();
      const updatedData = { ...data };
      delete updatedData.deliveryStatus;
      delete updatedData.deliveryStartedAt;
      delete updatedData.deliveryArrivedAt;
      delete updatedData.deliveryFinishedAt;
      delete updatedData.deliveryChecklist;
      delete updatedData.unattendedReason;
      delete updatedData.unattendedNotes;
      delete updatedData.unattendedProofUrl;
      delete updatedData.unattendedProofUrls;

      const { error } = await supabase
        .from('orders')
        .update({
          status: 'scheduled',
          order_data: updatedData,
          updated_at: now,
        })
        .eq('id', order.id);

      setCancelling(false);
      setShowCancelModal(false);

      if (error) {
        Alert.alert('Erro ao Cancelar', error.message);
        return;
      }

      if (userProfile?.id) {
        void stopDeliveringBroadcast(userProfile.id);
      }

      order.status = 'scheduled';
      order.order_data = updatedData;
      setDeliveryData(updatedData);

      onBack(true);
    } catch (err: any) {
      setCancelling(false);
      setShowCancelModal(false);
      Alert.alert('Erro', err?.message || 'Falha ao cancelar entrega');
    }
  }, [data, order, userProfile, onBack]);

  const handleToggleChecklist = useCallback((id: string) => {
    setChecked((c) => ({ ...c, [id]: !c[id] }));
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
    isInService,
    isInTransit,
    isInProgress,
    currentStep,
    headerTitle,
    paymentsConfirmed,
    handleStartRoute,
    handleConfirmStartRoute,
    handleArriveAtDestination,
    handleFinishDelivery,
    handleConfirmUnattended,
    handleStepBackToPreparation,
    handleStepBackToRoute,
    handleConfirmCancelDelivery,
  };
}
