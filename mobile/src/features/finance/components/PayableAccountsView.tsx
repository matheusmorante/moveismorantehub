import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, ActivityIndicator, Alert } from 'react-native';
import { Calendar, CheckCircle2, AlertTriangle, CreditCard, DollarSign } from 'lucide-react-native';
import {
  FinancialTransaction,
  fetchPayableAccounts,
  payPayableAccount,
} from '../../../services/mobileFinanceService';

interface Props {
  onAccountPaid?: () => void;
  isDarkMode?: boolean;
}

export const PayableAccountsView: React.FC<Props> = ({
  onAccountPaid,
  isDarkMode = false,
}) => {
  const [payables, setPayables] = useState<FinancialTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [payingId, setPayingId] = useState<string | null>(null);

  const loadPayables = async () => {
    setLoading(true);
    try {
      const list = await fetchPayableAccounts();
      setPayables(list);
    } catch (e) {
      console.warn('Erro ao carregar contas a pagar:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPayables();
  }, []);

  const handlePayAccount = async (item: FinancialTransaction) => {
    Alert.alert(
      'Registrar Pagamento',
      `Confirmar o pagamento de ${item.description} no valor de R$ ${item.amount.toFixed(2)}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar Pagamento',
          onPress: async () => {
            setPayingId(item.id);
            const res = await payPayableAccount(item.id, 'PIX');
            setPayingId(null);
            if (res.success) {
              loadPayables();
              if (onAccountPaid) onAccountPaid();
            } else {
              Alert.alert('Erro', res.error || 'Falha ao dar baixa na conta.');
            }
          },
        },
      ]
    );
  };

  const totalPending = payables.reduce((acc, curr) => acc + curr.amount, 0);

  if (loading) {
    return (
      <View style={styles.loadingBox}>
        <ActivityIndicator color="#3b82f6" size="large" />
      </View>
    );
  }

  return (
    <View style={[styles.container, isDarkMode && styles.containerDark]}>
      {/* Card de Resumo de Contas A Pagar */}
      <View style={[styles.summaryCard, isDarkMode && styles.summaryCardDark]}>
        <Text style={styles.summaryLabel}>Total A Pagar Pendente</Text>
        <Text style={styles.summaryValue}>
          R$ {totalPending.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
        </Text>
        <Text style={styles.summarySub}>
          {payables.length} {payables.length === 1 ? 'conta pendente' : 'contas pendentes'}
        </Text>
      </View>

      {payables.length === 0 ? (
        <View style={styles.emptyBox}>
          <CheckCircle2 size={40} color="#16a34a" />
          <Text style={[styles.emptyTitle, isDarkMode && styles.textDark]}>
            Nenhuma conta a pagar pendente
          </Text>
          <Text style={styles.emptySubtitle}>
            Todas as contas e boletos estão em dia!
          </Text>
        </View>
      ) : (
        <FlatList
          data={payables}
          keyExtractor={item => item.id}
          contentContainerStyle={{ padding: 16 }}
          renderItem={({ item }) => {
            const isOverdue = new Date(item.due_date || item.date) < new Date();
            return (
              <View style={[styles.payableCard, isDarkMode && styles.payableCardDark]}>
                <View style={styles.cardHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.itemTitle, isDarkMode && styles.textDark]}>
                      {item.counterparty || item.description}
                    </Text>
                    <Text style={styles.categoryName}>{item.category_name || 'Despesa'}</Text>
                  </View>

                  <View style={[styles.statusBadge, isOverdue ? styles.badgeOverdue : styles.badgePending]}>
                    {isOverdue ? <AlertTriangle size={12} color="#dc2626" /> : <Calendar size={12} color="#d97706" />}
                    <Text style={[styles.statusBadgeText, isOverdue ? styles.textOverdue : styles.textPending]}>
                      {isOverdue ? 'Atrasado' : 'Pendente'}
                    </Text>
                  </View>
                </View>

                <View style={styles.cardFooter}>
                  <View>
                    <Text style={styles.dateLabel}>Vencimento: {item.due_date || item.date}</Text>
                    <Text style={styles.amountText}>
                      R$ {item.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={styles.payBtn}
                    onPress={() => handlePayAccount(item)}
                    disabled={payingId === item.id}
                    activeOpacity={0.8}
                  >
                    {payingId === item.id ? (
                      <ActivityIndicator color="#ffffff" size="small" />
                    ) : (
                      <>
                        <CheckCircle2 size={14} color="#ffffff" />
                        <Text style={styles.payBtnText}>Pagar</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            );
          }}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  containerDark: {
    backgroundColor: '#0f172a',
  },
  loadingBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryCard: {
    backgroundColor: '#3b82f6',
    margin: 16,
    padding: 16,
    borderRadius: 16,
    elevation: 3,
  },
  summaryCardDark: {
    backgroundColor: '#1e40af',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#dbeafe',
    fontWeight: '600',
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#ffffff',
    marginVertical: 4,
  },
  summarySub: {
    fontSize: 11,
    color: '#93c5fd',
  },
  emptyBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 4,
  },
  textDark: {
    color: '#f8fafc',
  },
  payableCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  payableCardDark: {
    backgroundColor: '#1e293b',
    borderColor: '#334155',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  categoryName: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  badgePending: {
    backgroundColor: '#fef3c7',
  },
  badgeOverdue: {
    backgroundColor: '#fee2e2',
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  textPending: {
    color: '#d97706',
  },
  textOverdue: {
    color: '#dc2626',
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  dateLabel: {
    fontSize: 11,
    color: '#64748b',
  },
  amountText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#dc2626',
    marginTop: 2,
  },
  payBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#16a34a',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  payBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
  },
});
