import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert
} from 'react-native';
import { Plus, Trash2, Search, Info } from 'lucide-react-native';
import { supabase } from '../../../../lib/supabase';

interface Props {
  formData: any;
  setFormData: (fn: (prev: any) => any) => void;
  dark: boolean;
}

export const ProductFormCompositionTab: React.FC<Props> = ({ formData, setFormData, dark }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);

  const comboItems = Array.isArray(formData.comboItems) ? formData.comboItems : [];

  useEffect(() => {
    if (searchTerm.length < 3) {
      setResults([]);
      return;
    }

    const search = async () => {
      setSearching(true);
      try {
        const term = `%${searchTerm.toLowerCase()}%`;
        const { data, error } = await supabase
          .from('products')
          .select('id, name, code, price, unit_price, status')
          .neq('item_type', 'composition')
          .or(`name.ilike.${term},code.ilike.${term}`)
          .limit(10);

        if (!error && data) {
          setResults(data);
        }
      } catch (e) {
        console.log(e);
      } finally {
        setSearching(false);
      }
    };
    const to = setTimeout(search, 500);
    return () => clearTimeout(to);
  }, [searchTerm]);

  const handleAddItem = (product: any) => {
    if (comboItems.find((i: any) => i.productId === product.id)) {
      Alert.alert('Aviso', 'Este produto já está na composição.');
      return;
    }

    const newItem = {
      productId: product.id,
      variationId: null,
      quantity: 1,
      unitPrice: product.price ?? product.unit_price ?? 0,
      productName: product.name,
      productCode: product.code,
    };

    setFormData(prev => ({
      ...prev,
      comboItems: [...(prev.comboItems || []), newItem]
    }));
    setSearchTerm('');
    setResults([]);
  };

  const handleUpdateQuantity = (idx: number, text: string) => {
    const val = parseInt(text.replace(/[^0-9]/g, ''), 10) || 0;
    setFormData(prev => {
      const arr = [...(prev.comboItems || [])];
      arr[idx] = { ...arr[idx], quantity: val };
      return { ...prev, comboItems: arr };
    });
  };

  const handleRemove = (idx: number) => {
    setFormData(prev => {
      const arr = (prev.comboItems || []).filter((_: any, i: number) => i !== idx);
      return { ...prev, comboItems: arr };
    });
  };

  return (
    <View style={styles.container}>
      <View style={[styles.card, dark && styles.darkCard]}>
        <View style={styles.toggleRow}>
          <View style={styles.toggleInfo}>
            <Text style={[styles.cardTitle, dark && styles.lightText]}>Componentes</Text>
            <Text style={[styles.toggleDesc, dark && styles.dimText]}>
              Adicione produtos que compõem este kit ou embalagem.
            </Text>
          </View>
        </View>
      </View>

      <View style={[styles.card, dark && styles.darkCard]}>
        <Text style={[styles.sectionTitle, dark && styles.lightText]}>+ Adicionar Produto</Text>
        <View style={styles.searchRow}>
          <View style={[styles.searchBox, dark && styles.darkInput]}>
            <Search size={16} color="#94a3b8" />
            <TextInput
              style={[styles.searchInput, dark && styles.lightText]}
              placeholder="Buscar por nome ou código..."
              placeholderTextColor="#94a3b8"
              value={searchTerm}
              onChangeText={setSearchTerm}
            />
          </View>
        </View>

        {searching && <Text style={[styles.infoText, dark && styles.dimText]}>Buscando...</Text>}

        {results.length > 0 && (
          <View style={[styles.resultsContainer, dark && styles.darkCard]}>
            {results.map((r, i) => (
              <TouchableOpacity key={i} style={[styles.resultItem, dark && styles.darkBorder]} onPress={() => handleAddItem(r)}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.resultName, dark && styles.lightText]}>{r.name}</Text>
                  <Text style={[styles.resultCode, dark && styles.dimText]}>{r.code}</Text>
                </View>
                <Plus size={16} color="#2563eb" />
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      <Text style={[styles.sectionTitle, dark && styles.lightText]}>
        Itens do Kit ({comboItems.length})
      </Text>

      {comboItems.length === 0 ? (
        <View style={[styles.emptyBox, dark && styles.darkCard]}>
          <Info size={24} color="#94a3b8" style={{ marginBottom: 8 }} />
          <Text style={styles.emptyText}>Nenhum item na composição.</Text>
        </View>
      ) : (
        comboItems.map((item: any, idx: number) => (
          <View key={idx} style={[styles.varItem, dark && styles.darkCard]}>
            <View style={styles.varHeader}>
              <View style={styles.varHeaderLeft}>
                <Text style={[styles.varSku, dark && styles.lightText]}>{item.productCode || item.productId?.slice(0,8)}</Text>
                <Text style={[styles.varAttr, dark && styles.dimText]}>{item.productName || 'Produto'}</Text>
              </View>
            </View>

            <View style={styles.varEdit}>
              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.label, dark && styles.dimText]}>Quantidade</Text>
                  <TextInput
                    value={String(item.quantity ?? 1)}
                    onChangeText={val => handleUpdateQuantity(idx, val)}
                    keyboardType="numeric"
                    style={[styles.input, dark && styles.darkInput, dark && styles.lightText]}
                  />
                </View>
              </View>
              <TouchableOpacity
                onPress={() => handleRemove(idx)}
                style={styles.removeBtn}
              >
                <Trash2 size={14} color="#ef4444" />
                <Text style={styles.removeBtnText}>Remover Item</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { gap: 12 },
  card: { backgroundColor: '#f8fafc', borderRadius: 16, padding: 14, gap: 10, borderWidth: 1, borderColor: '#e2e8f0' },
  darkCard: { backgroundColor: '#1e293b', borderColor: '#334155' },
  cardTitle: { fontSize: 14, fontWeight: '900', color: '#0f172a' },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  toggleInfo: { flex: 1 },
  toggleDesc: { fontSize: 11, color: '#64748b', fontWeight: '600', marginTop: 2 },
  sectionTitle: { fontSize: 12, fontWeight: '900', color: '#0f172a', textTransform: 'uppercase' },
  searchRow: { flexDirection: 'row', gap: 8 },
  searchBox: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff', borderRadius: 10, paddingHorizontal: 10, borderWidth: 1, borderColor: '#e2e8f0', height: 42, gap: 8 },
  searchInput: { flex: 1, fontSize: 12, fontWeight: '700', color: '#0f172a' },
  darkInput: { backgroundColor: '#0f172a', borderColor: '#334155' },
  lightText: { color: '#f1f5f9' },
  dimText: { color: '#94a3b8' },
  infoText: { fontSize: 12, color: '#94a3b8', fontStyle: 'italic', paddingHorizontal: 4 },
  resultsContainer: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, backgroundColor: '#ffffff', overflow: 'hidden', marginTop: 4 },
  resultItem: { flexDirection: 'row', alignItems: 'center', padding: 10, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  darkBorder: { borderBottomColor: '#334155' },
  resultName: { fontSize: 12, fontWeight: '700', color: '#0f172a' },
  resultCode: { fontSize: 10, color: '#64748b' },
  emptyBox: { padding: 20, borderRadius: 12, backgroundColor: '#f8fafc', alignItems: 'center' },
  emptyText: { fontSize: 12, color: '#94a3b8', fontWeight: '700' },
  varItem: { borderRadius: 14, borderWidth: 1, borderColor: '#e2e8f0', overflow: 'hidden', backgroundColor: '#f8fafc' },
  varHeader: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 8 },
  varHeaderLeft: { flex: 1 },
  varSku: { fontSize: 12, fontWeight: '900', color: '#0f172a', fontVariant: ['tabular-nums'] as any },
  varAttr: { fontSize: 11, color: '#64748b', fontWeight: '600' },
  varEdit: { borderTopWidth: 1, borderTopColor: '#e2e8f0', padding: 12, gap: 10 },
  row: { flexDirection: 'row', gap: 8 },
  label: { fontSize: 10, fontWeight: '800', color: '#475569', textTransform: 'uppercase', marginBottom: 4 },
  input: { height: 42, backgroundColor: '#ffffff', borderRadius: 10, paddingHorizontal: 10, borderWidth: 1, borderColor: '#e2e8f0', fontSize: 12, fontWeight: '700', color: '#0f172a' },
  removeBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8 },
  removeBtnText: { fontSize: 12, fontWeight: '800', color: '#ef4444' },
});
