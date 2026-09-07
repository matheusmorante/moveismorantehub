import React, { useEffect, useMemo, useState } from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ChevronLeft, ChevronRight, X } from 'lucide-react-native';

interface Props {
  visible: boolean;
  selectedDate: string;
  isDarkMode?: boolean;
  onClose: () => void;
  onSelect: (date: string) => void;
}

const WEEK_DAYS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

const toIsoDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const fromIsoDate = (value: string) => {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
};

export const TransactionDatePickerModal: React.FC<Props> = ({
  visible,
  selectedDate,
  isDarkMode = false,
  onClose,
  onSelect,
}) => {
  const [visibleMonth, setVisibleMonth] = useState(() => fromIsoDate(selectedDate));

  useEffect(() => {
    if (visible) setVisibleMonth(fromIsoDate(selectedDate));
  }, [selectedDate, visible]);

  const calendarCells = useMemo(() => {
    const year = visibleMonth.getFullYear();
    const month = visibleMonth.getMonth();
    const leadingEmptyDays = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    return [
      ...Array.from({ length: leadingEmptyDays }, () => null),
      ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
    ];
  }, [visibleMonth]);

  const changeMonth = (offset: number) => {
    setVisibleMonth(current => new Date(current.getFullYear(), current.getMonth() + offset, 1));
  };

  const chooseDay = (day: number) => {
    onSelect(toIsoDate(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), day)));
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.content, isDarkMode && styles.contentDark]}>
          <View style={styles.header}>
            <Text style={[styles.title, isDarkMode && styles.textDark]}>Escolha a data</Text>
            <TouchableOpacity onPress={onClose} style={styles.iconButton}>
              <X size={20} color={isDarkMode ? '#cbd5e1' : '#475569'} />
            </TouchableOpacity>
          </View>

          <View style={styles.monthHeader}>
            <TouchableOpacity onPress={() => changeMonth(-1)} style={styles.iconButton}>
              <ChevronLeft size={20} color={isDarkMode ? '#cbd5e1' : '#475569'} />
            </TouchableOpacity>
            <Text style={[styles.monthTitle, isDarkMode && styles.textDark]}>
              {MONTHS[visibleMonth.getMonth()]} de {visibleMonth.getFullYear()}
            </Text>
            <TouchableOpacity onPress={() => changeMonth(1)} style={styles.iconButton}>
              <ChevronRight size={20} color={isDarkMode ? '#cbd5e1' : '#475569'} />
            </TouchableOpacity>
          </View>

          <View style={styles.grid}>
            {WEEK_DAYS.map((label, index) => (
              <View key={`${label}-${index}`} style={styles.cell}>
                <Text style={[styles.weekDay, isDarkMode && styles.mutedTextDark]}>{label}</Text>
              </View>
            ))}
            {calendarCells.map((day, index) => {
              if (!day) return <View key={`empty-${index}`} style={styles.cell} />;
              const isoDate = toIsoDate(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), day));
              const selected = isoDate === selectedDate;
              return (
                <TouchableOpacity
                  key={isoDate}
                  style={[styles.cell, styles.dayCell, selected && styles.selectedDay]}
                  onPress={() => chooseDay(day)}
                >
                  <Text style={[styles.dayText, isDarkMode && styles.textDark, selected && styles.selectedDayText]}>
                    {day}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.55)', alignItems: 'center', justifyContent: 'center', padding: 20 },
  content: { width: '100%', maxWidth: 380, borderRadius: 18, backgroundColor: '#ffffff', padding: 16 },
  contentDark: { backgroundColor: '#0f172a' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { color: '#0f172a', fontSize: 17, fontWeight: '700' },
  iconButton: { padding: 8 },
  monthHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginVertical: 14 },
  monthTitle: { color: '#1e293b', fontSize: 15, fontWeight: '700' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: '14.2857%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center' },
  dayCell: { borderRadius: 999 },
  selectedDay: { backgroundColor: '#2563eb' },
  weekDay: { color: '#64748b', fontSize: 12, fontWeight: '700' },
  dayText: { color: '#334155', fontSize: 14, fontWeight: '600' },
  selectedDayText: { color: '#ffffff' },
  textDark: { color: '#f8fafc' },
  mutedTextDark: { color: '#94a3b8' },
});
