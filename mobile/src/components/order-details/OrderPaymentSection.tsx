import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { CreditCard, AlertCircle, CheckCircle2 } from 'lucide-react-native';

const money = (value: unknown) => Number(value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const normalize = (value: unknown) => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

export const getPendingPaymentTotal = (payments: any[]) => (payments || [])
  .filter(payment => {
    const s = normalize(payment.status || payment.paymentStatus);
    return /pendente|pending|verificar|checar|a receber/.test(s) || (!/pago|paid|recebido|concluido|aprovado/.test(s) && s.length > 0);
  })
  .reduce((total, payment) => total + Number(payment.amount || payment.value || 0), 0);

export function OrderPaymentSection({ payments, fallbackMethod, dark }: { payments: any[]; fallbackMethod?: string; dark: boolean }) {
  const rows = payments?.length ? payments : [{ method: fallbackMethod || 'Não informada', amount: 0, status: 'Pendente' }];
  
  // Verifica se há pendência ou se todos estão pagos
  const hasPending = rows.some(payment => {
    const s = normalize(payment.status || payment.paymentStatus);
    return /pendente|pending|verificar|checar|a receber/.test(s) || !/pago|paid|recebido|concluido|aprovado/.test(s);
  });

  const cardBorderColor = hasPending ? '#f59e0b' : '#10b981';
  const cardBgColor = dark 
    ? (hasPending ? '#291b00' : '#052e16') 
    : (hasPending ? '#fffbeb' : '#f0fdf4');
  const headerIconColor = hasPending ? '#d97706' : '#16a34a';

  return (
    <View style={[
      styles.card, 
      { borderColor: cardBorderColor, backgroundColor: cardBgColor },
      dark && styles.cardDark
    ]}>
      <View style={styles.header}>
        {hasPending ? (
          <AlertCircle size={18} color={headerIconColor} />
        ) : (
          <CheckCircle2 size={18} color={headerIconColor} />
        )}
        <Text style={[styles.title, { color: hasPending ? (dark ? '#fde68a' : '#b45309') : (dark ? '#86efac' : '#15803d') }]}>
          FORMA DE PAGAMENTO {hasPending ? '• PENDENTE / VERIFICAR' : '• PAGO'}
        </Text>
      </View>

      {rows.map((payment, index) => {
        const rawStatus = String(payment.status || payment.paymentStatus || 'Pendente');
        const s = normalize(rawStatus);
        const isPending = /pendente|pending|verificar|checar|a receber/.test(s) || !/pago|paid|recebido|concluido|aprovado/.test(s);

        const rowBorder = isPending ? '#fcd34d' : '#86efac';
        const rowBg = dark
          ? (isPending ? '#1f1501' : '#062312')
          : (isPending ? '#fef3c7' : '#dcfce7');

        return (
          <View key={index} style={[
            styles.row, 
            { borderColor: rowBorder, backgroundColor: rowBg }
          ]}>
            <View style={styles.method}>
              <Text style={[styles.methodText, dark && styles.light]}>
                {payment.method || payment.paymentMethod || payment.type || 'Não informada'}
              </Text>
              <Text style={[styles.status, isPending ? styles.pendingBadge : styles.paidBadge]}>
                {rawStatus.toUpperCase()}
              </Text>
            </View>
            <Text style={[styles.amount, { color: isPending ? '#d97706' : '#16a34a' }]}>
              R$ {money(payment.amount || payment.value)}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: 16, borderRadius: 20, borderWidth: 1.5, gap: 10 },
  cardDark: { borderWidth: 1.5 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontSize: 12, fontWeight: '900', letterSpacing: 0.5 },
  light: { color: '#f8fafc' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: 12, borderRadius: 14, borderWidth: 1 },
  method: { flex: 1, gap: 4 },
  methodText: { fontSize: 13, fontWeight: '800', color: '#1e293b' },
  status: { alignSelf: 'flex-start', fontSize: 9, fontWeight: '900', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 7 },
  pendingBadge: { color: '#92400e', backgroundColor: '#fde68a' },
  paidBadge: { color: '#14532d', backgroundColor: '#bbf7d0' },
  amount: { fontSize: 15, fontWeight: '900' },
});

