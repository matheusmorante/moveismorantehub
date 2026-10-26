import React from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { ArrowLeft, Search, X } from 'lucide-react-native';
import type { MobileOrderType } from '../domain/types';

type Props = {
  dark: boolean;
  search: string;
  onSearch: (value: string) => void;
  statusFilter?: string;
  onSelectStatus?: (status: string) => void;
  totalOrders?: number;
  title?: string;
  onBack?: () => void;
  orderType?: MobileOrderType;
};

const SALES_STATUS_FILTERS = [
  { id: 'all', label: 'Todos' },
  { id: 'agendados', label: 'Agendados' },
  { id: 'concluidos', label: 'Atendidos' },
  { id: 'cancelados', label: 'Cancelados' },
  { id: 'retiradas', label: 'Retiradas' },
  { id: 'rascunhos', label: 'Rascunhos' },
];
const OTHER_STATUS_FILTERS = SALES_STATUS_FILTERS.filter((item) => item.id !== 'retiradas');


export function OrdersHeader({
  dark,
  search,
  onSearch,
  statusFilter = 'all',
  onSelectStatus,
  totalOrders,
  title = 'Pedidos de Venda',
  onBack,
  orderType = 'sale',
}: Props) {
  const statusFilters = orderType === 'sale' ? SALES_STATUS_FILTERS : OTHER_STATUS_FILTERS;

  return (
    <View style={styles.container}>
      <View style={styles.top}>
        <View style={styles.titleRow}>
          {onBack ? (
            <TouchableOpacity
              onPress={onBack}
              style={styles.back}
              accessibilityLabel="Voltar para Pedidos"
            >
              <ArrowLeft size={18} color={dark ? '#f8fafc' : '#334155'} />
            </TouchableOpacity>
          ) : null}
          <Text style={[styles.title, dark && styles.light]}>{title}</Text>
          {totalOrders !== undefined ? (
            <View style={[styles.countBadge, dark && styles.countBadgeDark]}>
              <Text style={styles.countText}>{totalOrders}</Text>
            </View>
          ) : null}
        </View>
      </View>

      <View style={[styles.search, dark && styles.darkCard]}>
        <Search size={16} color="#94a3b8" />
        <TextInput
          value={search}
          onChangeText={onSearch}
          placeholder="Buscar por cliente, código ou cidade..."
          placeholderTextColor="#94a3b8"
          underlineColorAndroid="transparent"
          style={[
            styles.input,
            dark && styles.light,
            { outlineStyle: 'none', outlineWidth: 0 } as any,
          ]}
        />
        {Boolean(search) && (
          <TouchableOpacity
            onPress={() => onSearch('')}
            style={styles.clearBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <X size={15} color="#94a3b8" />
          </TouchableOpacity>
        )}
      </View>

      {/* Chips de filtro de status replicados do ERP */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filtersContainer}
      >
        {statusFilters.map((item) => {
          const isActive = statusFilter === item.id;
          return (
            <TouchableOpacity
              key={item.id}
              activeOpacity={0.7}
              onPress={() => onSelectStatus?.(item.id)}
              style={[
                styles.chip,
                dark && styles.chipDark,
                isActive && styles.chipActive,
              ]}
            >
              <Text
                style={[
                  styles.chipText,
                  dark && styles.chipTextDark,
                  isActive && styles.chipTextActive,
                ]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 8,
    gap: 10,
  },
  top: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  back: {
    padding: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0f172a',
  },
  countBadge: {
    backgroundColor: '#eff6ff',
    borderColor: '#dbeafe',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  countBadgeDark: {
    backgroundColor: 'rgba(30, 58, 138, 0.35)',
    borderColor: 'rgba(30, 64, 175, 0.5)',
  },
  countText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#2563eb',
  },
  light: {
    color: '#f8fafc',
  },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  clearBtn: {
    padding: 4,
  },
  input: {
    flex: 1,
    height: 42,
    fontSize: 13,
    fontWeight: '600',
    color: '#0f172a',
  },
  darkCard: {
    backgroundColor: '#1e293b',
    borderColor: '#334155',
  },
  filtersContainer: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 2,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  chipDark: {
    backgroundColor: '#1e293b',
    borderColor: '#334155',
  },
  chipActive: {
    backgroundColor: '#2563eb',
    borderColor: '#1d4ed8',
  },
  chipText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  chipTextDark: {
    color: '#94a3b8',
  },
  chipTextActive: {
    color: '#ffffff',
  },
});
