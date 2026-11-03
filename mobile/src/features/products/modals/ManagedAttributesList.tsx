import { ChevronDown, ChevronRight, Plus, Tag, Trash2, X } from 'lucide-react-native';
import type { Dispatch, SetStateAction } from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import { FormTextInput } from '../../../components/shared/FormTextInput';
import { matchesSearchText } from '../../../../../shared-utils/searchText';
import type { MobileAttribute } from '../services/mobileAttributeService';
import { styles } from './attributesManagerModal.styles';

interface Props {
  attributes: MobileAttribute[];
  dark: boolean;
  expandedId: string | null;
  handleAddValue: (attributeId: string) => Promise<void>;
  handleDeleteAttr: (id: string, name: string) => void;
  handleDeleteValue: (attribute: MobileAttribute, valueId: string, value: string) => void;
  load: () => Promise<void>;
  loadError: string | null;
  loading: boolean;
  newValText: string;
  savingValueId: string | null;
  searchTerm: string;
  setExpandedId: Dispatch<SetStateAction<string | null>>;
  setNewValText: Dispatch<SetStateAction<string>>;
}

export const ManagedAttributesList = ({
  attributes,
  dark,
  expandedId,
  handleAddValue,
  handleDeleteAttr,
  handleDeleteValue,
  load,
  loadError,
  loading,
  newValText,
  savingValueId,
  searchTerm,
  setExpandedId,
  setNewValText,
}: Props) =>
  loading ? (
    <ActivityIndicator size="small" color="#7c3aed" style={{ marginVertical: 20 }} />
  ) : loadError ? (
    <View style={styles.errorBox}>
      <Text style={styles.errorText}>{loadError}</Text>
      <TouchableOpacity onPress={() => void load()}>
        <Text style={styles.retryText}>Tentar novamente</Text>
      </TouchableOpacity>
    </View>
  ) : (
    <View style={styles.list}>
      {attributes.filter((attr) => matchesSearchText(attr.name, searchTerm)).length === 0 ? (
        <Text style={styles.emptyText}>Nenhuma característica cadastrada</Text>
      ) : (
        attributes
          .filter((attr) => matchesSearchText(attr.name, searchTerm))
          .map((attr) => {
            const isExp = expandedId === attr.id;
            return (
              <View key={attr.id} style={[styles.attrCard, dark && styles.darkItem]}>
                <TouchableOpacity
                  onPress={() => setExpandedId(isExp ? null : attr.id)}
                  style={styles.attrHeader}
                >
                  <View style={styles.attrTitleRow}>
                    {isExp ? (
                      <ChevronDown size={16} color="#7c3aed" />
                    ) : (
                      <ChevronRight size={16} color="#94a3b8" />
                    )}
                    <Text style={[styles.attrName, dark && styles.light]}>{attr.name}</Text>
                    <Text style={styles.valCount}>
                      ({attr.options.length} opções · {attr.dataType || 'text_short'}
                      {attr.active === false ? ' · inativa' : ''})
                    </Text>
                  </View>
                  <View style={styles.attrActions}>
                    <TouchableOpacity
                      onPress={() => handleDeleteAttr(attr.id, attr.name)}
                      style={styles.trashBtn}
                    >
                      <Trash2 size={15} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>

                {isExp && (
                  <View style={styles.valuesArea}>
                    <View style={styles.valuesList}>
                      {attr.options.map((opt) => (
                        <View
                          key={opt.id}
                          style={[styles.valBadge, dark && styles.darkBadge]}
                        >
                          <Tag size={10} color="#7c3aed" />
                          <Text style={[styles.valText, dark && styles.light]}>{opt.value}</Text>
                          <TouchableOpacity
                            onPress={() => handleDeleteValue(attr, opt.id, opt.value)}
                            style={styles.valueRemoveButton}
                            accessibilityRole="button"
                            accessibilityLabel={`Remover valor ${opt.value}`}
                          >
                            <X size={12} color="#ef4444" />
                          </TouchableOpacity>
                        </View>
                      ))}
                    </View>
                    <View style={styles.addValRow}>
                      <FormTextInput
                        value={newValText}
                        onChangeText={setNewValText}
                        placeholder={`Adicionar valor para ${attr.name}...`}
                        placeholderTextColor="#94a3b8"
                        style={[
                          styles.valInput,
                          dark && styles.darkInput,
                          dark && styles.light,
                        ]}
                      />
                      <TouchableOpacity
                        onPress={() => handleAddValue(attr.id)}
                        disabled={savingValueId === attr.id}
                        style={[
                          styles.addValBtn,
                          savingValueId === attr.id && styles.disabledControl,
                        ]}
                        accessibilityLabel={`Adicionar valor para ${attr.name}`}
                      >
                        {savingValueId === attr.id ? (
                          <ActivityIndicator size="small" color="#ffffff" />
                        ) : (
                          <Plus size={14} color="#ffffff" />
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>
            );
          })
      )}
    </View>
  );
