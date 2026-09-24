import React from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useMobileCategoriesAndEnvironments } from '../hooks/useMobileCategoriesAndEnvironments';
import { MobileCategoriesHeader } from '../components/MobileCategoriesHeader';
import { MobileEnvironmentsList } from '../components/MobileEnvironmentsList';
import { MobileCategoriesList } from '../components/MobileCategoriesList';
import { MobileCategoryEnvironmentModal } from '../modals/MobileCategoryEnvironmentModal';

interface Props {
  dark: boolean;
  onCategoriesUpdated?: () => void;
}

export const NativeCategoriesScreen: React.FC<Props> = ({ dark, onCategoriesUpdated }) => {
  const {
    environments,
    categories,
    loading,
    refreshing,
    isSubmitting,
    showModal,
    editingNode,
    nameInput,
    setNameInput,
    selectedLinks,
    selectedAttributes,
    setSelectedAttributes,
    isLoadingAttributes,
    closeForm,
    handleSave,
    handleDelete,
    handleUnlink,
    openEditEnvironment,
    openEditCategory,
    openNewEnvironment,
    openNewCategory,
    toggleLink,
    activeView,
    setActiveView,
    categoryFilter,
    setCategoryFilter,
    searchTerm,
    setSearchTerm,
    handleViewOrphans,
    totalOrphans,
    refresh,
  } = useMobileCategoriesAndEnvironments(onCategoriesUpdated);

  if (loading && !refreshing) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={[styles.loadingText, dark && styles.textMuted]}>
          Carregando ambientes e categorias...
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} />
        }
        keyboardShouldPersistTaps="handled"
      >
        <MobileCategoriesHeader
          dark={dark}
          activeView={activeView}
          onViewChange={setActiveView}
          onNewEnvironment={openNewEnvironment}
          onNewCategory={() => openNewCategory()}
          totalOrphans={totalOrphans}
          onViewOrphans={handleViewOrphans}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
        />

        {activeView === 'ambiente' ? (
          <MobileEnvironmentsList
            dark={dark}
            environments={environments}
            categories={categories}
            onEditEnvironment={openEditEnvironment}
            onDeleteEnvironment={handleDelete}
            onEditCategory={openEditCategory}
            onUnlinkCategory={handleUnlink}
            onLinkCategoryToEnvironment={openNewCategory}
            searchTerm={searchTerm}
          />
        ) : (
          <MobileCategoriesList
            dark={dark}
            categories={categories}
            environments={environments}
            filterType={categoryFilter}
            onFilterChange={setCategoryFilter}
            onEditCategory={openEditCategory}
            onDeleteCategory={handleDelete}
            searchTerm={searchTerm}
          />
        )}
      </ScrollView>

      <MobileCategoryEnvironmentModal
        visible={Boolean(showModal)}
        dark={dark}
        showModal={showModal}
        editingNode={editingNode}
        nameInput={nameInput}
        onChangeNameInput={setNameInput}
        selectedLinks={selectedLinks}
        onToggleLink={toggleLink}
        selectedAttributes={selectedAttributes}
        setSelectedAttributes={setSelectedAttributes}
        isLoadingAttributes={isLoadingAttributes}
        categories={categories}
        environments={environments}
        isSubmitting={isSubmitting}
        onClose={closeForm}
        onSave={handleSave}
        onDelete={handleDelete}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 32,
    gap: 8,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
    marginTop: 10,
  },
  textMuted: {
    color: '#94a3b8',
  },
});
