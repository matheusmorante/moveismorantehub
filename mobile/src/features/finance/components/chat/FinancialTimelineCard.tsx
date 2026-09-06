import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Bot } from 'lucide-react-native';
import type { FinancialCategory } from '../../../../services/mobileFinanceService';
import type { ParsedFinancialIntent } from '../../../../services/financialAiAssistantService';
import { TransactionPreviewCard } from '../TransactionPreviewCard';
import type { FinancialCardTimelineEntry } from './financialCardTimeline';

interface Props {
  entry: FinancialCardTimelineEntry;
  active: boolean;
  categories: FinancialCategory[];
  isDarkMode: boolean;
  onConfirm: (intent: ParsedFinancialIntent) => void;
  onEdit: () => void;
  onDiscard: () => void;
  onSelectCandidate: (candidate: any) => void;
}

export function FinancialTimelineCard({ entry, active, categories, isDarkMode, onConfirm, onEdit, onDiscard, onSelectCandidate }: Props) {
  const queued = entry.intent.batchDraftsList || [];
  const current = queued[0] || entry.intent;

  return <View style={styles.wrapper}>
    <View style={styles.senderRow}>
      <View style={styles.avatar}><Bot size={14} color="#7c3aed" /></View>
      <Text style={[styles.sender, isDarkMode && styles.senderDark]}>Seu Lizandro</Text>
      <Text style={styles.timestamp}>{entry.timestamp}</Text>
    </View>
    {queued.length > 0 && <Text style={[styles.queueLabel, isDarkMode && styles.queueLabelDark]}>
      Tratando uma movimentação por vez{queued.length > 1 ? ` · mais ${queued.length - 1} na fila` : ''}
    </Text>}
    <TransactionPreviewCard
      intent={current}
      cardState={entry.cardState}
      readOnly={!active}
      onConfirm={() => onConfirm(current)}
      onEdit={onEdit}
      onDiscard={onDiscard}
      onSelectCandidate={onSelectCandidate}
      categories={categories}
      isDarkMode={isDarkMode}
    />
  </View>;
}

const styles = StyleSheet.create({
  wrapper: { gap: 4, marginVertical: 8, paddingHorizontal: 12 },
  senderRow: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 28, height: 28, borderRadius: 14, marginRight: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f3e8ff' },
  sender: { color: '#475569', fontSize: 12, fontWeight: '700' },
  senderDark: { color: '#cbd5e1' },
  timestamp: { marginLeft: 8, color: '#94a3b8', fontSize: 10 },
  queueLabel: { color: '#475569', fontSize: 12, fontWeight: '600', marginTop: 4 },
  queueLabelDark: { color: '#cbd5e1' },
});
