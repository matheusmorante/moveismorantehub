import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Check, Edit2, AlertCircle, RefreshCw, Calendar, CreditCard, Search, X } from 'lucide-react-native';
import { ParsedFinancialIntent } from '../../../services/financialAiAssistantService';

interface Props {
  intent: ParsedFinancialIntent;
  onConfirm: () => void;
  onCorrect: () => void;
  onDiscard?: () => void;
  registering?: boolean;
  isDarkMode?: boolean;
}

export const StructuredConfirmationCard: React.FC<Props> = ({
  intent,
  onConfirm,
  onCorrect,
  onDiscard,
  registering = false,
  isDarkMode = false,
}) => {
  const intentType = intent.intentType || 'SINGLE_TRANSACTION';

  // Configuração por Tipo
  const isIncome = intent.type === 'income';
  let badgeLabel = isIncome ? 'ENTRADA' : 'SAÍDA';
  let badgeBg = isIncome ? '#dcfce7' : '#fee2e2';
  let badgeColor = isIncome ? '#166534' : '#991b1b';

  const catLower = (intent.categoryName || '').toLowerCase();
  let confirmBtnText = isIncome ? 'Registrar entrada' : 'Registrar saída';

  if (catLower.includes('juros') || catLower.includes('rendimento')) {
    confirmBtnText = 'Registrar receita';
  } else if (catLower.includes('empréstimo') || catLower.includes('emprestimo') || catLower.includes('boleto') || catLower.includes('pagamento')) {
    confirmBtnText = 'Registrar pagamento';
  }

  if (intentType === 'RECURRING') {
    badgeLabel = 'SAÍDA RECORRENTE';
    badgeBg = '#f3e8ff';
    badgeColor = '#6b21a8';
    confirmBtnText = 'Criar recorrência';
  } else if (intentType === 'PAYABLE_BILL') {
    badgeLabel = 'CONTA A PAGAR';
    badgeBg = '#fef3c7';
    badgeColor = '#92400e';
    confirmBtnText = 'Criar conta a pagar';
  } else if (intentType === 'INSTALLMENT') {
    badgeLabel = isIncome ? 'ENTRADA PARCELADA' : 'SAÍDA PARCELADA';
    badgeBg = '#dbeafe';
    badgeColor = '#1e40af';
    confirmBtnText = 'Registrar parcelamento';
  } else if (intentType === 'MATCH_EXISTING') {
    badgeLabel = 'CONTA PENDENTE ENCONTRADA';
    badgeBg = '#dcfce7';
    badgeColor = '#15803d';
    confirmBtnText = 'Registrar pagamento';
  }

  const formattedAmount = (intent.amount || intent.totalAmount || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });

  return (
    <View style={[styles.card, isDarkMode && styles.cardDark]}>
      {/* Badge de Tipo + Botão X de Descarte */}
      <View style={styles.headerRow}>
        <View style={[styles.badge, { backgroundColor: badgeBg }]}>
          <Text style={[styles.badgeText, { color: badgeColor }]}>{badgeLabel}</Text>
        </View>

        {onDiscard ? (
          <TouchableOpacity style={styles.discardBtn} onPress={onDiscard} activeOpacity={0.7}>
            <X size={18} color={isDarkMode ? '#94a3b8' : '#64748b'} />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Título e Valor em Destaque */}
      <View style={styles.titleSection}>
        <Text style={[styles.itemTitle, isDarkMode && styles.textDark]}>
          {intent.supplier || intent.description || 'Lançamento Financeiro'}
        </Text>
        <Text style={[styles.amountText, { color: intent.type === 'income' ? '#16a34a' : '#dc2626' }]}>
          {formattedAmount}
        </Text>
        {intentType === 'INSTALLMENT' && intent.installmentsCount ? (
          <Text style={styles.subAmountText}>
            ({intent.installmentsCount}x de R$ {((intent.amount || 0) / intent.installmentsCount).toFixed(2)})
          </Text>
        ) : null}
      </View>

      {/* Grid de Campos Estruturados */}
      <View style={[styles.gridBox, isDarkMode && styles.gridBoxDark]}>
        {intentType === 'RECURRING' ? (
          <>
            <Row label="Frequência" value={intent.frequency || 'Mensal'} />
            <Row label="Vencimento" value={intent.dueDay ? `Todo dia ${intent.dueDay}` : 'Mensal'} />
            <Row label="Início" value={intent.date || 'Hoje'} />
            <Row label="Valor" value="Fixo" />
          </>
        ) : intentType === 'PAYABLE_BILL' ? (
          <>
            <Row label="Vencimento" value={intent.dueDate || intent.date || 'Não informado'} />
            <Row label="Status" value="Pendente" />
            <Row label="Fornecedor" value={intent.supplier || intent.counterparty || 'Não informado'} />
          </>
        ) : intentType === 'INSTALLMENT' ? (
          <>
            <Row label="Primeira Parcela" value={intent.date || 'Hoje'} />
            <Row label="Nº de Parcelas" value={`${intent.installmentsCount || 1}x`} />
            <Row label="Categoria" value={intent.categoryName || 'Despesa'} />
          </>
        ) : intentType === 'MATCH_EXISTING' ? (
          <>
            <Row label="Conta Correspondente" value={intent.matchedAccount?.description || ''} />
            <Row label="Vencimento" value={intent.dueDate || 'Pendente'} />
            <Row label="Status" value="Pendente" />
          </>
        ) : (
          <>
            <Row label="Data" value={intent.date || 'Hoje'} />
            <Row label="Categoria" value={intent.categoryName || 'Geral'} />
            <Row label="Tipo" value="Única" />
          </>
        )}
      </View>

      {/* Detalhamento de Parcelas */}
      {intentType === 'INSTALLMENT' && intent.installmentList && intent.installmentList.length > 0 && (
        <View style={styles.installmentContainer}>
          <Text style={[styles.installmentTitle, isDarkMode && styles.textDark]}>Parcelas Lançadas:</Text>
          {intent.installmentList.map((item, idx) => (
            <View key={idx} style={[styles.installmentRow, isDarkMode && styles.installmentRowDark]}>
              <Text style={[styles.installmentLabel, isDarkMode && styles.textDark]}>
                {item.number}/{intent.installmentList?.length}
              </Text>
              <Text style={[styles.installmentValue, isDarkMode && styles.textDark]}>
                R$ {item.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </Text>
              <Text style={[styles.installmentDate, item.dueDate ? styles.dueDateSet : styles.dueDatePending]}>
                {item.dueDate ? item.dueDate.split('-').reverse().join('/') : 'vencimento pendente'}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Botões de Ação */}
      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={[styles.editBtn, isDarkMode && styles.editBtnDark]}
          onPress={onCorrect}
          disabled={registering}
        >
          <Edit2 size={14} color={isDarkMode ? '#cbd5e1' : '#64748b'} />
          <Text style={[styles.editBtnText, isDarkMode && styles.editBtnTextDark]}>
            {intentType === 'MATCH_EXISTING' ? 'Não é essa' : 'Editar'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.confirmBtn}
          onPress={onConfirm}
          disabled={registering}
          activeOpacity={0.8}
        >
          {registering ? (
            <ActivityIndicator color="#ffffff" size="small" />
          ) : (
            <>
              <Check size={16} color="#ffffff" />
              <Text style={styles.confirmBtnText}>{confirmBtnText}</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const Row: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <View style={styles.rowItem}>
    <Text style={styles.rowLabel}>{label}</Text>
    <Text style={styles.rowValue}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginVertical: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  cardDark: {
    backgroundColor: '#1e293b',
    borderColor: '#334155',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  discardBtn: {
    padding: 4,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  titleSection: {
    marginBottom: 12,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  textDark: {
    color: '#f8fafc',
  },
  amountText: {
    fontSize: 22,
    fontWeight: '800',
    marginTop: 2,
  },
  subAmountText: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
  },
  gridBox: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
    gap: 6,
  },
  gridBoxDark: {
    backgroundColor: '#0f172a',
  },
  rowItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rowLabel: {
    fontSize: 12,
    color: '#64748b',
  },
  rowValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0f172a',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  editBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
    gap: 6,
  },
  editBtnDark: {
    backgroundColor: '#334155',
  },
  editBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },
  editBtnTextDark: {
    color: '#cbd5e1',
  },
  confirmBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#16a34a',
    gap: 6,
  },
  confirmBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
  installmentContainer: {
    marginBottom: 12,
    gap: 6,
  },
  installmentTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 2,
  },
  installmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  installmentRowDark: {
    backgroundColor: '#0f172a',
    borderColor: '#334155',
  },
  installmentLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  installmentValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0f172a',
  },
  installmentDate: {
    fontSize: 11,
    fontWeight: '600',
  },
  dueDateSet: {
    color: '#16a34a',
  },
  dueDatePending: {
    color: '#d97706',
  },
});
