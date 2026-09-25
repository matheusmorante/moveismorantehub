import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { Minus, Plus, Search, Maximize2 } from 'lucide-react-native';
import type { AuditItem } from '../hooks/useInventoryAuditWorkflow';

interface Props {
  item: AuditItem;
  isDarkMode: boolean;
  scopeType?: string | null;
  onUpdateCount: (item: AuditItem, count: number | null) => void;
  onOpenProductSearch?: (itemId: string) => void;
  onFocusItem: () => void;
}

export const InventoryOperationItemCard: React.FC<Props> = ({
  item,
  isDarkMode,
  scopeType,
  onUpdateCount,
  onOpenProductSearch,
  onFocusItem,
}) => {
  const surface = isDarkMode ? '#1e293b' : '#ffffff';
  const border = isDarkMode ? '#334155' : '#e2e8f0';
  const textPrimary = isDarkMode ? '#f1f5f9' : '#0f172a';
  const muted = isDarkMode ? '#94a3b8' : '#64748b';

  const isCounted = item.physicalCount !== null;
  const diff = isCounted ? item.physicalCount! - item.systemStock : 0;
  const diffText = diff > 0 ? `+${diff}` : `${diff}`;
  const diffColor = diff > 0 ? '#10b981' : diff < 0 ? '#ef4444' : muted;

  return (
    <View style={[styles.itemCard, { backgroundColor: surface, borderColor: isCounted ? 'rgba(16,185,129,0.3)' : border }]}>
      <View style={styles.itemHeader}>
        {item.productId === '' ? (
          <TouchableOpacity
            style={styles.searchPromptBtn}
            onPress={() => onOpenProductSearch?.(item.id)}
          >
            <Text style={{ color: muted, fontSize: 16, fontWeight: '700' }}>Pesquisar produto...</Text>
            <Search size={18} color={muted} />
          </TouchableOpacity>
        ) : (
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={[styles.itemName, { color: scopeType === 'custom' ? '#10b981' : textPrimary, flex: 1 }]} numberOfLines={2}>
                {item.name}
              </Text>
              {scopeType === 'custom' && (
                <View style={styles.checkBadge}>
                  <Text style={{ color: '#fff', fontSize: 8, fontWeight: '900' }}>✓</Text>
                </View>
              )}
              {isCounted && scopeType !== 'custom' && <View style={styles.countedDot} />}
              <TouchableOpacity onPress={onFocusItem} style={{ padding: 4 }}>
                <Maximize2 size={20} color={muted} />
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      <View style={styles.itemBody}>
        <View style={styles.statsCol}>
          <View style={{ flexDirection: 'row', gap: 16 }}>
            <View>
              <Text style={[styles.statLabel, { color: muted }]}>Sistema</Text>
              <Text style={[styles.statVal, { color: textPrimary }]}>{item.systemStock} {item.unit}</Text>
            </View>
            {isCounted && diff !== 0 && (
              <View>
                <Text style={[styles.statLabel, { color: muted }]}>Ajuste</Text>
                <Text style={[styles.statVal, { color: diffColor }]}>{diffText}</Text>
              </View>
            )}
          </View>
        </View>

        <View style={[styles.counter, { backgroundColor: isDarkMode ? 'rgba(15,23,42,0.5)' : '#f8fafc', borderColor: border }]}>
          <TouchableOpacity 
            testID="decrement-btn"
            style={[styles.counterBtn, { backgroundColor: surface, borderColor: border }]} 
            onPress={() => onUpdateCount(item, Math.max(0, (item.physicalCount || 0) - 1))}
            disabled={item.physicalCount === 0}
          >
            <Minus size={24} color={textPrimary} opacity={item.physicalCount === 0 ? 0.3 : 1} />
          </TouchableOpacity>
          
          <View style={{ alignItems: 'center', width: 60, overflow: 'hidden' }}>
            <TextInput
              testID="count-input"
              style={[styles.countInput, { color: textPrimary }]}
              keyboardType="numeric"
              value={item.physicalCount === null ? '' : String(item.physicalCount)}
              onChangeText={val => {
                if (val === '') onUpdateCount(item, null);
                else onUpdateCount(item, Math.max(0, parseInt(val, 10) || 0));
              }}
              placeholder="-"
              placeholderTextColor={muted}
            />
            <Text style={{ fontSize: 9, color: muted, fontWeight: '800', marginTop: -2 }}>CONTADO</Text>
          </View>

          <TouchableOpacity 
            testID="increment-btn"
            style={[styles.counterBtn, { backgroundColor: surface, borderColor: border }]} 
            onPress={() => onUpdateCount(item, (item.physicalCount || 0) + 1)}
          >
            <Plus size={24} color={textPrimary} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  itemCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  itemHeader: { marginBottom: 12 },
  searchPromptBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 2,
    borderBottomColor: '#10b981',
  },
  itemName: { fontSize: 16, fontWeight: '700' },
  checkBadge: { width: 14, height: 14, borderRadius: 7, backgroundColor: '#10b981', alignItems: 'center', justifyContent: 'center' },
  countedDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#10b981' },
  itemBody: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  statsCol: { flex: 1 },
  statLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', marginBottom: 2 },
  statVal: { fontSize: 16, fontWeight: '800' },
  counter: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, borderWidth: 1, padding: 4, gap: 4 },
  counterBtn: { width: 44, height: 44, borderRadius: 8, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  countInput: { fontSize: 20, fontWeight: '800', textAlign: 'center', padding: 0, width: '100%', maxWidth: 58 },
});
