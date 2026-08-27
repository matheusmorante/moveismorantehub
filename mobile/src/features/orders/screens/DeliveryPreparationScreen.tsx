import React, { useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ArrowLeft, Check, ClipboardCheck, MapPin, User } from 'lucide-react-native';
import { supabase } from '../../../services/supabaseClient';
import { formatFullAddress } from '../../../utils/orderUtils';
import { SlideHoldToStart } from '../components/SlideHoldToStart';
import { buildDeliveryChecklist } from '../utils/deliveryChecklist';

type Props = { order: any; isDarkMode: boolean; onBack: (started?: boolean) => void };

export function DeliveryPreparationScreen({ order, isDarkMode, onBack }: Props) {
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const checklist = useMemo(() => buildDeliveryChecklist(order), [order]);
  const data = order.order_data || order;
  const customer = data.customerData || {};
  const startDelivery = async () => {
    if (saving) return;
    setSaving(true);
    const startedAt = new Date().toISOString();
    const updatedData = {
      ...data,
      deliveryStatus: 'in_progress',
      deliveryStartedAt: startedAt,
      deliveryChecklist: checklist.map(item => ({ ...item, checked: Boolean(checked[item.id]) })),
    };
    const { error } = await supabase.from('orders').update({
      order_data: updatedData,
      updated_at: startedAt,
    }).eq('id', order.id);
    setSaving(false);
    if (error) return Alert.alert('Não foi possível iniciar', error.message);
    Alert.alert('Entrega iniciada', 'A saída para entrega foi registrada.', [{ text: 'OK', onPress: () => onBack(true) }]);
  };

  return (
    <View style={[styles.container, isDarkMode && styles.dark]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => onBack()} style={styles.back}><ArrowLeft size={22} color="#2563eb" /></TouchableOpacity>
        <View><Text style={[styles.title, isDarkMode && styles.light]}>Preparar entrega</Text><Text style={styles.subtitle}>Pedido #{String(order.id).slice(-6).toUpperCase()}</Text></View>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.info, isDarkMode && styles.cardDark]}>
          <View style={styles.row}><User size={18} color="#2563eb" /><Text style={[styles.infoText, isDarkMode && styles.light]}>{customer.fullName || 'Cliente'}</Text></View>
          <View style={styles.row}><MapPin size={18} color="#ef4444" /><Text style={[styles.address, isDarkMode && styles.light]}>{formatFullAddress(data.shipping || {}, customer)}</Text></View>
        </View>
        <View style={styles.heading}><ClipboardCheck size={20} color="#16a34a" /><Text style={[styles.headingText, isDarkMode && styles.light]}>Checklist antes de sair</Text></View>
        {checklist.map(item => (
          <TouchableOpacity key={item.id} style={[styles.item, isDarkMode && styles.cardDark]} onPress={() => setChecked(current => ({ ...current, [item.id]: !current[item.id] }))}>
            <View style={[styles.checkbox, checked[item.id] && styles.checkboxOn]}>{checked[item.id] && <Check size={17} color="#ffffff" strokeWidth={3} />}</View>
            <Text style={[styles.itemText, isDarkMode && styles.light]}>{item.label}</Text>
          </TouchableOpacity>
        ))}
        <Text style={styles.safety}>O checklist é opcional. Para evitar acionamento acidental, deslize o caminhão da esquerda para a direita duas vezes.</Text>
        <SlideHoldToStart disabled={saving} onComplete={startDelivery} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' }, dark: { backgroundColor: '#0f172a' }, light: { color: '#f8fafc' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  back: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#dbeafe', alignItems: 'center', justifyContent: 'center' }, title: { fontSize: 18, fontWeight: '900', color: '#0f172a' }, subtitle: { fontSize: 11, fontWeight: '700', color: '#64748b' },
  content: { padding: 16, gap: 12, paddingBottom: 32 }, info: { backgroundColor: '#fff', padding: 16, borderRadius: 18, gap: 10, borderWidth: 1, borderColor: '#e2e8f0' }, cardDark: { backgroundColor: '#1e293b', borderColor: '#334155' }, row: { flexDirection: 'row', alignItems: 'center', gap: 9 }, infoText: { fontSize: 15, fontWeight: '900', color: '#0f172a' }, address: { flex: 1, fontSize: 12, fontWeight: '700', color: '#475569' },
  heading: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 }, headingText: { fontSize: 15, fontWeight: '900', color: '#0f172a' }, item: { minHeight: 62, backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#e2e8f0', flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 }, checkbox: { width: 26, height: 26, borderRadius: 7, borderWidth: 2, borderColor: '#94a3b8', alignItems: 'center', justifyContent: 'center' }, checkboxOn: { backgroundColor: '#16a34a', borderColor: '#16a34a' }, itemText: { flex: 1, fontSize: 13, lineHeight: 18, fontWeight: '800', color: '#334155' }, safety: { fontSize: 11, lineHeight: 16, textAlign: 'center', color: '#64748b', marginTop: 8 },
});
