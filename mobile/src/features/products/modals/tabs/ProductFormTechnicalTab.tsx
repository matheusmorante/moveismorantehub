import React from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

interface Props {
  formData: any;
  setFormData: (fn: (prev: any) => any) => void;
  dark: boolean;
}

export const ProductFormTechnicalTab: React.FC<Props> = ({ formData, setFormData, dark }) => {
  const set = (field: string, val: any) => setFormData(prev => ({ ...prev, [field]: val }));

  return (
    <View style={styles.container}>
      {/* ─── Descrição Detalhada ─── */}
      <View style={[styles.card, dark && styles.darkCard]}>
        <Text style={[styles.cardTitle, dark && styles.lightText]}>📄 Descrição Detalhada</Text>
        <TextInput
          value={formData.description || ''}
          onChangeText={v => set('description', v)}
          placeholder="Escreva a descrição detalhada do produto, diferenciais, especificações técnicas..."
          placeholderTextColor="#94a3b8"
          multiline
          numberOfLines={8}
          textAlignVertical="top"
          style={[styles.textarea, dark && styles.darkInput, dark && styles.lightText]}
        />
      </View>

      {/* ─── Dimensões Físicas ─── */}
      <View style={[styles.card, dark && styles.darkCard]}>
        <Text style={[styles.cardTitle, dark && styles.lightText]}>📐 Medidas</Text>

        <View style={styles.row}>
          <View style={styles.flex1}>
            <Text style={[styles.label, dark && styles.dimText]}>Altura (cm)</Text>
            <TextInput
              value={formData.height ? String(formData.height) : ''}
              onChangeText={v => set('height', v)}
              keyboardType="numeric"
              placeholder="0"
              placeholderTextColor="#94a3b8"
              style={[styles.input, dark && styles.darkInput, dark && styles.lightText]}
            />
          </View>
          <View style={styles.flex1}>
            <Text style={[styles.label, dark && styles.dimText]}>Largura (cm)</Text>
            <TextInput
              value={formData.width ? String(formData.width) : ''}
              onChangeText={v => set('width', v)}
              keyboardType="numeric"
              placeholder="0"
              placeholderTextColor="#94a3b8"
              style={[styles.input, dark && styles.darkInput, dark && styles.lightText]}
            />
          </View>
        </View>

        <View style={styles.row}>
          <View style={styles.flex1}>
            <View style={styles.labelRow}>
              <Text style={[styles.label, dark && styles.dimText]}>
                {formData.depthUseLength ? 'Comprimento (cm)' : 'Profundidade (cm)'}
              </Text>
              <TouchableOpacity
                onPress={() => set('depthUseLength', !formData.depthUseLength)}
                style={styles.switchBtn}
              >
                <Text style={styles.switchBtnText}>
                  {formData.depthUseLength ? '→ Prof.' : '→ Comp.'}
                </Text>
              </TouchableOpacity>
            </View>
            <TextInput
              value={formData.depth ? String(formData.depth) : ''}
              onChangeText={v => set('depth', v)}
              keyboardType="numeric"
              placeholder="0"
              placeholderTextColor="#94a3b8"
              style={[styles.input, dark && styles.darkInput, dark && styles.lightText]}
            />
          </View>
          <View style={styles.flex1}>
            <Text style={[styles.label, dark && styles.dimText]}>Peso (kg)</Text>
            <TextInput
              value={formData.weight ? String(formData.weight) : ''}
              onChangeText={v => set('weight', v)}
              keyboardType="numeric"
              placeholder="0,00"
              placeholderTextColor="#94a3b8"
              style={[styles.input, dark && styles.darkInput, dark && styles.lightText]}
            />
          </View>
        </View>
      </View>

      {/* ─── Observações ─── */}
      <View style={[styles.card, dark && styles.darkCard]}>
        <Text style={[styles.cardTitle, dark && styles.lightText]}>🗒️ Observações Internas</Text>
        <TextInput
          value={formData.observations || ''}
          onChangeText={v => set('observations', v)}
          placeholder="Notas internas, informações complementares..."
          placeholderTextColor="#94a3b8"
          multiline
          numberOfLines={4}
          textAlignVertical="top"
          style={[styles.textarea, styles.textareaSmall, dark && styles.darkInput, dark && styles.lightText]}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { gap: 14 },
  card: { backgroundColor: '#f8fafc', borderRadius: 16, padding: 14, gap: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  darkCard: { backgroundColor: '#1e293b', borderColor: '#334155' },
  cardTitle: { fontSize: 13, fontWeight: '900', color: '#0f172a' },
  lightText: { color: '#f1f5f9' },
  dimText: { color: '#94a3b8' },
  row: { flexDirection: 'row', gap: 10 },
  flex1: { flex: 1 },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  label: { fontSize: 10, fontWeight: '800', color: '#475569', textTransform: 'uppercase', marginBottom: 4 },
  input: { height: 44, backgroundColor: '#ffffff', borderRadius: 10, paddingHorizontal: 12, borderWidth: 1, borderColor: '#e2e8f0', fontSize: 13, fontWeight: '700', color: '#0f172a' },
  darkInput: { backgroundColor: '#0f172a', borderColor: '#334155' },
  textarea: { backgroundColor: '#ffffff', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#e2e8f0', fontSize: 13, fontWeight: '600', color: '#0f172a', minHeight: 160 },
  textareaSmall: { minHeight: 80 },
  switchBtn: { backgroundColor: '#eff6ff', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  switchBtnText: { fontSize: 10, fontWeight: '800', color: '#2563eb' },
});
