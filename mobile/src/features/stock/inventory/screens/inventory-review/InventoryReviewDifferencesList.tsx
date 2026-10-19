import React from 'react';
import { Text, View } from 'react-native';
import { CheckCircle2 } from 'lucide-react-native';
import type { ReconciledAuditItem } from '../../hooks/useInventoryReconciliation';
import { styles } from './inventoryReview.styles';

interface InventoryReviewDifferencesListProps {
  itemsWithDifferences: ReconciledAuditItem[];
  surface: string;
  border: string;
  textPrimary: string;
  muted: string;
}

export const InventoryReviewDifferencesList: React.FC<InventoryReviewDifferencesListProps> = ({
  itemsWithDifferences,
  surface,
  border,
  textPrimary,
  muted,
}) => {
  if (itemsWithDifferences.length === 0) {
    return (
      <View
        style={[
          styles.card,
          {
            backgroundColor: surface,
            borderColor: border,
            alignItems: 'center',
            padding: 24,
          },
        ]}
      >
        <CheckCircle2 size={36} color="#10b981" style={{ marginBottom: 8 }} />
        <Text style={[styles.title, { color: textPrimary, fontSize: 16 }]}>
          Nenhuma divergência encontrada!
        </Text>
        <Text style={[styles.subtitle, { color: muted, textAlign: 'center', marginTop: 4 }]}>
          Todos os itens contados batem exatamente com o estoque reconciliado.
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.card, { backgroundColor: surface, borderColor: border }]}>
      <Text style={[styles.sectionTitle, { color: textPrimary }]}>
        Ajustes que serão lançados ({itemsWithDifferences.length}):
      </Text>
      {itemsWithDifferences.map((item) => (
        <View key={item.id} style={[styles.diffItem, { borderBottomColor: border }]}>
          <View style={{ flex: 1, paddingRight: 8 }}>
            <Text style={{ color: textPrimary, fontWeight: '700', marginBottom: 2 }}>
              {item.name}
            </Text>
            {!!item.supplierNames && item.supplierNames !== 'Fábrica não informada' && (
              <Text numberOfLines={1} style={{ color: muted, fontSize: 11, marginBottom: 4 }}>
                {item.supplierNames}
              </Text>
            )}
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <Text style={{ color: muted, fontSize: 12 }}>
                Esperado:{' '}
                <Text style={{ fontWeight: '700', color: textPrimary }}>
                  {item.reconciledExpected}
                </Text>
              </Text>
              <Text style={{ color: muted, fontSize: 12 }}>
                Contado:{' '}
                <Text style={{ fontWeight: '700', color: textPrimary }}>
                  {item.physicalCount}
                </Text>
              </Text>
            </View>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text
              style={{
                color: item.difference > 0 ? '#10b981' : '#ef4444',
                fontWeight: '800',
                fontSize: 16,
              }}
            >
              {item.difference > 0 ? '+' : ''}
              {item.difference}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
};
