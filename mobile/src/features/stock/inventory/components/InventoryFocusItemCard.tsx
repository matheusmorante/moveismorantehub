import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { FormTextInput } from '../../../../components/shared/FormTextInput';
import { Plus, Minus } from 'lucide-react-native';
import type { AuditItem } from '../hooks/useInventoryAuditWorkflow';

interface Props {
  item: AuditItem;
  width: number;
  height: number;
  isDarkMode: boolean;
  textPrimary: string;
  muted: string;
  border: string;
  bg: string;
  onUpdateCount: (id: string, count: number | null) => void;
}

export const InventoryFocusItemCard: React.FC<Props> = ({
  item,
  width,
  height,
  isDarkMode,
  textPrimary,
  muted,
  border,
  bg,
  onUpdateCount,
}) => {
  const isNarrow = width < 360;
  const isShort = height < 700;
  const buttonWidth = Math.max(52, Math.min(88, width * 0.2));
  const controlHeight = isShort ? 64 : 76;

  return (
    <View style={[styles.page, { width }]}>
      <ScrollView
        style={styles.cardScroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <View style={[styles.cardContent, { paddingHorizontal: isNarrow ? 16 : 24 }]}>
          <Text
            style={[
              styles.itemName,
              {
                color: textPrimary,
                fontSize: isNarrow ? 23 : 28,
                lineHeight: isNarrow ? 29 : 35,
              },
            ]}
          >
            {item.name}
          </Text>
          <Text style={[styles.itemSupplier, { color: muted, marginBottom: isShort ? 14 : 22 }]}>
            {item.supplierNames || 'Sem fornecedor'}
          </Text>

          <View
            style={[
              styles.statsRow,
              { marginBottom: isShort ? 18 : 28, gap: isNarrow ? 20 : 32 },
            ]}
          >
            <View style={styles.statBox}>
              <Text style={[styles.statLabel, { color: muted }]}>Sistema</Text>
              <Text style={[styles.statValue, { color: textPrimary }]}>{item.systemStock}</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={[styles.statLabel, { color: muted }]}>Unidade</Text>
              <Text style={[styles.statValue, { color: textPrimary }]}>{item.unit || 'UN'}</Text>
            </View>
          </View>

          <View style={[styles.counterContainer, { gap: isNarrow ? 8 : 12 }]}>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={`Remover uma unidade de ${item.name}`}
              style={[
                styles.bigBtn,
                {
                  width: buttonWidth,
                  height: controlHeight,
                  backgroundColor: '#ef4444',
                  borderColor: '#dc2626',
                },
              ]}
              onPress={() => onUpdateCount(item.id, Math.max(0, (item.physicalCount || 0) - 1))}
              disabled={item.physicalCount === 0}
            >
              <Minus
                size={isNarrow ? 28 : 36}
                color="#ffffff"
                opacity={item.physicalCount === 0 ? 0.3 : 1}
              />
            </TouchableOpacity>

            <View style={styles.inputWrapper}>
              <FormTextInput
                accessibilityLabel={`Quantidade contada de ${item.name}`}
                style={[
                  styles.bigInput,
                  {
                    height: controlHeight,
                    fontSize: isNarrow ? 32 : 42,
                    color: textPrimary,
                    borderColor: border,
                    backgroundColor: isDarkMode ? 'rgba(15,23,42,0.5)' : bg,
                  },
                ]}
                keyboardType="numeric"
                value={String(item.physicalCount ?? 0)}
                onChangeText={(val) => {
                  if (val === '') onUpdateCount(item.id, 0);
                  else onUpdateCount(item.id, Math.max(0, parseInt(val, 10) || 0));
                }}
                placeholder="0"
                placeholderTextColor={muted}
              />
              <Text style={[styles.inputLabel, { color: muted, fontSize: isNarrow ? 10 : 12 }]}>
                CONTADO
              </Text>
            </View>

            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={`Adicionar uma unidade de ${item.name}`}
              style={[
                styles.bigBtn,
                {
                  width: buttonWidth,
                  height: controlHeight,
                  backgroundColor: '#10b981',
                  borderColor: '#059669',
                },
              ]}
              onPress={() => onUpdateCount(item.id, (item.physicalCount || 0) + 1)}
            >
              <Plus size={isNarrow ? 28 : 36} color="#ffffff" />
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  page: {
    flex: 1,
  },
  cardScroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  cardContent: {
    width: '100%',
    maxWidth: 640,
    alignSelf: 'center',
    paddingVertical: 16,
  },
  itemName: {
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 6,
  },
  itemSupplier: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  statBox: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
  },
  counterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    alignSelf: 'center',
    maxWidth: 520,
  },
  bigBtn: {
    minWidth: 52,
    borderRadius: 18,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  inputWrapper: {
    flex: 1,
    minWidth: 72,
    alignItems: 'center',
  },
  bigInput: {
    width: '100%',
    borderRadius: 18,
    borderWidth: 2,
    fontWeight: '900',
    textAlign: 'center',
  },
  inputLabel: {
    fontWeight: '900',
    marginTop: 5,
    letterSpacing: 1,
  },
});
