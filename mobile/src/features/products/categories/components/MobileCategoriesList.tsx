import React, { useMemo } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Alert,
} from 'react-native';
import {
  Edit2,
  Trash2,
  Package,
  Layers,
  Inbox,
  AlertTriangle,
} from 'lucide-react-native';
import { CategoryNode, EnvironmentNode, CategoryFilterType } from '../types/mobileCategory.types';
import { filterCategories, getOrphanCategories } from '../domain/categoryEnvironmentRules';

interface Props {
  dark: boolean;
  categories: CategoryNode[];
  environments: EnvironmentNode[];
  filterType: CategoryFilterType;
  onFilterChange: (filter: CategoryFilterType) => void;
  onEditCategory: (cat: CategoryNode) => void;
  onDeleteCategory: (id: string, isEnv: boolean, name: string) => void;
  searchTerm: string;
}

export const MobileCategoriesList: React.FC<Props> = ({
  dark,
  categories,
  environments,
  filterType,
  onFilterChange,
  onEditCategory,
  onDeleteCategory,
  searchTerm,
}) => {
  const counts = useMemo(() => {
    const total = categories.length;
    const semAmbiente = getOrphanCategories(categories).length;
    const comAmbiente = total - semAmbiente;
    return { total, comAmbiente, semAmbiente };
  }, [categories]);

  const filteredCategories = useMemo(() => {
    return filterCategories(categories, filterType, searchTerm);
  }, [categories, filterType, searchTerm]);

  return (
    <View style={styles.container}>
      {/* Filtros Rápidos Segmentados */}
      <View style={[styles.filtersRow, dark && styles.filtersRowDark]}>
        <TouchableOpacity
          style={[styles.filterChip, filterType === 'todas' && styles.filterChipActive, filterType === 'todas' && dark && styles.filterChipActiveDark]}
          onPress={() => onFilterChange('todas')}
        >
          <Text style={[styles.filterChipText, dark && styles.textMuted, filterType === 'todas' && styles.filterChipTextActive]}>
            Todas ({counts.total})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterChip, filterType === 'com_ambiente' && styles.filterChipActive, filterType === 'com_ambiente' && dark && styles.filterChipActiveDark]}
          onPress={() => onFilterChange('com_ambiente')}
        >
          <Text style={[styles.filterChipText, dark && styles.textMuted, filterType === 'com_ambiente' && styles.filterChipTextActive]}>
            Com ambiente ({counts.comAmbiente})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterChip, filterType === 'sem_ambiente' && styles.filterChipActive, filterType === 'sem_ambiente' && dark && styles.filterChipActiveDark]}
          onPress={() => onFilterChange('sem_ambiente')}
        >
          <Text style={[
            styles.filterChipText,
            dark && styles.textMuted,
            filterType === 'sem_ambiente' && styles.filterChipTextWarning,
          ]}>
            Sem ambiente ({counts.semAmbiente})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Lista de Cards de Categoria */}
      {filteredCategories.map(cat => {
        const envNames = environments
          .filter(e => e.categories?.includes(cat.id))
          .map(e => e.name);

        const prodCount = cat.productCount || 0;
        const canDelete = prodCount === 0;

        const handleDeletePress = () => {
          if (!canDelete) {
            Alert.alert(
              'Exclusão bloqueada',
              `Não é possível excluir esta categoria porque ela está sendo utilizada por ${prodCount} produto(s). Altere a categoria desses produtos antes de excluí-la.`
            );
            return;
          }
          onDeleteCategory(cat.id, false, cat.name);
        };

        return (
          <View key={cat.id} style={[styles.card, dark && styles.cardDark]}>
            {/* Topo do card: Nome e Ações */}
            <View style={styles.cardTop}>
              <TouchableOpacity
                onPress={() => onEditCategory(cat)}
                style={styles.cardNameArea}
                activeOpacity={0.7}
              >
                <Text style={[styles.categoryName, dark && styles.textLight]} numberOfLines={1}>
                  {cat.name}
                </Text>
              </TouchableOpacity>

              <View style={styles.cardActions}>
                <TouchableOpacity
                  onPress={() => onEditCategory(cat)}
                  style={[styles.iconButton, styles.editButton, dark && styles.editButtonDark]}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  accessibilityRole="button"
                  accessibilityLabel={`Editar categoria ${cat.name}`}
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
                  accessibilityLabel={`Excluir categoria ${cat.name}`}
                >
                  <Trash2 size={13} color={canDelete ? '#ef4444' : '#94a3b8'} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Metadados compactos: Produtos e Ambientes vinculados */}
            <View style={styles.tagsRow}>
              <View style={[styles.productBadge, prodCount > 0 ? styles.productBadgeActive : styles.productBadgeZero, dark && styles.productBadgeDark]}>
                <Package size={11} color={prodCount > 0 ? '#2563eb' : '#059669'} />
                <Text style={[styles.productBadgeText, { color: prodCount > 0 ? '#2563eb' : '#059669' }]}>
                  {prodCount} {prodCount === 1 ? 'produto' : 'produtos'}
                </Text>
              </View>

              {envNames.length > 0 ? (
                envNames.map((envName, idx) => (
                  <View key={idx} style={[styles.envChip, dark && styles.envChipDark]}>
                    <Layers size={10} color={dark ? '#94a3b8' : '#64748b'} />
                    <Text style={[styles.envChipText, dark && styles.envChipTextDark]}>
                      {envName}
                    </Text>
                  </View>
                ))
              ) : (
                <View style={[styles.orphanBadge, dark && styles.orphanBadgeDark]}>
                  <AlertTriangle size={10} color="#d97706" />
                  <Text style={styles.orphanBadgeText}>Sem ambiente vinculado</Text>
                </View>
              )}
            </View>
          </View>
        );
      })}

      {filteredCategories.length === 0 && (
        <View style={[styles.emptyBox, dark && styles.emptyBoxDark]}>
          <Inbox size={32} color={dark ? '#475569' : '#cbd5e1'} />
          <Text style={[styles.emptyTitle, dark && styles.textLight]}>
            Nenhuma categoria encontrada
          </Text>
          <Text style={styles.emptySubtitle}>
            {searchTerm.trim()
              ? 'Tente buscar com outro termo ou alterar o filtro.'
              : 'Toque no botão "Categoria" no topo para criar.'}
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
  filtersRow: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    padding: 3,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  filtersRowDark: {
    backgroundColor: '#1e293b',
    borderColor: '#334155',
  },
  filterChip: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderRadius: 8,
  },
  filterChipActive: {
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  filterChipActiveDark: {
    backgroundColor: '#0f172a',
  },
  filterChipText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#64748b',
    textAlign: 'center',
  },
  filterChipTextActive: {
    color: '#0f172a',
    fontWeight: '800',
  },
  filterChipTextWarning: {
    color: '#d97706',
    fontWeight: '800',
  },
  textMuted: {
    color: '#94a3b8',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 12,
    gap: 8,
  },
  cardDark: {
    backgroundColor: '#1e293b',
    borderColor: '#334155',
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardNameArea: {
    flex: 1,
    marginRight: 8,
  },
  categoryName: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
    textTransform: 'uppercase',
  },
  textLight: {
    color: '#f8fafc',
  },
  cardActions: {
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
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
  },
  productBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 6,
    borderWidth: 1,
  },
  productBadgeActive: {
    backgroundColor: '#eff6ff',
    borderColor: '#bfdbfe',
  },
  productBadgeZero: {
    backgroundColor: '#ecfdf5',
    borderColor: '#a7f3d0',
  },
  productBadgeDark: {
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    borderColor: '#334155',
  },
  productBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  environmentsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
    alignItems: 'center',
  },
  envChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  envChipDark: {
    backgroundColor: '#0f172a',
    borderColor: '#334155',
  },
  envChipText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#475569',
    textTransform: 'uppercase',
  },
  envChipTextDark: {
    color: '#94a3b8',
  },
  orphanBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fde68a',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  orphanBadgeDark: {
    backgroundColor: 'rgba(120, 53, 15, 0.2)',
    borderColor: 'rgba(217, 119, 6, 0.35)',
  },
  orphanBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#d97706',
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
