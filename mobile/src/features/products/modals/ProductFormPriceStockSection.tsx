import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View, Image } from 'react-native';
import { Plus, X } from 'lucide-react-native';

interface Props {
  formData: any;
  setFormData: React.Dispatch<React.SetStateAction<any>>;
  dark: boolean;
}

export const ProductFormPriceStockSection: React.FC<Props> = ({
  formData,
  setFormData,
  dark,
}) => {
  const [newImageUrl, setNewImageUrl] = useState('');

  const update = (field: string, val: any) => {
    setFormData((prev: any) => ({ ...prev, [field]: val }));
  };

  const handleAddImage = () => {
    const trimmed = newImageUrl.trim();
    if (!trimmed) return;
    const current = Array.isArray(formData.images) ? formData.images : [];
    update('images', [...current, trimmed]);
    setNewImageUrl('');
  };

  const handleRemoveImage = (index: number) => {
    const current = Array.isArray(formData.images) ? formData.images : [];
    update('images', current.filter((_: any, i: number) => i !== index));
  };

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <View style={[styles.fieldGroup, { flex: 1 }]}>
          <Text style={[styles.label, dark && styles.lightText]}>Preço de Venda (R$) *</Text>
          <TextInput
            value={String(formData.unitPrice ?? '')}
            onChangeText={(v) => update('unitPrice', v)}
            keyboardType="numeric"
            placeholder="0,00"
            placeholderTextColor="#94a3b8"
            style={[styles.input, dark && styles.darkInput, dark && styles.lightText]}
          />
        </View>

        <View style={[styles.fieldGroup, { flex: 1 }]}>
          <Text style={[styles.label, dark && styles.lightText]}>Preço Promo (R$)</Text>
          <TextInput
            value={String(formData.promoPrice ?? '')}
            onChangeText={(v) => update('promoPrice', v)}
            keyboardType="numeric"
            placeholder="Opcional"
            placeholderTextColor="#94a3b8"
            style={[styles.input, dark && styles.darkInput, dark && styles.lightText]}
          />
        </View>
      </View>

      <View style={styles.row}>
        <View style={[styles.fieldGroup, { flex: 1 }]}>
          <Text style={[styles.label, dark && styles.lightText]}>Preço de Custo (R$)</Text>
          <TextInput
            value={String(formData.costPrice ?? '')}
            onChangeText={(v) => update('costPrice', v)}
            keyboardType="numeric"
            placeholder="0,00"
            placeholderTextColor="#94a3b8"
            style={[styles.input, dark && styles.darkInput, dark && styles.lightText]}
          />
        </View>

        <View style={[styles.fieldGroup, { flex: 1 }]}>
          <Text style={[styles.label, dark && styles.lightText]}>Estoque Atual</Text>
          <TextInput
            value={String(formData.stock ?? '')}
            onChangeText={(v) => update('stock', v)}
            keyboardType="numeric"
            placeholder="0"
            placeholderTextColor="#94a3b8"
            style={[styles.input, dark && styles.darkInput, dark && styles.lightText]}
          />
        </View>
      </View>

      <View style={styles.row}>
        <View style={[styles.fieldGroup, { flex: 1 }]}>
          <Text style={[styles.label, dark && styles.lightText]}>Largura (cm)</Text>
          <TextInput
            value={String(formData.width ?? '')}
            onChangeText={(v) => update('width', v)}
            keyboardType="numeric"
            placeholder="Ex: 180"
            placeholderTextColor="#94a3b8"
            style={[styles.input, dark && styles.darkInput, dark && styles.lightText]}
          />
        </View>
        <View style={[styles.fieldGroup, { flex: 1 }]}>
          <Text style={[styles.label, dark && styles.lightText]}>Altura (cm)</Text>
          <TextInput
            value={String(formData.height ?? '')}
            onChangeText={(v) => update('height', v)}
            keyboardType="numeric"
            placeholder="Ex: 210"
            placeholderTextColor="#94a3b8"
            style={[styles.input, dark && styles.darkInput, dark && styles.lightText]}
          />
        </View>
        <View style={[styles.fieldGroup, { flex: 1 }]}>
          <Text style={[styles.label, dark && styles.lightText]}>Profundidade (cm)</Text>
          <TextInput
            value={String(formData.depth ?? '')}
            onChangeText={(v) => update('depth', v)}
            keyboardType="numeric"
            placeholder="Ex: 55"
            placeholderTextColor="#94a3b8"
            style={[styles.input, dark && styles.darkInput, dark && styles.lightText]}
          />
        </View>
      </View>

      {/* Fotos do Produto */}
      <View style={styles.fieldGroup}>
        <Text style={[styles.label, dark && styles.lightText]}>Fotos do Produto (URL)</Text>
        <View style={styles.addImageRow}>
          <TextInput
            value={newImageUrl}
            onChangeText={setNewImageUrl}
            placeholder="Cole a URL da imagem aqui..."
            placeholderTextColor="#94a3b8"
            style={[styles.input, { flex: 1 }, dark && styles.darkInput, dark && styles.lightText]}
          />
          <TouchableOpacity onPress={handleAddImage} style={styles.addImgBtn}>
            <Plus size={16} color="#ffffff" />
          </TouchableOpacity>
        </View>

        {Array.isArray(formData.images) && formData.images.length > 0 && (
          <View style={styles.imagesPreviewList}>
            {formData.images.map((url: string, index: number) => (
              <View key={index} style={styles.thumbWrapper}>
                <Image source={{ uri: url }} style={styles.thumb} />
                <TouchableOpacity onPress={() => handleRemoveImage(index)} style={styles.removeThumbBtn}>
                  <X size={10} color="#ffffff" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { gap: 12 },
  fieldGroup: { gap: 4 },
  label: { fontSize: 11, fontWeight: '800', color: '#475569', textTransform: 'uppercase' },
  lightText: { color: '#f8fafc' },
  row: { flexDirection: 'row', gap: 8 },
  input: {
    height: 42,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    fontSize: 13,
  },
  darkInput: { backgroundColor: '#1e293b', borderColor: '#334155' },
  addImageRow: { flexDirection: 'row', gap: 8 },
  addImgBtn: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imagesPreviewList: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  thumbWrapper: { position: 'relative', width: 54, height: 54, borderRadius: 10, overflow: 'hidden' },
  thumb: { width: '100%', height: '100%' },
  removeThumbBtn: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: '#ef4444',
    borderRadius: 8,
    width: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
