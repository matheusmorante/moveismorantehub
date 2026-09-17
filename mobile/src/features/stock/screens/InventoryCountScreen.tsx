import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, TextInput, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { ArrowLeft, Minus, Plus, Search, Check, Save, Trash2 } from 'lucide-react-native';

interface ScannedItem {
  id: string;
  name: string;
  supplierNames: string;
  unit: string;
  systemStock: number;
  physicalCount: number;
}

interface Props {
  isDarkMode: boolean;
  onBack: () => void;
}

export const InventoryCountScreen: React.FC<Props> = ({ isDarkMode, onBack }) => {
  const [items, setItems] = useState<ScannedItem[]>([
    { id: '1', name: 'Sofá Retrátil 3 Lugares', supplierNames: 'Indústria Móveis Silva', unit: 'un', systemStock: 5, physicalCount: 5 },
    { id: '2', name: 'Mesa de Jantar 6 Lugares', supplierNames: 'Estofados Premium Ltda', unit: 'cj', systemStock: 2, physicalCount: 1 },
    { id: '3', name: 'Cadeira Estofada', supplierNames: 'Estofados Premium Ltda', unit: 'un', systemStock: 10, physicalCount: 12 },
  ]);
  const [searchQuery, setSearchQuery] = useState('');

  const handleUpdateCount = (id: string, newCount: number) => {
    setItems(items.map(item => {
      if (item.id === id) {
        return { ...item, physicalCount: Math.max(0, newCount) };
      }
      return item;
    }));
  };

  const handleRemove = (id: string) => {
    Alert.alert(
      'Remover Item',
      'Tem certeza que deseja remover este item da contagem atual?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Remover', style: 'destructive', onPress: () => setItems(items.filter(i => i.id !== id)) }
      ]
    );
  };

  const renderItem = ({ item }: { item: ScannedItem }) => {
    const diff = item.physicalCount - item.systemStock;
    const isMatching = diff === 0;
    const diffText = diff > 0 ? `+${diff}` : `${diff}`;

    return (
      <View style={[styles.itemCard, isDarkMode && styles.itemCardDark]}>
        
        {/* Header: Name and Remove */}
        <View style={styles.cardHeader}>
          <View style={styles.nameContainer}>
            <Text style={[styles.itemName, isDarkMode && styles.textDark]}>{item.name}</Text>
            <Text style={[styles.supplierName, isDarkMode && styles.textMutedDark]} numberOfLines={1}>
              {item.supplierNames}
            </Text>
          </View>
          <TouchableOpacity onPress={() => handleRemove(item.id)} style={styles.removeBtn}>
            <Trash2 size={20} color="#ef4444" />
          </TouchableOpacity>
        </View>

        {/* Content: Stock, Adjustment, and Counter */}
        <View style={styles.cardContent}>
            <View style={styles.statsCol}>
                <View style={styles.statRow}>
                    <Text style={[styles.statLabel, isDarkMode && styles.textMutedDark]}>Saldo Sistema:</Text>
                    <Text style={[styles.statValue, isDarkMode && styles.textDark]}>
                        {item.systemStock} {item.unit}
                    </Text>
                </View>
                <View style={styles.statRow}>
                    <Text style={[styles.statLabel, isDarkMode && styles.textMutedDark]}>Ajuste:</Text>
                    <View style={[
                        styles.diffBadge,
                        diff > 0 ? (isDarkMode ? styles.diffPositiveDark : styles.diffPositive) :
                        diff < 0 ? (isDarkMode ? styles.diffNegativeDark : styles.diffNegative) :
                        (isDarkMode ? styles.diffZeroDark : styles.diffZero)
                    ]}>
                        <Text style={[
                            styles.diffText,
                            diff > 0 ? (isDarkMode ? styles.diffTextPositiveDark : styles.diffTextPositive) :
                            diff < 0 ? (isDarkMode ? styles.diffTextNegativeDark : styles.diffTextNegative) :
                            (isDarkMode ? styles.diffTextZeroDark : styles.diffTextZero)
                        ]}>
                            {diffText} {item.unit}
                        </Text>
                    </View>
                </View>
            </View>

            {/* Counter */}
            <View style={styles.counterGroup}>
                <TouchableOpacity 
                    style={[styles.counterBtn, isDarkMode && styles.counterBtnDark]} 
                    onPress={() => handleUpdateCount(item.id, item.physicalCount - 1)}
                >
                    <Minus size={20} color={isDarkMode ? '#f8fafc' : '#0f172a'} />
                </TouchableOpacity>
                
                <TextInput
                    style={[
                        styles.countInput, 
                        isDarkMode && styles.countInputDark,
                        !isMatching && { borderColor: diff > 0 ? '#10b981' : '#ef4444' }
                    ]}
                    keyboardType="numeric"
                    value={String(item.physicalCount)}
                    onChangeText={(text) => {
                        const parsed = parseInt(text, 10);
                        handleUpdateCount(item.id, isNaN(parsed) ? 0 : parsed);
                    }}
                />
                
                <TouchableOpacity 
                    style={[styles.counterBtn, isDarkMode && styles.counterBtnDark]} 
                    onPress={() => handleUpdateCount(item.id, item.physicalCount + 1)}
                >
                    <Plus size={20} color={isDarkMode ? '#f8fafc' : '#0f172a'} />
                </TouchableOpacity>
            </View>
        </View>

      </View>
    );
  };

  return (
    <KeyboardAvoidingView 
      style={[styles.container, isDarkMode && styles.containerDark]} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={[styles.backButton, isDarkMode && styles.backButtonDark]}>
          <ArrowLeft size={24} color={isDarkMode ? '#94a3b8' : '#64748b'} />
        </TouchableOpacity>
        <View style={styles.headerTitleGroup}>
          <Text style={[styles.title, isDarkMode && styles.textDark]}>Nova Contagem</Text>
          <Text style={[styles.subtitle, isDarkMode && styles.textMutedDark]}>
            {items.length} itens encontrados
          </Text>
        </View>
        <TouchableOpacity style={[styles.saveBtn, isDarkMode && styles.saveBtnDark]}>
          <Save size={20} color="#ffffff" />
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <View style={[styles.searchBox, isDarkMode && styles.searchBoxDark]}>
          <Search size={20} color={isDarkMode ? '#64748b' : '#94a3b8'} />
          <TextInput
            style={[styles.searchInput, isDarkMode && styles.textDark]}
            placeholder="Buscar item na contagem..."
            placeholderTextColor={isDarkMode ? '#64748b' : '#94a3b8'}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      <FlatList
        data={items.filter(i => i.name.toLowerCase().includes(searchQuery.toLowerCase()))}
        keyExtractor={i => i.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
      />
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  containerDark: {
    backgroundColor: '#0f172a',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    backgroundColor: '#ffffff',
  },
  headerTitleGroup: {
    flex: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f1f5f9',
    marginRight: 12,
  },
  backButtonDark: {
    backgroundColor: '#1e293b',
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
  },
  subtitle: {
    fontSize: 13,
    color: '#64748b',
  },
  textDark: {
    color: '#f8fafc',
  },
  textMutedDark: {
    color: '#94a3b8',
  },
  saveBtn: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnDark: {
    backgroundColor: '#3b82f6',
  },
  searchContainer: {
    padding: 16,
    paddingBottom: 8,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 12,
  },
  searchBoxDark: {
    backgroundColor: '#1e293b',
    borderColor: '#334155',
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#0f172a',
  },
  list: {
    padding: 16,
    gap: 12,
    paddingBottom: 40,
  },
  itemCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  itemCardDark: {
    backgroundColor: '#1e293b',
    borderColor: '#334155',
  },
  cardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 16,
  },
  nameContainer: {
      flex: 1,
      paddingRight: 12,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 4,
  },
  supplierName: {
      fontSize: 13,
      color: '#64748b',
  },
  removeBtn: {
      padding: 4,
      marginTop: -4,
      marginRight: -4,
  },
  cardContent: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      justifyContent: 'space-between',
  },
  statsCol: {
      gap: 8,
  },
  statRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
  },
  statLabel: {
      fontSize: 13,
      color: '#64748b',
      width: 90,
  },
  statValue: {
      fontSize: 14,
      fontWeight: '700',
      fontFamily: 'monospace',
      color: '#334155',
  },
  
  diffBadge: {
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 6,
  },
  diffPositive: { backgroundColor: '#d1fae5' }, // emerald-100
  diffPositiveDark: { backgroundColor: '#022c22' },
  diffNegative: { backgroundColor: '#ffe4e6' }, // rose-100
  diffNegativeDark: { backgroundColor: '#4c0519' },
  diffZero: { backgroundColor: '#f1f5f9' }, // slate-100
  diffZeroDark: { backgroundColor: '#1e293b' },
  
  diffText: {
      fontSize: 11,
      fontWeight: '700',
      fontFamily: 'monospace',
  },
  diffTextPositive: { color: '#047857' }, // emerald-700
  diffTextPositiveDark: { color: '#6ee7b7' },
  diffTextNegative: { color: '#be123c' }, // rose-700
  diffTextNegativeDark: { color: '#fda4af' },
  diffTextZero: { color: '#64748b' },
  diffTextZeroDark: { color: '#94a3b8' },

  counterGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  counterBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  counterBtnDark: {
    backgroundColor: '#334155',
  },
  countInput: {
      width: 60,
      height: 36,
      borderWidth: 1,
      borderColor: '#e2e8f0',
      borderRadius: 8,
      textAlign: 'center',
      fontSize: 16,
      fontWeight: '700',
      fontFamily: 'monospace',
      color: '#0f172a',
      backgroundColor: '#ffffff',
  },
  countInputDark: {
      borderColor: '#334155',
      backgroundColor: '#0f172a',
      color: '#f8fafc',
  }
});
