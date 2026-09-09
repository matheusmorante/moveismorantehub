import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ParsedFinancialIntent } from '../../../services/financialAiAssistantService';
import { FinancialCategory } from '../../../services/mobileFinanceService';
import { CardHeaderSection } from './card/CardHeaderSection';
import { CardTotalBlock } from './card/CardTotalBlock';
import { CardInstallmentList } from './card/CardInstallmentList';
import { CardCandidatesBox } from './card/CardCandidatesBox';
import { CardNeedsInputBox } from './card/CardNeedsInputBox';
import { CardActionsSection } from './card/CardActionsSection';

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
  onSelectCandidate?: (candidate: any) => void;
  categories?: FinancialCategory[];
  isDarkMode?: boolean;
  readOnly?: boolean;
}

export const TransactionPreviewCard: React.FC<Props> = ({
  intent,
  cardState,
  onConfirm,
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
    : intentType === 'RECURRING'
      ? 'SAÍDA RECORRENTE'
      : isIncome
        ? 'ENTRADA FINANCEIRA'
        : 'SAÍDA FINANCEIRA';

  let badgeBg = isIncome ? '#dcfce7' : '#fee2e2';
  let badgeColor = isIncome ? '#166534' : '#991b1b';

  if (cardState === 'SAVED') {
    cardTitleType = isPayable
      ? '✓ CONTA A PAGAR CRIADA'
      : isIncome
        ? '✓ ENTRADA REGISTRADA'
        : '✓ SAÍDA REGISTRADA';
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

  const mainTitle = intent.supplier
    ? `Compra • ${intent.supplier}`
    : intent.counterparty || intent.description || (isIncome ? 'Entrada Direta' : 'Saída Direta');
  const secondarySubtitle =
    intent.categoryName ||
    (intent.description && intent.description !== mainTitle
      ? intent.description
      : isIncome
        ? 'Outras entradas'
        : 'Despesa não classificada');

  const installmentItems = intent.installmentList || [];

  const formatDateBR = (isoDate?: string | null) => {
    if (!isoDate) return 'A definir';
    const parts = isoDate.split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return isoDate;
  };

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

      {/* Título Principal & Subtítulo */}
      <View style={styles.titleSection}>
        <Text style={[styles.itemTitle, isDarkMode && styles.textDark]}>{mainTitle}</Text>
        <Text style={styles.secondarySubtitle}>{secondarySubtitle}</Text>
      </View>

      {/* Alerta de Erro */}
      {cardState === 'ERROR' && (
        <View style={styles.errorBox}>
          <Text style={styles.errorBoxText}>Não foi possível registrar no ERP. Verifique a conexão e tente novamente.</Text>
        </View>
      )}

      {/* Conteúdo Dinâmico: Candidatos / Dados Incompletos / Preview Regular */}
      {intent.candidateAccounts && intent.candidateAccounts.length > 0 && cardState !== 'SAVED' ? (
        <CardCandidatesBox
          candidateAccounts={intent.candidateAccounts}
          questionToUser={intent.questionToUser}
          readOnly={readOnly}
          onSelectCandidate={onSelectCandidate}
        />
      ) : cardState === 'NEEDS_INPUT' ? (
        <CardNeedsInputBox
          declaredTotal={declaredTotal}
          installmentsSum={installmentsSum}
          formattedTotal={formattedTotal}
          formattedSum={formattedSum}
          formattedDiff={formattedDiff}
          questionToUser={intent.questionToUser}
        />
      ) : (
        <View style={[styles.gridBox, isDarkMode && styles.gridBoxDark]}>
          <CardTotalBlock formattedTotal={formattedTotal} isIncome={isIncome} isDarkMode={isDarkMode} />

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

          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>{isIncome ? 'Recebimento' : 'Pagamento'}</Text>
            <Text style={[styles.fieldValue, isDarkMode && styles.textDark, (!intent.paymentMethod || intent.paymentMethod === 'UNKNOWN') && { color: '#94a3b8', fontStyle: 'italic' }]}>
              {intent.paymentMethod && intent.paymentMethod !== 'UNKNOWN' ? intent.paymentMethod : 'Não informada'}
            </Text>
          </View>

          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>Categoria</Text>
            <Text style={[styles.fieldValue, isDarkMode && styles.textDark]}>
              {intent.categoryName || 'Não informada'}
            </Text>
          </View>

          {!isIncome && intent.businessPurpose && intent.businessPurpose !== 'UNKNOWN' && (
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>Finalidade</Text>
              <Text style={[styles.fieldValue, isDarkMode && styles.textDark]}>
                {intent.businessPurpose === 'PERSONAL' || intent.businessPurpose === 'PERSONAL_PARTNER'
                  ? '👤 Uso Particular'
                  : '🏢 Operação da Empresa'}
              </Text>
            </View>
          )}

          {intent.vehicle && intent.vehicle !== 'Não informado' ? (
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>Veículo</Text>
              <Text style={[styles.fieldValue, isDarkMode && styles.textDark]}>
                🚗 {intent.vehicle}
              </Text>
            </View>
          ) : null}
        </View>
      )}

      {/* Ações do Rodapé */}
      <CardActionsSection
        cardState={cardState}
        readOnly={readOnly}
        isDarkMode={isDarkMode}
        onConfirm={onConfirm}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 12,
    marginVertical: 4,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  cardDark: {
    backgroundColor: '#1e293b',
    borderColor: '#334155',
  },
  savedCard: {
    borderColor: '#bbf7d0',
    backgroundColor: '#f0fdf4',
  },
  discardedCard: {
    opacity: 0.5,
    backgroundColor: '#f8fafc',
  },
  discardedText: {
    fontSize: 12,
    color: '#94a3b8',
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 8,
  },
  titleSection: {
    marginVertical: 6,
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
  },
  textDark: {
    color: '#f8fafc',
  },
  secondarySubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 1,
  },
  gridBox: {
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 8,
    gap: 6,
    marginVertical: 4,
  },
  gridBoxDark: {
    backgroundColor: '#0f172a',
  },
  fieldRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  fieldLabel: {
    fontSize: 12,
    color: '#64748b',
  },
  fieldValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0f172a',
  },
  errorBox: {
    backgroundColor: '#fee2e2',
    borderColor: '#fca5a5',
    borderWidth: 1,
    borderRadius: 8,
    padding: 8,
    marginVertical: 4,
  },
  errorBoxText: {
    color: '#991b1b',
    fontSize: 12,
    fontWeight: '600',
  },
});
