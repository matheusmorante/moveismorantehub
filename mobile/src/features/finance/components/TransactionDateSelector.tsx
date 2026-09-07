import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { CalendarDays } from 'lucide-react-native';
import { formatDateBr } from './transactionModalUtils';

interface Props {
  transactionDate: string;
  todayStr: string;
  yesterdayStr: string;
  onSelectDate: (date: string) => void;
  onOpenDatePicker: () => void;
  isDarkMode?: boolean;
}

export const TransactionDateSelector: React.FC<Props> = ({
  transactionDate,
  todayStr,
  yesterdayStr,
  onSelectDate,
  onOpenDatePicker,
  isDarkMode,
}) => {
  return (
    <View>
      <Text style={[styles.label, isDarkMode && styles.labelDark]}>Data da transação</Text>
      <View style={styles.dateOptionsRow}>
        <TouchableOpacity
          style={[styles.dateOption, transactionDate === yesterdayStr && styles.dateOptionActive]}
          onPress={() => onSelectDate(yesterdayStr)}
          activeOpacity={0.7}
        >
          <Text style={[styles.dateOptionText, transactionDate === yesterdayStr && styles.dateOptionTextActive]}>
            Ontem
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.dateOption, transactionDate === todayStr && styles.dateOptionActive]}
          onPress={() => onSelectDate(todayStr)}
          activeOpacity={0.7}
        >
          <Text style={[styles.dateOptionText, transactionDate === todayStr && styles.dateOptionTextActive]}>
            Hoje
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.dateOption,
            transactionDate !== todayStr && transactionDate !== yesterdayStr && styles.dateOptionActive,
          ]}
          onPress={onOpenDatePicker}
          activeOpacity={0.7}
        >
          <CalendarDays
            size={15}
            color={transactionDate !== todayStr && transactionDate !== yesterdayStr ? '#ffffff' : '#64748b'}
          />
          <Text
            style={[
              styles.dateOptionText,
              transactionDate !== todayStr && transactionDate !== yesterdayStr && styles.dateOptionTextActive,
            ]}
          >
            Personalizado
          </Text>
        </TouchableOpacity>
      </View>

      <Text style={[styles.selectedDateText, isDarkMode && styles.labelDark]}>
        Data selecionada: {formatDateBr(transactionDate)}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
    marginTop: 10,
    marginBottom: 6,
  },
  labelDark: {
    color: '#cbd5e1',
  },
  dateOptionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  dateOption: {
    flex: 1,
    minHeight: 40,
    paddingHorizontal: 8,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  dateOptionActive: {
    backgroundColor: '#2563eb',
  },
  dateOptionText: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '700',
  },
  dateOptionTextActive: {
    color: '#ffffff',
  },
  selectedDateText: {
    color: '#64748b',
    fontSize: 12,
    marginTop: 7,
    marginBottom: 3,
  },
});
