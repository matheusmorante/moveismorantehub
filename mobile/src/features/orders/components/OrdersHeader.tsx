import React from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { RefreshCw, Search } from 'lucide-react-native';

type Props = {
  dark: boolean;
  search: string;
  onSearch: (value: string) => void;
  onRefresh: () => void;
};

export function OrdersHeader({ dark, search, onSearch, onRefresh }: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.top}>
        <Text style={[styles.title, dark && styles.light]}>Pedidos de Venda</Text>
        <TouchableOpacity onPress={onRefresh} style={styles.refresh} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <RefreshCw size={16} color="#64748b" />
        </TouchableOpacity>
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
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 8,
    gap: 10,
  },
  top: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  title: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0f172a',
  },
  light: {
    color: '#f8fafc',
  },
  refresh: {
    padding: 6,
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
});
