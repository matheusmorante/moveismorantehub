import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { PackagePlus, PackageMinus, Scale } from 'lucide-react-native';

export type MoveTypeChoice = 'entry' | 'withdrawal' | 'balance';

interface Props {
  type: MoveTypeChoice;
  isDarkMode: boolean;
  onSelectType: (type: MoveTypeChoice) => void;
}

export const StockMoveTypeSelector: React.FC<Props> = ({ type, isDarkMode, onSelectType }) => {
  return (
    <View style={styles.typeRow}>
      <TouchableOpacity
        onPress={() => onSelectType('entry')}
        style={[
          styles.typeBtn,
          type === 'entry' && styles.typeBtnActiveEntry,
          isDarkMode && styles.typeBtnDark,
        ]}
      >
        <PackagePlus size={14} color={type === 'entry' ? '#059669' : '#64748b'} />
        <Text style={[styles.typeText, type === 'entry' && styles.typeTextActiveEntry]}>
          Entrada
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => onSelectType('withdrawal')}
        style={[
          styles.typeBtn,
          type === 'withdrawal' && styles.typeBtnActiveExit,
          isDarkMode && styles.typeBtnDark,
        ]}
      >
        <PackageMinus size={14} color={type === 'withdrawal' ? '#dc2626' : '#64748b'} />
        <Text style={[styles.typeText, type === 'withdrawal' && styles.typeTextActiveExit]}>
          Saída
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => onSelectType('balance')}
        style={[
          styles.typeBtn,
          type === 'balance' && styles.typeBtnActiveAdj,
          isDarkMode && styles.typeBtnDark,
        ]}
      >
        <Scale size={14} color={type === 'balance' ? '#d97706' : '#64748b'} />
        <Text style={[styles.typeText, type === 'balance' && styles.typeTextActiveAdj]}>
          Ajuste
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  typeRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  typeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  typeBtnDark: { backgroundColor: '#0f172a' },
  typeBtnActiveEntry: { backgroundColor: '#ecfdf5', borderColor: '#a7f3d0' },
  typeBtnActiveExit: { backgroundColor: '#fef2f2', borderColor: '#fecaca' },
  typeBtnActiveAdj: { backgroundColor: '#fffbeb', borderColor: '#fde68a' },
  typeText: { fontSize: 11, fontWeight: '800', color: '#64748b' },
  typeTextActiveEntry: { color: '#059669' },
  typeTextActiveExit: { color: '#dc2626' },
  typeTextActiveAdj: { color: '#d97706' },
});
