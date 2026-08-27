import React, { useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { supabase } from '../../../services/supabaseClient';
import { formatFullAddress } from '../../../utils/orderUtils';
import { buildDeliveryChecklist } from '../utils/deliveryChecklist';
import { DeliveryHeader } from '../components/delivery/DeliveryHeader';
import { DeliveryPreparationStep } from '../components/delivery/DeliveryPreparationStep';
import { DeliveryRouteStep } from '../components/delivery/DeliveryRouteStep';
import { DeliveryServiceStep } from '../components/delivery/DeliveryServiceStep';
import { UnattendedModal } from '../components/delivery/UnattendedModal';

type Props = { order: any; isDarkMode: boolean; onBack: (started?: boolean) => void };

export function DeliveryPreparationScreen({ order, isDarkMode, onBack }: Props) {
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [showUnattendedModal, setShowUnattendedModal] = useState(false);

  const checklist = useMemo(() => buildDeliveryChecklist(order), [order]);
  const data = order.order_data || order;
  const customer = data.customerData || {};
  const fullAddress = formatFullAddress(data.shipping || {}, customer);
  const items = data.items || order.items || data.assistanceItems || order.assistance_items || [];

  // Status de entrega: 'not_started' | 'in_transit' | 'in_service'
  const deliveryStatus = data.deliveryStatus;
  const isInService = deliveryStatus === 'in_service' || Boolean(data.deliveryArrivedAt);
  const isInTransit = (deliveryStatus === 'in_progress' || Boolean(data.deliveryStartedAt)) && !isInService;
  const isInProgress = isInTransit || isInService;

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
    onBack(true);
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
    Alert.alert('Chegada Confirmada', 'Você está no local do cliente.');
  };

  // 3. Finalizar Entrega (Atendido / Sucesso)
  const handleFinishDelivery = async () => {
    if (saving) return;
    setSaving(true);
    const now = new Date().toISOString();
    const updatedData = {
      ...data,
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
    Alert.alert(
      '🎉 Entrega Finalizada!',
      'O pedido foi marcado como ATENDIDO com sucesso.',
      [{ text: 'OK', onPress: () => onBack(true) }]
    );
  };

  // 4. Registrar Não Atendido
  const handleConfirmUnattended = async (reason: string, notes: string, proofUrl: string) => {
    const now = new Date().toISOString();
    const updatedData = {
      ...data,
      deliveryStatus: 'unattended',
      unattendedReason: reason,
      unattendedNotes: notes,
      unattendedProofUrl: proofUrl,
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

  // 5. Cancelar Entrega
  const handleCancelDelivery = () => {
    Alert.alert(
      'Cancelar Entrega',
      'Tem certeza que deseja cancelar a entrega em andamento? O pedido voltará ao estado de agendado.',
      [
        { text: 'Não', style: 'cancel' },
        {
          text: 'Sim, Cancelar',
          style: 'destructive',
          onPress: async () => {
            setCancelling(true);
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

            const { error } = await supabase.from('orders').update({
              order_data: updatedData,
              updated_at: now,
            }).eq('id', order.id);
            setCancelling(false);
            if (error) return Alert.alert('Erro', error.message);
            Alert.alert('Entrega Cancelada', 'O pedido voltou ao estado de agendado.', [{ text: 'OK', onPress: () => onBack(true) }]);
          },
        },
      ]
    );
  };

  return (
    <View style={[styles.container, isDarkMode && styles.dark]}>
      <DeliveryHeader
        title={headerTitle}
        orderId={order.id}
        isDarkMode={isDarkMode}
        isInProgress={isInProgress}
        onBack={() => onBack()}
        onCancelDelivery={handleCancelDelivery}
        cancelling={cancelling}
      />

      <ScrollView contentContainerStyle={styles.content}>
        {isInService ? (
          <DeliveryServiceStep
            order={order}
            items={items}
            isDarkMode={isDarkMode}
            arrivedAt={data.deliveryArrivedAt || data.deliveryStartedAt}
            onOpenUnattendedModal={() => setShowUnattendedModal(true)}
            onFinishDelivery={handleFinishDelivery}
            finishing={saving}
          />
        ) : isInTransit ? (
          <DeliveryRouteStep
            order={order}
            customer={customer}
            fullAddress={fullAddress}
            isDarkMode={isDarkMode}
            startedAt={data.deliveryStartedAt}
            onArriveAtDestination={handleArriveAtDestination}
            loading={saving}
          />
        ) : (
          <DeliveryPreparationStep
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  dark: { backgroundColor: '#0f172a' },
  content: { padding: 16, gap: 14, paddingBottom: 36 },
});
