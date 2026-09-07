import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface Props {
  declaredTotal: number;
  installmentsSum: number;
  formattedTotal: string;
  formattedSum: string;
  formattedDiff: string;
  questionToUser?: string | null;
}

export const CardNeedsInputBox: React.FC<Props> = ({
  declaredTotal,
  installmentsSum,
  formattedTotal,
  formattedSum,
  formattedDiff,
  questionToUser,
}) => {
  const hasMismatch = declaredTotal > 0 && installmentsSum > 0 && Math.abs(declaredTotal - installmentsSum) > 0.01;

  return (
    <View style={styles.needsInputBox}>
      {hasMismatch && (
        <View style={styles.mismatchGrid}>
          <View style={styles.mismatchRow}>
            <Text style={styles.mismatchLabel}>Total informado</Text>
            <Text style={styles.mismatchValueBold}>{formattedTotal}</Text>
          </View>
          <View style={styles.mismatchRow}>
            <Text style={styles.mismatchLabel}>Parcelas somadas</Text>
            <Text style={styles.mismatchValue}>{formattedSum}</Text>
          </View>
          <View style={styles.mismatchRow}>
            <Text style={styles.mismatchLabelAlert}>Diferença</Text>
            <Text style={styles.mismatchValueAlert}>{formattedDiff}</Text>
          </View>
        </View>
      )}

      <Text style={styles.needsInputQuestion}>
        {questionToUser || 'Faltam dados para concluir a operação. Como deseja ajustar?'}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  needsInputBox: {
    backgroundColor: '#fffbeb',
    borderColor: '#fef3c7',
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  needsInputQuestion: {
    fontSize: 13,
    color: '#92400e',
    fontWeight: '600',
    lineHeight: 18,
  },
  mismatchGrid: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 8,
    marginBottom: 8,
    gap: 4,
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  mismatchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  mismatchLabel: {
    fontSize: 11,
    color: '#64748b',
  },
  mismatchLabelAlert: {
    fontSize: 11,
    color: '#dc2626',
    fontWeight: '700',
  },
  mismatchValue: {
    fontSize: 12,
    color: '#0f172a',
  },
  mismatchValueBold: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0f172a',
  },
  mismatchValueAlert: {
    fontSize: 12,
    fontWeight: '700',
    color: '#dc2626',
  },
});
