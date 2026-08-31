import React, { useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { supabase } from '../../../services/supabaseClient';
import { formatFullAddress, formatOrderCode } from '../../../utils/orderUtils';
import { buildDeliveryChecklist } from '../utils/deliveryChecklist';
import { DeliveryHeader } from '../components/delivery/DeliveryHeader';
import { DeliveryPreparationStep } from '../components/delivery/DeliveryPreparationStep';
import { DeliveryRouteStep } from '../components/delivery/DeliveryRouteStep';
import { DeliveryServiceStep } from '../components/delivery/DeliveryServiceStep';
import { UnattendedModal } from '../components/delivery/UnattendedModal';
import { DeliveryQuickContactBar } from '../components/delivery/DeliveryQuickContactBar';
import { CancelDeliveryConfirmModal } from '../components/delivery/CancelDeliveryConfirmModal';
import { DeliveryStepProgressIndicator } from '../components/delivery/DeliveryStepProgressIndicator';
import { areDeliveryPaymentsPaid } from '../components/delivery/DeliveryPaymentSection';

type Props = { order: any; isDarkMode: boolean; onBack: (started?: boolean) => void };

export function DeliveryPreparationScreen({ order, isDarkMode, onBack }: Props) {
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [showUnattendedModal, setShowUnattendedModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [deliveryData, setDeliveryData] = useState(() => order.order_data || order);
  const [payments, setPayments] = useState<any[]>(() => {
    const data = order.order_data || order;
    if (Array.isArray(data.payments) && data.payments.length) return data.payments;
    const amount = Number(data.paymentsSummary?.totalOrderValue || data.totalValue || 0);
    return [{ method: data.paymentMethod || 'Pix', amount, status: 'Pendente', fee: 0, feeType: 'fixed' }];
  });

  const checklist = useMemo(() => buildDeliveryChecklist(order), [order]);
  const data = deliveryData;
  const customer = data.customerData || {};
  const fullAddress = formatFullAddress(data.shipping || {}, customer);
  const items = data.items || order.items || data.assistanceItems || order.assistance_items || [];

  // Status de entrega: 'not_started' | 'in_transit' | 'in_service'
  const deliveryStatus = data.deliveryStatus;
  const isInService = deliveryStatus === 'in_service' || Boolean(data.deliveryArrivedAt);
  const isInTransit = (deliveryStatus === 'in_progress' || Boolean(data.deliveryStartedAt)) && !isInService;
  const isInProgress = isInTransit || isInService;
  const paymentsConfirmed = areDeliveryPaymentsPaid(payments);

  const headerTitle = isInService
    ? 'Em Atendimento'
    : isInTransit
      ? 'Em Rota'
      : 'Preparar Saída';

  // 1. Iniciar Rota
  const handleStartRoute = async () => {
    if (saving) return;
    setSaving(true);
    const now = new Date().toISOString();
    const updatedData = {
      ...data,
      deliveryStatus: 'in_progress',
      deliveryStartedAt: now,
      deliveryChecklist: checklist.map(item => ({ ...item, checked: Boolean(checked[item.id]) })),
    };
    const { error } = await supabase.from('orders').update({
      order_data: updatedData,
      updated_at: now,
    }).eq('id', order.id);
    setSaving(false);
    if (error) return Alert.alert('Erro', error.message);
    Alert.alert('Em Rota', 'A saída para entrega foi registrada.');
    order.order_data = updatedData;
    setDeliveryData(updatedData);
  };

  // 2. Cheguei no Destino
  const handleArriveAtDestination = async () => {
    if (saving) return;
    setSaving(true);
    const now = new Date().toISOString();
    const updatedData = {
      ...data,
      deliveryStatus: 'in_service',
      deliveryArrivedAt: now,
    };
    const { error } = await supabase.from('orders').update({
      order_data: updatedData,
      updated_at: now,
    }).eq('id', order.id);
    setSaving(false);
    if (error) return Alert.alert('Erro', error.message);
    order.order_data = updatedData;
    setDeliveryData(updatedData);
    Alert.alert('Chegada Confirmada', 'Você está no local do cliente.');
  };

  // 3. Finalizar Entrega (Atendido / Sucesso)
  const handleFinishDelivery = async () => {
    if (saving) return;
    if (!paymentsConfirmed) {
      Alert.alert('Pagamento pendente', 'Confirme todos os pagamentos como pagos antes de finalizar a entrega.');
      return;
    }
    setSaving(true);
    const now = new Date().toISOString();
    const paidAmount = payments.reduce((total, payment) => total + Number(payment.amount || 0), 0);
    const totalValue = Number(data.paymentsSummary?.totalOrderValue || paidAmount);
    const updatedData = {
      ...data,
      payments,
      paymentsSummary: { ...data.paymentsSummary, totalOrderValue: totalValue, totalPaid: paidAmount, totalAmountPaid: paidAmount, amountRemaining: Math.max(0, totalValue - paidAmount) },
      status: 'fulfilled',
      deliveryStatus: 'completed',
      deliveryFinishedAt: now,
    };
    const { error } = await supabase.from('orders').update({
      status: 'fulfilled',
      order_data: updatedData,
      updated_at: now,
    }).eq('id', order.id);
    setSaving(false);
    if (error) return Alert.alert('Erro', error.message);
    order.status = 'fulfilled';
    order.order_data = updatedData;
    Alert.alert(
      '🎉 Entrega Finalizada!',
      'O pedido foi marcado como ATENDIDO com sucesso.',
      [{ text: 'OK', onPress: () => onBack(true) }]
    );
  };

  // 4. Registrar Não Atendido
  const handleConfirmUnattended = async (reason: string, notes: string, proofUrls: string[]) => {
    const now = new Date().toISOString();
    const updatedData = {
      ...data,
      deliveryStatus: 'unattended',
      unattendedReason: reason,
      unattendedNotes: notes,
      unattendedProofUrl: proofUrls[0] || '',
      unattendedProofUrls: proofUrls,
      unattendedAt: now,
    };
    const { error } = await supabase.from('orders').update({
      order_data: updatedData,
      updated_at: now,
    }).eq('id', order.id);
    setShowUnattendedModal(false);
    if (error) return Alert.alert('Erro', error.message);
    Alert.alert(
      'Insucesso Registrado',
      `O não atendimento foi registrado (${reason}).`,
      [{ text: 'OK', onPress: () => onBack(true) }]
    );
  };

  // Retroceder da Etapa 2 (Em Rota) para a Etapa 1 (Preparação)
  const handleStepBackToPreparation = async () => {
    if (saving) return;
    setSaving(true);
    const now = new Date().toISOString();
    const updatedData = { ...data };
    delete updatedData.deliveryStatus;
    delete updatedData.deliveryStartedAt;

    const { error } = await supabase.from('orders').update({
      order_data: updatedData,
      updated_at: now,
    }).eq('id', order.id);

    setSaving(false);
    if (error) return Alert.alert('Erro', error.message);

    order.order_data = updatedData;
    setDeliveryData(updatedData);
    Alert.alert('Etapa Retrocedida', 'O pedido voltou para a etapa de Preparação e Conferência.');
  };

  // Retroceder da Etapa 3 (Em Atendimento) para a Etapa 2 (Em Rota)
  const handleStepBackToRoute = async () => {
    if (saving) return;
    setSaving(true);
    const now = new Date().toISOString();
    const updatedData = {
      ...data,
      deliveryStatus: 'in_progress',
    };
    delete updatedData.deliveryArrivedAt;

    const { error } = await supabase.from('orders').update({
      order_data: updatedData,
      updated_at: now,
    }).eq('id', order.id);

    setSaving(false);
    if (error) return Alert.alert('Erro', error.message);

    order.order_data = updatedData;
    setDeliveryData(updatedData);
    Alert.alert('Etapa Retrocedida', 'O status voltou para Em Rota.');
  };

  // 5. Cancelar Entrega (Execução com confirmação)
  const handleConfirmCancelDelivery = async () => {
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

      const { error } = await supabase.from('orders').update({
        status: 'scheduled',
        order_data: updatedData,
        updated_at: now,
      }).eq('id', order.id);

      setCancelling(false);
      setShowCancelModal(false);

      if (error) {
        Alert.alert('Erro ao Cancelar', error.message);
        return;
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
  };

  const currentStep = isInService ? 3 : isInTransit ? 2 : 1;

  return (
    <View style={[styles.container, isDarkMode && styles.dark]}>
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

      {/* Barra de Contato Rápido (Cliente e Vendedor) em todas as etapas */}
      <DeliveryQuickContactBar order={order} isDarkMode={isDarkMode} />

      {/* Indicador Informativo da Etapa Atual (1. Preparação -> 2. Em Rota -> 3. Em Atendimento) */}
      <DeliveryStepProgressIndicator currentStep={currentStep} isDarkMode={isDarkMode} />

      <ScrollView contentContainerStyle={styles.content}>
        {isInService ? (
          <DeliveryServiceStep
            order={order}
            items={items}
            customer={customer}
            fullAddress={fullAddress}
            isDarkMode={isDarkMode}
            arrivedAt={data.deliveryArrivedAt || data.deliveryStartedAt}
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
            startedAt={data.deliveryStartedAt}
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
            onToggleChecklist={id => setChecked(c => ({ ...c, [id]: !c[id] }))}
            onStartDelivery={handleStartRoute}
            saving={saving}
            isDarkMode={isDarkMode}
          />
        )}
      </ScrollView>

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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  dark: { backgroundColor: '#0f172a' },
  content: { padding: 16, gap: 14, paddingBottom: 36 },
});
