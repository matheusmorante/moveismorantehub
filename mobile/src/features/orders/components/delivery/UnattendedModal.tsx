import React, { useState } from 'react';
import * as DocumentPicker from 'expo-document-picker';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { X, AlertTriangle, Camera, Check } from 'lucide-react-native';
import { flattenFormErrors, useZodForm } from '../../../../hooks/useZodForm';
import { unattendedDeliveryFormSchema } from '../../../../../../shared-utils/operationsFormSchemas';

const UNATTENDED_REASONS = [
  'Cliente comunicou que está ausente',
  'Ninguém Atendeu no Local',
  'Cliente Recusou Recebimento',
  'Outro Motivo',
] as const;

const CATALOG_API_URL = (
  process.env.EXPO_PUBLIC_CATALOG_API_URL || 'https://www.moveismorante.com.br'
).replace(/\/$/, '');

interface Props {
  visible: boolean;
  onClose: () => void;
  onConfirm: (reason: string, notes: string, proofUrls: string[]) => Promise<void>;
  isDarkMode: boolean;
  customerName: string;
}

export const UnattendedModal: React.FC<Props> = ({
  visible,
  onClose,
  onConfirm,
  isDarkMode,
  customerName,
}) => {
  const [selectedReason, setSelectedReason] = useState<(typeof UNATTENDED_REASONS)[number]>(UNATTENDED_REASONS[0]);
  const [notes, setNotes] = useState('');
  const [proofUrls, setProofUrls] = useState<string[]>([]);
  const [uploadingProofs, setUploadingProofs] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const form = useZodForm(unattendedDeliveryFormSchema, { reason: selectedReason, notes, proofUrls });

  const handleConfirm = async () => {
    if (uploadingProofs) return;
    return form.validateAndRun({ reason: selectedReason, notes, proofUrls }, async (values) => {
      setSubmitting(true);
      try {
        await onConfirm(values.reason, values.notes, values.proofUrls);
      } finally {
        setSubmitting(false);
      }
    }, (errors) => Alert.alert('Revise o registro', Object.values(flattenFormErrors(errors))[0]));
  };

  const addProofImages = async () => {
    setUploadingProofs(true);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'image/*',
        copyToCacheDirectory: true,
        multiple: true,
      });
      if (result.canceled || !result.assets?.length) return;

      const assets = result.assets.slice(0, 5 - proofUrls.length);
      for (const [index, asset] of assets.entries()) {
        const contentType = asset.mimeType || 'image/jpeg';
        if (!contentType.startsWith('image/')) {
          throw new Error('Selecione somente arquivos de imagem.');
        }
        const fileName = (asset.name || 'comprovante.jpg').replace(/[^a-zA-Z0-9._-]/g, '-');
        let credentialResponse: Response | null = null;
        try {
          credentialResponse = await fetch(`${CATALOG_API_URL}/api/upload`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              fileName: `delivery-proofs/${Date.now()}-${index}-${fileName}`,
              contentType,
            }),
          });
        } catch {
          // Fallback offline: quando sem internet para alcançar o endpoint de upload, mantém a URI local/data da foto
          if (asset.uri) {
            setProofUrls((current) => [...current, asset.uri].slice(0, 5));
            continue;
          }
          throw new Error('Não foi possível preparar o envio da imagem.');
        }

        if (!credentialResponse.ok) {
          const details = await credentialResponse.json().catch(() => ({}));
          throw new Error(details.error || 'Não foi possível preparar o envio da imagem.');
        }
        const { uploadUrl, fileUrl } = await credentialResponse.json();
        const imageResponse = await fetch(asset.uri);
        const uploadResponse = await fetch(uploadUrl, {
          method: 'PUT',
          headers: { 'Content-Type': contentType },
          body: await imageResponse.blob(),
        });
        if (!uploadResponse.ok) throw new Error('Falha ao enviar a imagem de comprovação.');
        setProofUrls((current) => [...current, fileUrl].slice(0, 5));
      }
    } catch (error: any) {
      Alert.alert('Erro ao anexar imagem', error?.message || 'Não foi possível enviar a imagem.');
    } finally {
      setUploadingProofs(false);
    }
  };

  const removeProofImage = (url: string) => {
    setProofUrls((current) => current.filter((proofUrl) => proofUrl !== url));
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        {/* Backdrop irmão (não pai) do conteúdo: toques dentro do card não fecham o modal */}
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={onClose}
          accessibilityLabel="Fechar modal"
        />
        <View style={[styles.content, isDarkMode && styles.contentDark]}>
          {/* Topo */}
          <View style={styles.topRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <AlertTriangle size={20} color="#dc2626" />
              <Text style={[styles.title, isDarkMode && styles.textLight]}>
                Não foi possível realizar a entrega
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={[styles.closeBtn, isDarkMode && styles.closeBtnDark]}
            >
              <X size={18} color={isDarkMode ? '#94a3b8' : '#64748b'} />
            </TouchableOpacity>
          </View>

          <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
            <Text style={styles.customerSubtext}>Cliente: {customerName}</Text>

            {/* Motivos */}
            <Text style={[styles.sectionLabel, isDarkMode && styles.textLight]}>
              Selecione o Motivo:
            </Text>
            <View style={styles.reasonsList}>
              {UNATTENDED_REASONS.map((r) => {
                const isSelected = selectedReason === r;
                return (
                  <TouchableOpacity
                    key={r}
                    onPress={() => setSelectedReason(r)}
                    style={[
                      styles.reasonOption,
                      isSelected && styles.reasonOptionSelected,
                      isDarkMode && styles.reasonOptionDark,
                      isDarkMode && isSelected && styles.reasonOptionSelectedDark,
                    ]}
                  >
                    <Text
                      style={[
                        styles.reasonText,
                        isSelected && styles.reasonTextSelected,
                        isDarkMode && styles.textLight,
                      ]}
                    >
                      {r}
                    </Text>
                    {isSelected && <Check size={16} color="#dc2626" />}
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Observações */}
            <Text style={[styles.sectionLabel, isDarkMode && styles.textLight]}>
              Detalhes / Observações:
            </Text>
            <TextInput
              style={[styles.input, isDarkMode && styles.inputDark]}
              placeholder="Explique o que aconteceu no local..."
              placeholderTextColor="#94a3b8"
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={3}
            />

            {/* Fotos de comprovação */}
            <Text style={[styles.sectionLabel, isDarkMode && styles.textLight]}>
              Fotos de Prova / Comprovante
              {selectedReason === 'Ninguém Atendeu no Local' ? (
                <>
                  <Text style={styles.requiredAsterisk}> *</Text>
                  <Text style={isDarkMode && styles.requiredTextDark}> (obrigatório)</Text>
                </>
              ) : (
                ' (opcional)'
              )}
              {' — até 5:'}
            </Text>
            <View style={styles.proofList}>
              {proofUrls.map((proofUrl, index) => (
                <View
                  key={proofUrl}
                  style={[styles.proofThumbnail, isDarkMode && styles.proofThumbnailDark]}
                >
                  <Image source={{ uri: proofUrl }} style={styles.proofImage} />
                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel={`Remover imagem ${index + 1}`}
                    onPress={() => removeProofImage(proofUrl)}
                    style={styles.removeProofButton}
                  >
                    <X size={16} color="#64748b" />
                  </TouchableOpacity>
                </View>
              ))}
              {proofUrls.length < 5 && (
                <TouchableOpacity
                  onPress={addProofImages}
                  disabled={uploadingProofs}
                  style={[styles.addProofButton, isDarkMode && styles.addProofButtonDark]}
                >
                  {uploadingProofs ? (
                    <ActivityIndicator size="small" color={isDarkMode ? '#cbd5e1' : '#475569'} />
                  ) : (
                    <Camera size={16} color={isDarkMode ? '#cbd5e1' : '#475569'} />
                  )}
                  <Text style={[styles.addProofText, isDarkMode && styles.textLight]}>
                    {uploadingProofs
                      ? 'Enviando imagem...'
                      : `Adicionar imagem (${proofUrls.length}/5)`}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </ScrollView>

          {/* Botão de Enviar */}
          <TouchableOpacity
            onPress={handleConfirm}
            disabled={submitting || uploadingProofs}
            style={[styles.confirmBtn, (submitting || uploadingProofs) && { opacity: 0.6 }]}
          >
            <Text style={styles.confirmBtnText}>
              {submitting ? 'REGISTRANDO...' : 'CONFIRMAR NÃO FOI POSSÍVEL ENTREGAR'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
  },
  content: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    gap: 12,
  },
  contentDark: {
    backgroundColor: '#0f172a',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  title: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0f172a',
  },
  customerSubtext: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
    marginTop: 4,
    marginBottom: 8,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnDark: {
    backgroundColor: '#1e293b',
  },
  textLight: {
    color: '#f8fafc',
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#334155',
    marginTop: 10,
    marginBottom: 6,
  },
  requiredAsterisk: {
    color: '#dc2626',
  },
  requiredTextDark: {
    color: '#fca5a5',
  },
  reasonsList: {
    gap: 6,
  },
  reasonOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  reasonOptionDark: {
    backgroundColor: '#1e293b',
    borderColor: '#334155',
  },
  reasonOptionSelected: {
    backgroundColor: '#fef2f2',
    borderColor: '#fca5a5',
  },
  reasonOptionSelectedDark: {
    backgroundColor: '#450a0a',
    borderColor: '#991b1b',
  },
  reasonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
  },
  reasonTextSelected: {
    color: '#dc2626',
    fontWeight: '900',
  },
  input: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 12,
    fontSize: 13,
    color: '#0f172a',
    textAlignVertical: 'top',
  },
  inputDark: {
    backgroundColor: '#1e293b',
    borderColor: '#334155',
    color: '#f8fafc',
  },
  proofThumbnail: {
    width: 58,
    height: 58,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
  },
  proofList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  proofThumbnailDark: {
    borderColor: '#475569',
  },
  proofImage: {
    width: '100%',
    height: '100%',
  },
  removeProofButton: {
    position: 'absolute',
    top: 2,
    right: 2,
    padding: 3,
    borderRadius: 10,
    backgroundColor: '#ffffffdd',
  },
  addProofButton: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#cbd5e1',
    backgroundColor: '#f8fafc',
  },
  addProofButtonDark: {
    backgroundColor: '#1e293b',
    borderColor: '#475569',
  },
  addProofText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
  },
  confirmBtn: {
    height: 52,
    borderRadius: 16,
    backgroundColor: '#dc2626',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  confirmBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '900',
  },
});
