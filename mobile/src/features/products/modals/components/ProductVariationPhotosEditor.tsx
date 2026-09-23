import React, { useState } from 'react';
import {
  Alert,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { ArrowDown, ArrowUp, Check, ImagePlus, Link2, X } from 'lucide-react-native';

const MAX_VARIATION_IMAGES = 15;

interface Props {
  images: string[];
  parentImages: string[];
  onChangeImages: (images: string[]) => void;
  dark: boolean;
}

export const ProductVariationPhotosEditor: React.FC<Props> = ({ images, parentImages, onChangeImages, dark }) => {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [draftImages, setDraftImages] = useState<string[]>([]);
  const availableParentImages = Array.from(new Set(parentImages.filter(Boolean)));

  const openPicker = () => {
    setDraftImages([...images]);
    setPickerOpen(true);
  };

  const toggleImage = (url: string) => {
    if (draftImages.includes(url)) {
      setDraftImages(draftImages.filter(image => image !== url));
      return;
    }
    if (draftImages.length >= MAX_VARIATION_IMAGES) {
      Alert.alert('Limite de fotos', `O ERP permite vincular até ${MAX_VARIATION_IMAGES} fotos por variação.`);
      return;
    }
    setDraftImages([...draftImages, url]);
  };

  const moveImage = (index: number, direction: -1 | 1) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= images.length) return;
    const next = [...images];
    [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
    onChangeImages(next);
  };

  return (
    <View style={[styles.card, dark && styles.darkCard]}>
      <View style={styles.header}>
        <View style={styles.titleGroup}>
          <Text style={[styles.title, dark && styles.lightText]}>Fotos da Variação</Text>
          <Text style={[styles.helper, dark && styles.dimText]}>
            Vincule fotos do produto pai. A primeira será a capa.
          </Text>
        </View>
        <Text style={[styles.counter, dark && styles.darkCounter]}>{images.length}/{MAX_VARIATION_IMAGES}</Text>
      </View>

      {images.length > 0 ? (
        <View style={styles.selectedList}>
          {images.map((url, index) => (
            <View key={`${url}-${index}`} style={[styles.selectedPhoto, dark && styles.darkPhoto]}>
              <Image source={{ uri: url }} style={styles.thumbnail} accessibilityLabel={`Foto da variação ${index + 1}`} />
              <View style={styles.photoDetails}>
                <Text style={[styles.photoLabel, dark && styles.lightText]} numberOfLines={1}>
                  {index === 0 ? 'Capa' : `Foto ${index + 1}`}
                </Text>
                <View style={styles.photoActions}>
                  <TouchableOpacity
                    onPress={() => moveImage(index, -1)}
                    disabled={index === 0}
                    accessibilityRole="button"
                    accessibilityLabel="Mover foto para cima"
                    style={[styles.iconButton, dark && styles.darkIconButton, index === 0 && styles.disabledButton]}
                  ><ArrowUp size={15} color={dark ? '#cbd5e1' : '#475569'} /></TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => moveImage(index, 1)}
                    disabled={index === images.length - 1}
                    accessibilityRole="button"
                    accessibilityLabel="Mover foto para baixo"
                    style={[styles.iconButton, dark && styles.darkIconButton, index === images.length - 1 && styles.disabledButton]}
                  ><ArrowDown size={15} color={dark ? '#cbd5e1' : '#475569'} /></TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => onChangeImages(images.filter((_, imageIndex) => imageIndex !== index))}
                    accessibilityRole="button"
                    accessibilityLabel={`Desvincular foto ${index + 1}`}
                    style={[styles.iconButton, styles.removeButton]}
                  ><X size={15} color="#dc2626" /></TouchableOpacity>
                </View>
              </View>
            </View>
          ))}
        </View>
      ) : (
        <Text style={[styles.emptyText, dark && styles.dimText]}>Nenhuma foto vinculada a esta variação.</Text>
      )}

      <TouchableOpacity
        onPress={openPicker}
        disabled={availableParentImages.length === 0}
        accessibilityRole="button"
        style={[styles.linkButton, availableParentImages.length === 0 && styles.disabledButton]}
      >
        <Link2 size={16} color="#ffffff" />
        <Text style={styles.linkButtonText}>{images.length ? 'Vincular fotos do pai' : 'Vincular fotos do produto pai'}</Text>
      </TouchableOpacity>
      {availableParentImages.length === 0 && (
        <Text style={[styles.helper, dark && styles.dimText]}>Adicione fotos ao produto para poder vinculá-las à variação.</Text>
      )}

      <Modal visible={pickerOpen} transparent animationType="slide" onRequestClose={() => setPickerOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, dark && styles.darkCard]}>
            <View style={styles.modalHeader}>
              <View style={styles.titleGroup}>
                <Text style={[styles.title, dark && styles.lightText]}>Vincular Fotos</Text>
                <Text style={[styles.helper, dark && styles.dimText]}>
                  Selecione até {MAX_VARIATION_IMAGES} fotos do produto pai. {draftImages.length} selecionada(s).
                </Text>
              </View>
              <TouchableOpacity onPress={() => setPickerOpen(false)} accessibilityRole="button" accessibilityLabel="Fechar seleção de fotos">
                <X size={22} color={dark ? '#cbd5e1' : '#475569'} />
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={styles.imageGrid}>
              {availableParentImages.map((url, index) => {
                const selected = draftImages.includes(url);
                return (
                  <TouchableOpacity
                    key={`${url}-${index}`}
                    onPress={() => toggleImage(url)}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: selected }}
                    accessibilityLabel={`Selecionar foto do produto pai ${index + 1}`}
                    style={[styles.parentPhoto, selected && styles.selectedParentPhoto]}
                  >
                    <Image source={{ uri: url }} style={styles.parentImage} />
                    {selected && <View style={styles.checkBadge}><Check size={15} color="#ffffff" /></View>}
                    <Text style={styles.parentPhotoLabel}>{index === 0 ? 'Capa do produto' : `Foto ${index + 1}`}</Text>
                  </TouchableOpacity>
                );
              })}
              {availableParentImages.length === 0 && (
                <View style={styles.noImages}>
                  <ImagePlus size={28} color="#94a3b8" />
                  <Text style={[styles.helper, dark && styles.dimText]}>O produto pai ainda não tem fotos.</Text>
                </View>
              )}
            </ScrollView>
            <View style={styles.modalFooter}>
              <TouchableOpacity onPress={() => setPickerOpen(false)} style={[styles.footerButton, styles.cancelButton]}>
                <Text style={styles.cancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => { onChangeImages(draftImages); setPickerOpen(false); }} style={[styles.footerButton, styles.confirmButton]}>
                <Text style={styles.confirmText}>Confirmar ({draftImages.length})</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  card: { padding: 14, gap: 12, borderRadius: 14, borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#fff' },
  darkCard: { borderColor: '#334155', backgroundColor: '#0f172a' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 },
  titleGroup: { flex: 1, gap: 4 },
  title: { color: '#0f172a', fontSize: 13, fontWeight: '900' },
  helper: { color: '#64748b', fontSize: 11, lineHeight: 16 },
  lightText: { color: '#f8fafc' },
  dimText: { color: '#94a3b8' },
  counter: { paddingHorizontal: 9, paddingVertical: 5, borderRadius: 10, color: '#1d4ed8', backgroundColor: '#eff6ff', fontSize: 10, fontWeight: '900' },
  darkCounter: { color: '#93c5fd', backgroundColor: '#1e3a8a55' },
  selectedList: { gap: 8 },
  selectedPhoto: { minHeight: 62, flexDirection: 'row', alignItems: 'center', gap: 10, padding: 7, borderRadius: 10, borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#f8fafc' },
  darkPhoto: { borderColor: '#334155', backgroundColor: '#1e293b' },
  thumbnail: { width: 48, height: 48, borderRadius: 7, backgroundColor: '#e2e8f0' },
  photoDetails: { flex: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 6 },
  photoLabel: { flex: 1, color: '#334155', fontSize: 11, fontWeight: '800' },
  photoActions: { flexDirection: 'row', gap: 5 },
  iconButton: { width: 32, height: 32, justifyContent: 'center', alignItems: 'center', borderRadius: 8, backgroundColor: '#e2e8f0' },
  darkIconButton: { backgroundColor: '#334155' },
  removeButton: { backgroundColor: '#fee2e2' },
  disabledButton: { opacity: 0.45 },
  emptyText: { paddingVertical: 12, color: '#64748b', textAlign: 'center', fontSize: 11 },
  linkButton: { minHeight: 42, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, paddingHorizontal: 12, borderRadius: 10, backgroundColor: '#2563eb' },
  linkButtonText: { color: '#fff', fontSize: 11, fontWeight: '900' },
  modalOverlay: { flex: 1, justifyContent: 'center', padding: 12, backgroundColor: '#0f172a99' },
  modalCard: { width: '100%', maxWidth: 620, maxHeight: '92%', alignSelf: 'center', padding: 16, gap: 12, borderRadius: 18, backgroundColor: '#fff' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  imageGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingVertical: 4 },
  parentPhoto: { width: '31.5%', aspectRatio: 0.82, overflow: 'hidden', borderWidth: 2, borderColor: 'transparent', borderRadius: 10, backgroundColor: '#f1f5f9' },
  selectedParentPhoto: { borderColor: '#2563eb' },
  parentImage: { width: '100%', flex: 1 },
  parentPhotoLabel: { paddingHorizontal: 5, paddingVertical: 5, color: '#334155', backgroundColor: '#f8fafc', fontSize: 9, fontWeight: '800', textAlign: 'center' },
  checkBadge: { position: 'absolute', top: 5, right: 5, width: 23, height: 23, justifyContent: 'center', alignItems: 'center', borderRadius: 12, backgroundColor: '#2563eb' },
  noImages: { width: '100%', minHeight: 130, alignItems: 'center', justifyContent: 'center', gap: 8 },
  modalFooter: { flexDirection: 'row', gap: 8 },
  footerButton: { flex: 1, minHeight: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 10 },
  cancelButton: { backgroundColor: '#e2e8f0' },
  confirmButton: { backgroundColor: '#2563eb' },
  cancelText: { color: '#334155', fontSize: 11, fontWeight: '800' },
  confirmText: { color: '#fff', fontSize: 11, fontWeight: '900' },
});
