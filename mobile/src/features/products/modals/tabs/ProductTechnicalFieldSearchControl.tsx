import { PlusCircle, Search } from 'lucide-react-native';
import type React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { FormTextInput } from '../../../../components/shared/FormTextInput';
import { getProductTechnicalFieldDisplayName } from '../../domain/productCharacteristics';
import type { MobileProductTechnicalField } from '../../services/mobileProductTechnicalService';
import { styles } from './productFormTechnicalTab.styles';

interface Props {
  dark: boolean;
  characteristicSearchTerm: string;
  onSearchTermChange: (value: string) => void;
  normalizedSearchTerm: string;
  normalizedDebouncedSearchTerm: string;
  matchingOptionalFields: MobileProductTechnicalField[];
  isPersistedGroupNameSearch: boolean;
  onAddSearchResultField: (field: MobileProductTechnicalField) => void;
}

export const ProductTechnicalFieldSearchControl: React.FC<Props> = ({
  dark,
  characteristicSearchTerm,
  onSearchTermChange,
  normalizedSearchTerm,
  normalizedDebouncedSearchTerm,
  matchingOptionalFields,
  isPersistedGroupNameSearch,
  onAddSearchResultField,
}) => (
  <View style={styles.searchControl}>
    <Text style={[styles.searchLabel, dark && styles.dimText]}>Pesquisar característica</Text>
    <View style={[styles.searchInputWrap, dark && styles.darkInput]}>
      <Search size={16} color={dark ? '#94a3b8' : '#64748b'} />
      <FormTextInput
        value={characteristicSearchTerm}
        onChangeText={onSearchTermChange}
        placeholder="Digite pelo menos 3 caracteres"
        placeholderTextColor="#94a3b8"
        accessibilityLabel="Pesquisar característica técnica"
        returnKeyType="search"
        style={[styles.searchInput, dark && styles.lightText]}
      />
    </View>
    <Text style={[styles.searchHint, dark && styles.dimText]} accessibilityLiveRegion="polite">
      {normalizedSearchTerm.length < 3
        ? 'Digite pelo menos 3 caracteres para pesquisar.'
        : normalizedSearchTerm !== normalizedDebouncedSearchTerm
          ? 'Buscando características...'
          : matchingOptionalFields.length === 0
            ? 'Nenhuma característica encontrada.'
            : isPersistedGroupNameSearch
              ? 'Exibindo as características disponíveis do grupo.'
              : 'Exibindo características correspondentes.'}
    </Text>
    {matchingOptionalFields.length > 0 && (
      <View style={[styles.searchResults, dark && styles.darkCard]}>
        {matchingOptionalFields.map((field) => (
          <TouchableOpacity
            key={field.id}
            onPress={() => onAddSearchResultField(field)}
            accessibilityRole="button"
            accessibilityLabel={`Adicionar característica ${getProductTechnicalFieldDisplayName(field.name)}`}
            style={[styles.searchResultRow, dark && styles.darkOptionRow]}
          >
            <View style={styles.searchResultCopy}>
              <Text style={[styles.searchResultName, dark && styles.lightText]}>
                {getProductTechnicalFieldDisplayName(field.name)}{field.unit ? ` (${field.unit})` : ''}
              </Text>
              {field.groupName ? (
                <Text style={[styles.searchResultGroup, dark && styles.dimText]}>
                  {field.groupName}
                </Text>
              ) : null}
            </View>
            <View style={styles.searchResultAction}>
              <PlusCircle size={14} color="#2563eb" />
              <Text style={styles.searchResultActionText}>Adicionar</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    )}
  </View>
);
