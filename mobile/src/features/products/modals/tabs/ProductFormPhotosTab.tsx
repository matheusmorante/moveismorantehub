import React, { useState } from 'react';
import {
  Image,
  Alert,
  ActivityIndicator,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { Plus, Trash2, Star, RefreshCw, X, Camera, Crop } from 'lucide-react-native';

const MAX_PRODUCT_IMAGES = 75;
const CATALOG_API_URL = (process.env.EXPO_PUBLIC_CATALOG_API_URL || 'https://www.moveismorante.com.br').replace(/\/$/, '');

const uploadProductPhoto = async (blob: Blob, fileName: string, contentType: string): Promise<string> => {
  const credentialResponse = await fetch(`${CATALOG_API_URL}/api/upload`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fileName: `products/${Date.now()}-${fileName.replace(/[^a-zA-Z0-9._-]/g, '-')}`, contentType }),
  });
  if (!credentialResponse.ok) {
    const details = await credentialResponse.json().catch(() => ({}));
    throw new Error(details.error || 'Não foi possível preparar o envio da foto.');
  }
  const { uploadUrl, fileUrl } = await credentialResponse.json();
  const uploadResponse = await fetch(uploadUrl, { method: 'PUT', headers: { 'Content-Type': contentType }, body: blob });
  if (!uploadResponse.ok) throw new Error('Falha ao enviar a foto para o armazenamento do catálogo.');
  return fileUrl;
};

interface Props {
  formData: any;
  setFormData: (fn: (prev: any) => any) => void;
  dark: boolean;
}

