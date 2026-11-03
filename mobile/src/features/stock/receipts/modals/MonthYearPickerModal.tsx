import React, { useEffect, useState } from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ChevronLeft, ChevronRight, X } from 'lucide-react-native';

const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

function parseMonthValue(value: string) {
  const match = /^(\d{4})-(\d{2})$/.exec(value);
  const year = Number(match?.[1]);
  const month = Number(match?.[2]);
  return year > 0 && month >= 1 && month <= 12
    ? { year, month }
    : { year: new Date().getFullYear(), month: new Date().getMonth() + 1 };
}

export function formatMonthYear(value: string) {
  const { year, month } = parseMonthValue(value);
  return `${MONTHS[month - 1]} de ${year}`;
}

interface MonthYearPickerModalProps {
  visible: boolean;
  isDarkMode: boolean;
  value: string;
  onClose: () => void;
  onSelect: (month: string) => void;
}

export const MonthYearPickerModal: React.FC<MonthYearPickerModalProps> = ({
  visible,
  isDarkMode,
  value,
  onClose,
  onSelect,
}) => {
  const [year, setYear] = useState(() => parseMonthValue(value).year);
  const selectedMonth = parseMonthValue(value).month;

  useEffect(() => {
    if (visible) setYear(parseMonthValue(value).year);
  }, [value, visible]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity
          style={StyleSheet.absoluteFillObject}
          activeOpacity={1}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Fechar seleção de mês"
        />
        <View style={[styles.card, isDarkMode && styles.cardDark]}>
          <View style={styles.header}>
            <Text style={[styles.title, isDarkMode && styles.textLight]}>
              Escolher mês e ano
            </Text>
            <TouchableOpacity
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Fechar calendário"
              hitSlop={8}
            >
              <X size={20} color={isDarkMode ? '#cbd5e1' : '#64748b'} />
            </TouchableOpacity>
          </View>
          <View style={styles.yearRow}>
            <TouchableOpacity
              style={[styles.yearButton, isDarkMode && styles.yearButtonDark]}
              onPress={() => setYear((current) => Math.max(1, current - 1))}
              disabled={year <= 1}
              accessibilityRole="button"
              accessibilityLabel={`Ano anterior: ${year - 1}`}
            >
              <ChevronLeft size={20} color={isDarkMode ? '#cbd5e1' : '#475569'} />
            </TouchableOpacity>
            <Text style={[styles.year, isDarkMode && styles.textLight]}>{year}</Text>
            <TouchableOpacity
              style={[styles.yearButton, isDarkMode && styles.yearButtonDark]}
              onPress={() => setYear((current) => Math.min(9999, current + 1))}
              disabled={year >= 9999}
              accessibilityRole="button"
              accessibilityLabel={`Próximo ano: ${year + 1}`}
            >
              <ChevronRight size={20} color={isDarkMode ? '#cbd5e1' : '#475569'} />
            </TouchableOpacity>
          </View>
          <View style={styles.monthGrid}>
            {MONTHS.map((monthName, index) => {
              const month = index + 1;
              const selected = month === selectedMonth && year === parseMonthValue(value).year;
              return (
                <TouchableOpacity
                  key={monthName}
                  style={[
                    styles.monthButton,
                    isDarkMode && styles.monthButtonDark,
                    selected && styles.monthButtonSelected,
                  ]}
                  onPress={() => onSelect(`${year}-${String(month).padStart(2, '0')}`)}
                  accessibilityRole="button"
                  accessibilityLabel={`${monthName} de ${year}`}
                  accessibilityState={{ selected }}
                >
                  <Text
                    style={[
                      styles.monthText,
                      isDarkMode && styles.textLight,
                      selected && styles.monthTextSelected,
                    ]}
                  >
                    {monthName}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={onClose}
            accessibilityRole="button"
          >
            <Text style={[styles.cancelText, isDarkMode && styles.cancelTextDark]}>Cancelar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
  },
  card: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 18,
    padding: 18,
    backgroundColor: '#ffffff',
    elevation: 12,
  },
  cardDark: { backgroundColor: '#1e293b' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  title: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  textLight: { color: '#f8fafc' },
  yearRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  yearButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
  },
  yearButtonDark: { backgroundColor: '#334155' },
  year: { fontSize: 18, fontWeight: '900', color: '#0f172a' },
  monthGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  monthButton: {
    flexBasis: '31%',
    flexGrow: 1,
    minHeight: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
  },
  monthButtonDark: { backgroundColor: '#334155' },
  monthButtonSelected: { backgroundColor: '#2563eb' },
  monthText: { fontSize: 12, fontWeight: '700', color: '#334155' },
  monthTextSelected: { color: '#ffffff' },
  cancelButton: { alignSelf: 'flex-end', paddingHorizontal: 12, paddingVertical: 12, marginTop: 6 },
  cancelText: { fontSize: 13, fontWeight: '700', color: '#64748b' },
  cancelTextDark: { color: '#cbd5e1' },
});
