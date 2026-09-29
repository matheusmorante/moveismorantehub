import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Plus } from 'lucide-react-native';
import {
  fetchStockUnavailabilities,
  undoStockUnavailability,
} from '../../../../services/stock/stockUnavailabilitiesService';
import type {
  StockUnavailability,
  UnavailabilityStatusFilter,
  UnavailabilityProductKindFilter,
} from '../types';
import { UnavailabilityCard } from '../components/UnavailabilityCard';
import { UnavailabilityFilters } from '../components/UnavailabilityFilters';
import { UnavailabilityEmptyState } from '../components/UnavailabilityEmptyState';
import { UnavailabilityFormModal } from '../modals/UnavailabilityFormModal';

interface Props {
  isDarkMode: boolean;
  userProfile?: any;
  renderHeader?: () => React.ReactNode;
}

export const UnavailabilitiesScreen: React.FC<Props> = ({
  isDarkMode,
  userProfile,
  renderHeader,
}) => {
  const [unavailabilities, setUnavailabilities] = useState<StockUnavailability[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<UnavailabilityStatusFilter>('all');
  const [productKindFilter, setProductKindFilter] =
    useState<UnavailabilityProductKindFilter>('all');

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Permissão: admin, manager, stockist
  const userRoles = Array.isArray(userProfile?.roles)
    ? userProfile.roles
    : userProfile?.role
    ? [userProfile.role]
    : [];
  const canManageStock =
    userRoles.includes('administrator') ||
    userRoles.includes('manager') ||
    userRoles.includes('stockist');

  const loadData = useCallback(
    async (page = 1, shouldAppend = false) => {
      if (page === 1) setIsLoading(true);
      try {
        const result = await fetchStockUnavailabilities({
          page,
          status: statusFilter,
          productKind: productKindFilter,
        });

        if (shouldAppend) {
          setUnavailabilities((prev) => [...prev, ...result.data]);
        } else {
          setUnavailabilities(result.data);
        }
        setTotalCount(result.totalCount);
        setCurrentPage(page);
      } catch (error: any) {
        console.error('Erro ao carregar indisponibilidades no mobile:', error);
        Alert.alert('Erro', 'Não foi possível carregar as indisponibilidades.');
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [productKindFilter, statusFilter]
  );

  useEffect(() => {
    void loadData(1, false);
  }, [loadData]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    void loadData(1, false);
  };

  const handleLoadMore = () => {
    if (isLoading || unavailabilities.length >= totalCount) return;
    void loadData(currentPage + 1, true);
  };

  const handleUndo = (unavailabilityId: string) => {
    if (!canManageStock) return;
    Alert.alert(
      'Desfazer Indisponibilidade',
      'Tem certeza de que deseja desfazer esta indisponibilidade? O produto retornará ao saldo disponível de estoque.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sim, Desfazer',
          style: 'destructive',
          onPress: async () => {
            try {
              await undoStockUnavailability(unavailabilityId);
              Alert.alert('Sucesso', 'Indisponibilidade desfeita com sucesso!');
              void loadData(1, false);
            } catch (error: any) {
              Alert.alert('Erro', error?.message || 'Falha ao desfazer indisponibilidade.');
            }
          },
        },
      ]
    );
  };

  const hasFiltersApplied = statusFilter !== 'all' || productKindFilter !== 'all';

  return (
    <View style={[styles.container, isDarkMode && styles.containerDark]}>
      {renderHeader && renderHeader()}

      {/* Action bar superior com botão de cadastro */}
      <View style={[styles.actionBar, isDarkMode && styles.actionBarDark]}>
        <View>
          <Text style={[styles.title, isDarkMode && styles.titleDark]}>Indisponibilidades</Text>
          <Text style={[styles.countText, isDarkMode && styles.textMutedDark]}>
            {totalCount} {totalCount === 1 ? 'registro' : 'registros'}
          </Text>
        </View>

        {canManageStock && (
          <TouchableOpacity
            style={styles.newBtn}
            onPress={() => setIsModalOpen(true)}
            activeOpacity={0.8}
          >
            <Plus size={16} color="#ffffff" />
            <Text style={styles.newBtnText}>Nova</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Filtros touch-friendly */}
      <UnavailabilityFilters
        isDarkMode={isDarkMode}
        statusFilter={statusFilter}
        productKindFilter={productKindFilter}
        onStatusChange={(status) => {
          setStatusFilter(status);
          setCurrentPage(1);
        }}
        onProductKindChange={(kind) => {
          setProductKindFilter(kind);
          setCurrentPage(1);
        }}
      />

      {/* Lista com pull-to-refresh e empty state inteligente */}
      {isLoading && !isRefreshing ? (
        <View style={styles.centerLoading}>
          <ActivityIndicator size="large" color="#dc2626" />
          <Text style={[styles.loadingText, isDarkMode && styles.textMutedDark]}>
            Carregando indisponibilidades...
          </Text>
        </View>
      ) : (
        <FlatList
          data={unavailabilities}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <UnavailabilityCard
              item={item}
              isDarkMode={isDarkMode}
              canManageStock={canManageStock}
              onUndo={handleUndo}
            />
          )}
          contentContainerStyle={[
            styles.listContainer,
            unavailabilities.length === 0 && styles.listContainerEmpty,
          ]}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor="#dc2626"
              colors={['#dc2626']}
            />
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.2}
          ListEmptyComponent={
            <UnavailabilityEmptyState
              isDarkMode={isDarkMode}
              hasFilters={hasFiltersApplied}
              canManageStock={canManageStock}
              onClearFilters={() => {
                setStatusFilter('all');
                setProductKindFilter('all');
              }}
              onNewUnavailability={() => setIsModalOpen(true)}
            />
          }
        />
      )}

      {/* Modal de cadastro de indisponibilidade */}
      <UnavailabilityFormModal
        isOpen={isModalOpen}
        isDarkMode={isDarkMode}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => {
          setIsModalOpen(false);
          void loadData(1, false);
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  containerDark: {
    backgroundColor: '#0f172a',
  },
  actionBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  actionBarDark: {
    backgroundColor: '#1e293b',
    borderBottomColor: '#334155',
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  titleDark: {
    color: '#f8fafc',
  },
  countText: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 1,
  },
  textMutedDark: {
    color: '#94a3b8',
  },
  newBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#dc2626',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  newBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  listContainer: {
    paddingVertical: 8,
  },
  listContainerEmpty: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  centerLoading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 13,
    color: '#64748b',
  },
});
