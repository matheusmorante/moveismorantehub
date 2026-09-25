import { useState, useEffect, useCallback, useMemo } from 'react';
import { Alert } from 'react-native';
import {
  fetchMobileEnvironments,
  fetchMobileCategories,
  fetchMobileCategoryProductCounts,
  deleteMobileEnvironment,
  deleteMobileCategory,
  unlinkMobileCategoryFromEnvironment,
} from '../../services/mobileCategoryService';
import {
  EnvironmentNode,
  CategoryNode,
  ActiveViewType,
  CategoryFilterType,
} from '../types/mobileCategory.types';
import { getOrphanCategories } from '../domain/categoryEnvironmentRules';
import { useCategoryFormModal } from './useCategoryFormModal';

export function useMobileCategoriesAndEnvironments(onDataChanged?: () => void) {
  const [environments, setEnvironments] = useState<EnvironmentNode[]>([]);
  const [categories, setCategories] = useState<CategoryNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Visualização e Filtros
  const [activeView, setActiveView] = useState<ActiveViewType>('ambiente');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilterType>('todas');
  const [searchTerm, setSearchTerm] = useState('');

  const loadData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);

    try {
      const [envs, cats, prodCounts] = await Promise.all([
        fetchMobileEnvironments(),
        fetchMobileCategories(),
        fetchMobileCategoryProductCounts(),
      ]);

      const categoriesWithCounts: CategoryNode[] = (cats || []).map(c => ({
        id: String(c.id),
        name: c.name,
        slug: c.slug,
        parents: c.parents || [],
        productCount: prodCounts[c.id] || 0,
      }));

      const environmentsWithCounts: EnvironmentNode[] = (envs || []).map(e => ({
        id: String(e.id),
        name: e.name,
        slug: e.slug,
        categories: e.categoryIds || [],
        categoryCount: e.categoryIds?.length || 0,
      }));

      setEnvironments(environmentsWithCounts);
      setCategories(categoriesWithCounts);
    } catch (err: any) {
      console.warn('[useMobileCategoriesAndEnvironments] Erro ao carregar:', err);
      Alert.alert('Erro ao carregar', 'Não foi possível carregar as categorias e ambientes.');
    } finally {
      if (!silent) setLoading(false);
      else setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleDataChanged = useCallback(async () => {
    await loadData(true);
    onDataChanged?.();
  }, [loadData, onDataChanged]);

  const modalForm = useCategoryFormModal({
    environments,
    categories,
    onSuccess: handleDataChanged,
  });

  const handleDelete = useCallback(
    (id: string, isEnv: boolean, name: string) => {
      const itemLabel = isEnv ? 'este ambiente' : 'esta categoria';
      Alert.alert('Confirmar exclusão', `Deseja realmente excluir ${itemLabel} "${name}"?`, [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              if (isEnv) {
                await deleteMobileEnvironment(id);
              } else {
                await deleteMobileCategory(id);
              }
              await handleDataChanged();
            } catch (err: any) {
              Alert.alert('Exclusão bloqueada', err?.message || 'Não foi possível excluir.');
            }
          },
        },
      ]);
    },
    [handleDataChanged]
  );

  const handleUnlink = useCallback(
    (envId: string, catId: string, catName: string, envName: string) => {
      Alert.alert(
        'Desvincular categoria',
        `Desvincular "${catName}" de "${envName}"? (A categoria continuará existindo)`,
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Desvincular',
            onPress: async () => {
              try {
                await unlinkMobileCategoryFromEnvironment(envId, catId);
                await handleDataChanged();
              } catch (err: any) {
                Alert.alert('Erro ao desvincular', err?.message || 'Tente novamente.');
              }
            },
          },
        ]
      );
    },
    [handleDataChanged]
  );

  const handleViewOrphans = useCallback(() => {
    setActiveView('categoria');
    setCategoryFilter('sem_ambiente');
  }, []);

  const totalEnvironments = environments.length;
  const totalCategories = categories.length;
  const totalOrphans = useMemo(() => {
    return getOrphanCategories(categories).length;
  }, [categories]);

  return {
    environments,
    categories,
    loading,
    refreshing,
    ...modalForm,
    handleDelete,
    handleUnlink,
    activeView,
    setActiveView,
    categoryFilter,
    setCategoryFilter,
    searchTerm,
    setSearchTerm,
    handleViewOrphans,
    totalEnvironments,
    totalCategories,
    totalOrphans,
    refresh: () => loadData(true),
  };
}
