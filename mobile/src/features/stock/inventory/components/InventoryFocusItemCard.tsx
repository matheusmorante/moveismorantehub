import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { Plus, Minus } from 'lucide-react-native';
import type { AuditItem } from '../hooks/useInventoryAuditWorkflow';

interface Props {
  item: AuditItem;
  width: number;
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
  isDarkMode,
  textPrimary,
  muted,
  border,
  bg,
  onUpdateCount,
}) => {
  return (
    <View style={[styles.cardContainer, { width }]}>
      <Text style={[styles.itemName, { color: textPrimary }]} numberOfLines={3} adjustsFontSizeToFit>
        {item.name}
      </Text>
      <Text style={[styles.itemSupplier, { color: muted }]}>
        {item.supplierNames || 'Sem fornecedor'}
      </Text>

      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={[styles.statLabel, { color: muted }]}>Sistema</Text>
          <Text style={[styles.statValue, { color: textPrimary }]}>{item.systemStock}</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statLabel, { color: muted }]}>Unidade</Text>
          <Text style={[styles.statValue, { color: textPrimary }]}>{item.unit || 'UN'}</Text>
        </View>
      </View>

      <View style={styles.counterContainer}>
        <TouchableOpacity
          style={[styles.bigBtn, { backgroundColor: '#10b981', borderColor: '#059669' }]}
          onPress={() => onUpdateCount(item.id, (item.physicalCount || 0) + 1)}
        >
          <Plus size={48} color="#ffffff" />
        </TouchableOpacity>

        <View style={styles.inputWrapper}>
          <TextInput
            style={[
              styles.bigInput,
              {
                color: textPrimary,
                borderColor: border,
                backgroundColor: isDarkMode ? 'rgba(15,23,42,0.5)' : bg,
              },
            ]}
            keyboardType="numeric"
            value={item.physicalCount === null ? '' : String(item.physicalCount)}
            onChangeText={val => {
              if (val === '') onUpdateCount(item.id, null);
              else onUpdateCount(item.id, Math.max(0, parseInt(val, 10) || 0));
            }}
            placeholder="0"
            placeholderTextColor={muted}
          />
          <Text style={[styles.inputLabel, { color: muted }]}>CONTADO</Text>
        </View>

        <TouchableOpacity
          style={[styles.bigBtn, { backgroundColor: '#ef4444', borderColor: '#dc2626' }]}
          onPress={() => onUpdateCount(item.id, Math.max(0, (item.physicalCount || 0) - 1))}
          disabled={item.physicalCount === 0}
        >
          <Minus size={48} color="#ffffff" opacity={item.physicalCount === 0 ? 0.3 : 1} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  itemName: {
    fontSize: 28,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 8,
  },
  itemSupplier: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 24,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 32,
    marginBottom: 32,
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
    alignItems: 'center',
    width: '100%',
    gap: 24,
  },
  bigBtn: {
    width: '100%',
    height: 100,
    borderRadius: 24,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputWrapper: {
    width: '100%',
    alignItems: 'center',
  },
  bigInput: {
    width: '100%',
    height: 100,
    borderRadius: 24,
    borderWidth: 2,
    fontSize: 48,
    fontWeight: '900',
    textAlign: 'center',
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '900',
    marginTop: 8,
    letterSpacing: 2,
  },
});
