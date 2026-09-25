import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { X } from 'lucide-react-native';
import { StockMove } from '../../types/stock.types';
import { StockMoveTypeSelector, MoveTypeChoice } from '../components';

export interface InventoryMoveEditModalProps {
  move: StockMove | null;
  isOpen: boolean;
  isDarkMode: boolean;
  isSaving: boolean;
  onClose: () => void;
  onSave: (updates: {
    type: 'entry' | 'withdrawal' | 'balance';
    quantity: number;
    date: string;
    observation: string;
  }) => Promise<void>;
}

export const InventoryMoveEditModal: React.FC<InventoryMoveEditModalProps> = ({
  move,
  isOpen,
  isDarkMode,
  isSaving,
  onClose,
  onSave,
}) => {
  const [type, setType] = useState<MoveTypeChoice>('entry');
  const [quantity, setQuantity] = useState('');
  const [date, setDate] = useState('');
  const [observation, setObservation] = useState('');

  useEffect(() => {
    if (move && isOpen) {
      const initialType =
        move.type === 'adjustment' || move.type === 'balance'
          ? 'balance'
          : move.type === 'withdrawal' || move.type === 'exit' || move.type === 'out'
          ? 'withdrawal'
          : 'entry';

      setType(initialType);
      setQuantity(String(Math.abs(Number(move.quantity || 0))));
      const rawDate = move.created_at || move.date;
      setDate(rawDate ? new Date(rawDate).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10));
      setObservation(move.observation || move.label || '');
    }
  }, [move, isOpen]);

  if (!isOpen || !move) return null;

  const handleSave = async () => {
    const numQty = Number(quantity);
    if (isNaN(numQty)) {
      Alert.alert('Quantidade inválida', 'Informe um valor numérico válido.');
      return;
    }
    if (type !== 'balance' && numQty <= 0) {
      Alert.alert('Quantidade inválida', 'Para entrada ou saída, a quantidade deve ser maior que zero.');
      return;
    }
    if (type === 'balance' && numQty === 0) {
      Alert.alert('Ajuste inválido', 'O valor do ajuste de saldo não pode ser zero.');
      return;
    }
    if (!observation.trim()) {
      Alert.alert('Observação obrigatória', 'Informe o motivo ou observação da alteração.');
      return;
    }
    if (!date.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(date.trim())) {
      Alert.alert('Data inválida', 'Informe uma data no formato AAAA-MM-DD.');
      return;
    }

    await onSave({
      type,
      quantity: numQty,
      date: new Date(`${date.trim()}T12:00:00Z`).toISOString(),
      observation: observation.trim(),
    });
  };

  const themeColor = type === 'entry' ? '#059669' : type === 'withdrawal' ? '#dc2626' : '#d97706';

  return (
    <Modal visible={isOpen} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.backdrop} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={[styles.card, isDarkMode && styles.cardDark]}>
          <View style={styles.header}>
            <View>
              <Text style={[styles.title, isDarkMode && styles.textLight]}>Editar movimentação</Text>
              <Text style={[styles.productName, isDarkMode && styles.textMuted]} numberOfLines={1}>
                {move.productDescription || move.productName || 'Produto'}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={[styles.closeBtn, isDarkMode && styles.closeBtnDark]}>
              <X size={18} color={isDarkMode ? '#cbd5e1' : '#64748b'} />
            </TouchableOpacity>
          </View>

          <StockMoveTypeSelector type={type} isDarkMode={isDarkMode} onSelectType={setType} />

          <View style={styles.form}>
            <View style={styles.formGroup}>
              <Text style={[styles.label, isDarkMode && styles.labelDark]}>Quantidade *</Text>
              <TextInput
                style={[styles.input, isDarkMode && styles.inputDark, isDarkMode && styles.textLight]}
                value={quantity}
                onChangeText={setQuantity}
                keyboardType="numeric"
                placeholder="Ex: 10"
                placeholderTextColor={isDarkMode ? '#64748b' : '#94a3b8'}
                editable={!isSaving}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.label, isDarkMode && styles.labelDark]}>Data (AAAA-MM-DD) *</Text>
              <TextInput
                style={[styles.input, isDarkMode && styles.inputDark, isDarkMode && styles.textLight]}
                value={date}
                onChangeText={setDate}
                placeholder="AAAA-MM-DD"
                placeholderTextColor={isDarkMode ? '#64748b' : '#94a3b8'}
                editable={!isSaving}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.label, isDarkMode && styles.labelDark]}>Motivo / Observação *</Text>
              <TextInput
                style={[styles.textArea, isDarkMode && styles.inputDark, isDarkMode && styles.textLight]}
                value={observation}
                onChangeText={setObservation}
                placeholder="Motivo da alteração..."
                placeholderTextColor={isDarkMode ? '#64748b' : '#94a3b8'}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                editable={!isSaving}
              />
            </View>
          </View>

          <View style={styles.actions}>
            <TouchableOpacity onPress={onClose} disabled={isSaving} style={[styles.cancelBtn, isDarkMode && styles.cancelBtnDark]}>
              <Text style={[styles.cancelText, isDarkMode && styles.textLight]}>Cancelar</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={handleSave} disabled={isSaving} style={[styles.saveBtn, { backgroundColor: themeColor }]}>
              {isSaving ? <ActivityIndicator size="small" color="#ffffff" /> : <Text style={styles.saveText}>Salvar alterações</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.65)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  card: { width: '100%', maxWidth: 440, backgroundColor: '#ffffff', borderRadius: 24, padding: 22, elevation: 8 },
  cardDark: { backgroundColor: '#1e293b', borderColor: '#334155', borderWidth: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  title: { fontSize: 18, fontWeight: '900', color: '#0f172a' },
  productName: { fontSize: 12, color: '#64748b', fontWeight: '600', marginTop: 2, maxWidth: 280 },
  closeBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' },
  closeBtnDark: { backgroundColor: '#334155' },
  form: { gap: 12 },
  formGroup: { gap: 4 },
  label: { fontSize: 10, fontWeight: '800', color: '#475569', textTransform: 'uppercase', letterSpacing: 0.6 },
  labelDark: { color: '#94a3b8' },
  input: { height: 42, borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 12, paddingHorizontal: 12, fontSize: 13, color: '#0f172a', backgroundColor: '#f8fafc' },
  textArea: { minHeight: 64, borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 12, padding: 12, fontSize: 13, color: '#0f172a', backgroundColor: '#f8fafc' },
  inputDark: { backgroundColor: '#0f172a', borderColor: '#334155' },
  textLight: { color: '#f8fafc' },
  textMuted: { color: '#94a3b8' },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 10, marginTop: 18 },
  cancelBtn: { paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, backgroundColor: '#f1f5f9' },
  cancelBtnDark: { backgroundColor: '#334155' },
  cancelText: { fontSize: 12, fontWeight: '700', color: '#475569' },
  saveBtn: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  saveText: { fontSize: 12, fontWeight: '900', color: '#ffffff' },
});
