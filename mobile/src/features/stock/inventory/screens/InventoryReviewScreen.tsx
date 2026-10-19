import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Platform,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft } from 'lucide-react-native';
import type { AuditItem } from '../hooks/useInventoryAuditWorkflow';
import { useInventoryReconciliation } from '../hooks/useInventoryReconciliation';
import { styles } from './inventory-review/inventoryReview.styles';
import { InventoryReviewSummaryCard } from './inventory-review/InventoryReviewSummaryCard';
import { InventoryReviewDifferencesList } from './inventory-review/InventoryReviewDifferencesList';

interface Props {
  isDarkMode: boolean;
  items: AuditItem[];
  startDate: string;
  hasStages?: boolean;
  onCancel: () => void;
  onConfirm: (
    itemsWithAdjustment: Array<AuditItem & { reconciledExpected: number; difference: number }>
  ) => void;
}

export const InventoryReviewScreen: React.FC<Props> = ({
  isDarkMode,
  items,
  startDate,
  onCancel,
  onConfirm,
}) => {
  const insets = useSafeAreaInsets();
  const topInset = Math.max(
    insets.top,
    Platform.OS === 'android' ? StatusBar.currentHeight || 24 : 0
  );
  const bottomInset = Math.max(insets.bottom, 16);

  const { reconciledItems, loading, reconcileError } = useInventoryReconciliation(items, startDate);

  const bg = isDarkMode ? '#0f172a' : '#f8fafc';
  const surface = isDarkMode ? '#1e293b' : '#ffffff';
  const border = isDarkMode ? '#334155' : '#e2e8f0';
  const textPrimary = isDarkMode ? '#f1f5f9' : '#0f172a';
  const muted = isDarkMode ? '#94a3b8' : '#64748b';

  const countedItems = items.filter((i) => i.physicalCount !== null);
  const itemsWithDifferences = reconciledItems.filter(
    (i) => i.physicalCount !== null && i.difference !== 0
  );
  const isBlocked = countedItems.length === 0 || loading;

  const handleConfirm = () => {
    if (isBlocked) return;
    onConfirm(reconciledItems.filter((item) => item.physicalCount !== null));
  };

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      <View
        style={[
          styles.header,
          { backgroundColor: surface, borderBottomColor: border, paddingTop: topInset + 8 },
        ]}
      >
        <TouchableOpacity testID="review-back-btn" onPress={onCancel} style={styles.backBtn}>
          <ArrowLeft size={24} color={textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: textPrimary }]}>Revisão Final</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 }}>
          <ActivityIndicator size="large" color="#10b981" />
          <Text style={{ color: muted }}>
            Reconciliando movimentações desde o início da contagem...
          </Text>
        </View>
      ) : (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, gap: 16 }}>
          {reconcileError && (
            <Text style={{ color: '#b45309', fontWeight: '700' }}>
              Sem conexão com o estoque. As divergências abaixo são estimativas locais; a submissão
              ficará salva no aparelho.
            </Text>
          )}

          <InventoryReviewSummaryCard
            countedCount={countedItems.length}
            totalCount={items.length}
            adjustmentsCount={itemsWithDifferences.length}
            surface={surface}
            border={border}
            bg={bg}
            textPrimary={textPrimary}
            muted={muted}
            isDarkMode={isDarkMode}
          />

          <InventoryReviewDifferencesList
            itemsWithDifferences={itemsWithDifferences}
            surface={surface}
            border={border}
            textPrimary={textPrimary}
            muted={muted}
          />
        </ScrollView>
      )}

      <View
        style={[
          styles.footer,
          { backgroundColor: surface, borderTopColor: border, paddingBottom: bottomInset + 12 },
        ]}
      >
        {isBlocked && (
          <Text
            style={{ color: '#ef4444', textAlign: 'center', marginBottom: 12, fontWeight: '600' }}
          >
            {countedItems.length === 0
              ? 'Você precisa contar pelo menos 1 item para finalizar o inventário.'
              : 'A revisão ainda está carregando.'}
          </Text>
        )}
        <TouchableOpacity
          testID="confirm-review-btn"
          style={[styles.confirmBtn, isBlocked && { backgroundColor: muted }]}
          onPress={handleConfirm}
          disabled={isBlocked}
        >
          <Text style={styles.confirmBtnText}>Confirmar e Atualizar Estoque</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};
