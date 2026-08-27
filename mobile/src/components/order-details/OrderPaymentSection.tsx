import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { CreditCard } from 'lucide-react-native';

const money = (value: unknown) => Number(value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const normalize = (value: unknown) => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

export const getPendingPaymentTotal = (payments: any[]) => (payments || [])
  .filter(payment => /pendente|pending/.test(normalize(payment.status || payment.paymentStatus)))
  .reduce((total, payment) => total + Number(payment.amount || payment.value || 0), 0);

export function OrderPaymentSection({ payments, fallbackMethod, dark }: { payments: any[]; fallbackMethod?: string; dark: boolean }) {
  const rows = payments?.length ? payments : [{ method: fallbackMethod || 'Não informada', amount: 0, status: 'Não informado' }];
  return <View style={[styles.card, dark && styles.cardDark]}>
    <View style={styles.header}><CreditCard size={18} color="#16a34a" /><Text style={[styles.title, dark && styles.light]}>FORMA DE PAGAMENTO</Text></View>
    {rows.map((payment, index) => {
      const status = String(payment.status || payment.paymentStatus || 'Não informado');
      const pending = /pendente|pending/.test(normalize(status));
      return <View key={index} style={[styles.row, dark && styles.rowDark]}>
        <View style={styles.method}><Text style={[styles.methodText, dark && styles.light]}>{payment.method || payment.paymentMethod || payment.type || 'Não informada'}</Text><Text style={[styles.status, pending ? styles.pending : styles.paid]}>{status.toUpperCase()}</Text></View>
        <Text style={styles.amount}>R$ {money(payment.amount || payment.value)}</Text>
      </View>;
    })}
  </View>;
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#fff', padding: 16, borderRadius: 20, borderWidth: 1, borderColor: '#e2e8f0', gap: 10 }, cardDark: { backgroundColor: '#1e293b', borderColor: '#334155' }, header: { flexDirection: 'row', alignItems: 'center', gap: 8 }, title: { fontSize: 12, fontWeight: '900', color: '#0f172a' }, light: { color: '#f8fafc' }, row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: 11, backgroundColor: '#f8fafc', borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0' }, rowDark: { backgroundColor: '#0f172a', borderColor: '#334155' }, method: { flex: 1, gap: 4 }, methodText: { fontSize: 13, fontWeight: '800', color: '#334155' }, status: { alignSelf: 'flex-start', fontSize: 9, fontWeight: '900', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 7 }, pending: { color: '#b45309', backgroundColor: '#fef3c7' }, paid: { color: '#15803d', backgroundColor: '#dcfce7' }, amount: { fontSize: 14, fontWeight: '900', color: '#16a34a' },
});

