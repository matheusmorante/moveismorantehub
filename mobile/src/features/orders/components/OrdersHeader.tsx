import React from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { RefreshCw, Search } from 'lucide-react-native';

type Props = { dark: boolean; search: string; status: string; onSearch: (value: string) => void; onStatus: (value: string) => void; onRefresh: () => void };
const filters = [{ id: 'all', label: 'Todos' }, { id: 'agendados', label: 'Agendados' }, { id: 'concluidos', label: 'Concluídos' }, { id: 'rascunhos', label: 'Rascunhos' }];

export function OrdersHeader({ dark, search, status, onSearch, onStatus, onRefresh }: Props) {
  return <View style={styles.container}>
    <View style={styles.top}><Text style={[styles.title, dark && styles.light]}>Pedidos de Venda</Text><TouchableOpacity onPress={onRefresh} style={styles.refresh}><RefreshCw size={16} color="#64748b" /></TouchableOpacity></View>
    <View style={[styles.search, dark && styles.darkCard]}><Search size={16} color="#94a3b8" /><TextInput value={search} onChangeText={onSearch} placeholder="Buscar por cliente ou cidade..." placeholderTextColor="#94a3b8" style={[styles.input, dark && styles.light]} /></View>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
      {filters.map(filter => <TouchableOpacity key={filter.id} onPress={() => onStatus(filter.id)} style={[styles.chip, dark && styles.darkCard, status === filter.id && styles.active]}><Text style={[styles.chipText, status === filter.id && styles.activeText]}>{filter.label}</Text></TouchableOpacity>)}
    </ScrollView>
  </View>;
}

const styles = StyleSheet.create({
  container: { paddingVertical: 12, gap: 10 }, top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }, title: { fontSize: 18, fontWeight: '900', color: '#0f172a' }, light: { color: '#f8fafc' }, refresh: { padding: 8 }, search: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fff', borderRadius: 14, paddingHorizontal: 12, borderWidth: 1, borderColor: '#e2e8f0' }, input: { flex: 1, height: 42, fontSize: 13, fontWeight: '600', color: '#0f172a' }, darkCard: { backgroundColor: '#1e293b', borderColor: '#334155' }, filters: { gap: 8 }, chip: { paddingVertical: 7, paddingHorizontal: 14, borderRadius: 12, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0' }, active: { backgroundColor: '#2563eb', borderColor: '#2563eb' }, chipText: { fontSize: 11, fontWeight: '800', color: '#64748b' }, activeText: { color: '#fff' },
});

