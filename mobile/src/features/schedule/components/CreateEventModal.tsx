import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, TextInput, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { X, Calendar as CalendarIcon, Clock, Tag, FileText, Check } from 'lucide-react-native';
import { createCalendarEvent, CalendarEvent } from '../../../services/scheduleEventsService';

interface Props {
  visible: boolean;
  onClose: () => void;
  onEventCreated: (event: CalendarEvent) => void;
  isDarkMode?: boolean;
}

const EVENT_TYPES = [
  { id: 'REUNION', label: 'Reunião', color: '#3b82f6' },
  { id: 'INSPECTION', label: 'Vistoria', color: '#f59e0b' },
  { id: 'MAINTENANCE', label: 'Manutenção', color: '#ef4444' },
  { id: 'TRAINING', label: 'Treinamento', color: '#10b981' },
  { id: 'OTHER', label: 'Outros', color: '#8b5cf6' },
];

const PERIOD_PRESETS = [
  'Manhã (08:00 - 12:00)',
  'Tarde (13:00 - 18:00)',
  'Horário Comercial',
  'Integral',
];

export const CreateEventModal: React.FC<Props> = ({
  visible,
  onClose,
  onEventCreated,
  isDarkMode = false,
}) => {
  const todayStr = new Date().toISOString().split('T')[0];

  const [title, setTitle] = useState('');
  const [date, setDate] = useState(todayStr);
  const [timeOrPeriod, setTimeOrPeriod] = useState('Manhã (08:00 - 12:00)');
  const [selectedType, setSelectedType] = useState<CalendarEvent['type']>('REUNION');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('Campo Obrigatório', 'Informe o título do compromisso.');
      return;
    }
    if (!date.trim()) {
      Alert.alert('Campo Obrigatório', 'Informe a data do compromisso.');
      return;
    }

    setSaving(true);
    const typeObj = EVENT_TYPES.find(t => t.id === selectedType);
    const res = await createCalendarEvent({
      title: title.trim(),
      date: date.trim(),
      time_or_period: timeOrPeriod,
      type: selectedType,
      type_label: typeObj?.label || 'Evento',
      notes: notes.trim() || null,
    });
    setSaving(false);

    if (res.success && res.data) {
      onEventCreated(res.data);
      onClose();
      // Resetar form
      setTitle('');
      setNotes('');
    } else {
      Alert.alert('Erro', res.error || 'Não foi possível salvar o compromisso.');
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.card, isDarkMode && styles.cardDark]}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.headerTitle, isDarkMode && styles.textDark]}>Novo Compromisso na Agenda</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={20} color={isDarkMode ? '#94a3b8' : '#64748b'} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.formScroll} showsVerticalScrollIndicator={false}>
            {/* Título */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, isDarkMode && styles.textDark]}>Título do Evento *</Text>
              <TextInput
                style={[styles.input, isDarkMode && styles.inputDark]}
                placeholder="Ex: Reunião de alinhamento ou Vistoria"
                placeholderTextColor={isDarkMode ? '#64748b' : '#94a3b8'}
                value={title}
                onChangeText={setTitle}
              />
            </View>

            {/* Data */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, isDarkMode && styles.textDark]}>Data (AAAA-MM-DD) *</Text>
              <TextInput
                style={[styles.input, isDarkMode && styles.inputDark]}
                placeholder="2026-09-10"
                placeholderTextColor={isDarkMode ? '#64748b' : '#94a3b8'}
                value={date}
                onChangeText={setDate}
              />
            </View>

            {/* Período / Horário */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, isDarkMode && styles.textDark]}>Horário ou Período</Text>
              <View style={styles.presetsRow}>
                {PERIOD_PRESETS.map(preset => (
                  <TouchableOpacity
                    key={preset}
                    style={[styles.presetChip, timeOrPeriod === preset && styles.presetChipActive]}
                    onPress={() => setTimeOrPeriod(preset)}
                  >
                    <Text style={[styles.presetText, timeOrPeriod === preset && styles.presetTextActive]}>
                      {preset}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TextInput
                style={[styles.input, { marginTop: 8 }, isDarkMode && styles.inputDark]}
                placeholder="Ou digite o horário fixo ex: 14:30"
                placeholderTextColor={isDarkMode ? '#64748b' : '#94a3b8'}
                value={timeOrPeriod}
                onChangeText={setTimeOrPeriod}
              />
            </View>

            {/* Tipo de Evento */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, isDarkMode && styles.textDark]}>Tipo de Compromisso</Text>
              <View style={styles.typesRow}>
                {EVENT_TYPES.map(t => (
                  <TouchableOpacity
                    key={t.id}
                    style={[styles.typeChip, { borderColor: t.color }, selectedType === t.id && { backgroundColor: t.color }]}
                    onPress={() => setSelectedType(t.id as any)}
                  >
                    <Text style={[styles.typeText, { color: selectedType === t.id ? '#fff' : t.color }]}>
                      {t.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Observações */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, isDarkMode && styles.textDark]}>Observações / Notas</Text>
              <TextInput
                style={[styles.input, styles.textArea, isDarkMode && styles.inputDark]}
                placeholder="Detalhes adicionais do compromisso..."
                placeholderTextColor={isDarkMode ? '#64748b' : '#94a3b8'}
                multiline={true}
                numberOfLines={3}
                value={notes}
                onChangeText={setNotes}
              />
            </View>
          </ScrollView>

          {/* Botão Salvar */}
          <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving} activeOpacity={0.8}>
            {saving ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <>
                <Check size={18} color="#ffffff" />
                <Text style={styles.saveBtnText}>Salvar Compromisso</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    padding: 16,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    maxHeight: '85%',
    padding: 20,
  },
  cardDark: {
    backgroundColor: '#1e293b',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0f172a',
  },
  textDark: {
    color: '#f8fafc',
  },
  closeBtn: {
    padding: 4,
  },
  formScroll: {
    marginBottom: 16,
  },
  fieldGroup: {
    marginBottom: 14,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: '#0f172a',
  },
  inputDark: {
    backgroundColor: '#0f172a',
    borderColor: '#334155',
    color: '#f8fafc',
  },
  textArea: {
    height: 70,
    textAlignVertical: 'top',
  },
  presetsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 4,
  },
  presetChip: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  presetChipActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  presetText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  presetTextActive: {
    color: '#ffffff',
  },
  typesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  typeChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  typeText: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  saveBtn: {
    backgroundColor: '#2563eb',
    borderRadius: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  saveBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
});
