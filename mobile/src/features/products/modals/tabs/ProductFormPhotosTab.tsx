import React, { useState } from 'react';
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Link, Plus, Trash2, ImageIcon } from 'lucide-react-native';

interface Props {
  formData: any;
  setFormData: (fn: (prev: any) => any) => void;
  dark: boolean;
}

export const ProductFormPhotosTab: React.FC<Props> = ({ formData, setFormData, dark }) => {
  const [urlInput, setUrlInput] = useState('');
  const images: string[] = Array.isArray(formData.images) ? formData.images : [];

  const handleAddUrl = () => {
    const url = urlInput.trim();
    if (!url) return;
    if (!url.startsWith('http://') && !url.startsWith('https://')) return;
    setFormData(prev => ({ ...prev, images: [...(prev.images || []), url] }));
    setUrlInput('');
  };

  const handleRemove = (idx: number) => {
    setFormData(prev => {
      const next = (prev.images || []).filter((_: string, i: number) => i !== idx);
      return { ...prev, images: next };
    });
  };

  const handleMoveUp = (idx: number) => {
    if (idx === 0) return;
    setFormData(prev => {
      const imgs = [...(prev.images || [])];
      [imgs[idx - 1], imgs[idx]] = [imgs[idx], imgs[idx - 1]];
      return { ...prev, images: imgs };
    });
  };

  return (
    <View style={styles.container}>
      {/* Instruções */}
      <View style={[styles.infoBox, dark && styles.darkInfoBox]}>
        <ImageIcon size={18} color="#2563eb" />
        <Text style={[styles.infoText, dark && styles.lightText]}>
          Cole a URL de uma imagem (JPG, PNG, WebP) para adicionar ao produto.
          A primeira foto será a imagem de capa.
        </Text>
      </View>

      {/* Input de URL */}
      <View style={styles.urlRow}>
        <TextInput
          value={urlInput}
          onChangeText={setUrlInput}
          placeholder="https://..."
          placeholderTextColor="#94a3b8"
          autoCapitalize="none"
          keyboardType="url"
          style={[styles.urlInput, dark && styles.darkInput, dark && styles.lightText]}
        />
        <TouchableOpacity
          onPress={handleAddUrl}
          style={[styles.addBtn, !urlInput.trim() && styles.addBtnDisabled]}
          disabled={!urlInput.trim()}
        >
          <Plus size={18} color="#ffffff" />
        </TouchableOpacity>
      </View>

      {/* Preview de Fotos */}
      {images.length === 0 ? (
        <View style={[styles.emptyBox, dark && styles.darkCard]}>
          <ImageIcon size={36} color="#cbd5e1" />
          <Text style={styles.emptyText}>Nenhuma foto adicionada ainda</Text>
          <Text style={styles.emptyHint}>Cole a URL de uma imagem acima</Text>
        </View>
      ) : (
        <View style={styles.grid}>
          {images.map((url, idx) => (
            <View key={idx} style={[styles.photoCard, dark && styles.darkCard]}>
              {/* Badge de posição */}
              {idx === 0 && (
                <View style={styles.coverBadge}>
                  <Text style={styles.coverBadgeText}>CAPA</Text>
                </View>
              )}
              {/* Preview da imagem */}
              <Image
                source={{ uri: url }}
                style={styles.photoImg}
                resizeMode="cover"
              />
              {/* URL truncada */}
              <Text style={[styles.urlLabel, dark && styles.dimText]} numberOfLines={1}>
                {url.split('/').pop()?.slice(0, 30) || url.slice(0, 30)}
              </Text>
              {/* Ações */}
              <View style={styles.photoActions}>
                {idx > 0 && (
                  <TouchableOpacity
                    onPress={() => handleMoveUp(idx)}
                    style={[styles.actionBtn, styles.actionBtnUp]}
                  >
                    <Text style={styles.actionBtnText}>↑ Subir</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  onPress={() => handleRemove(idx)}
                  style={[styles.actionBtn, styles.actionBtnRemove]}
                >
                  <Trash2 size={12} color="#ef4444" />
                  <Text style={styles.removeBtnText}>Remover</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      )}

      <Text style={styles.countHint}>
        {images.length} foto{images.length !== 1 ? 's' : ''} adicionada{images.length !== 1 ? 's' : ''}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { gap: 14 },
  infoBox: { flexDirection: 'row', gap: 10, backgroundColor: '#eff6ff', borderRadius: 12, padding: 12, alignItems: 'flex-start' },
  darkInfoBox: { backgroundColor: '#1e3a8a20' },
  infoText: { flex: 1, fontSize: 12, fontWeight: '600', color: '#1e40af', lineHeight: 18 },
  lightText: { color: '#f1f5f9' },
  dimText: { color: '#94a3b8' },
  urlRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  urlInput: { flex: 1, height: 46, backgroundColor: '#f8fafc', borderRadius: 12, paddingHorizontal: 12, borderWidth: 1, borderColor: '#e2e8f0', fontSize: 12, fontWeight: '600', color: '#0f172a' },
  darkInput: { backgroundColor: '#1e293b', borderColor: '#334155' },
  addBtn: { width: 46, height: 46, borderRadius: 12, backgroundColor: '#2563eb', alignItems: 'center', justifyContent: 'center' },
  addBtnDisabled: { backgroundColor: '#93c5fd' },
  emptyBox: { alignItems: 'center', padding: 36, borderRadius: 16, backgroundColor: '#f8fafc', gap: 8 },
  darkCard: { backgroundColor: '#1e293b', borderColor: '#334155' },
  emptyText: { fontSize: 13, fontWeight: '800', color: '#94a3b8' },
  emptyHint: { fontSize: 11, fontWeight: '600', color: '#cbd5e1' },
  grid: { gap: 12 },
  photoCard: { backgroundColor: '#f8fafc', borderRadius: 14, padding: 10, gap: 8, borderWidth: 1, borderColor: '#e2e8f0' },
  coverBadge: { position: 'absolute', top: 10, left: 10, zIndex: 1, backgroundColor: '#2563eb', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  coverBadgeText: { fontSize: 9, fontWeight: '900', color: '#ffffff' },
  photoImg: { width: '100%', height: 160, borderRadius: 10 },
  urlLabel: { fontSize: 10, fontWeight: '600', color: '#64748b' },
  photoActions: { flexDirection: 'row', gap: 8 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 8, borderRadius: 8 },
  actionBtnUp: { backgroundColor: '#eff6ff' },
  actionBtnRemove: { backgroundColor: '#fef2f2', flex: 1 },
  actionBtnText: { fontSize: 11, fontWeight: '800', color: '#2563eb' },
  removeBtnText: { fontSize: 11, fontWeight: '800', color: '#ef4444' },
  countHint: { fontSize: 11, color: '#94a3b8', fontWeight: '700', textAlign: 'center' },
});
