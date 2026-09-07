import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface Props {
  candidateAccounts: any[];
  questionToUser?: string | null;
  readOnly?: boolean;
  onSelectCandidate?: (candidate: any) => void;
}

export const CardCandidatesBox: React.FC<Props> = ({
  candidateAccounts,
  questionToUser,
  readOnly,
  onSelectCandidate,
}) => {
  return (
    <View style={styles.needsInputBox}>
      <Text style={styles.needsInputQuestion}>
        {questionToUser ||
          `Encontrei ${candidateAccounts.length} movimentações compatíveis. Qual delas você gostaria de verificar?`}
      </Text>
      <View style={{ marginTop: 8, gap: 6 }}>
        {candidateAccounts.map((cand, idx) => (
          <TouchableOpacity
            key={cand.id || idx}
            style={styles.fieldRow}
            onPress={() => !readOnly && onSelectCandidate && onSelectCandidate(cand)}
            disabled={readOnly}
            activeOpacity={0.7}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.candTitle}>
                {cand.counterparty || cand.description}
              </Text>
              <Text style={styles.candSubtitle}>
                Vence em {cand.due_date || cand.date} • {cand.category_name || 'Despesa'}
              </Text>
            </View>
            <Text style={styles.candAmount}>
              {cand.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  needsInputBox: {
    backgroundColor: '#fffbeb',
    borderColor: '#fef3c7',
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  needsInputQuestion: {
    fontSize: 13,
    color: '#92400e',
    fontWeight: '600',
    lineHeight: 18,
  },
  fieldRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  candTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  candSubtitle: {
    fontSize: 11,
    color: '#64748b',
  },
  candAmount: {
    fontSize: 14,
    fontWeight: '800',
    color: '#2563eb',
  },
});
