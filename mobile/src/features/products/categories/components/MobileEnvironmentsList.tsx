import React, { useState, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Alert,
} from 'react-native';
import {
  ChevronDown,
  ChevronRight,
  Edit2,
  Trash2,
  X,
  Plus,
  Inbox,
} from 'lucide-react-native';
import { EnvironmentNode, CategoryNode } from '../types/mobileCategory.types';

interface Props {
  dark: boolean;
  environments: EnvironmentNode[];
  categories: CategoryNode[];
  onEditEnvironment: (env: EnvironmentNode) => void;
  onDeleteEnvironment: (id: string, isEnv: boolean, name: string) => void;
  onEditCategory: (cat: CategoryNode) => void;
  onUnlinkCategory: (envId: string, catId: string, catName: string, envName: string) => void;
  onLinkCategoryToEnvironment: (envId: string) => void;
  searchTerm: string;
}

export const MobileEnvironmentsList: React.FC<Props> = ({
  dark,
  environments,
  categories,
  onEditEnvironment,
  onDeleteEnvironment,
  onEditCategory,
  onUnlinkCategory,
  onLinkCategoryToEnvironment,
  searchTerm,
}) => {
  const [collapsedMap, setCollapsedMap] = useState<Record<string, boolean>>({});

  const toggleExpand = (id: string) => {
    setCollapsedMap(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const filteredEnvironments = useMemo(() => {
    if (!searchTerm.trim()) return environments;
    const norm = searchTerm.toLowerCase();
    return environments.filter(env => {
      if (env.name.toLowerCase().includes(norm)) return true;
      const envCats = categories.filter(c => env.categories?.includes(c.id));
      return envCats.some(c => c.name.toLowerCase().includes(norm));
    });
  }, [environments, categories, searchTerm]);

  return (
    <View style={styles.container}>
      {filteredEnvironments.map(env => {
        const isExpanded = !collapsedMap[env.id];
        const envCategories = categories.filter(c => env.categories?.includes(c.id));
        const count = envCategories.length;
        const canDelete = count === 0;

        const handleDeletePress = () => {
          if (!canDelete) {
            Alert.alert(
              'Exclusão bloqueada',
              `Não é possível excluir este ambiente porque ele possui ${count} categoria(s) vinculada(s). Desvincule as categorias antes de excluir.`
            );
            return;
          }
          onDeleteEnvironment(env.id, true, env.name);
        };

        return (
          <View key={env.id} style={[styles.card, dark && styles.cardDark]}>
            {/* Cabeçalho do Card */}
            <View style={styles.cardHeader}>
              <TouchableOpacity
                onPress={() => toggleExpand(env.id)}
                style={styles.cardTitleArea}
                activeOpacity={0.7}
              >
                {isExpanded ? (
                  <ChevronDown size={16} color={dark ? '#94a3b8' : '#64748b'} />
                ) : (
                  <ChevronRight size={16} color={dark ? '#94a3b8' : '#64748b'} />
                )}
                <Text style={[styles.cardTitle, dark && styles.textLight]} numberOfLines={1}>
                  {env.name}
                </Text>
                <View style={[styles.badge, dark && styles.badgeDark]}>
                  <Text style={[styles.badgeText, dark && styles.badgeTextDark]}>
                    {count} {count === 1 ? 'categoria' : 'categorias'}
                  </Text>
                </View>
              </TouchableOpacity>

              <View style={styles.headerActions}>
                <TouchableOpacity
                  onPress={() => onEditEnvironment(env)}
                  style={[styles.iconButton, styles.editButton, dark && styles.editButtonDark]}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  accessibilityRole="button"
                  accessibilityLabel={`Editar ambiente ${env.name}`}
                >
                  <Edit2 size={13} color="#2563eb" />
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleDeletePress}
                  style={[
                    styles.iconButton,
                    styles.deleteButton,
                    dark && styles.deleteButtonDark,
                    !canDelete && styles.disabledButton,
                  ]}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  accessibilityRole="button"
                  accessibilityLabel={`Excluir ambiente ${env.name}`}
                >
                  <Trash2 size={13} color={canDelete ? '#ef4444' : '#94a3b8'} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Conteúdo Expandido: Chips de Categorias e Botão de Vincular */}
            {isExpanded && (
              <View style={[styles.cardBody, dark && styles.cardBodyDark]}>
                <View style={styles.chipsContainer}>
                  {envCategories.map(cat => (
                    <View key={cat.id} style={[styles.chip, dark && styles.chipDark]}>
                      <TouchableOpacity onPress={() => onEditCategory(cat)} activeOpacity={0.7}>
                        <Text style={[styles.chipText, dark && styles.chipTextDark]} numberOfLines={1}>
                          {cat.name}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => onUnlinkCategory(env.id, cat.id, cat.name, env.name)}
                        style={styles.chipRemove}
                        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                      >
                        <X size={11} color={dark ? '#cbd5e1' : '#64748b'} />
                      </TouchableOpacity>
                    </View>
                  ))}

                  <TouchableOpacity
                    onPress={() => onLinkCategoryToEnvironment(env.id)}
                    style={[styles.linkChip, dark && styles.linkChipDark]}
                    activeOpacity={0.7}
                  >
                    <Plus size={11} color="#059669" />
                    <Text style={styles.linkChipText}>Vincular categoria</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        );
      })}

      {filteredEnvironments.length === 0 && (
        <View style={[styles.emptyBox, dark && styles.emptyBoxDark]}>
          <Inbox size={32} color={dark ? '#475569' : '#cbd5e1'} />
          <Text style={[styles.emptyTitle, dark && styles.textLight]}>
            {searchTerm.trim() ? 'Nenhum ambiente encontrado' : 'Nenhum ambiente cadastrado'}
          </Text>
          <Text style={styles.emptySubtitle}>
            {searchTerm.trim()
              ? 'Tente buscar com outro termo ou limpe a busca.'
              : 'Toque no botão "Ambiente" no topo para criar o primeiro.'}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
  },
  cardDark: {
    backgroundColor: '#1e293b',
    borderColor: '#334155',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  cardTitleArea: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
    marginRight: 8,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
    textTransform: 'uppercase',
  },
  textLight: {
    color: '#f8fafc',
  },
  badge: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  badgeDark: {
    backgroundColor: '#0f172a',
    borderColor: '#334155',
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#475569',
  },
  badgeTextDark: {
    color: '#cbd5e1',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  iconButton: {
    width: 28,
    height: 28,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  editButton: {
    backgroundColor: '#eff6ff',
    borderColor: '#bfdbfe',
  },
  editButtonDark: {
    backgroundColor: 'rgba(37, 99, 235, 0.15)',
    borderColor: 'rgba(37, 99, 235, 0.4)',
  },
  deleteButton: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
  },
  deleteButtonDark: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderColor: 'rgba(239, 68, 68, 0.4)',
  },
  disabledButton: {
    opacity: 0.4,
    backgroundColor: '#f8fafc',
    borderColor: '#e2e8f0',
  },
  cardBody: {
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#fafafa',
  },
  cardBodyDark: {
    borderTopColor: '#334155',
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    alignItems: 'center',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  chipDark: {
    backgroundColor: '#1e293b',
    borderColor: '#475569',
  },
  chipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
    textTransform: 'uppercase',
  },
  chipTextDark: {
    color: '#e2e8f0',
  },
  chipRemove: {
    padding: 2,
  },
  linkChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#a7f3d0',
    borderStyle: 'dashed',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  linkChipDark: {
    backgroundColor: 'rgba(5, 150, 105, 0.12)',
    borderColor: 'rgba(5, 150, 105, 0.35)',
  },
  linkChipText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#059669',
  },
  emptyBox: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingVertical: 32,
    paddingHorizontal: 16,
    gap: 6,
  },
  emptyBoxDark: {
    backgroundColor: '#1e293b',
    borderColor: '#334155',
  },
  emptyTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
    marginTop: 4,
  },
  emptySubtitle: {
    fontSize: 11,
    color: '#64748b',
    textAlign: 'center',
  },
});
