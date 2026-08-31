import React from 'react';
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { CreditCard, PlusCircle, CheckCircle2, CircleDollarSign } from 'lucide-react-native';

type Payment = { method?: string; amount?: number; status?: string; fee?: number; feeType?: string };
type Props = { payments: Payment[]; onChange: (payments: Payment[]) => void; isDarkMode: boolean };
const METHODS = ['Pix', 'Débito', 'Crédito', 'Dinheiro'];
const paid = (status?: string) => ['pago', 'paid'].includes(String(status || '').toLowerCase());
const currency = (value?: number) => Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export const DeliveryPaymentSection = ({ payments, onChange, isDarkMode }: Props) => {
  const update = (index: number, patch: Partial<Payment>) => onChange(payments.map((payment, current) => current === index ? { ...payment, ...patch } : payment));
  const selectMethod = (index: number) => Alert.alert('Forma de pagamento', 'Escolha a forma recebida na entrega.', METHODS.map(method => ({ text: method, onPress: () => update(index, { method }) })));
  const selectStatus = (index: number) => Alert.alert('Status do pagamento', 'Confirme o recebimento antes de finalizar a entrega.', [
    { text: 'Pendente - no ato da entrega', onPress: () => update(index, { status: 'Pendente' }) },
    { text: 'Pago', onPress: () => update(index, { status: 'Pago' }) },
    { text: 'Cancelar', style: 'cancel' },
  ]);

  return <View style={[styles.card, isDarkMode && styles.cardDark]}>
    <View style={styles.header}><View style={styles.titleRow}><CircleDollarSign size={18} color="#16a34a" /><Text style={[styles.title, isDarkMode && styles.light]}>Pagamento na entrega</Text></View><Text style={styles.hint}>Confirme cada pagamento para liberar a finalização.</Text></View>
    {payments.map((payment, index) => <View key={`${index}-${payment.method}`} style={[styles.payment, isDarkMode && styles.paymentDark]}>
      <View style={styles.paymentTop}><Text style={[styles.paymentLabel, isDarkMode && styles.light]}>Pagamento {index + 1}</Text><Text style={[styles.amount, isDarkMode && styles.light]}>{currency(payment.amount)}</Text></View>
      <View style={styles.controls}><TouchableOpacity onPress={() => selectMethod(index)} style={styles.select}><CreditCard size={15} color="#2563eb" /><Text style={styles.selectText}>{payment.method || 'Escolher forma'}</Text></TouchableOpacity><TextInput value={String(payment.amount ?? '')} onChangeText={value => update(index, { amount: Number(value.replace(',', '.')) || 0 })} keyboardType="decimal-pad" style={[styles.amountInput, isDarkMode && styles.inputDark]} /></View>
      <TouchableOpacity disabled={paid(payment.status)} onPress={() => selectStatus(index)} style={[styles.status, paid(payment.status) ? styles.statusPaid : styles.statusPending]}><CheckCircle2 size={16} color={paid(payment.status) ? '#166534' : '#b45309'} /><Text style={[styles.statusText, paid(payment.status) ? styles.paidText : styles.pendingText]}>{paid(payment.status) ? 'Pago' : 'Pendente - no ato da entrega'}</Text></TouchableOpacity>
    </View>)}
    <TouchableOpacity onPress={() => onChange([...payments, { method: 'Pix', amount: 0, status: 'Pendente', fee: 0, feeType: 'fixed' }])} style={styles.add}><PlusCircle size={17} color="#2563eb" /><Text style={styles.addText}>Adicionar forma de pagamento</Text></TouchableOpacity>
  </View>;
};

export const areDeliveryPaymentsPaid = (payments: Payment[]) => payments.length > 0 && payments.every(payment => paid(payment.status));

const styles = StyleSheet.create({
  card: { backgroundColor: '#fff', borderRadius: 20, padding: 16, borderWidth: 1, borderColor: '#bbf7d0', gap: 12 }, cardDark: { backgroundColor: '#1e293b', borderColor: '#166534' }, header: { gap: 3 }, titleRow: { flexDirection: 'row', alignItems: 'center', gap: 7 }, title: { fontSize: 14, fontWeight: '900', color: '#0f172a' }, hint: { fontSize: 11, color: '#64748b', fontWeight: '600' }, light: { color: '#f8fafc' }, payment: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 14, padding: 12, gap: 9, backgroundColor: '#f8fafc' }, paymentDark: { backgroundColor: '#0f172a', borderColor: '#334155' }, paymentTop: { flexDirection: 'row', justifyContent: 'space-between' }, paymentLabel: { fontSize: 11, fontWeight: '900', color: '#334155' }, amount: { fontSize: 13, fontWeight: '900', color: '#0f172a' }, controls: { flexDirection: 'row', gap: 8 }, select: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#eff6ff', borderRadius: 10, paddingHorizontal: 10, minHeight: 40 }, selectText: { color: '#1d4ed8', fontSize: 12, fontWeight: '800' }, amountInput: { width: 92, backgroundColor: '#fff', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, paddingHorizontal: 8, color: '#0f172a', fontWeight: '800', textAlign: 'right' }, inputDark: { backgroundColor: '#1e293b', borderColor: '#475569', color: '#f8fafc' }, status: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderRadius: 10, minHeight: 40 }, statusPending: { backgroundColor: '#fef3c7', borderWidth: 1, borderColor: '#fcd34d' }, statusPaid: { backgroundColor: '#dcfce7', borderWidth: 1, borderColor: '#86efac' }, statusText: { fontSize: 12, fontWeight: '900' }, pendingText: { color: '#b45309' }, paidText: { color: '#166534' }, add: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderWidth: 1, borderStyle: 'dashed', borderColor: '#93c5fd', borderRadius: 12, paddingVertical: 11 }, addText: { fontSize: 12, fontWeight: '900', color: '#2563eb' },
});
