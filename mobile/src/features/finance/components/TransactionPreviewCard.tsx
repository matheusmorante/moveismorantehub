import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Check, Edit2 } from 'lucide-react-native';
import { ParsedFinancialIntent } from '../../../services/financialAiAssistantService';
import { FinancialCategory } from '../../../services/mobileFinanceService';
import { CardHeaderSection } from './card/CardHeaderSection';
import { CardTotalBlock } from './card/CardTotalBlock';
import { CardInstallmentList } from './card/CardInstallmentList';

export type CardVisualState =
  | 'DRAFT'
  | 'NEEDS_INPUT'
  | 'READY_TO_CONFIRM'
  | 'SAVING'
  | 'SAVED'
  | 'ERROR'
  | 'DISCARDED';

interface Props {
  intent: ParsedFinancialIntent;
  cardState: CardVisualState;
  onConfirm: () => void;
  onEdit: () => void;
  onSelectCandidate?: (candidate: any) => void;
  categories?: FinancialCategory[];
  isDarkMode?: boolean;
  readOnly?: boolean;
}

export const TransactionPreviewCard: React.FC<Props> = ({
  intent,
  cardState,
  onConfirm,
  onEdit,
  onSelectCandidate,
  isDarkMode = false,
  readOnly = false,
}) => {
  if (cardState === 'DISCARDED') {
    return (
      <View style={[styles.card, styles.discardedCard, isDarkMode && styles.cardDark]}>
        <Text style={styles.discardedText}>Sugestão descartada</Text>
      </View>
    );
  }

  const isIncome = intent.type === 'income';
  const intentType = intent.intentType || 'SINGLE_TRANSACTION';
  const isPayable = intentType === 'PAYABLE_BILL' || intentType === 'INSTALLMENT';

  let cardTitleType = isPayable
    ? 'CONTA A PAGAR'
    : (intentType === 'RECURRING' ? 'SAÍDA RECORRENTE' : (isIncome ? 'ENTRADA FINANCEIRA' : 'SAÍDA FINANCEIRA'));

  let badgeBg = isIncome ? '#dcfce7' : '#fee2e2';
  let badgeColor = isIncome ? '#166534' : '#991b1b';

  if (cardState === 'SAVED') {
    cardTitleType = isPayable
      ? '✓ CONTA A PAGAR CRIADA'
      : (isIncome ? '✓ ENTRADA REGISTRADA' : '✓ SAÍDA REGISTRADA');
    badgeBg = '#dcfce7';
    badgeColor = '#166534';
  } else if (cardState === 'SAVING') {
    cardTitleType = 'REGISTRANDO...';
    badgeBg = '#dbeafe';
    badgeColor = '#1e40af';
  } else if (cardState === 'ERROR') {
    cardTitleType = 'ERRO AO REGISTRAR';
    badgeBg = '#fee2e2';
    badgeColor = '#991b1b';
  } else if (cardState === 'NEEDS_INPUT') {
    cardTitleType = 'DADOS INCOMPLETOS';
    badgeBg = '#fef3c7';
    badgeColor = '#92400e';
  }

  const declaredTotal = intent.totalAmount || intent.amount || 0;
  const installmentsSum = intent.installmentList?.reduce((acc, item) => acc + (item.amount || 0), 0) || 0;
  const difference = declaredTotal > 0 ? Math.abs(declaredTotal - installmentsSum) : 0;

  const formattedTotal = declaredTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const formattedSum = installmentsSum.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const formattedDiff = difference.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const mainTitle = intent.supplier ? `Compra • ${intent.supplier}` : (intent.counterparty || intent.description || (isIncome ? 'Entrada Direta' : 'Saída Direta'));
  const secondarySubtitle = intent.categoryName || (intent.description && intent.description !== mainTitle ? intent.description : (isIncome ? 'Outras entradas' : 'Despesa não classificada'));

  const installmentItems = intent.installmentList || [];

  const formatDateBR = (isoDate?: string | null) => {
    if (!isoDate) return 'A definir';
    const parts = isoDate.split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return isoDate;
  };

  const nowTimeStr = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  return (
    <View style={[styles.card, cardState === 'SAVED' && styles.savedCard, isDarkMode && styles.cardDark]}>
      {/* Cabeçalho do Card */}
      <CardHeaderSection
        cardState={cardState}
        cardTitleType={cardTitleType}
        badgeBg={badgeBg}
        badgeColor={badgeColor}
        isDarkMode={isDarkMode}
      />

      {/* Título Principal & Subtítulo Secundário */}
      <View style={styles.titleSection}>
        <Text style={[styles.itemTitle, isDarkMode && styles.textDark]}>{mainTitle}</Text>
        <Text style={styles.secondarySubtitle}>{secondarySubtitle}</Text>
      </View>

      {/* ERRO AO REGISTRAR */}
      {cardState === 'ERROR' && (
        <View style={styles.errorBox}>
          <Text style={styles.errorBoxText}>Não foi possível registrar no ERP. Verifique a conexão e tente novamente.</Text>
        </View>
      )}

      {/* QUADRO DE CANDIDATOS OU DIVERGÊNCIA / DADOS INCOMPLETOS OU PREVIEW NORMAL */}
      {intent.candidateAccounts && intent.candidateAccounts.length > 0 && cardState !== 'SAVED' ? (
        <View style={styles.needsInputBox}>
          <Text style={styles.needsInputQuestion}>
            {intent.questionToUser || `Encontrei ${intent.candidateAccounts.length} movimentações compatíveis. Qual delas você gostaria de verificar?`}
          </Text>
          <View style={{ marginTop: 8, gap: 6 }}>
            {intent.candidateAccounts.map((cand, idx) => (
              <TouchableOpacity
                key={cand.id || idx}
                style={[
                  styles.fieldRow,
                  {
                    backgroundColor: '#ffffff',
                    padding: 10,
                    borderRadius: 10,
                    borderWidth: 1,
                    borderColor: '#cbd5e1',
                  },
                ]}
                onPress={() => !readOnly && onSelectCandidate && onSelectCandidate(cand)}
                disabled={readOnly}
                activeOpacity={0.7}
              >
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: '#0f172a' }}>
                    {cand.counterparty || cand.description}
                  </Text>
                  <Text style={{ fontSize: 11, color: '#64748b' }}>
                    Vence em {cand.due_date || cand.date} • {cand.category_name || 'Despesa'}
                  </Text>
                </View>
                <Text style={{ fontSize: 14, fontWeight: '800', color: '#2563eb' }}>
                  {cand.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ) : cardState === 'NEEDS_INPUT' ? (
        <View style={styles.needsInputBox}>
          {declaredTotal > 0 && installmentsSum > 0 && Math.abs(declaredTotal - installmentsSum) > 0.01 ? (
            <View style={styles.mismatchGrid}>
              <View style={styles.mismatchRow}>
                <Text style={styles.mismatchLabel}>Total informado</Text>
                <Text style={styles.mismatchValueBold}>{formattedTotal}</Text>
              </View>
              <View style={styles.mismatchRow}>
                <Text style={styles.mismatchLabel}>Parcelas somadas</Text>
                <Text style={styles.mismatchValue}>{formattedSum}</Text>
              </View>
              <View style={styles.mismatchRow}>
                <Text style={styles.mismatchLabelAlert}>Diferença</Text>
                <Text style={styles.mismatchValueAlert}>{formattedDiff}</Text>
              </View>
            </View>
          ) : null}

          <Text style={styles.needsInputQuestion}>
            {intent.questionToUser || 'Faltam dados para concluir a operação. Como deseja ajustar?'}
          </Text>
        </View>
      ) : (
        <View style={[styles.gridBox, isDarkMode && styles.gridBoxDark]}>
          {/* TOTAL DESTACADO */}
          <CardTotalBlock formattedTotal={formattedTotal} isIncome={isIncome} isDarkMode={isDarkMode} />

          {/* PARCELAS (SE HOUVER) */}
          {installmentItems.length > 0 ? (
            <CardInstallmentList
              installmentItems={installmentItems}
              formatDateBR={formatDateBR}
              isDarkMode={isDarkMode}
            />
          ) : (
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>Vencimento / Data</Text>
              <Text style={[styles.fieldValue, isDarkMode && styles.textDark]}>
                {formatDateBR(intent.dueDate || intent.date)}
              </Text>
            </View>
          )}

          {/* FORMA DE PAGAMENTO */}
          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>{isIncome ? 'Recebimento' : 'Pagamento'}</Text>
            <Text style={[styles.fieldValue, isDarkMode && styles.textDark]}>
              {intent.paymentMethod && intent.paymentMethod !== 'UNKNOWN' ? intent.paymentMethod : '??? (Não informada)'}
            </Text>
          </View>
        </View>
      )}

      {/* Ações do Card */}
      {!readOnly && <View style={styles.actionsRow}>
        {cardState === 'SAVING' ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator color="#3b82f6" size="small" />
            <Text style={styles.loadingText}>Registrando...</Text>
          </View>
        ) : cardState === 'SAVED' ? (
          <View style={styles.savedFooterRow}>
            <Text style={styles.timestampText}>Registrado às {nowTimeStr}</Text>
            <TouchableOpacity
              style={styles.viewRecordBtn}
              onPress={() => onConfirm && onConfirm()}
              activeOpacity={0.7}
            >
              <Text style={styles.viewRecordBtnText}>Ver transação</Text>
            </TouchableOpacity>
          </View>
        ) : cardState === 'ERROR' ? (
          <View style={{ flex: 1, flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity
              style={[styles.editBtn, { flex: 1 }]}
              onPress={onEdit}
              activeOpacity={0.7}
            >
              <Edit2 size={14} color="#475569" />
              <Text style={styles.editBtnText}>Ajustar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.confirmBtn, { flex: 2, backgroundColor: '#dc2626' }]}
              onPress={onConfirm}
              activeOpacity={0.8}
            >
              <Text style={styles.confirmBtnText}>Tentar novamente</Text>
            </TouchableOpacity>
          </View>
        ) : cardState === 'NEEDS_INPUT' ? null : (
          <>
            <TouchableOpacity
              style={[styles.editBtn, isDarkMode && styles.editBtnDark]}
              onPress={onEdit}
              activeOpacity={0.7}
            >
              <Edit2 size={14} color={isDarkMode ? '#cbd5e1' : '#475569'} />
              <Text style={[styles.editBtnText, isDarkMode && styles.editBtnTextDark]}>Editar</Text>
            </TouchableOpacity>

            {cardState === 'READY_TO_CONFIRM' ? (
              <TouchableOpacity
                style={styles.confirmBtn}
                onPress={onConfirm}
                activeOpacity={0.8}
              >
                <Check size={16} color="#ffffff" style={{ marginRight: 4 }} />
                <Text style={styles.confirmBtnText}>Confirmar</Text>
              </TouchableOpacity>
            ) : null}
          </>
        )}
      </View>}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  cardDark: {
    backgroundColor: '#1e293b',
    borderColor: '#334155',
  },
  savedCard: {
    backgroundColor: '#f0fdf4',
    borderColor: '#bbf7d0',
    borderWidth: 1.5,
  },
  errorBox: {
    backgroundColor: '#fef2f2',
    borderColor: '#fca5a5',
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
  },
  errorBoxText: {
    fontSize: 12,
    color: '#991b1b',
    fontWeight: '600',
  },
  savedFooterRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 4,
  },
  timestampText: {
    fontSize: 11,
    color: '#166534',
    fontWeight: '600',
  },
  viewRecordBtn: {
    backgroundColor: '#166534',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  viewRecordBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ffffff',
  },
  discardedCard: {
    backgroundColor: '#f8fafc',
    borderColor: '#e2e8f0',
    paddingVertical: 10,
    alignItems: 'center',
  },
  discardedText: {
    fontSize: 13,
    color: '#94a3b8',
    fontWeight: '500',
  },
  savedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  savedIconBg: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#dcfce7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  savedText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#166534',
  },
  titleSection: {
    marginBottom: 10,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 2,
  },
  secondarySubtitle: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '500',
  },
  textDark: {
    color: '#f8fafc',
  },
  gridBox: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  gridBoxDark: {
    backgroundColor: '#0f172a',
  },
  fieldRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  fieldLabel: {
    fontSize: 13,
    color: '#64748b',
  },
  fieldValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1e293b',
  },
  needsInputBox: {
    backgroundColor: '#fffbeb',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  mismatchGrid: {
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#fef3c7',
  },
  mismatchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  mismatchLabel: {
    fontSize: 12,
    color: '#78350f',
  },
  mismatchValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#78350f',
  },
  mismatchValueBold: {
    fontSize: 13,
    fontWeight: '700',
    color: '#78350f',
  },
  mismatchLabelAlert: {
    fontSize: 12,
    fontWeight: '700',
    color: '#b45309',
  },
  mismatchValueAlert: {
    fontSize: 13,
    fontWeight: '800',
    color: '#b45309',
  },
  needsInputQuestion: {
    fontSize: 13,
    fontWeight: '600',
    color: '#92400e',
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 10,
    marginTop: 4,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  loadingText: {
    fontSize: 13,
    color: '#3b82f6',
    fontWeight: '500',
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
  },
  editBtnDark: {
    backgroundColor: '#334155',
  },
  editBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  editBtnTextDark: {
    color: '#cbd5e1',
  },
  confirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#16a34a',
  },
  confirmBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
});
