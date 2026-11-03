import type React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { FormTextInput } from '../../../../components/shared/FormTextInput';
import { styles } from './productFormVariationsTab.styles';

interface Props {
  variation: any;
  parentPrefix: string;
  dark: boolean;
  onDifferentTitleModeChange: (enabled: boolean) => void;
  onVariationNameChange: (name: string) => void;
  onCatalogTitleChange: (title: string) => void;
}

export const ProductVariationIdentificationTab: React.FC<Props> = ({
  variation,
  parentPrefix,
  dark,
  onDifferentTitleModeChange,
  onVariationNameChange,
  onCatalogTitleChange,
}) => {
  const hasDistinctTitle = Boolean(
    variation.differentiateTitle ||
      (variation.title && variation.title !== variation.name) ||
      (variation.marketplaceTitle && variation.marketplaceTitle !== variation.name)
  );
  const currentName = String(variation.name || '');
  const suffix = currentName
    .toLocaleLowerCase('pt-BR')
    .startsWith(parentPrefix.toLocaleLowerCase('pt-BR'))
    ? currentName.slice(parentPrefix.length).replace(/^[\s\-_:]+/, '')
    : currentName;

  return (
    <View style={styles.tabContent}>
      <View style={styles.cardHeader}>
        <Text style={[styles.sectionTitle, dark && styles.lightText]}>Identificação</Text>
        <Text style={[styles.varSku, dark && styles.lightText]}>{variation.sku}</Text>
      </View>
      <View style={styles.cardHeader}>
        <Text style={[styles.label, dark && styles.dimText]}>
          Nome <Text style={{ color: '#ef4444' }}>*</Text>
        </Text>
        <TouchableOpacity
          onPress={() => onDifferentTitleModeChange(!hasDistinctTitle)}
          style={[styles.titleToggle, hasDistinctTitle && styles.distinctTitleToggle]}
          accessibilityRole="switch"
          accessibilityState={{ checked: hasDistinctTitle }}
        >
          <Text style={styles.titleToggleText}>
            {hasDistinctTitle
              ? 'Usando título diferente'
              : 'Diferenciar título no catálogo'}
          </Text>
        </TouchableOpacity>
      </View>
      <View style={[styles.nameInputRow, dark && styles.darkInput]}>
        <Text style={[styles.parentName, dark && styles.dimText]} numberOfLines={1}>
          {parentPrefix}
        </Text>
        <FormTextInput
          value={suffix}
          onChangeText={(value) =>
            onVariationNameChange(
              value.trimStart() ? `${parentPrefix} ${value.trimStart()}` : parentPrefix
            )
          }
          placeholder="Complemento da variação"
          placeholderTextColor="#94a3b8"
          style={[styles.nameSuffixInput, dark && styles.lightText]}
          accessibilityLabel="Sufixo do nome da variação"
        />
      </View>
      {hasDistinctTitle && (
        <View>
          <Text style={[styles.label, dark && styles.dimText]}>Título no Catálogo</Text>
          <FormTextInput
            value={String(variation.title || variation.marketplaceTitle || '')}
            onChangeText={onCatalogTitleChange}
            placeholder="Título exibido no catálogo digital"
            placeholderTextColor="#94a3b8"
            style={[styles.catalogTitleInput, dark && styles.darkInput, dark && styles.lightText]}
            accessibilityLabel="Título da variação no catálogo"
          />
        </View>
      )}
    </View>
  );
};
