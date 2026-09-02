import React, { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Plus, Trash2, ChevronDown } from 'lucide-react-native';
import { generateVariationSku } from '../../services/mobileProductHelpers';

interface Props {
  formData: any;
  setFormData: (fn: (prev: any) => any) => void;
  dark: boolean;
}

interface NewVarState {
  attrName: string;
  attrVal: string;
  price: string;
  stock: string;
}

const EMPTY_VAR: NewVarState = { attrName: 'Cor', attrVal: '', price: '', stock: '' };

export const ProductFormVariationsTab: React.FC<Props> = ({ formData, setFormData, dark }) => {
  const [newVar, setNewVar] = useState<NewVarState>(EMPTY_VAR);
  const [expanded, setExpanded] = useState<number | null>(null);

  const variations: any[] = Array.isArray(formData.variations) ? formData.variations : [];
  const hasVariations: boolean = Boolean(formData.hasVariations || variations.length > 0);

  const toggleHasVariations = () => {
    setFormData(prev => ({
      ...prev,
      hasVariations: !hasVariations,
      variations: !hasVariations ? prev.variations || [] : [],
    }));
  };

  const handleAdd = () => {
    if (!newVar.attrVal.trim()) return;
    const parentCode = (formData.code || '000000').trim();
    const resolvedSku = generateVariationSku(parentCode, variations);

    const v = {
      sku: resolvedSku,
      price: newVar.price ? Number(newVar.price) : (Number(formData.unitPrice) || 0),
      stock: newVar.stock ? Number(newVar.stock) : 0,
      status: 'published',
      active: true,
      attributes: { [newVar.attrName.trim() || 'Cor']: newVar.attrVal.trim() },
    };

    setFormData(prev => ({
      ...prev,
      hasVariations: true,
      variations: [...(prev.variations || []), v],
    }));
    setNewVar(EMPTY_VAR);
  };

  const handleRemove = (idx: number) => {
    setFormData(prev => {
      const next = (prev.variations || []).filter((_: any, i: number) => i !== idx);
      return { ...prev, variations: next, hasVariations: next.length > 0 };
    });
  };

  const updateVar = (idx: number, field: string, val: any) => {
    setFormData(prev => {
      const vars = [...(prev.variations || [])];
      vars[idx] = { ...vars[idx], [field]: val };
      return { ...prev, variations: vars };
    });
  };

  const parentCode = (formData.code || 'PRD').trim();
  const nextSuffix = String(variations.length + 1).padStart(2, '0');
  const autoSku = `${parentCode}-${nextSuffix}`;

  return (
    <View style={styles.container}>
      {/* Toggle Tem Variações */}
      <View style={[styles.card, dark && styles.darkCard]}>
        <View style={styles.toggleRow}>
          <View style={styles.toggleInfo}>
            <Text style={[styles.cardTitle, dark && styles.lightText]}>Grade de Variações</Text>
            <Text style={[styles.toggleDesc, dark && styles.dimText]}>
              Cores, tamanhos, modelos com preços e estoques individuais
            </Text>
          </View>
          <TouchableOpacity
            onPress={toggleHasVariations}
            style={[styles.toggleBtn, hasVariations && styles.toggleBtnActive]}
          >
            <Text style={[styles.toggleBtnText, hasVariations && styles.toggleBtnTextActive]}>
              {hasVariations ? 'Sim' : 'Não'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {hasVariations && (
        <>
          {/* Formulário de Nova Variação */}
          <View style={[styles.card, dark && styles.darkCard]}>
            <Text style={[styles.sectionTitle, dark && styles.lightText]}>+ Adicionar Variação</Text>

            <View style={styles.row}>
              <View style={styles.flex1}>
                <Text style={[styles.label, dark && styles.dimText]}>Atributo</Text>
                <TextInput
                  value={newVar.attrName}
                  onChangeText={v => setNewVar(p => ({ ...p, attrName: v }))}
                  placeholder="Ex: Cor"
                  placeholderTextColor="#94a3b8"
                  style={[styles.input, dark && styles.darkInput, dark && styles.lightText]}
                />
              </View>
              <View style={{ flex: 1.5 }}>
                <Text style={[styles.label, dark && styles.dimText]}>Valor *</Text>
                <TextInput
                  value={newVar.attrVal}
                  onChangeText={v => setNewVar(p => ({ ...p, attrVal: v }))}
                  placeholder="Ex: Preto Fosco"
                  placeholderTextColor="#94a3b8"
                  style={[styles.input, dark && styles.darkInput, dark && styles.lightText]}
                />
              </View>
            </View>

            <View style={styles.row}>
              <View style={styles.flex1}>
                <Text style={[styles.label, dark && styles.dimText]}>Preço (R$)</Text>
                <TextInput
                  value={newVar.price}
                  onChangeText={v => setNewVar(p => ({ ...p, price: v }))}
                  keyboardType="numeric"
                  placeholder="Herda pai"
                  placeholderTextColor="#94a3b8"
                  style={[styles.input, dark && styles.darkInput, dark && styles.lightText]}
                />
              </View>
              <View style={styles.flex1}>
                <Text style={[styles.label, dark && styles.dimText]}>Estoque</Text>
                <TextInput
                  value={newVar.stock}
                  onChangeText={v => setNewVar(p => ({ ...p, stock: v }))}
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor="#94a3b8"
                  style={[styles.input, dark && styles.darkInput, dark && styles.lightText]}
                />
              </View>
            </View>

            <TouchableOpacity
              onPress={handleAdd}
              style={[styles.addBtn, !newVar.attrVal.trim() && styles.addBtnDisabled]}
              disabled={!newVar.attrVal.trim()}
            >
              <Plus size={15} color="#ffffff" />
              <Text style={styles.addBtnText}>Incluir Variação</Text>
            </TouchableOpacity>
          </View>

          {/* Lista de Variações */}
          <Text style={[styles.sectionTitle, dark && styles.lightText]}>
            Variações Cadastradas ({variations.length})
          </Text>

          {variations.length === 0 ? (
            <View style={[styles.emptyBox, dark && styles.darkCard]}>
              <Text style={styles.emptyText}>Nenhuma variação ainda. Adicione acima.</Text>
            </View>
          ) : (
            variations.map((v: any, idx: number) => {
              const attrSummary = v.attributes
                ? Object.entries(v.attributes).map(([k, val]) => `${k}: ${val}`).join(' · ')
                : '-';
              const isOpen = expanded === idx;
              return (
                <View key={idx} style={[styles.varItem, dark && styles.darkCard]}>
                  {/* Header da variação */}
                  <TouchableOpacity
                    onPress={() => setExpanded(isOpen ? null : idx)}
                    style={styles.varHeader}
                  >
                    <View style={styles.varHeaderLeft}>
                      <Text style={[styles.varSku, dark && styles.lightText]}>{v.sku}</Text>
                      <Text style={[styles.varAttr, dark && styles.dimText]}>{attrSummary}</Text>
                    </View>
                    <View style={styles.varHeaderRight}>
                      <Text style={styles.varPrice}>
                        R$ {Number(v.price || 0).toFixed(2).replace('.', ',')}
                      </Text>
                      <Text style={[styles.varStock, dark && styles.dimText]}>Est: {v.stock ?? 0}</Text>
                    </View>
                    <ChevronDown
                      size={16}
                      color="#94a3b8"
                      style={isOpen ? { transform: [{ rotate: '180deg' }] } : undefined}
                    />
                  </TouchableOpacity>

                  {/* Edição inline */}
                  {isOpen && (
                    <View style={styles.varEdit}>
                      <View style={styles.row}>
                        <View style={styles.flex1}>
                          <Text style={[styles.label, dark && styles.dimText]}>Preço (R$)</Text>
                          <TextInput
                            value={String(v.price ?? '')}
                            onChangeText={val => updateVar(idx, 'price', val)}
                            keyboardType="numeric"
                            style={[styles.input, dark && styles.darkInput, dark && styles.lightText]}
                          />
                        </View>
                        <View style={styles.flex1}>
                          <Text style={[styles.label, dark && styles.dimText]}>Estoque</Text>
                          <TextInput
                            value={String(v.stock ?? '')}
                            onChangeText={val => updateVar(idx, 'stock', val)}
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
                        <Text style={styles.removeBtnText}>Remover Variação</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              );
            })
          )}
        </>
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
  toggleBtn: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 12, backgroundColor: '#f1f5f9' },
  toggleBtnActive: { backgroundColor: '#2563eb' },
  toggleBtnText: { fontSize: 12, fontWeight: '900', color: '#64748b' },
  toggleBtnTextActive: { color: '#ffffff' },
  sectionTitle: { fontSize: 12, fontWeight: '900', color: '#0f172a', textTransform: 'uppercase' },
  row: { flexDirection: 'row', gap: 8 },
  flex1: { flex: 1 },
  label: { fontSize: 10, fontWeight: '800', color: '#475569', textTransform: 'uppercase', marginBottom: 4 },
  input: { height: 42, backgroundColor: '#ffffff', borderRadius: 10, paddingHorizontal: 10, borderWidth: 1, borderColor: '#e2e8f0', fontSize: 12, fontWeight: '700', color: '#0f172a' },
  darkInput: { backgroundColor: '#0f172a', borderColor: '#334155' },
  lightText: { color: '#f1f5f9' },
  dimText: { color: '#94a3b8' },
  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 42, borderRadius: 12, backgroundColor: '#2563eb' },
  addBtnDisabled: { backgroundColor: '#93c5fd' },
  addBtnText: { fontSize: 13, fontWeight: '900', color: '#ffffff' },
  emptyBox: { padding: 20, borderRadius: 12, backgroundColor: '#f8fafc', alignItems: 'center' },
  emptyText: { fontSize: 12, color: '#94a3b8', fontWeight: '700' },
  varItem: { borderRadius: 14, borderWidth: 1, borderColor: '#e2e8f0', overflow: 'hidden', backgroundColor: '#f8fafc' },
  varHeader: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 8 },
  varHeaderLeft: { flex: 1 },
  varHeaderRight: { alignItems: 'flex-end', marginRight: 8 },
  varSku: { fontSize: 12, fontWeight: '900', color: '#0f172a', fontVariant: ['tabular-nums'] as any },
  varAttr: { fontSize: 11, color: '#64748b', fontWeight: '600' },
  varPrice: { fontSize: 13, fontWeight: '900', color: '#2563eb' },
  varStock: { fontSize: 11, fontWeight: '700', color: '#64748b' },
  varEdit: { borderTopWidth: 1, borderTopColor: '#e2e8f0', padding: 12, gap: 10 },
  removeBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8 },
  removeBtnText: { fontSize: 12, fontWeight: '800', color: '#ef4444' },
});
