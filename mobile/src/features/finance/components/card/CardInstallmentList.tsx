import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { ChevronDown, ChevronUp } from 'lucide-react-native';
import { InstallmentItemDraft } from '../../../../services/financialAiAssistantService';

interface Props {
  installmentItems: InstallmentItemDraft[];
  formatDateBR: (isoDate?: string | null) => string;
  isDarkMode?: boolean;
}

export const CardInstallmentList: React.FC<Props> = ({
  installmentItems,
  formatDateBR,
  isDarkMode = false,
}) => {
  const [expandedInstallments, setExpandedInstallments] = useState(false);

  if (installmentItems.length === 0) return null;

  const hasManyInstallments = installmentItems.length > 12;
  const displayedInstallments = expandedInstallments ? installmentItems : installmentItems.slice(0, 12);

  return (
    <View style={styles.installmentsBlock}>
      <Text style={[styles.installmentsHeader, isDarkMode && styles.textDark]}>
        {installmentItems.length} {installmentItems.length === 1 ? 'PARCELA' : 'PARCELAS'}
      </Text>
      {displayedInstallments.map((item, idx) => (
        <View key={idx} style={styles.installmentLine}>
          <Text style={[styles.installmentDateText, isDarkMode && styles.textDark]}>
            {formatDateBR(item.dueDate)}
          </Text>
          <Text style={[styles.installmentAmountText, isDarkMode && styles.textDark]}>
            {item.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </Text>
        </View>
      ))}

      {hasManyInstallments ? (
        <TouchableOpacity
          style={styles.expandBtn}
          onPress={() => setExpandedInstallments(!expandedInstallments)}
          activeOpacity={0.7}
        >
          <Text style={styles.expandBtnText}>
            {expandedInstallments ? 'Recolher parcelas' : `Ver todas as ${installmentItems.length} parcelas`}
          </Text>
          {expandedInstallments ? <ChevronUp size={14} color="#3b82f6" /> : <ChevronDown size={14} color="#3b82f6" />}
        </TouchableOpacity>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  installmentsBlock: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  installmentsHeader: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  installmentLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 3,
  },
  installmentDateText: {
    fontSize: 13,
    color: '#334155',
    fontWeight: '500',
  },
  installmentAmountText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  expandBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingTop: 8,
    marginTop: 4,
  },
  expandBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#3b82f6',
  },
  textDark: {
    color: '#f8fafc',
  },
});