export const ProductFormPhotosTab: React.FC<Props> = ({ formData, setFormData, dark }) => {
  const images: string[] = Array.isArray(formData.images) ? formData.images : [];
  const [selectedPhotoIdx, setSelectedPhotoIdx] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);

  // Selecionar uma ou múltiplas imagens usando leitor do dispositivo / Web
  const pickImages = ({
    multiple = true,
    onImagesPicked,
  }: {
    multiple?: boolean;
    onImagesPicked: (urls: string[]) => void;
  }) => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      if (multiple) {
        input.multiple = true;
      }
      input.onchange = async (e: any) => {
        const rawFiles = e.target?.files ? Array.from(e.target.files) : [];
        const files = multiple ? (rawFiles as File[]) : (rawFiles.slice(0, 1) as File[]);
        if (files.length === 0) return;
        setUploading(true);
        try {
          const uploadedUrls: string[] = [];
          for (const file of files) {
            const url = await uploadProductPhoto(file, file.name || 'produto.jpg', file.type || 'image/jpeg');
            uploadedUrls.push(url);
          }
          if (uploadedUrls.length > 0) {
            onImagesPicked(uploadedUrls);
          }
        } catch (error: any) {
          Alert.alert('Erro ao enviar foto(s)', error?.message || 'Tente novamente.');
        } finally {
          setUploading(false);
        }
      };
      input.click();
    } else {
      DocumentPicker.getDocumentAsync({
        type: 'image/*',
        copyToCacheDirectory: true,
        multiple,
      }).then(async result => {
        if (result.canceled || !result.assets || result.assets.length === 0) return;
        const assets = multiple ? result.assets : [result.assets[0]];
        setUploading(true);
        try {
          const uploadedUrls: string[] = [];
          for (const asset of assets) {
            const response = await fetch(asset.uri);
            const blob = await response.blob();
            const type = asset.mimeType || blob.type || 'image/jpeg';
            const url = await uploadProductPhoto(blob, asset.name || 'produto.jpg', type);
            uploadedUrls.push(url);
          }
          if (uploadedUrls.length > 0) {
            onImagesPicked(uploadedUrls);
          }
        } catch (error: any) {
          Alert.alert('Erro ao enviar foto(s)', error?.message || 'Tente novamente.');
        } finally {
          setUploading(false);
        }
      }).catch((error: any) => Alert.alert('Erro ao selecionar foto(s)', error?.message || 'Não foi possível abrir a galeria.'));
    }
  };

  const handleAddPhoto = () => {
    const currentCount = images.length;
    if (currentCount >= MAX_PRODUCT_IMAGES) {
      Alert.alert('Limite de fotos', `O ERP permite até ${MAX_PRODUCT_IMAGES} fotos por produto.`);
      return;
    }
    const availableSlots = MAX_PRODUCT_IMAGES - currentCount;

    pickImages({
      multiple: true,
      onImagesPicked: (newUrls) => {
        const urlsToAdd = newUrls.slice(0, availableSlots);
        if (newUrls.length > availableSlots) {
          Alert.alert(
            'Limite de fotos',
            `Foram adicionadas ${availableSlots} foto(s) respeitando o limite máximo de ${MAX_PRODUCT_IMAGES}.`
          );
        }
        setFormData(prev => ({
          ...prev,
          images: [...(prev.images || []), ...urlsToAdd],
        }));
      },
    });
  };

  const handleReplacePhoto = (idx: number) => {
    pickImages({
      multiple: false,
      onImagesPicked: ([dataUrl]) => {
        if (!dataUrl) return;
        setFormData(prev => {
          const next = [...(prev.images || [])];
          next[idx] = dataUrl;
          return { ...prev, images: next };
        });
        setSelectedPhotoIdx(null);
      },
    });
  };

  const handleMakeCover = (idx: number) => {
    if (idx === 0) return;
    setFormData(prev => {
      const imgs = [...(prev.images || [])];
      const [target] = imgs.splice(idx, 1);
      imgs.unshift(target);
      return { ...prev, images: imgs };
    });
    setSelectedPhotoIdx(null);
  };

  const handleRemovePhoto = (idx: number) => {
    setFormData(prev => {
      const next = (prev.images || []).filter((_: string, i: number) => i !== idx);
      return { ...prev, images: next };
    });
    setSelectedPhotoIdx(null);
  };

  const activePhotoUrl = selectedPhotoIdx !== null ? images[selectedPhotoIdx] : null;

  return (
    <View style={styles.container}>
      {/* Informação Resumida */}
      <View style={[styles.infoBar, dark && styles.darkInfoBar]}>
        <Camera size={16} color="#2563eb" />
        <Text style={[styles.infoText, dark && styles.lightText]}>
          Fotos do Produto ({images.length}/{MAX_PRODUCT_IMAGES}) · Armazenamento do catálogo
        </Text>
        {uploading && <ActivityIndicator size="small" color="#2563eb" />}
      </View>

      {/* Grade de Fotos (2 fotos por linha, aspecto 1:1) */}
      <View style={styles.grid}>
        {/* Card 1: Botão de Adicionar Foto (1:1) */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={handleAddPhoto}
          disabled={uploading || images.length >= MAX_PRODUCT_IMAGES}
          style={[styles.addCard, dark && styles.darkAddCard]}
        >
          <View style={styles.addIconCircle}>
            <Plus size={24} color="#2563eb" />
          </View>
          <Text style={styles.addCardText}>Adicionar Fotos</Text>
          <Text style={styles.addCardSubtext}>Galeria / Múltiplas imagens</Text>
        </TouchableOpacity>

        {/* Cards de Fotos do Produto (1:1) */}
        {images.map((url, idx) => (
          <TouchableOpacity
            key={idx}
            activeOpacity={0.88}
            onPress={() => setSelectedPhotoIdx(idx)}
            style={[styles.photoCard, dark && styles.darkCard]}
          >
            {/* Selo CAPA na primeira foto */}
            {idx === 0 && (
              <View style={styles.coverBadge}>
                <Star size={10} color="#ffffff" fill="#ffffff" />
                <Text style={styles.coverBadgeText}>CAPA</Text>
              </View>
            )}

            <Image source={{ uri: url }} style={styles.photoImg} resizeMode="cover" />
          </TouchableOpacity>
        ))}
      </View>

      {/* Modal de Ações Centralizadas com Fundo Escurecido */}
      <Modal
        visible={selectedPhotoIdx !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedPhotoIdx(null)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setSelectedPhotoIdx(null)}
          />

          <View style={[styles.modalCard, dark && styles.darkModalCard]}>
            {/* Imagem de Preview no Modal (1:1) */}
            {activePhotoUrl && (
              <View style={styles.modalPreviewWrapper}>
                <Image source={{ uri: activePhotoUrl }} style={styles.modalPreviewImg} resizeMode="cover" />
                {selectedPhotoIdx === 0 && (
                  <View style={styles.coverBadgeModal}>
                    <Star size={10} color="#ffffff" fill="#ffffff" />
                    <Text style={styles.coverBadgeText}>FOTO DE CAPA</Text>
                  </View>
                )}
              </View>
            )}

            <Text style={[styles.modalTitle, dark && styles.lightText]}>
              Opções da Foto #{selectedPhotoIdx !== null ? selectedPhotoIdx + 1 : ''}
            </Text>

            {/* Ações da Foto */}
            <View style={styles.modalActions}>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Recortar foto em formato quadrado"
                style={[styles.modalBtn, styles.modalBtnCrop]}
                onPress={() => Alert.alert('Recortar foto', 'O editor de recorte será conectado na etapa de funcionalidades.')}
              >
                <Crop size={16} color="#7e22ce" />
                <Text style={styles.modalBtnCropText}>Recortar foto (1:1)</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnReplace]}
                onPress={() => selectedPhotoIdx !== null && handleReplacePhoto(selectedPhotoIdx)}
              >
                <RefreshCw size={16} color="#2563eb" />
                <Text style={styles.modalBtnReplaceText}>Substituir Foto</Text>
              </TouchableOpacity>

              {selectedPhotoIdx !== null && selectedPhotoIdx > 0 && (
                <TouchableOpacity
                  style={[styles.modalBtn, styles.modalBtnCover]}
                  onPress={() => handleMakeCover(selectedPhotoIdx)}
                >
                  <Star size={16} color="#d97706" />
                  <Text style={styles.modalBtnCoverText}>Definir como Capa</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnDelete]}
                onPress={() => selectedPhotoIdx !== null && handleRemovePhoto(selectedPhotoIdx)}
              >
                <Trash2 size={16} color="#ef4444" />
                <Text style={styles.modalBtnDeleteText}>Excluir Foto</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnCancel, dark && styles.darkBtnCancel]}
                onPress={() => setSelectedPhotoIdx(null)}
              >
                <X size={16} color={dark ? '#94a3b8' : '#64748b'} />
                <Text style={[styles.modalBtnCancelText, dark && styles.dimText]}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { gap: 12 },
  infoBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#eff6ff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  darkInfoBar: { backgroundColor: '#1e3a8a20' },
  infoText: { fontSize: 11, fontWeight: '800', color: '#1d4ed8' },
  lightText: { color: '#f8fafc' },
  dimText: { color: '#94a3b8' },

  // Grade de 2 fotos por linha (aspectRatio: 1)
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  addCard: {
    width: '48%',
    aspectRatio: 1,
    borderRadius: 16,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#3b82f6',
    backgroundColor: '#eff6ff30',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    gap: 4,
  },
  darkAddCard: {
    borderColor: '#3b82f6',
    backgroundColor: '#1e3a8a15',
  },
  addIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  addCardText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#2563eb',
  },
  addCardSubtext: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748b',
  },
  photoCard: {
    width: '48%',
    aspectRatio: 1,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    position: 'relative',
  },
  darkCard: {
    backgroundColor: '#1e293b',
    borderColor: '#334155',
  },
  darkInput: { backgroundColor: '#0f172a', borderColor: '#334155' },
  photoImg: {
    width: '100%',
    height: '100%',
  },
  descriptionCard: { backgroundColor: '#f8fafc', borderRadius: 16, padding: 14, gap: 10, borderWidth: 1, borderColor: '#e2e8f0' },
  sectionTitle: { fontSize: 13, fontWeight: '900', color: '#0f172a' },
  sectionHint: { fontSize: 11, color: '#64748b' },
  label: { fontSize: 10, fontWeight: '800', color: '#475569', textTransform: 'uppercase' },
  descriptionInput: { minHeight: 110, backgroundColor: '#fff', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#e2e8f0', fontSize: 12, color: '#0f172a' },
  shortDescription: { minHeight: 88 },
  coverBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    zIndex: 2,
    backgroundColor: '#2563eb',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 3,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  coverBadgeText: {
    fontSize: 8,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 0.5,
  },

  // Modal com fundo escurecido
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.80)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 20,
    alignItems: 'center',
    gap: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
  },
  darkModalCard: {
    backgroundColor: '#0f172a',
  },
  modalPreviewWrapper: {
    width: 200,
    height: 200,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  modalPreviewImg: {
    width: '100%',
    height: '100%',
  },
  coverBadgeModal: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: '#2563eb',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#0f172a',
  },
  modalActions: {
    width: '100%',
    gap: 8,
  },
  modalBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    width: '100%',
  },
  modalBtnReplace: {
    backgroundColor: '#eff6ff',
  },
  modalBtnCrop: {
    backgroundColor: '#f3e8ff',
  },
  modalBtnCropText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#7e22ce',
  },
  modalBtnReplaceText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#2563eb',
  },
  modalBtnCover: {
    backgroundColor: '#fffbe8',
  },
  modalBtnCoverText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#d97706',
  },
  modalBtnDelete: {
    backgroundColor: '#fef2f2',
  },
  modalBtnDeleteText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#ef4444',
  },
  modalBtnCancel: {
    backgroundColor: '#f1f5f9',
    marginTop: 4,
  },
  darkBtnCancel: {
    backgroundColor: '#1e293b',
  },
  modalBtnCancelText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#64748b',
  },
});
