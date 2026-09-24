import React from 'react';
import { View, Text, StyleSheet, TextInput, ScrollView, TouchableOpacity } from 'react-native';
import { Search } from 'lucide-react-native';
import type { OperationFilter } from '../hooks/useInventoryOperation';

interface Props {
  isDarkMode: boolean;
  scopeType?: string | null;
  search: string;
  onSearchChange: (text: string) => void;
  filter: OperationFilter;
  onFilterChange: (filter: OperationFilter) => void;
  onAddManualItem?: () => void;
}

export const InventoryOperationFilterBar: React.FC<Props> = ({
  isDarkMode,
  scopeType,
  search,
  onSearchChange,
  filter,
  onFilterChange,
  onAddManualItem,
}) => {
  const bg = isDarkMode ? '#0f172a' : '#f8fafc';
  const surface = isDarkMode ? '#1e293b' : '#ffffff';
  const border = isDarkMode ? '#334155' : '#e2e8f0';
  const textPrimary = isDarkMode ? '#f1f5f9' : '#0f172a';
  const muted = isDarkMode ? '#94a3b8' : '#64748b';

  return (
    <>
      <View style={[styles.filterBar, { backgroundColor: surface, borderBottomColor: border }]}>
        {scopeType !== 'custom' && (
          <View style={[styles.searchBox, { backgroundColor: bg, borderColor: border }]}>
            <Search size={18} color={muted} />
            <TextInput
              style={[styles.searchInput, { color: textPrimary }]}
              placeholder="Buscar produto..."
              placeholderTextColor={muted}
              value={search}
              onChangeText={onSearchChange}
            />
          </View>
        )}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 12 }}>
          {(['all', 'uncounted', 'counted', 'divergent'] as const).map(f => (
            <TouchableOpacity
              key={f}
              style={[
                styles.filterChip, 
                { borderColor: filter === f ? '#3b82f6' : border, backgroundColor: filter === f ? 'rgba(59,130,246,0.1)' : bg }
              ]}
              onPress={() => onFilterChange(f)}
            >
              <Text style={{ color: filter === f ? '#3b82f6' : textPrimary, fontWeight: filter === f ? '700' : '500', fontSize: 13 }}>
                {f === 'all' ? 'Todos' : f === 'uncounted' ? 'Não contados' : f === 'counted' ? 'Contados' : 'Divergentes'}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {scopeType === 'custom' && onAddManualItem && (
        <View style={[styles.addItemBar, { backgroundColor: surface, borderBottomColor: border }]}>
          <TouchableOpacity style={styles.addItemBtn} onPress={onAddManualItem}>
            <Text style={styles.addItemBtnText}>+ Adicionar Item</Text>
          </TouchableOpacity>
        </View>
      )}
    </>
  );
};

const styles = StyleSheet.create({
  filterBar: { padding: 16, borderBottomWidth: 1 },
  searchBox: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, height: 44, borderRadius: 10, borderWidth: 1, gap: 8 },
  searchInput: { flex: 1, fontSize: 15, padding: 0 },
  filterChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1, marginRight: 8 },
  addItemBar: { paddingHorizontal: 16, paddingVertical: 8, borderBottomWidth: 1 },
  addItemBtn: { backgroundColor: 'rgba(16,185,129,0.1)', borderWidth: 1, borderColor: '#10b981', borderRadius: 8, paddingVertical: 8, alignItems: 'center' },
  addItemBtnText: { color: '#10b981', fontWeight: '800', fontSize: 13 },
});
