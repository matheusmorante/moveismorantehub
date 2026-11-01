import React from 'react';
import { Text, View } from 'react-native';
import { AlertTriangle, CheckCircle2 } from 'lucide-react-native';
import { styles } from './inventoryReview.styles';

interface InventoryReviewSummaryCardProps {
  countedQuantityTotal: number;
  hasUncountedItems: boolean;
  adjustmentsCount: number;
  surface: string;
  border: string;
  bg: string;
  textPrimary: string;
  muted: string;
  isDarkMode: boolean;
}

export const InventoryReviewSummaryCard: React.FC<InventoryReviewSummaryCardProps> = ({
  countedQuantityTotal,
  hasUncountedItems,
  adjustmentsCount,
  surface,
  border,
  bg,
  textPrimary,
  muted,
  isDarkMode,
}) => {
  return (
    <>
      <View style={[styles.card, { backgroundColor: surface, borderColor: border }]}>
        <View style={{ alignItems: 'center', marginBottom: 24 }}>
          <View
            style={{
              width: 64,
              height: 64,
              borderRadius: 32,
              backgroundColor: 'rgba(16,185,129,0.1)',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 12,
            }}
          >
            <CheckCircle2 size={32} color="#10b981" />
          </View>
          <Text style={[styles.title, { color: textPrimary }]}>Pronto para finalizar!</Text>
          <Text style={[styles.subtitle, { color: muted, textAlign: 'center' }]}>
            {countedQuantityTotal.toLocaleString('pt-BR')} quantidades contadas neste inventário.
          </Text>
        </View>

        <View style={[styles.summaryBox, { backgroundColor: bg, borderColor: border }]}>
          <View style={styles.summaryRow}>
            <Text style={{ color: muted, fontWeight: '700' }}>Divergências Encontradas</Text>
            <Text style={{ color: textPrimary, fontWeight: '800', fontSize: 16 }}>
              {adjustmentsCount}
            </Text>
          </View>
        </View>
      </View>

      {hasUncountedItems && (
        <View
          style={[
            styles.warningCard,
            {
              backgroundColor: isDarkMode ? 'rgba(217, 119, 6, 0.15)' : '#fffbeb',
              borderColor: '#f59e0b',
            },
          ]}
        >
          <AlertTriangle size={20} color="#d97706" style={{ marginTop: 2 }} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.warningTitle, { color: isDarkMode ? '#fbbf24' : '#92400e' }]}>
              Itens sem contagem
            </Text>
            <Text style={[styles.warningDesc, { color: isDarkMode ? '#fde68a' : '#b45309' }]}>
              Itens sem contagem permanecem com o saldo atual no sistema.
            </Text>
          </View>
        </View>
      )}
    </>
  );
};
