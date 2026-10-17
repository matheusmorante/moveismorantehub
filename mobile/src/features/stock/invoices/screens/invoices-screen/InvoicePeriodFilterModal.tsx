import React from 'react';
import { Modal, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { X } from 'lucide-react-native';
import type { InvoiceDateFilterMode } from '../../types/stock.types';
import { styles } from './invoicesScreen.styles';

export const periodOptions: Array<{ value: InvoiceDateFilterMode; label: string }> = [
  { value: 'current_month', label: 'Mês Atual' },
  { value: 'previous_month', label: 'Mês Anterior' },
  { value: 'current_year', label: 'Este Ano' },
  { value: 'previous_year', label: 'Ano Passado' },
  { value: 'custom_month', label: 'Outro Mês' },
  { value: 'custom_range', label: 'Intervalo Personalizado' },
];

interface InvoicePeriodFilterModalProps {
  visible: boolean;
  isDarkMode: boolean;
  currentMode: InvoiceDateFilterMode;
  onClose: () => void;
  onSelectMode: (mode: InvoiceDateFilterMode) => void;
}

export const InvoicePeriodFilterModal: React.FC<InvoicePeriodFilterModalProps> = ({
  visible,
  isDarkMode,
  currentMode,
  onClose,
  onSelectMode,
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
        <View style={[styles.periodModal, isDarkMode && styles.periodModalDark]}>
          <View style={styles.periodModalHeader}>
            <Text style={[styles.modalTitle, isDarkMode && styles.textDark]}>
              Selecione o Período
            </Text>
            <TouchableOpacity
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Fechar períodos"
            >
              <X size={20} color={isDarkMode ? '#cbd5e1' : '#64748b'} />
            </TouchableOpacity>
          </View>
          <ScrollView>
            {periodOptions.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.periodOption,
                  currentMode === option.value && styles.periodOptionSelected,
                ]}
                onPress={() => onSelectMode(option.value)}
                accessibilityRole="button"
              >
                <Text
                  style={[
                    styles.periodOptionText,
                    isDarkMode && styles.textDark,
                    currentMode === option.value && styles.periodOptionTextSelected,
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </TouchableOpacity>
    </Modal>
  );
};
