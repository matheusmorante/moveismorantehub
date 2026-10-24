import { ArrowDown, ArrowUp, Crop, ImagePlus, Link2, X } from 'lucide-react-native';
import type React from 'react';
import { useState } from 'react';
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
import { MAX_VARIATION_IMAGES } from '../../domain/productImageLimits';
import { flattenFormErrors, useZodForm } from '../../../../hooks/useZodForm';
import { createVariationImageSelectionFormSchema } from '../../../../../../shared-utils/productImageFormSchemas';
import { toggleAllParentProductImages } from '../../../../../../shared-utils/productImageSelection';
import { ProductImage } from '../../../../components/shared/ProductImage';
import { ProductSquareImageCropModal } from './ProductSquareImageCropModal';

interface Props {
  images: string[];
  parentImages: string[];
  onChangeImages: (images: string[]) => void;
  onCropPhoto: (oldUrl: string, newUrl: string) => void;
  dark: boolean;
  inheritsParentGallery?: boolean;
}

export const ProductVariationPhotosEditor: React.FC<Props> = ({
  images,
  parentImages,
  onChangeImages,
  onCropPhoto,
  dark,
  inheritsParentGallery = false,
}) => {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [croppingPhotoUrl, setCroppingPhotoUrl] = useState('');
  const [draftImages, setDraftImages] = useState<string[]>([]);
  const availableParentImages = Array.from(new Set(parentImages.filter(Boolean)));
  const selectionForm = useZodForm(
    createVariationImageSelectionFormSchema(availableParentImages, MAX_VARIATION_IMAGES),
    { images: [] }
  );

  const commitImages = (nextImages: string[]) => {
    void selectionForm.validateAndRun(
      { images: nextImages },
      (values) => onChangeImages(values.images),
      (errors) => {
        const messages = flattenFormErrors(errors);
        Alert.alert('Seleção de fotos inválida', Object.values(messages)[0] || 'Revise as fotos selecionadas.');
      }
    );
  };

  const openPicker = () => {
    setDraftImages([...images]);
    setPickerOpen(true);
  };

  const selectableParentImageCount = Math.min(availableParentImages.length, MAX_VARIATION_IMAGES);
  const allSelectableParentImagesSelected = draftImages.length === selectableParentImageCount;
  const toggleAllParentImages = () => {
    setDraftImages((selected) =>
      toggleAllParentProductImages(selected, availableParentImages, MAX_VARIATION_IMAGES)
    );
  };

  const toggleImage = (url: string) => {
    if (draftImages.includes(url)) {
      setDraftImages(draftImages.filter((image) => image !== url));
      return;
    }
    if (draftImages.length >= MAX_VARIATION_IMAGES) {
      Alert.alert(
        'Limite de fotos',
        `O ERP permite vincular até ${MAX_VARIATION_IMAGES} fotos por variação.`
      );
      return;
    }
    setDraftImages([...draftImages, url]);
  };

  const moveImage = (index: number, direction: -1 | 1) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= images.length) return;
    const next = [...images];
    [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
    commitImages(next);
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
        <Text style={[styles.counter, dark && styles.darkCounter]}>
          {inheritsParentGallery ? `${images.length} fotos herdadas` : `${images.length}/${MAX_VARIATION_IMAGES}`}
        </Text>
      </View>

      {images.length > 0 ? (
        <View style={styles.selectedList}>
          {images.map((url, index) => (
            <View key={url} style={[styles.selectedPhoto, dark && styles.darkPhoto]}>
              <ProductImage
                src={url}
                size="thumbnail"
                style={styles.thumbnail}
                accessibilityLabel={`Foto da variação ${index + 1}`}
              />
              <View style={styles.photoDetails}>
                <Text style={[styles.photoLabel, dark && styles.lightText]} numberOfLines={1}>
                  {index === 0 ? 'Capa' : `Foto ${index + 1}`}
                </Text>
                {!inheritsParentGallery && <View style={styles.photoActions}>
                  <TouchableOpacity
                    onPress={() => moveImage(index, -1)}
                    disabled={index === 0}
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                    accessibilityRole="button"
                    accessibilityLabel="Mover foto para cima"
                    style={[
                      styles.iconButton,
                      dark && styles.darkIconButton,
                      index === 0 && styles.disabledButton,
                    ]}
                  >
                    <ArrowUp size={15} color={dark ? '#cbd5e1' : '#475569'} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => moveImage(index, 1)}
                    disabled={index === images.length - 1}
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                    accessibilityRole="button"
                    accessibilityLabel="Mover foto para baixo"
                    style={[
                      styles.iconButton,
                      dark && styles.darkIconButton,
                      index === images.length - 1 && styles.disabledButton,
                    ]}
                  >
                    <ArrowDown size={15} color={dark ? '#cbd5e1' : '#475569'} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setCroppingPhotoUrl(url)}
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                    accessibilityRole="button"
                    accessibilityLabel={`Recortar foto da variação ${index + 1}`}
                    style={[styles.iconButton, styles.cropButton]}
                  >
                    <Crop size={15} color="#7e22ce" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => commitImages(images.filter((_, imageIndex) => imageIndex !== index))}
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                    accessibilityRole="button"
                    accessibilityLabel={`Desvincular foto ${index + 1}`}
                    style={[styles.iconButton, styles.removeButton]}
                  >
                    <X size={15} color="#dc2626" />
                  </TouchableOpacity>
                </View>}
              </View>
            </View>
          ))}
        </View>
      ) : (
        <Text style={[styles.emptyText, dark && styles.dimText]}>
          {inheritsParentGallery
            ? 'Adicione fotos à galeria do produto para que esta variação as herde.'
            : 'Nenhuma foto vinculada a esta variação.'}
        </Text>
      )}

      {!inheritsParentGallery && <TouchableOpacity
        onPress={openPicker}
        disabled={availableParentImages.length === 0}
        accessibilityRole="button"
        style={[styles.linkButton, availableParentImages.length === 0 && styles.disabledButton]}
      >
        <Link2 size={16} color="#ffffff" />
        <Text style={styles.linkButtonText}>
          {images.length ? 'Vincular fotos do pai' : 'Vincular fotos do produto pai'}
        </Text>
      </TouchableOpacity>}
      {!inheritsParentGallery && availableParentImages.length === 0 && (
        <Text style={[styles.helper, dark && styles.dimText]}>
          Adicione fotos ao produto para poder vinculá-las à variação.
        </Text>
      )}

      <Modal
        visible={pickerOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setPickerOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, dark && styles.darkCard]}>
            <View style={styles.modalHeader}>
              <View style={styles.titleGroup}>
                <Text style={[styles.title, dark && styles.lightText]}>Vincular Fotos</Text>
                <Text style={[styles.helper, dark && styles.dimText]}>
                  Selecione até {MAX_VARIATION_IMAGES} fotos do produto pai.
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setPickerOpen(false)}
                accessibilityRole="button"
                accessibilityLabel="Fechar seleção de fotos"
                style={styles.closeButton}
              >
                <X size={22} color={dark ? '#cbd5e1' : '#475569'} />
              </TouchableOpacity>
            </View>
            <View style={styles.selectionToolbar}>
              <Text style={[styles.selectionCount, dark && styles.dimText]}>
                Selecionadas: {draftImages.length} de {MAX_VARIATION_IMAGES} máx.
              </Text>
              <TouchableOpacity
                onPress={toggleAllParentImages}
                accessibilityRole="button"
                accessibilityLabel={
                  allSelectableParentImagesSelected
                    ? 'Desmarcar todas as fotos do produto pai'
                    : 'Selecionar todas as fotos do produto pai'
                }
                style={[styles.selectAllButton, dark && styles.darkSelectAllButton]}
              >
                <Text style={[styles.selectAllText, dark && styles.darkSelectAllText]}>
                  {allSelectableParentImagesSelected ? 'Desmarcar todas' : 'Selecionar todas'}
                </Text>
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={styles.imageGrid}>
              {availableParentImages.map((url, index) => {
                const selected = draftImages.includes(url);
                const selectionOrder = draftImages.indexOf(url) + 1;
                return (
                  <TouchableOpacity
                    key={url}
                    onPress={() => toggleImage(url)}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: selected }}
                    accessibilityLabel={`Selecionar foto do produto pai ${index + 1}`}
                    style={[styles.parentPhoto, selected && styles.selectedParentPhoto]}
                  >
                    <Image source={{ uri: url }} style={styles.parentImage} />
                    {selected && (
                      <View style={styles.checkBadge}>
                        <Text style={styles.selectionOrderText}>{selectionOrder}</Text>
                      </View>
                    )}
                    <Text style={styles.parentPhotoLabel}>
                      {index === 0 ? 'Capa do produto' : `Foto ${index + 1}`}
                    </Text>
                  </TouchableOpacity>
                );
              })}
              {availableParentImages.length === 0 && (
                <View style={styles.noImages}>
                  <ImagePlus size={28} color="#94a3b8" />
                  <Text style={[styles.helper, dark && styles.dimText]}>
                    O produto pai ainda não tem fotos.
                  </Text>
                </View>
              )}
            </ScrollView>
            <View style={styles.modalFooter}>
              <TouchableOpacity
                onPress={() => setPickerOpen(false)}
                style={[styles.footerButton, styles.cancelButton]}
              >
                <Text style={styles.cancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => void selectionForm.validateAndRun(
                  { images: draftImages },
                  (values) => {
                    onChangeImages(values.images);
                    setPickerOpen(false);
                  },
                  (errors) => {
                    const messages = flattenFormErrors(errors);
                    Alert.alert('Seleção de fotos inválida', Object.values(messages)[0] || 'Revise as fotos selecionadas.');
                  }
                )}
                style={[styles.footerButton, styles.confirmButton]}
              >
                <Text style={styles.confirmText}>Confirmar ({draftImages.length})</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      <ProductSquareImageCropModal
        visible={Boolean(croppingPhotoUrl)}
        imageUrl={croppingPhotoUrl}
        dark={dark}
        onCancel={() => setCroppingPhotoUrl('')}
        onConfirm={(newUrl) => {
          const oldUrl = croppingPhotoUrl;
          onCropPhoto(oldUrl, newUrl);
          setCroppingPhotoUrl('');
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    padding: 14,
    gap: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#fff',
  },
  darkCard: { borderColor: '#334155', backgroundColor: '#0f172a' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  titleGroup: { flex: 1, gap: 4 },
  title: { color: '#0f172a', fontSize: 13, fontWeight: '900' },
  helper: { color: '#64748b', fontSize: 11, lineHeight: 16 },
  lightText: { color: '#f8fafc' },
  dimText: { color: '#94a3b8' },
  counter: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 10,
    color: '#1d4ed8',
    backgroundColor: '#eff6ff',
    fontSize: 10,
    fontWeight: '900',
  },
  darkCounter: { color: '#93c5fd', backgroundColor: '#1e3a8a55' },
  selectedList: { gap: 8 },
  selectedPhoto: {
    minHeight: 62,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 7,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
  },
  darkPhoto: { borderColor: '#334155', backgroundColor: '#1e293b' },
  thumbnail: { width: 48, height: 48, borderRadius: 7, backgroundColor: '#e2e8f0' },
  photoDetails: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 6,
  },
  photoLabel: { flex: 1, color: '#334155', fontSize: 11, fontWeight: '800' },
  photoActions: { flexDirection: 'row', gap: 5 },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: '#e2e8f0',
  },
  cropButton: { backgroundColor: '#f3e8ff' },
  darkIconButton: { backgroundColor: '#334155' },
  removeButton: { backgroundColor: '#fee2e2' },
  disabledButton: { opacity: 0.45 },
  emptyText: { paddingVertical: 12, color: '#64748b', textAlign: 'center', fontSize: 11 },
  linkButton: {
    minHeight: 44,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: '#2563eb',
  },
  linkButtonText: { color: '#fff', fontSize: 11, fontWeight: '900' },
  modalOverlay: { flex: 1, justifyContent: 'center', padding: 12, backgroundColor: '#0f172a99' },
  modalCard: {
    width: '100%',
    maxWidth: 620,
    maxHeight: '92%',
    alignSelf: 'center',
    padding: 16,
    gap: 12,
    borderRadius: 18,
    backgroundColor: '#fff',
  },
  modalHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  selectionToolbar: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  selectionCount: { flex: 1, color: '#475569', fontSize: 11, fontWeight: '700' },
  selectAllButton: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 10,
    borderRadius: 9,
    backgroundColor: '#eff6ff',
  },
  darkSelectAllButton: { backgroundColor: '#1e3a8a55' },
  selectAllText: { color: '#2563eb', fontSize: 10, fontWeight: '900' },
  darkSelectAllText: { color: '#93c5fd' },
  imageGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingVertical: 4 },
  parentPhoto: {
    width: '31.5%',
    aspectRatio: 0.82,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
  },
  selectedParentPhoto: { borderColor: '#2563eb' },
  parentImage: { width: '100%', flex: 1 },
  parentPhotoLabel: {
    paddingHorizontal: 5,
    paddingVertical: 5,
    color: '#334155',
    backgroundColor: '#f8fafc',
    fontSize: 9,
    fontWeight: '800',
    textAlign: 'center',
  },
  checkBadge: {
    position: 'absolute',
    top: 5,
    right: 5,
    width: 23,
    height: 23,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: '#2563eb',
  },
  selectionOrderText: { color: '#ffffff', fontSize: 11, fontWeight: '900' },
  noImages: {
    width: '100%',
    minHeight: 130,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  modalFooter: { flexDirection: 'row', gap: 8 },
  footerButton: {
    flex: 1,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
  },
  cancelButton: { backgroundColor: '#e2e8f0' },
  confirmButton: { backgroundColor: '#2563eb' },
  cancelText: { color: '#334155', fontSize: 11, fontWeight: '800' },
  confirmText: { color: '#fff', fontSize: 11, fontWeight: '900' },
});
