import React from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';

interface Props {
  visible: boolean;
  isDarkMode: boolean;
  selectedPeriod: string;
  customStartDate: string;
  customEndDate: string;
  onSelectPeriod: (period: string) => void;
  onChangeCustomStartDate: (date: string) => void;
  onChangeCustomEndDate: (date: string) => void;
  onApplyCustomPeriod: (range: { startDate: string; endDate: string }) => void;
  onClose: () => void;
}

const PERIOD_OPTIONS = ['Este Mês', 'Mês Passado', 'Este Ano', 'Personalizado', 'Todos'];

export const StockPeriodModal: React.FC<Props> = ({
  visible,
  isDarkMode,
  selectedPeriod,
  customStartDate,
  customEndDate,
  onSelectPeriod,
  onChangeCustomStartDate,
  onChangeCustomEndDate,
  onApplyCustomPeriod,
  onClose,
}) => {
  const handleApplyCustom = () => {
    if (!customStartDate || !customEndDate) {
      Alert.alert('Período inválido', 'Informe as datas de início e fim no formato AAAA-MM-DD.');
      return;
    }
    onApplyCustomPeriod({
      startDate: new Date(`${customStartDate}T00:00:00Z`).toISOString(),
      endDate: new Date(`${customEndDate}T23:59:59Z`).toISOString(),
    });
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <View style={[styles.card, isDarkMode && styles.cardDark]}>
          <Text style={[styles.title, isDarkMode && styles.textLight]}>Selecione o Período</Text>
          {PERIOD_OPTIONS.map(option => (
            <TouchableOpacity
              key={option}
              style={styles.option}
              onPress={() => {
                onSelectPeriod(option);
                if (option !== 'Personalizado') {
                  onClose();
                }
              }}
            >
              <Text
                style={[
                  styles.optionText,
                  isDarkMode && styles.textLight,
                  selectedPeriod === option && styles.optionTextActive,
                ]}
              >
                {option}
              </Text>
            </TouchableOpacity>
          ))}

          {selectedPeriod === 'Personalizado' && (
            <View style={styles.customBox}>
              <TextInput
                value={customStartDate}
                onChangeText={onChangeCustomStartDate}
                placeholder="Início AAAA-MM-DD"
                placeholderTextColor="#94a3b8"
                style={[styles.input, isDarkMode && styles.inputDark, isDarkMode && styles.textLight]}
              />
              <TextInput
                value={customEndDate}
                onChangeText={onChangeCustomEndDate}
                placeholder="Fim AAAA-MM-DD"
                placeholderTextColor="#94a3b8"
                style={[styles.input, isDarkMode && styles.inputDark, isDarkMode && styles.textLight]}
              />
              <TouchableOpacity style={styles.applyBtn} onPress={handleApplyCustom}>
                <Text style={styles.applyBtnText}>Aplicar período</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    width: '100%',
    maxWidth: 360,
    padding: 22,
  },
  cardDark: { backgroundColor: '#1e293b' },
  title: { fontSize: 17, fontWeight: '800', color: '#0f172a', marginBottom: 14, textAlign: 'center' },
  textLight: { color: '#f8fafc' },
  option: { paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  optionText: { fontSize: 15, color: '#334155', textAlign: 'center', fontWeight: '600' },
  optionTextActive: { color: '#2563eb', fontWeight: '800' },
  customBox: { marginTop: 10, gap: 8 },
  input: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, padding: 10, color: '#0f172a', fontSize: 13 },
  inputDark: { backgroundColor: '#0f172a', borderColor: '#334155' },
  applyBtn: { backgroundColor: '#2563eb', borderRadius: 10, padding: 11, alignItems: 'center' },
  applyBtnText: { color: '#ffffff', fontWeight: '800', fontSize: 12 },
});
