import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Plus, Trash2, Layers } from 'lucide-react-native';

interface Props {
  formData: any;
  setFormData: React.Dispatch<React.SetStateAction<any>>;
  dark: boolean;
}

export const ProductFormVariationsSection: React.FC<Props> = ({
  formData,
  setFormData,
  dark,
}) => {
  const [varSku, setVarSku] = useState('');
  const [varPrice, setVarPrice] = useState('');
  const [varStock, setVarStock] = useState('');
  const [attrName, setAttrName] = useState('Cor');
  const [attrVal, setAttrVal] = useState('');

  const variations = Array.isArray(formData.variations) ? formData.variations : [];

  const handleAddVariation = () => {
    if (!attrVal.trim()) return;
    // SKU sequencial: parentCode-01, parentCode-02, etc (padrão oficial do ERP)
    const parentCode = (formData.code || 'PRD').trim();
    const suffix = String(variations.length + 1).padStart(2, '0');
    const autoSku = `${parentCode}-${suffix}`;
    const inputSku = varSku.trim();
    // Se o usuário digitou um SKU, validar se já tem o prefixo correto; caso contrário, usar o auto-gerado
    const resolvedSku = inputSku
      ? (inputSku.startsWith(`${parentCode}-`) ? inputSku : autoSku)
      : autoSku;
    const newVar = {
      sku: resolvedSku,
      price: varPrice ? Number(varPrice) : Number(formData.unitPrice || 0),
      stock: varStock ? Number(varStock) : Number(formData.stock || 0),
      status: 'published',
      active: true,
      attributes: { [attrName]: attrVal.trim() },
    };
    setFormData((prev: any) => ({
      ...prev,
      hasVariations: true,
      variations: [...variations, newVar],
    }));
    setVarSku('');
    setVarPrice('');
    setVarStock('');
    setAttrVal('');
  };

  const handleRemoveVar = (index: number) => {
    setFormData((prev: any) => {
      const next = variations.filter((_: any, i: number) => i !== index);
      return {
        ...prev,
        hasVariations: next.length > 0,
        variations: next,
      };
    });
  };

  return (
    <View style={styles.container}>
      <Text style={[styles.sectionTitle, dark && styles.lightText]}>
        Adicionar Variação Filha
      </Text>

      <View style={styles.addBox}>
        <View style={styles.row}>
          <View style={[styles.fieldGroup, { flex: 1 }]}>
            <Text style={[styles.label, dark && styles.lightText]}>Atributo</Text>
            <TextInput
              value={attrName}
              onChangeText={setAttrName}
              placeholder="Ex: Cor"
              placeholderTextColor="#94a3b8"
              style={[styles.input, dark && styles.darkInput, dark && styles.lightText]}
            />
          </View>
          <View style={[styles.fieldGroup, { flex: 1.5 }]}>
            <Text style={[styles.label, dark && styles.lightText]}>Valor *</Text>
            <TextInput
              value={attrVal}
              onChangeText={setAttrVal}
              placeholder="Ex: Preto Fosco"
              placeholderTextColor="#94a3b8"
              style={[styles.input, dark && styles.darkInput, dark && styles.lightText]}
            />
          </View>
        </View>

        <View style={styles.row}>
          <View style={[styles.fieldGroup, { flex: 1 }]}>
            <Text style={[styles.label, dark && styles.lightText]}>SKU da Variação</Text>
            <TextInput
              value={varSku}
              onChangeText={setVarSku}
              placeholder={`${(formData.code || 'PRD').trim()}-${String(variations.length + 1).padStart(2, '0')}`}
              placeholderTextColor="#94a3b8"
              style={[styles.input, dark && styles.darkInput, dark && styles.lightText]}
            />
          </View>
          <View style={[styles.fieldGroup, { flex: 1 }]}>
            <Text style={[styles.label, dark && styles.lightText]}>Preço (R$)</Text>
            <TextInput
              value={varPrice}
              onChangeText={setVarPrice}
              keyboardType="numeric"
              placeholder="Herda do pai"
              placeholderTextColor="#94a3b8"
              style={[styles.input, dark && styles.darkInput, dark && styles.lightText]}
            />
          </View>
          <View style={[styles.fieldGroup, { flex: 0.8 }]}>
            <Text style={[styles.label, dark && styles.lightText]}>Estoque</Text>
            <TextInput
              value={varStock}
              onChangeText={setVarStock}
              keyboardType="numeric"
              placeholder="0"
              placeholderTextColor="#94a3b8"
              style={[styles.input, dark && styles.darkInput, dark && styles.lightText]}
            />
          </View>
        </View>

        <TouchableOpacity onPress={handleAddVariation} style={styles.addBtn}>
          <Plus size={16} color="#ffffff" />
          <Text style={styles.addBtnText}>Incluir Variação</Text>
        </TouchableOpacity>
      </View>

      <Text style={[styles.sectionTitle, dark && styles.lightText, { marginTop: 6 }]}>
        Variações Cadastradas ({variations.length})
      </Text>

      {variations.length === 0 ? (
        <View style={styles.emptyBox}>
          <Layers size={22} color="#94a3b8" />
          <Text style={styles.emptyText}>Nenhuma variação vinculada</Text>
        </View>
      ) : (
        variations.map((v: any, index: number) => {
          const attrSummary = v.attributes ? Object.entries(v.attributes).map(([k, val]) => `${k}: ${val}`).join(' · ') : '-';
          return (
            <View key={index} style={[styles.varItem, dark && styles.darkVarItem]}>
              <View style={styles.varInfo}>
                <Text style={[styles.varAttr, dark && styles.lightText]}>{attrSummary}</Text>
                <Text style={styles.varSku}>SKU: {v.sku} | Estoque: {v.stock ?? 0}</Text>
                <Text style={styles.varPrice}>R$ {Number(v.price || formData.unitPrice || 0).toFixed(2).replace('.', ',')}</Text>
              </View>
              <TouchableOpacity onPress={() => handleRemoveVar(index)} style={styles.removeBtn}>
                <Trash2 size={15} color="#ef4444" />
              </TouchableOpacity>
            </View>
          );
        })
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { gap: 10 },
  sectionTitle: { fontSize: 12, fontWeight: '800', color: '#0f172a', textTransform: 'uppercase' },
  lightText: { color: '#f8fafc' },
  addBox: { padding: 12, borderRadius: 14, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', gap: 10 },
  row: { flexDirection: 'row', gap: 8 },
  fieldGroup: { gap: 4 },
  label: { fontSize: 10, fontWeight: '700', color: '#64748b', textTransform: 'uppercase' },
  input: { height: 38, backgroundColor: '#ffffff', borderRadius: 10, paddingHorizontal: 8, borderWidth: 1, borderColor: '#e2e8f0', fontSize: 12 },
  darkInput: { backgroundColor: '#1e293b', borderColor: '#334155' },
  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 38, borderRadius: 10, backgroundColor: '#2563eb' },
  addBtnText: { color: '#ffffff', fontSize: 12, fontWeight: '800' },
  emptyBox: { alignItems: 'center', paddingVertical: 14, gap: 4 },
  emptyText: { fontSize: 11, color: '#94a3b8', fontWeight: '600' },
  varItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 10, borderRadius: 12, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0' },
  darkVarItem: { backgroundColor: '#1e293b', borderColor: '#334155' },
  varInfo: { flex: 1, gap: 2 },
  varAttr: { fontSize: 13, fontWeight: '800', color: '#0f172a' },
  varSku: { fontSize: 10, color: '#64748b', fontWeight: '600' },
  varPrice: { fontSize: 11, fontWeight: '800', color: '#2563eb' },
  removeBtn: { padding: 6 },
});
