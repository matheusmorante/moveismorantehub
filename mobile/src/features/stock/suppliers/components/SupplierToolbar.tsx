import React from 'react';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import {
  ArrowDownAZ,
  ArrowUpAZ,
  ArrowDownWideNarrow,
  ArrowUpWideNarrow,
  Plus,
  Search,
  X,
} from 'lucide-react-native';
import { styles } from '../screens/suppliersScreen.styles';

interface SupplierColors {
  bg: string;
  surface: string;
  border: string;
  text: string;
  muted: string;
}

interface SupplierToolbarProps {
  search: string;
  setSearch: (text: string) => void;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  cycleSort: () => void;
  sortLabel: string;
  activeOnly?: boolean;
  setActiveOnly: (value?: boolean) => void;
  onOpenNewSupplier: () => void;
  colors: SupplierColors;
}

export const SupplierToolbar: React.FC<SupplierToolbarProps> = ({
  search,
  setSearch,
  sortBy,
  sortOrder,
  cycleSort,
  sortLabel,
  activeOnly,
  setActiveOnly,
  onOpenNewSupplier,
  colors,
}) => {
  return (
    <View style={[styles.toolbar, { borderBottomColor: colors.border }]}>
      <View
        style={[
          styles.searchBox,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}
      >
        <Search size={17} color={colors.muted} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Pesquisar fornecedor por nome, razão social ou CPF/CNPJ"
          placeholderTextColor={colors.muted}
          style={[styles.searchInput, { color: colors.text }]}
          returnKeyType="search"
        />
        {search ? (
          <TouchableOpacity
            onPress={() => setSearch('')}
            accessibilityRole="button"
            accessibilityLabel="Limpar busca"
            style={styles.iconButton}
          >
            <X size={17} color={colors.muted} />
          </TouchableOpacity>
        ) : null}
      </View>
      <View style={styles.toolbarActions}>
        <TouchableOpacity
          onPress={cycleSort}
          style={[
            styles.sortButton,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
          accessibilityRole="button"
          accessibilityLabel={`Ordenação: ${sortLabel}. Toque para alterar`}
        >
          {sortBy === 'full_name' ? (
            sortOrder === 'asc' ? (
              <ArrowDownAZ size={18} color="#2563eb" />
            ) : (
              <ArrowUpAZ size={18} color="#2563eb" />
            )
          ) : sortOrder === 'asc' ? (
            <ArrowUpWideNarrow size={18} color="#2563eb" />
          ) : (
            <ArrowDownWideNarrow size={18} color="#2563eb" />
          )}
          <Text style={{ color: colors.text, fontSize: 12, fontWeight: '700' }}>
            {sortLabel}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onOpenNewSupplier}
          style={styles.addButton}
          accessibilityRole="button"
          accessibilityLabel="Novo Fornecedor"
        >
          <Plus size={17} color="#fff" />
          <Text style={styles.addButtonText}>Novo</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.statusFilters}>
        {(
          [
            { label: 'Todos', value: undefined },
            { label: 'Ativos', value: true },
            { label: 'Inativos', value: false },
          ] as const
        ).map((option) => {
          const selected = activeOnly === option.value;
          return (
            <TouchableOpacity
              key={option.label}
              onPress={() => setActiveOnly(option.value)}
              style={[
                styles.statusChip,
                {
                  backgroundColor: selected ? '#dbeafe' : colors.surface,
                  borderColor: selected ? '#93c5fd' : colors.border,
                },
              ]}
              accessibilityRole="button"
              accessibilityState={{ selected }}
            >
              <Text
                style={{
                  color: selected ? '#1d4ed8' : colors.muted,
                  fontSize: 11,
                  fontWeight: '800',
                }}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};
