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
import { Plus, Minus, Trash2, Search, Info } from 'lucide-react-native';
import { supabase } from '../../../../services/supabaseClient';

interface Props {
  formData: any;
  setFormData: (fn: (prev: any) => any) => void;
  dark: boolean;
  supplierId?: string;
}

export const ProductFormCompositionTab: React.FC<Props> = ({ formData, setFormData, dark, supplierId }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState(false);

  const comboItems = Array.isArray(formData.comboItems) ? formData.comboItems : [];

  useEffect(() => {
    if (searchTerm.length < 2) {
      setResults([]);
      setSearchError(false);
      return;
    }

    const search = async () => {
      setSearching(true);
      setSearchError(false);
      try {
        const term = `%${searchTerm.toLowerCase()}%`;
        const { data, error } = await supabase
          .from('products')
          .select('id, name, code, price, unit_price, status, item_type, is_combo, supplier_id, main_supplier_id, supplier_ids, product_variations(id, name, sku, price, unit_price, stock, active, status)')
          .neq('item_type', 'composition')
          .neq('item_type', 'combo')
          .or('is_combo.is.null,is_combo.eq.false')
          .or(`name.ilike.${term},code.ilike.${term}`)
          .limit(10);

        if (error) throw error;
        if (data) {
          const selectedSupplierId = supplierId || formData.mainSupplierId || formData.supplierId;
          const filtered = (data as any[]).filter(product => {
            if (!selectedSupplierId) return true;
            const supplierIds = Array.isArray(product.supplier_ids) ? product.supplier_ids : [];
            return product.supplier_id === selectedSupplierId || product.main_supplier_id === selectedSupplierId || supplierIds.includes(selectedSupplierId);
          });
          setResults(filtered.flatMap(product => {
            const variations = (product.product_variations || []).filter((variation: any) => variation.active !== false && variation.status !== 'merged');
            return variations.length > 0 ? variations.map((variation: any) => ({
              ...product,
              variationId: variation.id,
              variationName: variation.name,
              variationSku: variation.sku,
              variationPrice: variation.price ?? variation.unit_price,
              variationStock: variation.stock,
            })) : [product];
          }));
        }
      } catch (e) {
        console.warn('[ProductFormCompositionTab] Falha ao buscar componentes:', e);
        setResults([]);
        setSearchError(true);
      } finally {
        setSearching(false);
      }
    };
    const to = setTimeout(search, 500);
    return () => clearTimeout(to);
  }, [searchTerm, supplierId, formData.mainSupplierId, formData.supplierId]);

  const handleAddItem = (product: any) => {
    if (comboItems.find((i: any) => i.productId === product.id && (i.variationId || null) === (product.variationId || null))) {
      Alert.alert('Aviso', 'Este produto já está na composição.');
      return;
    }

    const description = product.variationName ? `${product.name} - ${product.variationName}` : product.name;
    const newItem = {
      productId: product.id,
      variationId: product.variationId || null,
      quantity: 1,
      unitPrice: product.variationPrice ?? product.price ?? product.unit_price ?? 0,
      description,
      productName: product.variationName ? `${product.name} · ${product.variationName}` : product.name,
      productCode: product.variationSku || product.code,
      stock: product.variationStock ?? product.stock ?? 0,
    };

    setFormData(prev => ({
      ...prev,
      comboItems: [...(prev.comboItems || []), newItem]
    }));
    setSearchTerm('');
    setResults([]);
  };

  const handleUpdateQuantity = (idx: number, text: string) => {
    const val = Math.max(1, parseInt(text.replace(/[^0-9]/g, ''), 10) || 1);
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

  const suggestedPrice = comboItems.reduce((total: number, item: any) => total + Number(item.unitPrice || 0) * Math.max(1, Number(item.quantity || 1)), 0);

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
        {!searching && searchError && <Text style={styles.errorText}>Não foi possível buscar componentes. Tente novamente.</Text>}
        {!searching && !searchError && searchTerm.length >= 2 && results.length === 0 && <Text style={[styles.infoText, dark && styles.dimText]}>Nenhum produto encontrado.</Text>}

        {results.length > 0 && (
          <View style={[styles.resultsContainer, dark && styles.darkCard]}>
            {results.map((r, i) => (
              <TouchableOpacity key={i} style={[styles.resultItem, dark && styles.darkBorder]} onPress={() => handleAddItem(r)}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.resultName, dark && styles.lightText]}>{r.name}{r.variationName ? ` · ${r.variationName}` : ''}</Text>
                  <Text style={[styles.resultCode, dark && styles.dimText]}>{r.variationSku || r.code} · R$ {Number(r.variationPrice ?? r.price ?? r.unit_price ?? 0).toFixed(2)} · Estoque: {Number(r.variationStock ?? r.stock ?? 0)}</Text>
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
                <Text style={[styles.varAttr, dark && styles.dimText]}>{item.description || item.productName || 'Produto'}</Text>
              <Text style={[styles.varStock, dark && styles.dimText]}>Unit.: R$ {Number(item.unitPrice || 0).toFixed(2)} · Estoque: {Number(item.stock ?? 0)}</Text>
              </View>
            </View>

            <View style={styles.varEdit}>
              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.label, dark && styles.dimText]}>Quantidade</Text>
                  <View style={styles.quantityControl}>
                    <TouchableOpacity accessibilityRole="button" accessibilityLabel="Diminuir quantidade" onPress={() => handleUpdateQuantity(idx, String(Math.max(1, Number(item.quantity || 1) - 1)))} style={styles.quantityButton}>
                      <Minus size={14} color="#64748b" />
                    </TouchableOpacity>
                    <TextInput
                      value={String(item.quantity ?? 1)}
                      onChangeText={val => handleUpdateQuantity(idx, val)}
                      keyboardType="numeric"
                      style={[styles.input, styles.quantityInput, dark && styles.darkInput, dark && styles.lightText]}
                    />
                    <TouchableOpacity accessibilityRole="button" accessibilityLabel="Aumentar quantidade" onPress={() => handleUpdateQuantity(idx, String(Number(item.quantity || 1) + 1))} style={styles.quantityButton}>
                      <Plus size={14} color="#64748b" />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => handleRemove(idx)}
                style={styles.removeBtn}
              >
                <Trash2 size={14} color="#ef4444" />
                <Text style={styles.removeBtnText}>Remover Item</Text>
              </TouchableOpacity>
              <Text style={[styles.itemSubtotal, dark && styles.dimText]}>
                Subtotal: R$ {(Number(item.unitPrice || 0) * Math.max(1, Number(item.quantity || 1))).toFixed(2)}
              </Text>
            </View>
          </View>
        ))
      )}
      {comboItems.length > 0 && (
        <View style={[styles.totalBox, dark && styles.darkCard]}>
          <Text style={[styles.totalLabel, dark && styles.dimText]}>Preço sugerido da composição</Text>
          <Text style={[styles.totalValue, dark && styles.lightText]}>R$ {suggestedPrice.toFixed(2)}</Text>
        </View>
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
  errorText: { fontSize: 12, color: '#dc2626', fontWeight: '700', paddingHorizontal: 4 },
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
  varStock: { fontSize: 10, color: '#64748b', fontWeight: '700', marginTop: 2 },
  varEdit: { borderTopWidth: 1, borderTopColor: '#e2e8f0', padding: 12, gap: 10 },
  row: { flexDirection: 'row', gap: 8 },
  label: { fontSize: 10, fontWeight: '800', color: '#475569', textTransform: 'uppercase', marginBottom: 4 },
  input: { height: 42, backgroundColor: '#ffffff', borderRadius: 10, paddingHorizontal: 10, borderWidth: 1, borderColor: '#e2e8f0', fontSize: 12, fontWeight: '700', color: '#0f172a' },
  quantityControl: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  quantityButton: { width: 32, height: 32, borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f1f5f9' },
  quantityInput: { flex: 1, minWidth: 56, textAlign: 'center' },
  removeBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8 },
  removeBtnText: { fontSize: 12, fontWeight: '800', color: '#ef4444' },
  itemSubtotal: { fontSize: 11, fontWeight: '800', color: '#64748b' },
  totalBox: { backgroundColor: '#ecfdf5', borderColor: '#a7f3d0', borderWidth: 1, borderRadius: 12, padding: 14, marginTop: 4, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalLabel: { color: '#047857', fontSize: 11, fontWeight: '900', textTransform: 'uppercase' },
  totalValue: { color: '#047857', fontSize: 16, fontWeight: '900' },
});
