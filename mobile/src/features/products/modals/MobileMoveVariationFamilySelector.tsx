import type React from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import { FormTextInput } from '../../../components/shared/FormTextInput';
import type { MobileVariationFamily } from '../services/mobileProductVariationActionsService';
import { styles } from './mobileMoveVariationModal.styles';

interface Props {
  dark: boolean;
  familyQuery: string;
  familiesLoading: boolean;
  queryError: string;
  saving: boolean;
  mutationBlocked: boolean;
  targetFamilyId: string;
  showSuggestions: boolean;
  suggestions: MobileVariationFamily[];
  familyName: (family: MobileVariationFamily) => string;
  onQueryChange: (value: string) => void;
  onFocus: () => void;
  onRetry: () => void;
  onSelectFamily: (family: MobileVariationFamily) => void;
}

export const MobileMoveVariationFamilySelector: React.FC<Props> = ({
  dark,
  familyQuery,
  familiesLoading,
  queryError,
  saving,
  mutationBlocked,
  targetFamilyId,
  showSuggestions,
  suggestions,
  familyName,
  onQueryChange,
  onFocus,
  onRetry,
  onSelectFamily,
}) => (
  <View>
    <Text style={[styles.label, dark && styles.textDark]}>Novo produto pai</Text>
    <FormTextInput
      value={familyQuery}
      onChangeText={onQueryChange}
      onFocus={onFocus}
      editable={!familiesLoading && !queryError && !saving && !mutationBlocked}
      placeholder="Nome ou código (mín. 3 caracteres)"
      placeholderTextColor={dark ? '#94a3b8' : '#94a3b8'}
      style={[
        styles.input,
        dark && styles.inputDark,
        targetFamilyId && styles.inputSelected,
      ]}
      autoCorrect={false}
      accessibilityLabel="Pesquisar produto pai de destino"
    />
    {familiesLoading ? (
      <View style={styles.queryStatus}>
        <ActivityIndicator color="#4f46e5" />
        <Text style={[styles.hint, dark && styles.subtitleDark]}>
          Carregando produtos de destino e confirmando o produto de origem…
        </Text>
      </View>
    ) : null}
    {queryError ? (
      <View style={styles.conflict}>
        <Text style={styles.conflictTitle}>Não foi possível preparar a mudança</Text>
        <Text style={styles.conflictText}>{queryError}</Text>
        <TouchableOpacity
          onPress={onRetry}
          disabled={familiesLoading || saving}
          style={styles.retryButton}
          accessibilityRole="button"
          accessibilityLabel="Consultar novamente os produtos de destino e a origem"
        >
          <Text style={styles.retryText}>Consultar novamente</Text>
        </TouchableOpacity>
      </View>
    ) : null}
    {showSuggestions && !targetFamilyId && familyQuery.trim().length >= 3 ? (
      <View style={[styles.suggestions, dark && styles.suggestionsDark]}>
        {suggestions.length ? (
          suggestions.map((family) => (
            <TouchableOpacity
              key={family.id}
              style={[styles.suggestion, dark && styles.borderDark]}
              disabled={mutationBlocked}
              onPress={() => onSelectFamily(family)}
              accessibilityRole="button"
            >
              <Text
                style={[styles.suggestionName, dark && styles.textDark]}
                numberOfLines={2}
              >
                {familyName(family) || 'Produto sem nome'}
              </Text>
              <Text style={styles.suggestionCode}>
                Código: {family.code || 'não informado'}
              </Text>
            </TouchableOpacity>
          ))
        ) : (
          <Text style={styles.emptySuggestion}>Nenhum produto pai encontrado.</Text>
        )}
      </View>
    ) : null}
  </View>
);
