import { Link2, Unlink } from 'lucide-react-native';
import type React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { FormTextInput } from '../../../../components/shared/FormTextInput';
import { styles } from './productFormVariationsTab.styles';

interface Props {
  dark: boolean;
  syncWithParent: boolean;
  parentDescription: string;
  description: string;
  onToggleSync: () => void;
  onDescriptionChange: (value: string) => void;
}

export const ProductVariationDescriptionTab: React.FC<Props> = ({
  dark,
  syncWithParent,
  parentDescription,
  description,
  onToggleSync,
  onDescriptionChange,
}) => (
  <View style={[styles.card, dark && styles.darkCard]}>
    <View style={styles.cardHeader}>
      <View style={styles.flex1}>
        <Text style={[styles.sectionTitle, dark && styles.lightText]}>
          Descrição da Variação
        </Text>
        <Text style={[styles.helperText, dark && styles.dimText]}>
          {syncWithParent
            ? 'Sincronizada com a descrição do produto pai'
            : 'Descrição própria desta variação'}
        </Text>
      </View>
      <TouchableOpacity
        onPress={onToggleSync}
        style={[styles.inheritButton, syncWithParent && styles.inheritButtonActive]}
        accessibilityRole="switch"
        accessibilityLabel="Sincronizar descrição com o produto pai"
        accessibilityState={{ checked: syncWithParent }}
      >
        {syncWithParent ? (
          <Link2 size={14} color="#ffffff" />
        ) : (
          <Unlink size={14} color="#64748b" />
        )}
        <Text
          style={[
            styles.inheritButtonText,
            syncWithParent && styles.inheritButtonTextActive,
          ]}
        >
          {syncWithParent ? 'Sincronizado' : 'Manual'}
        </Text>
      </TouchableOpacity>
    </View>
    {syncWithParent ? (
      <View
        style={[
          styles.inheritedDescription,
          dark && styles.darkInheritedDescription,
        ]}
      >
        <Text style={[styles.descriptionText, dark && styles.dimText]}>
          {parentDescription}
        </Text>
      </View>
    ) : (
      <FormTextInput
        value={description}
        onChangeText={onDescriptionChange}
        placeholder="Descrição específica desta variação..."
        placeholderTextColor="#94a3b8"
        multiline
        textAlignVertical="top"
        style={[
          styles.descriptionInput,
          dark && styles.darkInput,
          dark && styles.lightText,
        ]}
        accessibilityLabel="Descrição específica da variação"
      />
    )}
  </View>
);
