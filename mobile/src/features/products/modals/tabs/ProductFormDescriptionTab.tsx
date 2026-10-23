import type React from 'react';
import { useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Sparkles } from 'lucide-react-native';
import { useZodForm, flattenFormErrors } from '../../../../hooks/useZodForm';
import { productDescriptionAiFormSchema } from '../../../../../../shared-utils/productAiFormSchemas';
import { getMissingRequiredCharacteristics, getTechnicalValue } from '../../domain/productCharacteristics';
import { parseLocalizedNumber } from '../../domain/productNumbers';
import { improveMobileProductDescription } from '../../services/mobileProductAiService';

interface Props {
  formData: any;
  setFormData: (fn: (prev: any) => any) => void;
  dark: boolean;
  onFieldFocus?: (fieldName: string) => void;
  onFieldBlur?: (fieldName: string) => void;
}

export const ProductFormDescriptionTab: React.FC<Props> = ({
  formData,
  setFormData,
  dark,
  onFieldFocus,
  onFieldBlur,
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const aiForm = useZodForm(productDescriptionAiFormSchema, { title: '', currentDescription: '' });

  const handleGenerateDescription = async () => {
    const technicalValues = formData.technicalValues || {};
    const brand = String(formData.brand || getTechnicalValue(technicalValues, 'Marca') || '').trim();
    const model = String(formData.model || getTechnicalValue(technicalValues, 'Modelo') || '').trim();
    const line = String(formData.line || getTechnicalValue(technicalValues, 'Linha') || '').trim();
    const modelOrLine = String(
      getTechnicalValue(technicalValues, 'Modelo/Linha') ||
      getTechnicalValue(technicalValues, 'Modelo / Linha') || line || model
    );
    const missing: string[] = [];
    if (String(formData.name || '').trim().length < 2) missing.push('Nome do produto');
    if (!brand) missing.push('Marca');
    if (!model && !line && !modelOrLine) missing.push('Modelo');
    getMissingRequiredCharacteristics({
      ...technicalValues,
      ...(brand ? { Marca: brand } : {}),
      ...(model ? { Modelo: model } : {}),
      Cor: 'NaoAplicaParaDescricao',
    }).forEach((field) => {
      if (field.trim().toLocaleLowerCase('pt-BR') !== 'cor' && !missing.includes(field)) missing.push(field);
    });
    if (missing.length) {
      Alert.alert('Dados incompletos', `Preencha antes de gerar: ${missing.join(', ')}.`);
      return;
    }

    await aiForm.validateAndRun({
      title: formData.name || '',
      currentDescription: formData.description || '',
      brand,
      line,
      model,
      modelOrLine,
      material: String(formData.material || getTechnicalValue(technicalValues, 'Material') || getTechnicalValue(technicalValues, 'Estrutura') || ''),
      width: parseLocalizedNumber(formData.width ?? getTechnicalValue(technicalValues, 'Largura')),
      height: parseLocalizedNumber(formData.height ?? getTechnicalValue(technicalValues, 'Altura')),
      depth: parseLocalizedNumber(formData.depth ?? getTechnicalValue(technicalValues, 'Profundidade')),
      weight: parseLocalizedNumber(formData.weight ?? getTechnicalValue(technicalValues, 'Peso')),
      technicalValues,
    }, async (values) => {
      setIsGenerating(true);
      try {
        const description = await improveMobileProductDescription(values);
        setFormData((previous) => ({ ...previous, description }));
      } catch (error) {
        Alert.alert('Não foi possível gerar', error instanceof Error ? error.message : 'Tente novamente.');
      } finally {
        setIsGenerating(false);
      }
    }, (errors) => {
      Alert.alert('Dados incompletos', Object.values(flattenFormErrors(errors))[0] || 'Revise os dados do produto.');
    });
  };

  return (
  <View style={styles.container}>
    <View style={styles.heading}>
      <View style={styles.headingRow}>
        <Text style={[styles.title, dark && styles.lightText]}>DESCRIÇÃO DO PRODUTO</Text>
        <TouchableOpacity
          onPress={handleGenerateDescription}
          disabled={isGenerating}
          style={[styles.aiButton, isGenerating && styles.aiButtonDisabled]}
          accessibilityRole="button"
          accessibilityLabel="Gerar descrição com IA a partir das características"
        >
          {isGenerating ? <ActivityIndicator size="small" color="#ffffff" /> : <Sparkles size={15} color="#ffffff" />}
          <Text style={styles.aiButtonText}>{isGenerating ? 'Gerando' : 'Gerar com IA'}</Text>
        </TouchableOpacity>
      </View>
      <Text style={[styles.helper, dark && styles.dimText]}>
        Descreva o produto, seus diferenciais e informações importantes para o catálogo.
      </Text>
    </View>
    <TextInput
      value={formData.description || ''}
      onFocus={() => onFieldFocus?.('description')}
      onBlur={() => onFieldBlur?.('description')}
      onChangeText={(value) => setFormData((previous) => ({ ...previous, description: value }))}
      editable={!isGenerating}
      placeholder="Descreva o produto..."
      placeholderTextColor="#94a3b8"
      multiline
      textAlignVertical="top"
      style={[styles.input, dark && styles.darkInput, dark && styles.lightText]}
      accessibilityLabel="Descrição detalhada do produto"
    />
  </View>
  );
};

const styles = StyleSheet.create({
  container: { gap: 12 },
  heading: { gap: 6 },
  headingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  aiButton: { minHeight: 36, paddingHorizontal: 12, borderRadius: 10, backgroundColor: '#d97706', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  aiButtonDisabled: { opacity: 0.65 },
  aiButtonText: { color: '#ffffff', fontSize: 11, fontWeight: '800' },
  title: { fontSize: 12, fontWeight: '900', letterSpacing: 1, color: '#334155' },
  helper: {
    flex: 1,
    minWidth: 0,
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 18,
    color: '#94a3b8',
  },
  lightText: { color: '#f8fafc' },
  dimText: { color: '#94a3b8' },
  input: {
    minHeight: 360,
    backgroundColor: 'transparent',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
    color: '#0f172a',
  },
  darkInput: { borderColor: '#334155' },
});
