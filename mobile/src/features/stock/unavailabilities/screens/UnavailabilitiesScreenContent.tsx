import { MoreVertical, Plus } from 'lucide-react-native';
import type React from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  getProductProfileRoles,
  normalizePermissionRoles,
} from '../../../../../../shared-utils/productPermissions';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import {
  fetchStockUnavailabilities,
  undoStockUnavailability,
} from '../../../../services/stock/stockUnavailabilitiesService';
import { UnavailabilityCard } from '../components/UnavailabilityCard';
import { UnavailabilityEmptyState } from '../components/UnavailabilityEmptyState';
import { UnavailabilityFilters } from '../components/UnavailabilityFilters';
import { UnavailabilityFormModal } from '../modals/UnavailabilityFormModal';
import type {
  StockUnavailability,
  UnavailabilityStatusFilter,
} from '../types';

export interface UnavailabilitiesScreenProps {
  isDarkMode: boolean;
  userProfile?: any;
  renderHeader?: (rightAction?: React.ReactNode) => React.ReactElement;
}

export const UnavailabilitiesScreenContent: React.FC<UnavailabilitiesScreenProps> = ({
  isDarkMode,
  userProfile,
  renderHeader,
}) => {
  const [unavailabilities, setUnavailabilities] = useState<StockUnavailability[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<UnavailabilityStatusFilter>('all');

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, right: 16 });
  const menuAnchorRef = useRef<View>(null);
  const { width: viewportWidth } = useWindowDimensions();

  // Permissão: admin, manager, stockist
  const userRoles = normalizePermissionRoles(getProductProfileRoles(userProfile));
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
          productKind: 'all',
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
    [statusFilter]
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

  const hasFiltersApplied = statusFilter !== 'all';

  const openMenu = () => {
    menuAnchorRef.current?.measureInWindow((x, y, width, height) => {
      setMenuPosition({
        top: y + height + 4,
        right: Math.max(8, viewportWidth - x - width),
      });
      setIsMenuOpen(true);
    });
  };

  const addUnavailability = () => {
    setIsMenuOpen(false);
    setIsModalOpen(true);
  };

  const menuTrigger = canManageStock ? (
    <View ref={menuAnchorRef} collapsable={false}>
      <TouchableOpacity
        style={styles.menuTrigger}
        onPress={openMenu}
        accessibilityRole="button"
        accessibilityLabel="Mais opções de indisponíveis"
        accessibilityHint="Abre as ações disponíveis para indisponíveis"
      >
        <MoreVertical size={19} color={isDarkMode ? '#cbd5e1' : '#475569'} />
      </TouchableOpacity>
    </View>
  ) : null;

  return (
    <View style={[styles.container, isDarkMode && styles.containerDark]}>
      {renderHeader?.(menuTrigger)}

      {/* Filtros touch-friendly */}
      <UnavailabilityFilters
        isDarkMode={isDarkMode}
        statusFilter={statusFilter}
        totalCount={totalCount}
        onStatusChange={(status) => {
          setStatusFilter(status);
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
              }}
              onNewUnavailability={() => setIsModalOpen(true)}
            />
          }
        />
      )}

      <Modal
        visible={isMenuOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsMenuOpen(false)}
      >
        <View style={styles.menuOverlay}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setIsMenuOpen(false)}
            accessibilityRole="button"
            accessibilityLabel="Fechar menu de indisponíveis"
          />
          <View style={[styles.actionMenu, isDarkMode && styles.actionMenuDark, menuPosition]}>
            <TouchableOpacity
              style={styles.actionMenuItem}
              onPress={addUnavailability}
              accessibilityRole="button"
              accessibilityLabel="Adicionar indisponibilidade"
            >
              <Plus size={17} color={isDarkMode ? '#93c5fd' : '#2563eb'} />
              <Text style={[styles.actionMenuText, isDarkMode && styles.actionMenuTextDark]}>
                Adicionar
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

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
  textMutedDark: {
    color: '#94a3b8',
  },
  menuTrigger: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  menuOverlay: { flex: 1 },
  actionMenu: {
    position: 'absolute',
    minWidth: 228,
    padding: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 12,
    elevation: 8,
  },
  actionMenuDark: { borderColor: '#334155', backgroundColor: '#1e293b' },
  actionMenuItem: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 10,
  },
  actionMenuText: { color: '#0f172a', fontSize: 13, fontWeight: '700' },
  actionMenuTextDark: { color: '#f8fafc' },
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
