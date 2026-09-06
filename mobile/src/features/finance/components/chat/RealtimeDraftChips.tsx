import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ParsedFinancialIntent } from '../../../../services/financialAiAssistantService';
import { buildDraftAnalysisChips, DraftAnalysisChip } from '../../../../services/financial/draftAnalysisChips';

interface Props {
  draft?: ParsedFinancialIntent | null;
  isDarkMode?: boolean;
}

export const RealtimeDraftChips: React.FC<Props> = ({ draft, isDarkMode = false }) => {
  const chips = buildDraftAnalysisChips(draft);

  if (chips.length === 0) return null;

  return (
    <View style={styles.container}>
      <Text style={[styles.title, isDarkMode && styles.titleDark]}>
        ✦ Análise em Tempo Real
      </Text>
      <View style={styles.chipsRow}>
        {chips.map(chip => {
          const styleKey = getChipStyleKey(chip.type);
          return (
            <View
              key={chip.id}
              style={[
                styles.chip,
                styles[styleKey.badge],
                isDarkMode && styles[`${styleKey.badge}Dark`],
              ]}
            >
              <Text
                style={[
                  styles.chipText,
                  styles[styleKey.text],
                  isDarkMode && styles[`${styleKey.text}Dark`],
                ]}
              >
                {chip.label}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
};

const getChipStyleKey = (type: DraftAnalysisChip['type']) => {
  switch (type) {
    case 'expense':
      return { badge: 'badgeExpense', text: 'textExpense' };
    case 'income':
      return { badge: 'badgeIncome', text: 'textIncome' };
    case 'loan':
      return { badge: 'badgeLoan', text: 'textLoan' };
    case 'pending':
      return { badge: 'badgePending', text: 'textPending' };
    default:
      return { badge: 'badgeNeutral', text: 'textNeutral' };
  }
};

const styles: Record<string, any> = StyleSheet.create({
  container: {
    marginTop: 6,
  },
  title: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  titleDark: {
    color: '#94a3b8',
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 11,
    fontWeight: '600',
  },
  // Neutro (Slate / Cinza)
  badgeNeutral: {
    backgroundColor: '#f1f5f9',
    borderColor: '#cbd5e1',
  },
  badgeNeutralDark: {
    backgroundColor: '#1e293b',
    borderColor: '#334155',
  },
  textNeutral: {
    color: '#334155',
  },
  textNeutralDark: {
    color: '#cbd5e1',
  },

  // Saída (Vermelho)
  badgeExpense: {
    backgroundColor: '#fef2f2',
    borderColor: '#fca5a5',
  },
  badgeExpenseDark: {
    backgroundColor: '#450a0a',
    borderColor: '#991b1b',
  },
  textExpense: {
    color: '#dc2626',
  },
  textExpenseDark: {
    color: '#fca5a5',
  },

  // Entrada (Verde)
  badgeIncome: {
    backgroundColor: '#f0fdf4',
    borderColor: '#86efac',
  },
  badgeIncomeDark: {
    backgroundColor: '#052e16',
    borderColor: '#166534',
  },
  textIncome: {
    color: '#16a34a',
  },
  textIncomeDark: {
    color: '#86efac',
  },

  // Empréstimo (Roxo)
  badgeLoan: {
    backgroundColor: '#faf5ff',
    borderColor: '#d8b4fe',
  },
  badgeLoanDark: {
    backgroundColor: '#3b0764',
    borderColor: '#7e22ce',
  },
  textLoan: {
    color: '#9333ea',
  },
  textLoanDark: {
    color: '#d8b4fe',
  },

  // Pendente / Não informado (Âmbar com Borda Pontilhada)
  badgePending: {
    backgroundColor: '#fffbeb',
    borderColor: '#fcd34d',
    borderStyle: 'dashed',
  },
  badgePendingDark: {
    backgroundColor: '#451a03',
    borderColor: '#b45309',
    borderStyle: 'dashed',
  },
  textPending: {
    color: '#d97706',
  },
  textPendingDark: {
    color: '#fcd34d',
  },
});
