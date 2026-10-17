import React from 'react';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import type { Composition } from '../types/composition.type';

interface ThemeColors {
  bg: string;
  surface: string;
  border: string;
  text: string;
  textMuted: string;
  primary: string;
  danger: string;
}

interface CompositionInfoTabProps {
  formData: Partial<Composition>;
  setFormData: React.Dispatch<React.SetStateAction<Partial<Composition>>>;
  manualPriceInput: string;
  setManualPriceInput: (val: string) => void;
  themeColors: ThemeColors;
}

export const CompositionInfoTab: React.FC<CompositionInfoTabProps> = ({
  formData,
  setFormData,
  manualPriceInput,
  setManualPriceInput,
  themeColors,
}) => {
  return (
    <View style={{ padding: 16 }}>
      <Text style={{ color: themeColors.text, fontWeight: 'bold', marginBottom: 8, fontSize: 16 }}>
        Informações Básicas
      </Text>

      <Text style={{ color: themeColors.textMuted, fontSize: 12, marginBottom: 4, marginTop: 8 }}>
        Nome da Composição *
      </Text>
      <TextInput
        style={{
          backgroundColor: themeColors.surface,
          color: themeColors.text,
          padding: 12,
          borderRadius: 8,
          borderWidth: 1,
          borderColor: themeColors.border,
        }}
        placeholder="Ex: Cozinha Compacta Paris"
        placeholderTextColor={themeColors.textMuted}
        value={formData.name || ''}
        onChangeText={(text) => setFormData({ ...formData, name: text })}
      />

      <Text style={{ color: themeColors.textMuted, fontSize: 12, marginBottom: 4, marginTop: 16 }}>
        SKU Base
      </Text>
      <TextInput
        style={{
          backgroundColor: themeColors.surface,
          color: themeColors.text,
          padding: 12,
          borderRadius: 8,
          borderWidth: 1,
          borderColor: themeColors.border,
        }}
        placeholder="Ex: CMP-COZ-PARIS"
        placeholderTextColor={themeColors.textMuted}
        value={formData.sku || ''}
        onChangeText={(text) => setFormData({ ...formData, sku: text })}
      />

      <Text style={{ color: themeColors.textMuted, fontSize: 12, marginBottom: 4, marginTop: 16 }}>
        Modo de Precificação
      </Text>
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
        <TouchableOpacity
          onPress={() => setFormData({ ...formData, pricing_mode: 'sum' })}
          style={{
            flex: 1,
            padding: 12,
            borderRadius: 8,
            borderWidth: 1,
            borderColor: formData.pricing_mode === 'sum' ? themeColors.primary : themeColors.border,
            backgroundColor:
              formData.pricing_mode === 'sum' ? `${themeColors.primary}20` : themeColors.surface,
            alignItems: 'center',
          }}
        >
          <Text
            style={{
              color: formData.pricing_mode === 'sum' ? themeColors.primary : themeColors.text,
              fontSize: 12,
              fontWeight: 'bold',
            }}
          >
            Automático (Soma)
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setFormData({ ...formData, pricing_mode: 'fixed' })}
          style={{
            flex: 1,
            padding: 12,
            borderRadius: 8,
            borderWidth: 1,
            borderColor:
              formData.pricing_mode === 'fixed' ? themeColors.primary : themeColors.border,
            backgroundColor:
              formData.pricing_mode === 'fixed' ? `${themeColors.primary}20` : themeColors.surface,
            alignItems: 'center',
          }}
        >
          <Text
            style={{
              color: formData.pricing_mode === 'fixed' ? themeColors.primary : themeColors.text,
              fontSize: 12,
              fontWeight: 'bold',
            }}
          >
            Fixo Manual
          </Text>
        </TouchableOpacity>
      </View>

      {formData.pricing_mode === 'fixed' && (
        <>
          <Text style={{ color: themeColors.textMuted, fontSize: 12, marginBottom: 4 }}>
            Preço Fixo de Venda
          </Text>
          <TextInput
            style={{
              backgroundColor: themeColors.surface,
              color: themeColors.text,
              padding: 12,
              borderRadius: 8,
              borderWidth: 1,
              borderColor: themeColors.border,
            }}
            placeholder="R$ 0,00"
            keyboardType="numeric"
            placeholderTextColor={themeColors.textMuted}
            value={manualPriceInput}
            onChangeText={setManualPriceInput}
          />
        </>
      )}
    </View>
  );
};
