import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { CreditCard, AlertCircle, CheckCircle2 } from 'lucide-react-native';

const money = (value: unknown) =>
  Number(value || 0).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
const normalize = (value: unknown) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

export const getPendingPaymentTotal = (payments: any[]) =>
  (payments || [])
    .filter((payment) => {
      const s = normalize(payment.status || payment.paymentStatus);
      return (
        /pendente|pending|verificar|checar|a receber/.test(s) ||
        (!/pago|paid|recebido|concluido|aprovado/.test(s) && s.length > 0)
      );
    })
    .reduce((total, payment) => total + Number(payment.amount || payment.value || 0), 0);

export function OrderPaymentSection({
  payments,
  fallbackMethod,
  totalPaid,
  amountRemaining,
  totalOrderValue = 0,
  dark,
}: {
  payments: any[];
  fallbackMethod?: string;
  totalPaid?: number;
  amountRemaining?: number;
  totalOrderValue?: number;
  dark: boolean;
}) {
  const rows = payments?.length
    ? payments
    : [{ method: fallbackMethod || 'Não informada', amount: 0, status: 'Pendente' }];

  const calculatedPaid = (payments || []).reduce((acc, p) => {
    const s = normalize(p.status || p.paymentStatus);
    const isPaid = /pago|paid|recebido|concluido|aprovado/.test(s);
    return isPaid ? acc + Number(p.amount || p.value || 0) : acc;
  }, 0);

  const finalPaid = totalPaid != null ? Number(totalPaid) : calculatedPaid;
  const finalRemaining =
    amountRemaining != null
      ? Number(amountRemaining)
      : Math.max(0, Number(totalOrderValue || 0) - finalPaid);

  return (
    <View style={[styles.card, dark && styles.cardDark]}>
      <View style={styles.header}>
        <CreditCard size={18} color="#2563eb" />
        <Text style={[styles.title, dark && styles.light]}>PAGAMENTOS</Text>
      </View>

      {rows.map((payment, index) => {
        const rawStatus = String(payment.status || payment.paymentStatus || 'Pendente');
        const s = normalize(rawStatus);
        const isPending =
          /pendente|pending|verificar|checar|a receber/.test(s) ||
          !/pago|paid|recebido|concluido|aprovado/.test(s);

        const rowBorder = isPending ? (dark ? '#f59e0b' : '#fcd34d') : dark ? '#334155' : '#e2e8f0';
        const rowBg = isPending ? (dark ? '#291b00' : '#fffbeb') : dark ? '#0f172a' : '#f8fafc';

        return (
          <View
            key={index}
            style={[styles.row, { borderColor: rowBorder, backgroundColor: rowBg }]}
          >
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

      {/* Rodapé Financeiro de Pagamentos (idêntico ao ERP) */}
      <View style={[styles.summaryFooter, dark && styles.summaryFooterDark]}>
        <View style={styles.footerItem}>
          <Text style={[styles.footerLabel, dark && styles.footerLabelDark]}>PAGO</Text>
          <Text style={styles.paidValue}>R$ {money(finalPaid)}</Text>
        </View>

        <View style={[styles.footerDivider, dark && styles.footerDividerDark]} />

        <View style={styles.footerItem}>
          <Text style={[styles.footerLabel, dark && styles.footerLabelDark]}>EM ABERTO</Text>
          <Text
            style={[
              styles.remainingValue,
              finalRemaining > 0 ? styles.remainingPending : styles.remainingZero,
            ]}
          >
            R$ {money(finalRemaining)}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 10,
  },
  cardDark: { backgroundColor: '#1e293b', borderColor: '#334155' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontSize: 12, fontWeight: '900', color: '#0f172a', letterSpacing: 0.5 },
  light: { color: '#f8fafc' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  method: { flex: 1, gap: 4 },
  methodText: { fontSize: 13, fontWeight: '800', color: '#1e293b' },
  status: {
    alignSelf: 'flex-start',
    fontSize: 9,
    fontWeight: '900',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 7,
  },
  pendingBadge: { color: '#92400e', backgroundColor: '#fde68a' },
  paidBadge: { color: '#14532d', backgroundColor: '#bbf7d0' },
  amount: { fontSize: 15, fontWeight: '900' },
  summaryFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingTop: 10,
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  summaryFooterDark: {
    borderTopColor: '#334155',
  },
  footerItem: {
    alignItems: 'center',
    gap: 2,
  },
  footerLabel: {
    fontSize: 9,
    fontWeight: '900',
    color: '#64748b',
    letterSpacing: 0.5,
  },
  footerLabelDark: {
    color: '#94a3b8',
  },
  paidValue: {
    fontSize: 14,
    fontWeight: '900',
    color: '#16a34a',
  },
  footerDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#e2e8f0',
  },
  footerDividerDark: {
    backgroundColor: '#334155',
  },
  remainingValue: {
    fontSize: 14,
    fontWeight: '900',
  },
  remainingPending: {
    color: '#d97706',
  },
  remainingZero: {
    color: '#64748b',
  },
});
