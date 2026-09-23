import React from 'react';
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Sparkles } from 'lucide-react-native';

interface Props {
  formData: any;
  setFormData: (fn: (prev: any) => any) => void;
  dark: boolean;
}

export const ProductFormDescriptionTab: React.FC<Props> = ({ formData, setFormData, dark }) => (
  <View style={styles.container}>
    <View style={styles.heading}>
      <Text style={[styles.title, dark && styles.lightText]}>DESCRIÇÃO DO PRODUTO</Text>
      <View style={styles.helperRow}>
        <Text style={[styles.helper, dark && styles.dimText]}>
          Descreva o produto, seus diferenciais e informações importantes para o catálogo.
        </Text>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Aperfeiçoar descrição com IA"
          style={styles.improveButton}
          onPress={() => Alert.alert('Aperfeiçoar descrição', 'A ação será conectada na etapa de funcionalidades.')}
        >
          <Sparkles size={14} color="#7e22ce" />
          <Text style={styles.improveButtonText}>Aperfeiçoar</Text>
        </TouchableOpacity>
      </View>
    </View>
    <TextInput
      value={formData.description || ''}
      onChangeText={value => setFormData(previous => ({ ...previous, description: value }))}
      placeholder="Descreva o produto..."
      placeholderTextColor="#94a3b8"
      multiline
      textAlignVertical="top"
      style={[styles.input, dark && styles.darkInput, dark && styles.lightText]}
      accessibilityLabel="Descrição detalhada do produto"
    />
  </View>
);

const styles = StyleSheet.create({
  container: { gap: 12 },
  heading: { gap: 6 },
  helperRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  title: { fontSize: 12, fontWeight: '900', letterSpacing: 1, color: '#334155' },
  helper: { flex: 1, minWidth: 0, fontSize: 12, fontWeight: '600', lineHeight: 18, color: '#94a3b8' },
  improveButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, backgroundColor: '#f3e8ff', paddingHorizontal: 12, paddingVertical: 9, borderRadius: 12 },
  improveButtonText: { fontSize: 10, fontWeight: '900', color: '#7e22ce' },
  lightText: { color: '#f8fafc' },
  dimText: { color: '#94a3b8' },
  input: { minHeight: 360, backgroundColor: 'transparent', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#e2e8f0', fontSize: 14, fontWeight: '600', lineHeight: 20, color: '#0f172a' },
  darkInput: { borderColor: '#334155' },
});
