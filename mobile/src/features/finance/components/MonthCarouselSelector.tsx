import React, { useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList } from 'react-native';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';

interface Props {
  selectedYear: number;
  selectedMonth: number; // 1-12
  onMonthChange: (year: number, month: number) => void;
  isDarkMode?: boolean;
}

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export const MonthCarouselSelector: React.FC<Props> = ({
  selectedYear,
  selectedMonth,
  onMonthChange,
  isDarkMode = false,
}) => {
  const getPrevMonthInfo = () => {
    if (selectedMonth === 1) return { year: selectedYear - 1, month: 12 };
    return { year: selectedYear, month: selectedMonth - 1 };
  };

  const getNextMonthInfo = () => {
    if (selectedMonth === 12) return { year: selectedYear + 1, month: 1 };
    return { year: selectedYear, month: selectedMonth + 1 };
  };

  const prev = getPrevMonthInfo();
  const next = getNextMonthInfo();

  const handlePrev = () => onMonthChange(prev.year, prev.month);
  const handleNext = () => onMonthChange(next.year, next.month);

  const prevLabel = MONTH_NAMES[prev.month - 1];
  const currentLabel = `${MONTH_NAMES[selectedMonth - 1].toUpperCase()} ${selectedYear}`;
  const nextLabel = MONTH_NAMES[next.month - 1];

  return (
    <View style={[styles.container, isDarkMode && styles.containerDark]}>
      {/* Botão Mês Anterior */}
      <TouchableOpacity
        style={styles.sideButton}
        onPress={handlePrev}
        activeOpacity={0.7}
      >
        <ChevronLeft size={18} color={isDarkMode ? '#94a3b8' : '#64748b'} />
        <Text style={[styles.sideText, isDarkMode && styles.sideTextDark]} numberOfLines={1}>
          {prevLabel}
        </Text>
      </TouchableOpacity>

      {/* Mês Selecionado (Destaque Central) */}
      <View style={[styles.centerBadge, isDarkMode && styles.centerBadgeDark]}>
        <Text style={[styles.centerText, isDarkMode && styles.centerTextDark]}>
          {currentLabel}
        </Text>
      </View>

      {/* Botão Próximo Mês */}
      <TouchableOpacity
        style={styles.sideButton}
        onPress={handleNext}
        activeOpacity={0.7}
      >
        <Text style={[styles.sideText, isDarkMode && styles.sideTextDark]} numberOfLines={1}>
          {nextLabel}
        </Text>
        <ChevronRight size={18} color={isDarkMode ? '#94a3b8' : '#64748b'} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  containerDark: {
    backgroundColor: '#0f172a',
    borderBottomColor: '#1e293b',
  },
  sideButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 2,
    maxWidth: '30%',
  },
  sideText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#64748b',
  },
  sideTextDark: {
    color: '#94a3b8',
  },
  centerBadge: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    elevation: 2,
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  centerBadgeDark: {
    backgroundColor: '#2563eb',
  },
  centerText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  centerTextDark: {
    color: '#ffffff',
  },
});
