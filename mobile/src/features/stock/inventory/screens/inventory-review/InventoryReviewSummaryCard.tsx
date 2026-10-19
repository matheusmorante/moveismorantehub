import React from 'react';
import { Text, View } from 'react-native';
import { AlertTriangle, CheckCircle2 } from 'lucide-react-native';
import { styles } from './inventoryReview.styles';

interface InventoryReviewSummaryCardProps {
  countedCount: number;
  totalCount: number;
  adjustmentsCount: number;
  surface: string;
  border: string;
  bg: string;
  textPrimary: string;
  muted: string;
  isDarkMode: boolean;
}

export const InventoryReviewSummaryCard: React.FC<InventoryReviewSummaryCardProps> = ({
  countedCount,
  totalCount,
  adjustmentsCount,
  surface,
  border,
  bg,
  textPrimary,
  muted,
  isDarkMode,
}) => {
  const uncountedCount = totalCount - countedCount;

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
            Você contou {countedCount} de {totalCount} itens do escopo.
          </Text>
        </View>

        <View style={[styles.summaryBox, { backgroundColor: bg, borderColor: border }]}>
          <View style={styles.summaryRow}>
            <Text style={{ color: muted, fontWeight: '700' }}>Divergências Encontradas</Text>
            <Text style={{ color: textPrimary, fontWeight: '800', fontSize: 16 }}>
              {adjustmentsCount}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={{ color: muted, fontWeight: '700' }}>Itens não contados</Text>
            <Text style={{ color: textPrimary, fontWeight: '800', fontSize: 16 }}>
              {uncountedCount}
            </Text>
          </View>
        </View>
      </View>

      {uncountedCount > 0 && (
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
              Itens não contados ({uncountedCount})
            </Text>
            <Text style={[styles.warningDesc, { color: isDarkMode ? '#fde68a' : '#b45309' }]}>
              As variações que não receberam contagem permanecerão com o saldo intacto no sistema.
            </Text>
          </View>
        </View>
      )}
    </>
  );
};
