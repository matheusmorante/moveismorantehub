import React from 'react';
import { Calendar, ChevronDown } from 'lucide-react-native';
import { Text, TouchableOpacity, View } from 'react-native';
import { FormTextInput } from '../../../../components/shared/FormTextInput';
import type { InvoiceDateFilter } from '../../types/stock.types';
import { periodOptions } from '../../invoices/screens/invoices-screen/InvoicePeriodFilterModal';
import { formatMonthYear } from './MonthYearPickerModal';
import type { ReceiptSourceColors } from './ReceiptSourceOptions';
import { styles } from './receiptSourcePicker.styles';

interface Props {
  dateFilter: InvoiceDateFilter;
  colors: ReceiptSourceColors;
  onOpenPeriodPicker: () => void;
  onOpenMonthPicker: () => void;
  onChangeStartMonth: (value: string) => void;
  onChangeEndMonth: (value: string) => void;
}

export const ReceiptSourceDateFilterControls: React.FC<Props> = ({
  dateFilter,
  colors,
  onOpenPeriodPicker,
  onOpenMonthPicker,
  onChangeStartMonth,
  onChangeEndMonth,
}) => (
  <View style={styles.dateFilterContainer}>
    <TouchableOpacity
      style={[styles.dateFilterButton, { borderColor: colors.border, backgroundColor: colors.surface }]}
      onPress={onOpenPeriodPicker}
      accessibilityRole="button"
      accessibilityLabel={`Período: ${periodOptions.find((option) => option.value === dateFilter.mode)?.label || 'Mês Atual'}`}
    >
      <Calendar size={16} color="#2563eb" />
      <Text style={[styles.dateFilterText, { color: colors.text }]}>Período:</Text>
      <Text style={[styles.dateFilterValue, { color: colors.text }]}>
        {periodOptions.find((option) => option.value === dateFilter.mode)?.label || 'Mês Atual'}
      </Text>
      <ChevronDown size={15} color={colors.muted} />
    </TouchableOpacity>
    {dateFilter.mode === 'custom_month' && (
      <TouchableOpacity
        onPress={onOpenMonthPicker}
        accessibilityRole="button"
        accessibilityLabel={`Mês da nota fiscal: ${formatMonthYear(dateFilter.customMonth)}. Escolher mês e ano.`}
        style={[styles.datePickerButton, { borderColor: colors.border, backgroundColor: colors.surface }]}
      >
        <Text style={{ color: colors.text, fontSize: 12 }}>
          {formatMonthYear(dateFilter.customMonth)}
        </Text>
        <Calendar size={16} color={colors.muted} />
      </TouchableOpacity>
    )}
    {dateFilter.mode === 'custom_range' && (
      <View style={styles.dateRange}>
        <Text style={[styles.dateRangeLabel, { color: colors.muted }]}>De:</Text>
        <FormTextInput
          value={dateFilter.startMonth}
          onChangeText={onChangeStartMonth}
          placeholder="AAAA-MM"
          maxLength={7}
          accessibilityLabel="Mês inicial das notas fiscais"
          style={[styles.dateInput, styles.dateRangeInput, { borderColor: colors.border, color: colors.text, backgroundColor: colors.surface }]}
        />
        <Text style={[styles.dateRangeLabel, { color: colors.muted }]}>Até:</Text>
        <FormTextInput
          value={dateFilter.endMonth}
          onChangeText={onChangeEndMonth}
          placeholder="AAAA-MM"
          maxLength={7}
          accessibilityLabel="Mês final das notas fiscais"
          style={[styles.dateInput, styles.dateRangeInput, { borderColor: colors.border, color: colors.text, backgroundColor: colors.surface }]}
        />
      </View>
    )}
  </View>
);
