import React, { useState } from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ScrollView,
  Alert,
} from 'react-native';
import { X, AlertTriangle, Camera, Check } from 'lucide-react-native';

const UNATTENDED_REASONS = [
  'Cliente Ausente',
  'Ninguém Atendeu no Local',
  'Cliente Recusou Recebimento',
  'Outro Motivo',
];

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
  const [selectedReason, setSelectedReason] = useState(UNATTENDED_REASONS[0]);
  const [notes, setNotes] = useState('');
  const [proofUrls, setProofUrls] = useState<string[]>(['']);
  const [submitting, setSubmitting] = useState(false);

  const handleConfirm = async () => {
    if (!selectedReason) {
      Alert.alert('Atenção', 'Selecione o motivo do não atendimento.');
      return;
    }
    setSubmitting(true);
    try {
      await onConfirm(selectedReason, notes, proofUrls.filter(Boolean));
    } finally {
      setSubmitting(false);
    }
  };

  const updateProofUrl = (index: number, value: string) => {
    setProofUrls(current => current.map((url, currentIndex) => currentIndex === index ? value : url));
  };

  const addProofField = () => {
    setProofUrls(current => current.length < 5 ? [...current, ''] : current);
  };

  const removeProofField = (index: number) => {
    setProofUrls(current => current.length === 1 ? [''] : current.filter((_, currentIndex) => currentIndex !== index));
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose}>
        <View style={[styles.content, isDarkMode && styles.contentDark]}>
          {/* Topo */}
          <View style={styles.topRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <AlertTriangle size={20} color="#dc2626" />
              <Text style={[styles.title, isDarkMode && styles.textLight]}>Registrar Não Atendido</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={[styles.closeBtn, isDarkMode && styles.closeBtnDark]}>
              <X size={18} color={isDarkMode ? '#94a3b8' : '#64748b'} />
            </TouchableOpacity>
          </View>

          <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
            <Text style={styles.customerSubtext}>Cliente: {customerName}</Text>

            {/* Motivos */}
            <Text style={[styles.sectionLabel, isDarkMode && styles.textLight]}>Selecione o Motivo:</Text>
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
            <Text style={[styles.sectionLabel, isDarkMode && styles.textLight]}>Detalhes / Observações:</Text>
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
              Fotos de Prova / Comprovante (opcional — até 5):
            </Text>
            <View style={styles.proofList}>
              {proofUrls.map((proofUrl, index) => (
                <View key={index} style={[styles.proofBox, isDarkMode && styles.inputDark]}>
                  <Camera size={18} color="#64748b" />
                  <TextInput
                    style={[styles.proofInput, isDarkMode && styles.textLight]}
                    placeholder={`Referência ou link da foto ${index + 1}`}
                    placeholderTextColor="#94a3b8"
                    value={proofUrl}
                    onChangeText={(value) => updateProofUrl(index, value)}
                  />
                  {proofUrls.length > 1 && (
                    <TouchableOpacity
                      accessibilityLabel={`Remover foto ${index + 1}`}
                      onPress={() => removeProofField(index)}
                      style={styles.removeProofButton}
                    >
                      <X size={16} color="#64748b" />
                    </TouchableOpacity>
                  )}
                </View>
              ))}
              {proofUrls.length < 5 && (
                <TouchableOpacity
                  onPress={addProofField}
                  style={[styles.addProofButton, isDarkMode && styles.addProofButtonDark]}
                >
                  <Camera size={16} color={isDarkMode ? '#cbd5e1' : '#475569'} />
                  <Text style={[styles.addProofText, isDarkMode && styles.textLight]}>Adicionar foto ({proofUrls.length}/5)</Text>
                </TouchableOpacity>
              )}
            </View>
          </ScrollView>

          {/* Botão de Enviar */}
          <TouchableOpacity
            onPress={handleConfirm}
            disabled={submitting}
            style={[styles.confirmBtn, submitting && { opacity: 0.6 }]}
          >
            <Text style={styles.confirmBtnText}>
              {submitting ? 'REGISTRANDO...' : 'CONFIRMAR NÃO ATENDIDO'}
            </Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
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
  proofBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  proofList: {
    gap: 8,
  },
  proofInput: {
    flex: 1,
    fontSize: 13,
    color: '#0f172a',
    paddingVertical: 4,
  },
  removeProofButton: {
    padding: 4,
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
