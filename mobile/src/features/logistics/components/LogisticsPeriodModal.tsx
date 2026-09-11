import React from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet } from 'react-native';
import { Check } from 'lucide-react-native';

export interface PeriodOption {
  id: string;
  label: string;
}

export const PERIOD_OPTIONS: PeriodOption[] = [
  { id: 'today_and_following', label: 'A partir de hoje' },
  { id: 'today', label: 'Hoje' },
  { id: 'tomorrow', label: 'Amanhã' },
  { id: 'this_week', label: 'Esta Semana' },
  { id: 'this_month', label: 'Este Mês' },
  { id: 'last_30_days', label: 'Últimos 30 Dias' },
  { id: 'all', label: 'Todos' },
];

interface Props {
  visible: boolean;
  isDarkMode: boolean;
  selectedPeriod: string;
  onSelectPeriod: (periodId: string) => void;
  onClose: () => void;
}

export const LogisticsPeriodModal: React.FC<Props> = ({
  visible,
  isDarkMode,
  selectedPeriod,
  onSelectPeriod,
  onClose,
}) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <View style={[styles.modalCard, isDarkMode && styles.modalCardDark]}>
          <Text style={[styles.modalTitle, isDarkMode && styles.textDark]}>Filtrar Período</Text>
          {PERIOD_OPTIONS.map(opt => {
            const isSelected = selectedPeriod === opt.id;
            return (
              <TouchableOpacity
                key={opt.id}
                style={[
                  styles.modalOptionBtn,
                  isSelected && styles.modalOptionActive,
                  isDarkMode && styles.modalOptionBtnDark,
                  isSelected && isDarkMode && styles.modalOptionActiveDark
                ]}
                onPress={() => {
                  onSelectPeriod(opt.id);
                  onClose();
                }}
              >
                <Text style={[
                  styles.modalOptionText,
                  isDarkMode && styles.subtitleDark,
                  isSelected && styles.modalOptionTextActive,
                  isSelected && isDarkMode && styles.textDark
                ]}>
                  {opt.label}
                </Text>
                {isSelected && <Check size={16} color="#2563eb" />}
              </TouchableOpacity>
            );
          })}
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20
  },
  modalCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    gap: 8
  },
  modalCardDark: {
    backgroundColor: '#1e293b'
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0f172a',
    marginBottom: 8
  },
  textDark: { color: '#f8fafc' },
  subtitleDark: { color: '#94a3b8' },
  modalOptionBtn: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: '#f8fafc'
  },
  modalOptionBtnDark: {
    backgroundColor: '#0f172a'
  },
  modalOptionActive: {
    backgroundColor: '#eff6ff'
  },
  modalOptionActiveDark: {
    backgroundColor: '#0f172a'
  },
  modalOptionText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569'
  },
  modalOptionTextActive: {
    color: '#2563eb',
    fontWeight: '900'
  },
});
