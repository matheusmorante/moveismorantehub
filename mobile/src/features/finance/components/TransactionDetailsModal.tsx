import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { X, ArrowUpRight, ArrowDownLeft, Bot, User, RotateCcw } from 'lucide-react-native';
import { FinancialTransaction, reverseFinancialTransaction } from '../../../services/mobileFinanceService';

interface Props {
  visible: boolean;
  transaction: FinancialTransaction | null;
  onClose: () => void;
  onSuccess: () => void;
  canReverse?: boolean;
  isDarkMode?: boolean;
}

export const TransactionDetailsModal: React.FC<Props> = ({
  visible,
  transaction,
  onClose,
  onSuccess,
  canReverse = true,
  isDarkMode = false,
}) => {
  const [reversing, setReversing] = useState(false);

  if (!transaction) return null;

  const isIncome = transaction.type === 'income';

  const formatCurrency = (val: number) => {
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const handleReverse = () => {
    Alert.alert(
      'Estornar Movimentação',
      'Tem certeza que deseja estornar esta movimentação financeira? O saldo do período será atualizado.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sim, Estornar',
          style: 'destructive',
          onPress: async () => {
            setReversing(true);
            const res = await reverseFinancialTransaction(transaction.id);
            setReversing(false);
            if (res.success) {
              Alert.alert('Sucesso', 'Movimentação estornada com sucesso.');
              onSuccess();
              onClose();
            } else {
              Alert.alert('Erro ao Estornar', res.error || 'Não foi possível estornar a movimentação.');
            }
          },
        },
      ]
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.modalContent, isDarkMode && styles.modalContentDark]}>
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <View style={[styles.iconBox, isIncome ? styles.incomeIconBg : styles.expenseIconBg]}>
                {isIncome ? (
                  <ArrowUpRight size={18} color="#16a34a" />
                ) : (
                  <ArrowDownLeft size={18} color="#dc2626" />
                )}
              </View>
              <Text style={[styles.title, isDarkMode && styles.titleDark]}>Detalhes da Transação</Text>
            </View>

            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={20} color={isDarkMode ? '#94a3b8' : '#64748b'} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            {/* Valor */}
            <View style={styles.amountBox}>
              <Text style={[styles.amountText, isIncome ? styles.incomeText : styles.expenseText]}>
                {isIncome ? '+' : '-'} {formatCurrency(transaction.amount)}
              </Text>
              <Text style={[styles.descriptionText, isDarkMode && styles.descriptionTextDark]}>
                {transaction.description}
              </Text>
            </View>

            {/* Grid de Detalhes */}
            <View style={styles.detailGroup}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Categoria</Text>
                <Text style={[styles.detailValue, isDarkMode && styles.detailValueDark]}>
                  {transaction.category_name || (isIncome ? 'Outras entradas' : 'Outras saídas')}
                </Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Natureza no Resultado</Text>
                <Text style={[styles.detailValue, isDarkMode && styles.detailValueDark]}>
                  {transaction.result_nature === 'NAO_AFETA_RESULTADO'
                    ? 'Não afeta resultado'
                    : transaction.result_nature === 'RECEITA'
                    ? 'Receita'
                    : transaction.result_nature === 'DESPESA'
                    ? 'Despesa'
                    : isIncome
                    ? 'Receita'
                    : 'Despesa'}
                </Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Data e Horário</Text>
                <Text style={[styles.detailValue, isDarkMode && styles.detailValueDark]}>
                  {transaction.date} {transaction.transaction_time ? `às ${transaction.transaction_time}` : ''}
                </Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Forma de Pagamento</Text>
                <Text style={[styles.detailValue, isDarkMode && styles.detailValueDark]}>
                  {transaction.payment_method}
                </Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Conta / Caixa</Text>
                <Text style={[styles.detailValue, isDarkMode && styles.detailValueDark]}>
                  {transaction.account_id || 'Caixa Geral'}
                </Text>
              </View>

              {transaction.counterparty ? (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Pessoa / Empresa</Text>
                  <Text style={[styles.detailValue, isDarkMode && styles.detailValueDark]}>
                    {transaction.counterparty}
                  </Text>
                </View>
              ) : null}

              {transaction.vehicle_id ? (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Veículo</Text>
                  <Text style={[styles.detailValue, isDarkMode && styles.detailValueDark]}>
                    {transaction.vehicle_id}
                  </Text>
                </View>
              ) : null}

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Origem do Lançamento</Text>
                <Text style={[styles.detailValue, isDarkMode && styles.detailValueDark]}>
                  {transaction.origin === 'AI_ASSISTANT' ? 'IA Assistente' : 'Manual'}
                </Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Registrado por</Text>
                <Text style={[styles.detailValue, isDarkMode && styles.detailValueDark]}>
                  {transaction.created_by || 'Sistema'}
                </Text>
              </View>

              {transaction.notes ? (
                <View style={styles.notesBox}>
                  <Text style={styles.detailLabel}>Observações</Text>
                  <Text style={[styles.notesText, isDarkMode && styles.notesTextDark]}>
                    {transaction.notes}
                  </Text>
                </View>
              ) : null}

              {transaction.status === 'REVERSED' ? (
                <View style={styles.reversedBadge}>
                  <Text style={styles.reversedBadgeText}>[ MOVIMENTAÇÃO ESTORNADA ]</Text>
                </View>
              ) : null}
            </View>
          </ScrollView>

          <View style={styles.footer}>
            {canReverse && transaction.status !== 'REVERSED' ? (
              <TouchableOpacity
                style={styles.reverseBtn}
                onPress={handleReverse}
                disabled={reversing}
              >
                {reversing ? (
                  <ActivityIndicator color="#dc2626" size="small" />
                ) : (
                  <>
                    <RotateCcw size={16} color="#dc2626" />
                    <Text style={styles.reverseBtnText}>Estornar Movimentação</Text>
                  </>
                )}
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 16,
    paddingHorizontal: 16,
    paddingBottom: 24,
    maxHeight: '85%',
  },
  modalContentDark: {
    backgroundColor: '#0f172a',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  titleDark: {
    color: '#f8fafc',
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  incomeIconBg: {
    backgroundColor: '#dcfce7',
  },
  expenseIconBg: {
    backgroundColor: '#fee2e2',
  },
  closeBtn: {
    padding: 4,
  },
  body: {
    paddingVertical: 12,
  },
  amountBox: {
    alignItems: 'center',
    marginVertical: 12,
    paddingVertical: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
  },
  amountText: {
    fontSize: 22,
    fontWeight: '800',
  },
  incomeText: {
    color: '#16a34a',
  },
  expenseText: {
    color: '#dc2626',
  },
  descriptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
    marginTop: 4,
  },
  descriptionTextDark: {
    color: '#cbd5e1',
  },
  detailGroup: {
    gap: 10,
    marginTop: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  detailLabel: {
    fontSize: 13,
    color: '#64748b',
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0f172a',
  },
  detailValueDark: {
    color: '#f8fafc',
  },
  notesBox: {
    marginTop: 6,
    padding: 10,
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
  },
  notesText: {
    fontSize: 13,
    color: '#334155',
    marginTop: 2,
  },
  notesTextDark: {
    color: '#cbd5e1',
  },
  reversedBadge: {
    marginTop: 10,
    padding: 10,
    backgroundColor: '#fee2e2',
    borderRadius: 8,
    alignItems: 'center',
  },
  reversedBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#dc2626',
  },
  footer: {
    marginTop: 14,
  },
  reverseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#fff1f2',
    borderWidth: 1,
    borderColor: '#fecdd3',
  },
  reverseBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#dc2626',
  },
});
