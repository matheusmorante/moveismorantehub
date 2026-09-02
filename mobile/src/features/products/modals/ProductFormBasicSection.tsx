import React from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

interface Props {
  formData: any;
  setFormData: React.Dispatch<React.SetStateAction<any>>;
  categories: any[];
  dark: boolean;
}

export const ProductFormBasicSection: React.FC<Props> = ({
  formData,
  setFormData,
  categories,
  dark,
}) => {
  const update = (field: string, val: any) => {
    setFormData((prev: any) => ({ ...prev, [field]: val }));
  };

  return (
    <View style={styles.container}>
      <View style={styles.fieldGroup}>
        <Text style={[styles.label, dark && styles.lightText]}>Nome do Produto *</Text>
        <TextInput
          value={formData.name}
          onChangeText={(v) => update('name', v)}
          placeholder="Ex: Guarda-Roupa Casal 6 Portas"
          placeholderTextColor="#94a3b8"
          style={[styles.input, dark && styles.darkInput, dark && styles.lightText]}
        />
      </View>

      <View style={styles.row}>
        <View style={[styles.fieldGroup, { flex: 1 }]}>
          <Text style={[styles.label, dark && styles.lightText]}>Código / Ref</Text>
          <TextInput
            value={formData.code}
            onChangeText={(v) => update('code', v)}
            placeholder="Ex: 00123"
            placeholderTextColor="#94a3b8"
            style={[styles.input, dark && styles.darkInput, dark && styles.lightText]}
          />
        </View>

        <View style={[styles.fieldGroup, { flex: 1 }]}>
          <Text style={[styles.label, dark && styles.lightText]}>SKU Principal</Text>
          <TextInput
            value={formData.sku}
            onChangeText={(v) => update('sku', v)}
            placeholder="Ex: GUA-001"
            placeholderTextColor="#94a3b8"
            style={[styles.input, dark && styles.darkInput, dark && styles.lightText]}
          />
        </View>
      </View>

      <View style={styles.fieldGroup}>
        <Text style={[styles.label, dark && styles.lightText]}>Tipo de Item</Text>
        <View style={styles.typeRow}>
          {(['product', 'service', 'combo'] as const).map((t) => {
            const active = (formData.itemType || 'product') === t;
            const label = t === 'product' ? 'Produto' : t === 'service' ? 'Serviço' : 'Combo';
            return (
              <TouchableOpacity
                key={t}
                onPress={() => update('itemType', t)}
                style={[styles.typeBtn, active && styles.typeBtnActive, dark && !active && styles.darkBtn]}
              >
                <Text style={[styles.typeText, active && styles.typeTextActive, dark && !active && styles.lightText]}>
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <View style={styles.fieldGroup}>
        <Text style={[styles.label, dark && styles.lightText]}>Categoria</Text>
        <View style={styles.categoryPills}>
          {categories.slice(0, 8).map((c) => {
            const active = formData.category === c.name;
            return (
              <TouchableOpacity
                key={c.id}
                onPress={() => update('category', active ? '' : c.name)}
                style={[styles.catPill, active && styles.catPillActive, dark && !active && styles.darkBtn]}
              >
                <Text style={[styles.catText, active && styles.catTextActive, dark && !active && styles.lightText]}>
                  {c.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <View style={styles.fieldGroup}>
        <Text style={[styles.label, dark && styles.lightText]}>Descrição do Produto</Text>
        <TextInput
          value={formData.description}
          onChangeText={(v) => update('description', v)}
          placeholder="Detalhes, especificações técnicas, etc..."
          placeholderTextColor="#94a3b8"
          multiline
          numberOfLines={3}
          style={[styles.textArea, dark && styles.darkInput, dark && styles.lightText]}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { gap: 12 },
  fieldGroup: { gap: 4 },
  label: { fontSize: 11, fontWeight: '800', color: '#475569', textTransform: 'uppercase' },
  lightText: { color: '#f8fafc' },
  row: { flexDirection: 'row', gap: 10 },
  input: {
    height: 42,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    fontSize: 13,
  },
  textArea: {
    minHeight: 70,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    fontSize: 13,
    textAlignVertical: 'top',
  },
  darkInput: { backgroundColor: '#1e293b', borderColor: '#334155' },
  darkBtn: { backgroundColor: '#1e293b' },
  typeRow: { flexDirection: 'row', gap: 8 },
  typeBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
  },
  typeBtnActive: { backgroundColor: '#2563eb' },
  typeText: { fontSize: 12, fontWeight: '700', color: '#64748b' },
  typeTextActive: { color: '#ffffff' },
  categoryPills: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  catPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
  },
  catPillActive: { backgroundColor: '#2563eb' },
  catText: { fontSize: 11, fontWeight: '700', color: '#64748b' },
  catTextActive: { color: '#ffffff' },
});
