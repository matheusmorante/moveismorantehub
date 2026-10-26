import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { FixedPageSlots } from '../../../../components/shared/FixedPageSlots';
import { InventoryCard } from '../components/inventory-card/InventoryCard';
import { useInventory } from '../hooks/useInventory';
import { useInventoryScreenActions } from '../hooks/useInventoryScreenActions';
import type { InventorySession } from '../../types/stock.types';
import { InventoryAuditFlow } from './InventoryAuditFlow';
import { InventoryDetailsModal } from '../modals/InventoryDetailsModal';
import { InventoryOptionsMenuModal } from '../modals/InventoryOptionsMenuModal';
import { styles } from './inventory-screen/inventoryScreen.styles';
import { InventoryScreenPageHeader } from './inventory-screen/InventoryScreenPageHeader';
import { InventoryScreenEmptyState } from './inventory-screen/InventoryScreenEmptyState';

interface Props {
  isDarkMode: boolean;
  userProfile?: any;
  onBack: () => void;
  renderHeader: () => React.ReactElement;
}

export const InventoryScreen: React.FC<Props> = ({
  isDarkMode,
  userProfile,
  renderHeader,
}) => {
  const { sessions, loading, loadingMore, loadMore, reload } = useInventory();
  const listRef = useRef<FlatList<any>>(null);
  const [periodDays, setPeriodDays] = useState(30);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const {
    showCount,
    editingSession,
    copiedItems,
    selectedSession,
    viewDetailsSession,
    setSelectedSession,
    setViewDetailsSession,
    startNewInventory,
    closeAuditFlow,
    handleOptionsPress,
    handleContinueInventory,
    handleDuplicateInventory,
    handleReverseInventory,
    handleApplyAdjustments,
    handleDeleteDraft,
  } = useInventoryScreenActions(reload);

  const filteredSessions = sessions.filter(
    (session) =>
      periodDays === 0 ||
      new Date(session.created_at || session.updated_at).getTime() >=
        Date.now() - periodDays * 24 * 60 * 60 * 1000
  );
  const pageCount = Math.max(1, Math.ceil(filteredSessions.length / pageSize));
  const visibleSessions = filteredSessions.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const handleCyclePeriod = () => {
    setPeriodDays(
      periodDays === 30 ? 90 : periodDays === 90 ? 365 : periodDays === 365 ? 0 : 30
    );
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    listRef.current?.scrollToOffset({ offset: 0, animated: true });
  };

  if (showCount) {
    return (
      <InventoryAuditFlow
        isDarkMode={isDarkMode}
        userProfile={userProfile}
        initialSession={editingSession}
        copiedItems={copiedItems}
        onClose={closeAuditFlow}
      />
    );
  }

  const data: any[] = [
    { type: 'MODULE_HEADER', id: 'MODULE_HEADER' },
    { type: 'PAGE_HEADER', id: 'PAGE_HEADER' },
    ...visibleSessions.map((s) => ({ type: 'ITEM', id: s.id, data: s })),
  ];

  return (
    <View style={[styles.container, isDarkMode && styles.containerDark]}>
      <FlatList
        ref={listRef}
        data={data}
        keyExtractor={(item) => item.id}
        stickyHeaderIndices={[1]}
        ListHeaderComponent={
          loading ? (
            <ActivityIndicator size="large" color="#10b981" style={{ padding: 24 }} />
          ) : null
        }
        renderItem={({ item }) => {
          if (item.type === 'MODULE_HEADER') return renderHeader();
          if (item.type === 'PAGE_HEADER') {
            return (
              <InventoryScreenPageHeader
                isDarkMode={isDarkMode}
                periodDays={periodDays}
                onCyclePeriod={handleCyclePeriod}
                onStartNewInventory={startNewInventory}
              />
            );
          }
          return (
            <View style={styles.cardContainer}>
              <InventoryCard
                session={item.data as InventorySession}
                isDarkMode={isDarkMode}
                onPress={(session) => {
                  if (session.status === 'in_progress' || session.status === 'pending_sync') {
                    handleContinueInventory(session);
                  } else {
                    setViewDetailsSession(session);
                  }
                }}
                onOptionsPress={handleOptionsPress}
              />
            </View>
          );
        }}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          <>
            {loadingMore && (
              <ActivityIndicator size="small" color="#10b981" style={{ padding: 16 }} />
            )}
            {!loading && visibleSessions.length === 0 && (
              <InventoryScreenEmptyState isDarkMode={isDarkMode} />
            )}
            {!loading && visibleSessions.length > 0 && (
              <View style={styles.pagination}>
                <FixedPageSlots
                  label="Paginação de inventários"
                  currentPage={currentPage}
                  totalPages={pageCount}
                  onPageChange={handlePageChange}
                  dark={isDarkMode}
                />
              </View>
            )}
          </>
        }
      />
      <InventoryOptionsMenuModal
        visible={Boolean(selectedSession)}
        session={selectedSession}
        isDarkMode={isDarkMode}
        onClose={() => setSelectedSession(null)}
        onContinue={handleContinueInventory}
        onViewDetails={(s) => {
          setSelectedSession(null);
          setTimeout(() => setViewDetailsSession(s), 300);
        }}
        onDuplicate={(s) => void handleDuplicateInventory(s)}
        onReverse={handleReverseInventory}
        onApplyAdjustments={handleApplyAdjustments}
        onDeleteDraft={handleDeleteDraft}
      />
      {viewDetailsSession && (
        <InventoryDetailsModal
          session={viewDetailsSession}
          isDarkMode={isDarkMode}
          onClose={() => setViewDetailsSession(null)}
        />
      )}
    </View>
  );
};
