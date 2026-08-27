import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AlertCircle } from 'lucide-react-native';

type Observation = { title: string; text: string; type: 'general' | 'address' | 'delivery' | 'customer' };

const splitObservation = (observation: Observation): Observation[] => observation.text
  .split(/[;\n]+/)
  .map(text => text.trim())
  .filter(Boolean)
  .map(text => ({ ...observation, text }));

export function buildOrderObservations(order: any): Observation[] {
  const data = order.order_data || order;
  const shipping = data.shipping || {};
  const customer = data.customerData || data.customer || {};
  const address = shipping.deliveryAddress || shipping.address || customer.address || {};
  const candidates: Observation[] = [
    { title: 'Observação do pedido', text: order.observation || data.observation || order.observations || data.observations || order.notes || data.notes || '', type: 'general' },
    { title: 'Endereço / referência', text: address.observation || address.notes || shipping.observation || shipping.deliveryObservation || '', type: 'address' },
    { title: 'Instrução de entrega', text: shipping.notes || shipping.instructions || data.deliveryNotes || '', type: 'delivery' },
    { title: 'Observação do cliente', text: customer.notes || customer.observation || '', type: 'customer' },
  ];
  const seen = new Set<string>();
  return candidates.flatMap(splitObservation).filter(item => {
    const key = item.text.toLocaleLowerCase('pt-BR');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function OrderObservationLabels({ observations, dark }: { observations: Observation[]; dark: boolean }) {
  if (!observations.length) return null;
  return <View style={[styles.container, dark && styles.dark]}>
    <View style={styles.heading}><AlertCircle size={16} color="#b45309" /><Text style={styles.title}>Observações do pedido</Text></View>
    <View style={styles.labels}>{observations.map((item, index) => <View key={`${item.type}-${index}`} style={[styles.label, dark && styles.labelDark]}><Text style={[styles.text, dark && styles.textDark]}>{item.text}</Text></View>)}</View>
  </View>;
}

const styles = StyleSheet.create({
  container: { padding: 14, borderRadius: 18, borderWidth: 1, gap: 10, backgroundColor: '#fef3c7', borderColor: '#fde68a' }, dark: { backgroundColor: '#1e293b', borderColor: '#334155' }, heading: { flexDirection: 'row', alignItems: 'center', gap: 7 }, title: { fontSize: 11, fontWeight: '900', color: '#b45309', textTransform: 'uppercase' }, labels: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 }, label: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#fde68a', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 7 }, labelDark: { backgroundColor: '#0f172a', borderColor: '#475569' }, text: { fontSize: 12, fontWeight: '800', color: '#92400e' }, textDark: { color: '#f8fafc' },
});
